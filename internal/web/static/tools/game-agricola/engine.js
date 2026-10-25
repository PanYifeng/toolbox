// 农场主引擎：14 轮 6 阶段工人放置 + 收获序列（田间收获→喂食→繁殖）。
// 纯函数、JSON-safe、零 DOM/i18n 依赖（node 可直接 import 自测）。
//
// ⚠ 已知与官方规则的偏差（诚实声明，均待核对官方后修正）：
//   1) 2-5 人共用 20 格行动板（官方 1-2 人板更小）
//   2) 卡牌为记忆重建 + 自创平衡混合（cards-data.js / majors.js 顶部声明）
//   3) 子阶段支持「取消」——放工人后未做任何实质操作可撤回（官方放工人即承诺；
//      已加房/已犁/已播/已烤/已购则不可取消，防循环刷烤面包）
//   4) 翻新格允许只购大设施不翻新（官方要求翻新）
//   5) 动物溢出自动按已购设备最优汇率烹煮，无设备则丢失（官方要求手动转化）
//   6) 卡上栏位为单一共享池，只养一种畜（官方每张卡独立栏位）
//   7) 大设施每局全局各 1 份（官方壁炉/灶台各 2 份）
//
// 阶段模型：{kind:'place'} 放工 → {kind:'sub'} 子阶段（pending 逐步展开）
//         → {kind:'feed'} 收获喂食 → {kind:'over'} 终局计分。

import {
  SPACES, SPACE_BY_ID, visibleSpaces, spaceUnlocked, playerOk, COST,
  HARVEST_ROUNDS, TOTAL_ROUNDS, FARM_SPACES, START_ROOMS,
  SCORE_FIELDS, SCORE_PASTURES, SCORE_GRAIN, SCORE_VEG, SCORE_ANIMAL,
  SCORE_FAMILY, SCORE_ROOM_CLAY, SCORE_ROOM_STONE, SCORE_STABLE_FENCED,
  SCORE_UNUSED, SCORE_BEGGAR, RES_INFO, ANIMAL_KEYS, MAT_NAMES, RENOV_CHAIN,
} from './actionboard-data.js';
import { OCCUPATIONS, MINOR_IMPROVEMENTS, OCC_BY_ID, MINOR_BY_ID } from './cards-data.js';
import { MAJORS, MAJOR_BY_ID } from './majors.js';
import * as I from './cards-interp.js';

// ==== 随机数（入 state，保证悔棋/重放确定性）====

// rand01 由 seed+计数器派生伪随机数（mulberry32 变体，只用于开局发牌）
function rand01(s) {
  s.rng.n += 1;
  let t = (s.rng.seed + s.rng.n * 0x9E3779B9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// shuffle 原地洗牌（Fisher-Yates）
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand01(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==== 通用小工具 ====

// gainList 资源对象 → '🪵3 🍞2' 展示串（日志用）
export function gainList(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${RES_INFO[k].emoji}${v}`)
    .join(' ');
}

// tab 计分表按拥有量取值（超出取末位）
function tab(tbl, n) { return tbl[Math.min(n, tbl.length - 1)]; }

// log 追加日志条目（seat=-1 系统条目；args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  const a = { ...(args || {}) };
  if (seat >= 0 && a.name === undefined) a.name = s.players[seat].name;
  s.log.push({ seat, key, args: a });
}

// remaining 玩家本轮剩余工人（家庭成长的新成员本轮不动工）
export function remaining(p) { return p.workers - p.placedWorkers; }

// feedNeedOf 喂食需求 = 2×家庭成员 − 本轮新生儿
export function feedNeedOf(p) { return 2 * p.family - p.newborn; }

// ==== 农场几何 ====

// inGrid / orthNeighbors 网格正交邻接（5 列 × 3 行 = 15 格）
function inGrid(idx) { return idx >= 0 && idx < FARM_SPACES; }
function orthNeighbors(idx) {
  const r = Math.floor(idx / 5), c = idx % 5, out = [];
  if (r > 0) out.push(idx - 5);
  if (r < 2) out.push(idx + 5);
  if (c > 0) out.push(idx - 1);
  if (c < 4) out.push(idx + 1);
  return out;
}

// components 一组格子的正交连通分量
export function components(idxs) {
  const set = new Set(idxs), seen = new Set(), comps = [];
  for (const start of idxs) {
    if (seen.has(start)) continue;
    const comp = [], stack = [start];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const nb of orthNeighbors(cur)) {
        if (set.has(nb) && !seen.has(nb)) { seen.add(nb); stack.push(nb); }
      }
    }
    comps.push(comp.sort((a, b) => a - b));
  }
  return comps;
}

// compEdges 一个牧场组的围栏边集合：组内格朝组外/农场外的每条边
function compEdges(comp) {
  const inG = new Set(comp), edges = new Set();
  for (const a of comp) {
    for (const nb of orthNeighbors(a)) {
      if (!inG.has(nb)) edges.add(`${Math.min(a, nb)}-${Math.max(a, nb)}`);
    }
    // 农场外边界同样需要围栏（1×1 角落格 = 4 段）
    const r = Math.floor(a / 5), c = a % 5;
    if (r === 0) edges.add(`${a}|top`);
    if (r === 2) edges.add(`${a}|bot`);
    if (c === 0) edges.add(`${a}|left`);
    if (c === 4) edges.add(`${a}|right`);
  }
  return edges;
}

// existingEdges 玩家既有全部牧场的围栏边集合
function existingEdges(p) {
  const edges = new Set();
  for (const comp of Object.values(p.groups)) {
    for (const e of compEdges(comp)) edges.add(e);
  }
  return edges;
}

// fenceCostOf 新围一组格子的增量木费（与既有牧场共享的边不重复计费）
export function fenceCostOf(p, sel) {
  const before = existingEdges(p);
  const after = new Set(before);
  for (const comp of components(sel)) {
    for (const e of compEdges(comp)) after.add(e);
  }
  const cost = after.size - before.size - (I.discounts(p).fence || 0);
  return Math.max(0, cost);
}

// minFenceCost 单格牧场最小可能花费（用于围栏格放置合法性）
export function minFenceCost(p) {
  let min = Infinity;
  for (let idx = 0; idx < FARM_SPACES; idx++) {
    if (p.farm[idx].t !== 'empty') continue;
    min = Math.min(min, fenceCostOf(p, [idx]));
  }
  return min === Infinity ? Infinity : min;
}

// ==== 玩家状态查询 ====

// canPay / canPayN 费用可负担性（N 份乘算）
export function canPay(p, cost) { return Object.entries(cost).every(([k, v]) => p[k] >= v); }
function canPayN(p, cost, n) { return Object.entries(cost).every(([k, v]) => p[k] >= v * n); }

// pay 扣费（调用前必须已 canPay）
function pay(p, cost) { for (const [k, v] of Object.entries(cost)) p[k] -= v; }

// roomMatOf 现有房间材质（初始木房，翻新统一升级）
export function roomMatOf(p) {
  const room = p.farm.find((f) => f.t === 'room');
  return room ? room.mat : 'wood';
}

// roomCountOf / freeRooms 房间数 / 空房数
export function roomCountOf(p) { return p.farm.filter((f) => f.t === 'room').length; }
export function freeRooms(p) { return roomCountOf(p) - p.family; }

// roomCostOf 下一间房费用（5 材料 + 2 芦苇，减免后下限 1）
export function roomCostOf(p) {
  const d = I.discounts(p);
  const mat = roomMatOf(p);
  const matKey = mat === 'wood' ? 'wood' : mat === 'clay' ? 'clay' : 'stone';
  return {
    [matKey]: Math.max(1, COST[`room${mat[0].toUpperCase()}${mat.slice(1)}`][matKey] - (d.roomMat || 0)),
    reed: Math.max(1, COST.roomWood.reed - (d.roomReed || 0)),
  };
}

// stableCostOf 单个马厩费用（1 木，减免后可至 0）
export function stableCostOf(p) {
  return { wood: Math.max(0, COST.stable.wood - (I.discounts(p).stable || 0)) };
}

// renovInfo 翻新目标与费用（wood→clay / clay→stone；null = 已是石房不可翻）
export function renovInfo(p) {
  const target = RENOV_CHAIN[roomMatOf(p)];
  if (!target) return null;
  const d = I.discounts(p).renov || 0;
  return { target, cost: { reed: COST.renov.reed, [target]: roomCountOf(p) * Math.max(0, 1 - d) } };
}

// canRenovate 是否可翻新
export function canRenovate(p) {
  const info = renovInfo(p);
  return !!info && canPay(p, info.cost);
}

// ownsMajor 大设施全局唯一性检查
export function ownsMajor(s, id) { return s.players.some((p) => p.majors.includes(id)); }

// affordMajors 可购大设施列表（全局未售 + 买得起）
export function affordMajors(s, p) {
  return MAJORS.filter((m) => !ownsMajor(s, m.id) && canPay(p, m.cost));
}

// occCostOf 打出下一张职业的食物费（已打职业数，教师可减免至 0）
export function occCostOf(p) {
  return Math.max(0, p.occPlayed.length - (I.discounts(p).occFood || 0));
}

// validRoomSpots 可建房间（空地 + 正交邻接既有房间）
export function validRoomSpots(p) {
  return p.farm
    .map((f, idx) => ({ f, idx }))
    .filter(({ f, idx }) => f.t === 'empty'
      && orthNeighbors(idx).some((nb) => p.farm[nb].t === 'room'))
    .map(({ idx }) => idx);
}

// validPlowSpots 可犁田（空地 + 正交邻接田/房；本批已犁的算田，支持链式）
function validPlowSpots(p, plowed) {
  const plowedSet = new Set(plowed);
  return p.farm
    .map((f, idx) => ({ f, idx }))
    .filter(({ f, idx }) => f.t === 'empty' && !plowedSet.has(idx)
      && orthNeighbors(idx).some((nb) => ['field', 'room'].includes(p.farm[nb].t) || plowedSet.has(nb)))
    .map(({ idx }) => idx);
}

// emptyFields 空田（未播种）下标
function emptyFields(p) {
  return p.farm.map((f, idx) => ({ f, idx }))
    .filter(({ f }) => f.t === 'field' && f.g === 0 && f.v === 0)
    .map(({ idx }) => idx);
}

// ==== 牲畜（栏位 = 牧场组容量 + 卡上共享池）====

// groupCapacity 牧场组容量 = 2×(格数 + 组内马厩数)
export function groupCapacity(p, gid) {
  const idxs = p.groups[gid];
  const stables = idxs.filter((i) => p.farm[i].stable).length;
  return 2 * (idxs.length + stables);
}

// totalAnimals 某畜种总拥有量（牧场 + 卡上）
export function totalAnimals(p, type) {
  let n = 0;
  for (const ga of Object.values(p.groupAnimals)) if (ga.type === type) n += ga.n;
  if (p.cardAnimal && p.cardAnimal.type === type) n += p.cardAnimal.n;
  return n;
}

// spareFor 某畜种剩余栏位（同种/空牧场 + 卡上空位）
export function spareFor(p, type) {
  let spare = 0;
  for (const gid of Object.keys(p.groups)) {
    const ga = p.groupAnimals[gid];
    if (ga && ga.type !== type) continue;
    spare += groupCapacity(p, gid) - (ga ? ga.n : 0);
  }
  const cc = I.cardCapacity(p), ca = p.cardAnimal;
  if (!ca || ca.type === type) spare += cc - (ca ? ca.n : 0);
  return Math.max(0, spare);
}

// cookOrLose 溢出牲畜处置：有设备按最优汇率烹煮，否则丢失
function cookOrLose(s, p, type, n) {
  const rate = I.cookRates(p)[type];
  if (rate) {
    p.food += rate * n;
    log(s, p.seat, 'ag.log.cook', { a: RES_INFO[type], n, m: rate * n });
  } else {
    log(s, p.seat, 'ag.log.lost', { a: RES_INFO[type], n });
  }
}

// addAnimals 获得牲畜：先补同种牧场空位，再开空牧场，再卡上池，溢出烹煮/丢失
export function addAnimals(s, p, type, n) {
  let left = n;
  for (const pass of [0, 1]) {
    for (const gid of Object.keys(p.groups)) {
      const ga = p.groupAnimals[gid];
      if (pass === 0 && (!ga || ga.type !== type)) continue;
      if (pass === 1 && ga) continue;
      const take = Math.min(groupCapacity(p, gid) - (ga ? ga.n : 0), left);
      if (take > 0) { p.groupAnimals[gid] = { type, n: (ga ? ga.n : 0) + take }; left -= take; }
      if (!left) return;
    }
  }
  const cc = I.cardCapacity(p), ca = p.cardAnimal;
  if (!ca || ca.type === type) {
    const take = Math.min(cc - (ca ? ca.n : 0), left);
    if (take > 0) { p.cardAnimal = { type, n: (ca ? ca.n : 0) + take }; left -= take; }
  }
  if (left > 0) cookOrLose(s, p, type, left);
}

// removeAnimals 取出牲畜（烹食用）：先卡上池再牧场
function removeAnimals(p, type, n) {
  let left = n;
  if (p.cardAnimal && p.cardAnimal.type === type) {
    const take = Math.min(p.cardAnimal.n, left);
    p.cardAnimal.n -= take; left -= take;
    if (!p.cardAnimal.n) p.cardAnimal = null;
    if (!left) return;
  }
  for (const gid of Object.keys(p.groups)) {
    const ga = p.groupAnimals[gid];
    if (!ga || ga.type !== type) continue;
    const take = Math.min(ga.n, left);
    ga.n -= take; left -= take;
    if (!ga.n) delete p.groupAnimals[gid];
    if (!left) return;
  }
}

// gainRes 获得资源（牲畜走栏位分配，其余直加；自动记日志）
function gainRes(s, p, obj) {
  const plain = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (ANIMAL_KEYS.includes(k)) addAnimals(s, p, k, v);
    else { p[k] += v; plain[k] = v; }
  }
  if (Object.keys(plain).length) log(s, p.seat, 'ag.log.gain', { list: gainList(plain) });
}

// ==== 开局与轮次 ====

// newFarm 初始农场：15 空地 + 第 2 行前两格木房
function newFarm() {
  return Array.from({ length: FARM_SPACES }, (_, i) => ({
    t: START_ROOMS.includes(i) ? 'room' : 'empty',
    mat: START_ROOMS.includes(i) ? 'wood' : null,
    g: 0, v: 0, stable: false, gid: 0,
  }));
}

// initialState 开局：发牌 7 职业 + 7 小改进，进入第 1 轮
export function initialState(setup) {
  const s = {
    seed: setup.seed, rng: { seed: setup.seed, n: 0 },
    log: [], round: 0, startSeat: 0, nextStart: 0,
    order: [], turnPtr: 0,
    phase: { kind: 'place' }, pending: null,
    spaces: {}, players: [], feedQueue: null, gameOver: false,
  };
  for (const sp of SPACES) {
    s.spaces[sp.id] = {
      acc: sp.acc ? Object.fromEntries(Object.keys(sp.acc).map((k) => [k, 0])) : null,
      taken: null,
    };
  }
  const occDeck = shuffle(s, OCCUPATIONS.map((c) => c.id));
  const minorDeck = shuffle(s, MINOR_IMPROVEMENTS.map((c) => c.id));
  setup.seats.forEach((seat, i) => {
    s.players.push({
      seat: i, name: seat.name, isAI: !!seat.isAI, color: seat.color,
      food: 2, grain: 0, veg: 0, wood: 0, clay: 0, reed: 0, stone: 0,
      family: 2, workers: 2, placedWorkers: 0, newborn: 0, beggars: 0,
      handOcc: occDeck.slice(i * 7, (i + 1) * 7),
      handMinor: minorDeck.slice(i * 7, (i + 1) * 7),
      occPlayed: [], minorsPlayed: [], majors: [],
      farm: newFarm(), groups: {}, nextGid: 1, groupAnimals: {},
      cardAnimal: null, isStart: i === 0,
    });
  });
  s.order = s.players.map((p) => p.seat);
  log(s, -1, 'ag.log.start', { n: s.players.length });
  startRound(s);
  return s;
}

// startRound 新一轮：累积格增长/重置、被动收入、行动顺位从先手起
function startRound(s) {
  s.round++;
  for (const sp of SPACES) {
    const st = s.spaces[sp.id];
    if (st.taken !== null) {
      st.taken = null;
      if (sp.acc) for (const k of Object.keys(st.acc)) st.acc[k] = sp.acc[k];
    } else if (sp.acc && spaceUnlocked(sp, s.round)) {
      for (const k of Object.keys(st.acc)) st.acc[k] += sp.acc[k];
    }
  }
  for (const p of s.players) {
    p.workers = p.family;
    p.placedWorkers = 0;
    p.newborn = 0;
    const inc = I.roundIncome(p);
    if (Object.keys(inc).length) {
      gainRes(s, p, inc);
      log(s, p.seat, 'ag.log.income', { list: gainList(inc) });
    }
  }
  s.order = s.players.map((p) => p.seat)
    .sort((a, b) => ((a - s.startSeat + s.players.length) % s.players.length)
      - ((b - s.startSeat + s.players.length) % s.players.length));
  s.turnPtr = 0;
  s.phase = { kind: 'place' };
  s.pending = null;
  log(s, -1, 'ag.log.round', { r: s.round });
}

// advance 行动完成后轮转：下一个有工人的座位；全员用尽则收轮
function advance(s) {
  s.phase = { kind: 'place' };
  s.pending = null;
  const n = s.order.length;
  for (let k = 1; k <= n; k++) {
    const ptr = (s.turnPtr + k) % n;
    if (remaining(s.players[s.order[ptr]]) > 0) { s.turnPtr = ptr; return; }
  }
  endRound(s);
}

// endRound 收轮：先手交接 → 收获轮走收获序列，否则直接下一轮
function endRound(s) {
  if (s.nextStart !== s.startSeat) {
    s.startSeat = s.nextStart;
    for (const p of s.players) p.isStart = p.seat === s.startSeat;
  }
  if (HARVEST_ROUNDS.includes(s.round)) beginHarvest(s);
  else nextRound(s);
}

// nextRound 轮次推进；第 14 轮后终局
function nextRound(s) {
  if (s.round >= TOTAL_ROUNDS) {
    s.gameOver = true;
    s.phase = { kind: 'over' };
    s.pending = null;
    log(s, -1, 'ag.log.over', {});
    return;
  }
  startRound(s);
}

// ==== 收获序列 ====

// beginHarvest 田间收获（自动）→ 进入喂食队列
function beginHarvest(s) {
  log(s, -1, 'ag.log.harvest', { r: s.round });
  for (const seat of s.order) {
    const p = s.players[seat];
    const gain = {};
    for (const f of p.farm) {
      if (f.g) { gain.grain = (gain.grain || 0) + f.g; f.g = 0; }
      if (f.v) { gain.veg = (gain.veg || 0) + f.v; f.v = 0; }
    }
    if (Object.keys(gain).length) {
      p.grain += gain.grain || 0;
      p.veg += gain.veg || 0;
      log(s, seat, 'ag.log.harvestField', { list: gainList(gain) });
    }
    const hf = I.harvestFood(p);
    if (hf) { p.food += hf; log(s, seat, 'ag.log.harvestFood', { n: hf }); }
  }
  s.phase = { kind: 'feed' };
  s.feedQueue = s.order.slice(1);
  s.pending = { type: 'feed', seat: s.order[0] };
}

// feedConfirmApply 喂食确认：付食，缺口 1 食 = 1 乞讨卡
function feedConfirmApply(s) {
  const p = s.players[s.pending.seat];
  const need = feedNeedOf(p);
  const paid = Math.min(p.food, need);
  p.food -= paid;
  if (need - paid > 0) {
    p.beggars += need - paid;
    log(s, p.seat, 'ag.log.beg', { n: need - paid });
  } else {
    log(s, p.seat, 'ag.log.feedOk', { n: need });
  }
  const nxt = s.feedQueue.shift();
  if (nxt === undefined) { finishHarvest(s); return; }
  s.pending = { type: 'feed', seat: nxt };
}

// finishHarvest 繁殖（每种 ≥2 只且有栏位 +1）→ 下一轮
function finishHarvest(s) {
  s.phase = { kind: 'place' };
  s.pending = null;
  s.feedQueue = null;
  for (const seat of s.order) {
    const p = s.players[seat];
    for (const k of ANIMAL_KEYS) {
      if (totalAnimals(p, k) >= 2 && spareFor(p, k) >= 1) {
        addAnimals(s, p, k, 1);
        log(s, seat, 'ag.log.breed', { a: RES_INFO[k] });
      }
    }
  }
  nextRound(s);
}

// ==== 合法动作枚举 ====

// grantOf 空间当前可拿资源（fixed 固定 / acc 累积快照）
export function grantOf(s, sp) {
  return sp.fixed ? { ...sp.fixed } : { ...s.spaces[sp.id].acc };
}

// currentPlayer 当前待决策座位
export function currentPlayer(s) {
  if (s.phase.kind === 'sub' || s.phase.kind === 'feed') return s.pending.seat;
  return s.order[s.turnPtr];
}

// legalActions 唯一合法性来源
export function legalActions(s) {
  if (s.gameOver) return [];
  const seat = currentPlayer(s);
  const p = s.players[seat];
  if (s.phase.kind === 'place') {
    return visibleSpaces(s.round, s.players.length)
      .filter((sp) => s.spaces[sp.id].taken === null && spaceOk(s, p, sp))
      .map((sp) => ({ kind: 'place', space: sp.id }));
  }
  if (s.phase.kind === 'sub') return subActions(s, p);
  return feedActions(p);
}

// spaceOk 放工阶段各空间合法性
function spaceOk(s, p, sp) {
  switch (sp.kind) {
    case 'takeResource': {
      const grant = grantOf(s, sp);
      return Object.entries(grant).every(([k, v]) =>
        !(ANIMAL_KEYS.includes(k) && v > 0 && spareFor(p, k) <= 0 && !I.cookRates(p)[k]));
    }
    case 'start': return true;
    case 'build': {
      return (canPay(p, roomCostOf(p)) && validRoomSpots(p).length > 0)
        || (canPay(p, stableCostOf(p)) && p.farm.some((f) => (f.t === 'empty' || f.t === 'pasture') && !f.stable));
    }
    case 'plow': return validPlowSpots(p, []).length > 0;
    case 'sow': {
      const canSow = emptyFields(p).length > 0 && (p.grain > 0 || p.veg > 0);
      return canSow || I.bakeOptions(p).some((o) => p.grain >= 1);
    }
    case 'occ': return p.handOcc.some((id) => occPlayable(s, p, id));
    case 'minor': return p.handMinor.some((id) => minorPlayable(s, p, id));
    case 'growth': return freeRooms(p) > 0;
    case 'growth2': return true;
    case 'renov': return canRenovate(p) || affordMajors(s, p).length > 0;
    case 'fence': return p.wood >= minFenceCost(p);
    default: return true;
  }
}

// occPlayable / minorPlayable 打牌合法性（费用 + 前置）
function occPlayable(s, p, id) {
  const card = OCC_BY_ID[id];
  return p.handOcc.includes(id) && p.food >= occCostOf(p) && I.reqOk(p, card, s.round);
}
function minorPlayable(s, p, id) {
  const card = MINOR_BY_ID[id];
  return p.handMinor.includes(id) && canPay(p, card.cost) && I.reqOk(p, card, s.round);
}

// feedActions 喂食阶段：烹食转换（缺口内）+ 确认
function feedActions(p) {
  const acts = [];
  const need = feedNeedOf(p);
  if (p.food < need) {
    const rates = I.cookRates(p);
    for (const [k, r] of Object.entries(rates)) {
      if (!r) continue;
      const stock = ANIMAL_KEYS.includes(k) ? totalAnimals(p, k) : p[k];
      const maxN = Math.min(stock, Math.ceil((need - p.food) / r));
      for (let n = 1; n <= maxN; n++) acts.push({ kind: 'feedCook', res: k, n });
    }
  }
  acts.push({ kind: 'feedConfirm' });
  return acts;
}

// pendingClean 子阶段是否零操作（决定可否取消）
function pendingClean(pd) {
  switch (pd.type) {
    case 'build': return !pd.rooms.length && !pd.stables.length;
    case 'plow': case 'plowsow': return !pd.plowed.length && !pd.sown.length && !pd.baked;
    case 'sow': return !pd.sown.length && !pd.baked;
    case 'fence': return !pd.sel.length;
    case 'renov': return !pd.didRenov && !pd.major;
    default: return true; // occ / minor 无中间态
  }
}

// subActions 子阶段合法动作（按 pending 类型展开）
function subActions(s, p) {
  const pd = s.pending;
  const acts = [];
  switch (pd.type) {
    case 'build': buildActions(s, p, pd, acts); break;
    case 'plow': case 'plowsow': plowActions(s, p, pd, acts); break;
    case 'sow': sowActions(s, p, pd, acts); break;
    case 'fence': fenceActions(p, pd, acts); break;
    case 'renov': renovActions(s, p, pd, acts); break;
    case 'occ':
      for (const id of p.handOcc) if (occPlayable(s, p, id)) acts.push({ kind: 'subOcc', id });
      break;
    case 'minor':
      for (const id of p.handMinor) if (minorPlayable(s, p, id)) acts.push({ kind: 'subMinor', id });
      break;
    default: break;
  }
  if (pendingClean(pd)) acts.push({ kind: 'subCancel' });
  return acts;
}

// buildTotalCost 建造合计费用（房 rc×rooms + 马厩 sc×stables，同键相加）
function buildTotalCost(rc, sc, rooms, stables) {
  const total = {};
  for (const [k, v] of Object.entries(rc)) total[k] = v * rooms;
  for (const [k, v] of Object.entries(sc)) total[k] = (total[k] || 0) + v * stables;
  return total;
}

// buildActions 建房/马厩子阶段（合计可负担性验证，done 统一支付落地）
function buildActions(s, p, pd, acts) {
  void s;
  const rc = roomCostOf(p), sc = stableCostOf(p);
  if (canPay(p, buildTotalCost(rc, sc, pd.rooms.length + 1, pd.stables.length))) {
    for (const idx of validRoomSpots(p)) {
      if (!pd.rooms.includes(idx)) acts.push({ kind: 'subRoom', idx });
    }
  }
  if (canPay(p, buildTotalCost(rc, sc, pd.rooms.length, pd.stables.length + 1))) {
    for (let idx = 0; idx < FARM_SPACES; idx++) {
      const f = p.farm[idx];
      if ((f.t === 'empty' || f.t === 'pasture') && !f.stable && !pd.stables.includes(idx)) {
        acts.push({ kind: 'subStable', idx });
      }
    }
  }
  if (pd.rooms.length || pd.stables.length) acts.push({ kind: 'subDone' });
}

// plowActions 犁田子阶段（plowsow 附带播种/烤面包）
function plowActions(s, p, pd, acts) {
  void s;
  const limit = 1 + I.extraPlow(p);
  if (pd.plowed.length < limit) {
    for (const idx of validPlowSpots(p, pd.plowed)) acts.push({ kind: 'subPlow', idx });
  }
  if (pd.type === 'plowsow') pushSowBake(p, pd, acts);
  if (pd.plowed.length + pd.sown.length || pd.baked) acts.push({ kind: 'subDone' });
}

// sowActions 播种/烤面包子阶段
function sowActions(s, p, pd, acts) {
  void s;
  pushSowBake(p, pd, acts);
  if (pd.sown.length || pd.baked) acts.push({ kind: 'subDone' });
}

// pushSowBake 播种步（谷 1→田 2 / 菜 1→田 1）+ 烤面包步（每动作一次）
// 可烤量 = 现有谷物 − 已登记播种量（播种 done 才落地扣谷，须预留防透支）
function pushSowBake(p, pd, acts) {
  const sownGrain = pd.sown.filter((x) => x.crop === 'grain').length;
  const sownVeg = pd.sown.filter((x) => x.crop === 'veg').length;
  for (const idx of emptyFields(p)) {
    if (pd.sown.some((x) => x.idx === idx)) continue;
    if (p.grain > sownGrain) acts.push({ kind: 'subSow', idx, crop: 'grain' });
    if (p.veg > sownVeg) acts.push({ kind: 'subSow', idx, crop: 'veg' });
  }
  if (!pd.baked) {
    const bakeable = Math.max(0, p.grain - sownGrain);
    for (const o of I.bakeOptions(p)) {
      for (let n = 1; n <= Math.min(o.max, bakeable); n++) {
        acts.push({ kind: 'subBake', rate: o.rate, max: o.max, n });
      }
    }
  }
}

// fenceActions 围栏子阶段（toggle 空地，done 计价支付）
function fenceActions(p, pd, acts) {
  for (let idx = 0; idx < FARM_SPACES; idx++) {
    if (p.farm[idx].t === 'empty') acts.push({ kind: 'subFenceSel', idx });
  }
  if (pd.sel.length && fenceCostOf(p, pd.sel) <= p.wood) acts.push({ kind: 'subDone' });
}

// sumCost 合并两份费用（同键相加）
function sumCost(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}

// renovActions 翻新/购大设施子阶段（翻新+大设施可同做，按合计费用校验）
function renovActions(s, p, pd, acts) {
  const info = renovInfo(p);
  if (!pd.didRenov && !pd.major && info && canPay(p, info.cost)) acts.push({ kind: 'subRenovate' });
  if (!pd.major) {
    for (const m of affordMajors(s, p)) {
      const extra = pd.didRenov && info ? info.cost : {};
      if (canPay(p, sumCost(m.cost, extra))) acts.push({ kind: 'subMajor', id: m.id });
    }
  }
  if (pd.didRenov || pd.major) acts.push({ kind: 'subDone' });
}

// ==== 动作应用 ====

// apply 纯函数入口：深拷贝后原地派发
export function apply(state, action) {
  const s = structuredClone(state);
  if (s.gameOver) throw new Error('game over');
  applyInplace(s, action);
  return s;
}

// applyInplace 派发（所有分支必须已通过 legalActions 校验，此处抛错兜底）
function applyInplace(s, a) {
  switch (a.kind) {
    case 'place': return applyPlace(s, a);
    case 'subRoom': case 'subStable': return applyBuildStep(s, a);
    case 'subPlow': return applyPlowStep(s, a);
    case 'subSow': return applySowStep(s, a);
    case 'subBake': return applyBakeStep(s, a);
    case 'subFenceSel': return applyFenceSel(s, a);
    case 'subRenovate': case 'subMajor': return applyRenovStep(s, a);
    case 'subOcc': return applyOcc(s, a);
    case 'subMinor': return applyMinor(s, a);
    case 'subDone': return applyDone(s);
    case 'subCancel': return applyCancel(s);
    case 'feedCook': return applyFeedCook(s, a);
    case 'feedConfirm': return feedConfirmApply(s);
    default: throw new Error(`unknown action ${a.kind}`);
  }
}

// requirePhase 阶段守卫
function requirePhase(s, kind) {
  if (s.phase.kind !== kind) throw new Error(`expected ${kind}, got ${s.phase.kind}`);
}

// makePending 各专长空间进入子阶段的 pending 结构（space 记来源格，供取消释放）
function makePending(sp, seat) {
  const base = { seat, space: sp.id };
  switch (sp.kind) {
    case 'build': return { type: 'build', ...base, rooms: [], stables: [] };
    case 'plow': return { type: 'plow', ...base, plowed: [], sown: [], baked: false };
    case 'sow': return { type: 'sow', ...base, plowed: [], sown: [], baked: false };
    case 'plowsow': return { type: 'plowsow', ...base, plowed: [], sown: [], baked: false };
    case 'fence': return { type: 'fence', ...base, sel: [] };
    case 'renov': return { type: 'renov', ...base, didRenov: false, major: null };
    default: return { type: sp.kind, ...base };
  }
}

// sumGain 合并两份资源获得（同键相加，非覆盖）
function sumGain(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}

// applyPlace 放工：占用空间 → 简单空间立即结算，专长空间进子阶段
function applyPlace(s, a) {
  requirePhase(s, 'place');
  const sp = SPACE_BY_ID[a.space];
  const st = s.spaces[a.space];
  const seat = currentPlayer(s);
  const p = s.players[seat];
  if (!sp || st.taken !== null || !spaceUnlocked(sp, s.round) || !playerOk(sp, s.players.length) || !spaceOk(s, p, sp)) {
    throw new Error(`illegal place ${a.space}`);
  }
  st.taken = seat;
  p.placedWorkers++;
  log(s, seat, 'ag.log.place', { name: p.name, space: sp.name });
  switch (sp.kind) {
    case 'takeResource': {
      const grant = grantOf(s, sp);
      const bonus = I.takeBonus(p, sp.id);
      if (sp.acc) for (const k of Object.keys(st.acc)) st.acc[k] = 0;
      gainRes(s, p, sumGain(grant, bonus));
      return advance(s);
    }
    case 'start': {
      const grant = { ...st.acc };
      for (const k of Object.keys(st.acc)) st.acc[k] = 0;
      gainRes(s, p, grant);
      s.nextStart = seat;
      log(s, seat, 'ag.log.startNext', { name: p.name });
      return advance(s);
    }
    case 'growth': {
      if (freeRooms(p) <= 0) throw new Error('family growth needs a free room');
      return applyGrowth(s, p);
    }
    case 'growth2': return applyGrowth(s, p);
    default: {
      s.phase = { kind: 'sub' };
      s.pending = makePending(sp, seat);
    }
  }
}

// applyGrowth 家庭成长：+1 成员，本轮新生儿（不动工、只吃 1 食）
function applyGrowth(s, p) {
  p.family++;
  p.newborn = 1;
  log(s, p.seat, 'ag.log.growth', {});
  advance(s);
}

// applyBuildStep 建房/马厩步（登记，合计可负担性校验，done 统一支付）
function applyBuildStep(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (pd.type !== 'build') throw new Error('not build pending');
  const rc = roomCostOf(p), sc = stableCostOf(p);
  if (a.kind === 'subRoom') {
    if (!validRoomSpots(p).includes(a.idx) || pd.rooms.includes(a.idx)) throw new Error('illegal room');
    if (!canPay(p, buildTotalCost(rc, sc, pd.rooms.length + 1, pd.stables.length))) throw new Error('cannot afford room');
    pd.rooms.push(a.idx);
  } else {
    const f = p.farm[a.idx];
    if ((f.t !== 'empty' && f.t !== 'pasture') || f.stable || pd.stables.includes(a.idx)) throw new Error('illegal stable');
    if (!canPay(p, buildTotalCost(rc, sc, pd.rooms.length, pd.stables.length + 1))) throw new Error('cannot afford stable');
    pd.stables.push(a.idx);
  }
}

// applyPlowStep 犁田步
function applyPlowStep(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (!['plow', 'plowsow'].includes(pd.type)) throw new Error('not plow pending');
  if (pd.plowed.length >= 1 + I.extraPlow(p)) throw new Error('plow limit');
  if (!validPlowSpots(p, pd.plowed).includes(a.idx)) throw new Error('illegal plow');
  pd.plowed.push(a.idx);
}

// applySowStep 播种步（登记，done 统一扣供落地）
function applySowStep(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (!['sow', 'plowsow'].includes(pd.type)) throw new Error('not sow pending');
  if (!['grain', 'veg'].includes(a.crop)) throw new Error('bad crop');
  if (!emptyFields(p).includes(a.idx) || pd.sown.some((x) => x.idx === a.idx)) throw new Error('illegal sow');
  const used = pd.sown.filter((x) => x.crop === a.crop).length;
  if (p[a.crop] <= used) throw new Error('no supply');
  pd.sown.push({ idx: a.idx, crop: a.crop });
}

// applyBakeStep 烤面包步：n 谷 × 设备汇率 + 烤面包加成，每动作限一次
function applyBakeStep(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (!['sow', 'plowsow'].includes(pd.type)) throw new Error('not sow pending');
  if (pd.baked) throw new Error('already baked');
  const opt = I.bakeOptions(p).find((o) => o.rate === a.rate && o.max === a.max);
  // 可烤量须扣除已登记播种的谷物（done 才落地扣，此处透支会让终值扣成负数）
  const sownGrain = pd.sown.filter((x) => x.crop === 'grain').length;
  if (!opt || a.n < 1 || a.n > opt.max || a.n > p.grain - sownGrain) throw new Error('bad bake');
  p.grain -= a.n;
  const food = opt.rate * a.n + I.bakeBonus(p);
  p.food += food;
  pd.baked = true;
  log(s, p.seat, 'ag.log.bake', { n: a.n, m: food });
}

// applyFenceSel 围栏选格（toggle）
function applyFenceSel(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (pd.type !== 'fence') throw new Error('not fence pending');
  if (p.farm[a.idx].t !== 'empty') throw new Error('not empty');
  const i = pd.sel.indexOf(a.idx);
  if (i >= 0) pd.sel.splice(i, 1);
  else pd.sel.push(a.idx);
}

// applyRenovStep 翻新/购大设施步（登记，done 统一支付；合计费用在选定时校验）
function applyRenovStep(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (pd.type !== 'renov') throw new Error('not renov pending');
  const info = renovInfo(p);
  if (a.kind === 'subRenovate') {
    if (pd.didRenov || pd.major || !info || !canPay(p, info.cost)) throw new Error('cannot renovate');
    pd.didRenov = true;
  } else {
    if (pd.major) throw new Error('major already picked');
    const m = MAJOR_BY_ID[a.id];
    if (!m || ownsMajor(s, m.id) || !canPay(p, m.cost)) throw new Error('cannot buy major');
    if (pd.didRenov && info && !canPay(p, sumCost(m.cost, info.cost))) throw new Error('cannot afford renov + major');
    pd.major = a.id;
  }
}

// applyOcc 打职业：付食、入場、立即获得 once 效果
function applyOcc(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (pd.type !== 'occ' || !occPlayable(s, p, a.id)) throw new Error('illegal occ');
  const card = OCC_BY_ID[a.id];
  p.food -= occCostOf(p);
  p.handOcc = p.handOcc.filter((x) => x !== a.id);
  p.occPlayed.push(a.id);
  log(s, p.seat, 'ag.log.occ', { card: card.name });
  if (card.eff.once) gainRes(s, p, card.eff.once);
  advance(s);
}

// applyMinor 打小改进：付费、入場、立即获得 once 效果
function applyMinor(s, a) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (pd.type !== 'minor' || !minorPlayable(s, p, a.id)) throw new Error('illegal minor');
  const card = MINOR_BY_ID[a.id];
  pay(p, card.cost);
  p.handMinor = p.handMinor.filter((x) => x !== a.id);
  p.minorsPlayed.push(a.id);
  log(s, p.seat, 'ag.log.minor', { card: card.name });
  if (card.eff.once) gainRes(s, p, card.eff.once);
  advance(s);
}

// applyDone 子阶段收尾：统一支付 + 落地 + 日志
function applyDone(s) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  const p = s.players[pd.seat];
  switch (pd.type) {
    case 'build': return doneBuild(s, p, pd);
    case 'plow': case 'plowsow': return donePlow(s, p, pd);
    case 'sow': return doneSow(s, p, pd);
    case 'fence': return doneFence(s, p, pd);
    case 'renov': return doneRenov(s, p, pd);
    default: throw new Error(`bad pending ${pd.type}`);
  }
}

// doneBuild 建造落地（材质先取再落，避免读到半初始化新房）
function doneBuild(s, p, pd) {
  if (!pd.rooms.length && !pd.stables.length) throw new Error('nothing built');
  const rc = roomCostOf(p), sc = stableCostOf(p);
  if (!canPay(p, buildTotalCost(rc, sc, pd.rooms.length, pd.stables.length))) throw new Error('cannot afford');
  pay(p, Object.fromEntries(Object.entries(rc).map(([k, v]) => [k, v * pd.rooms.length])));
  pay(p, Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v * pd.stables.length])));
  const mat = roomMatOf(p);
  for (const idx of pd.rooms) {
    p.farm[idx].t = 'room';
    p.farm[idx].mat = mat;
  }
  for (const idx of pd.stables) p.farm[idx].stable = true;
  log(s, p.seat, 'ag.log.build', { rooms: pd.rooms.length, stables: pd.stables.length });
  advance(s);
}

// donePlow 犁田落地（plowsow 时连同播种）
function donePlow(s, p, pd) {
  if (!pd.plowed.length && !pd.sown.length && !pd.baked) throw new Error('nothing done');
  for (const idx of pd.plowed) p.farm[idx].t = 'field';
  if (pd.plowed.length) log(s, p.seat, 'ag.log.plow', { n: pd.plowed.length });
  landSown(s, p, pd);
  advance(s);
}

// doneSow 播种落地
function doneSow(s, p, pd) {
  if (!pd.sown.length && !pd.baked) throw new Error('nothing done');
  landSown(s, p, pd);
  advance(s);
}

// landSown 播种统一落地：谷 1→田 2，菜 1→田 1
function landSown(s, p, pd) {
  if (!pd.sown.length) return;
  for (const { idx, crop } of pd.sown) {
    p[crop] -= 1;
    if (crop === 'grain') p.farm[idx].g = 2;
    else p.farm[idx].v = 1;
  }
  log(s, p.seat, 'ag.log.sow', { n: pd.sown.length });
}

// doneFence 围栏落地：连通分量各成一组牧场
function doneFence(s, p, pd) {
  if (!pd.sel.length) throw new Error('no fence selected');
  const cost = fenceCostOf(p, pd.sel);
  if (cost > p.wood) throw new Error('cannot afford fence');
  p.wood -= cost;
  for (const comp of components(pd.sel)) {
    const gid = p.nextGid++;
    p.groups[gid] = comp;
    for (const idx of comp) {
      p.farm[idx].t = 'pasture';
      p.farm[idx].gid = gid;
    }
  }
  log(s, p.seat, 'ag.log.fence', { n: pd.sel.length, w: cost });
  advance(s);
}

// doneRenov 翻新/购大设施落地
function doneRenov(s, p, pd) {
  if (!pd.didRenov && !pd.major) throw new Error('nothing done');
  if (pd.didRenov) {
    const info = renovInfo(p);
    if (!info || !canPay(p, info.cost)) throw new Error('cannot afford renovation');
    pay(p, info.cost);
    for (const f of p.farm) if (f.t === 'room') f.mat = info.target;
    log(s, p.seat, 'ag.log.renov', { mat: MAT_NAMES[info.target] });
  }
  if (pd.major) {
    const m = MAJOR_BY_ID[pd.major];
    if (ownsMajor(s, m.id) || !canPay(p, m.cost)) throw new Error('cannot buy major');
    pay(p, m.cost);
    p.majors.push(m.id);
    log(s, p.seat, 'ag.log.major', { card: m.name });
  }
  advance(s);
}

// applyCancel 撤回放置（仅零操作子阶段可取消：归还工人、释放来源空间）
function applyCancel(s) {
  requirePhase(s, 'sub');
  const pd = s.pending;
  if (!pendingClean(pd)) throw new Error('cannot cancel after actions');
  const p = s.players[pd.seat];
  if (s.spaces[pd.space] && s.spaces[pd.space].taken === pd.seat) s.spaces[pd.space].taken = null;
  p.placedWorkers--;
  s.phase = { kind: 'place' };
  s.pending = null;
}

// applyFeedCook 喂食烹食转换
function applyFeedCook(s, a) {
  requirePhase(s, 'feed');
  const p = s.players[s.pending.seat];
  const rate = I.cookRates(p)[a.res];
  if (!rate || a.n < 1) throw new Error('bad feedCook');
  const stock = ANIMAL_KEYS.includes(a.res) ? totalAnimals(p, a.res) : p[a.res];
  if (stock < a.n) throw new Error('not enough to cook');
  if (ANIMAL_KEYS.includes(a.res)) removeAnimals(p, a.res, a.n);
  else p[a.res] -= a.n;
  p.food += rate * a.n;
  log(s, p.seat, 'ag.log.cook', { a: RES_INFO[a.res], n: a.n, m: rate * a.n });
}

// ==== 终局计分 ====

// isGameOver 终局判定
export function isGameOver(s) { return s.gameOver; }

// score 终局计分（家族版口径）：田/牧场/谷/菜/畜/家庭/房/马厩/乞讨/空地/卡牌
export function score(s) {
  return s.players.map((p) => {
    const fields = p.farm.filter((f) => f.t === 'field').length;
    const pastures = Object.keys(p.groups).length;
    const grain = p.grain + p.farm.reduce((a, f) => a + f.g, 0);
    const veg = p.veg + p.farm.reduce((a, f) => a + f.v, 0);
    const clayRooms = p.farm.filter((f) => f.t === 'room' && f.mat === 'clay').length;
    const stoneRooms = p.farm.filter((f) => f.t === 'room' && f.mat === 'stone').length;
    let stableVp = 0;
    for (const idxs of Object.values(p.groups)) {
      stableVp += idxs.filter((i) => p.farm[i].stable).length * SCORE_STABLE_FENCED;
    }
    stableVp -= p.farm.filter((f) => f.stable && f.t !== 'pasture').length;
    const unused = p.farm.filter((f) => f.t === 'empty' && !f.stable).length;
    const rows = [
      ['ag.score.fields', tab(SCORE_FIELDS, fields)],
      ['ag.score.pastures', tab(SCORE_PASTURES, pastures)],
      ['ag.score.grain', tab(SCORE_GRAIN, grain)],
      ['ag.score.veg', tab(SCORE_VEG, veg)],
      ['ag.score.sheep', tab(SCORE_ANIMAL, totalAnimals(p, 'sheep'))],
      ['ag.score.boar', tab(SCORE_ANIMAL, totalAnimals(p, 'boar'))],
      ['ag.score.cattle', tab(SCORE_ANIMAL, totalAnimals(p, 'cattle'))],
      ['ag.score.family', SCORE_FAMILY * p.family],
      ['ag.score.rooms', clayRooms * SCORE_ROOM_CLAY + stoneRooms * SCORE_ROOM_STONE],
      ['ag.score.stables', stableVp],
      ['ag.score.beggar', SCORE_BEGGAR * p.beggars],
      ['ag.score.unused', SCORE_UNUSED * unused],
      ['ag.score.cards', I.endCardVp(p)],
    ];
    return { seat: p.seat, total: rows.reduce((a, [, v]) => a + v, 0), breakdown: rows };
  });
}
