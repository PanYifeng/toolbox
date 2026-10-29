// 神秘大地引擎：6 轮轮流行动、地形改造、三碗能量、邪教轨、建镇检测。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// ⚠ 规则细节为记忆重建（见 tables.js / data-factions.js / map-data.js 顶部声明），
// 已知偏差：leech 自动接受（官方可拒绝换 1 金币）；burn 作为独立动作（官方为支付前自由转换）；
// 恩惠板块不可换（官方建后续神殿可换）；开局奖励板块随机分配（官方轮选）。

import {
  BUILDINGS, UPGRADE_CHAIN, POWER_ACTIONS, BONUS_TILES, FAVOR_TILES, ROUND_TILES,
  ROUNDS, CULT_TRACKS, CULT_TOP, cultSpaceReward, CULT_RANK_VP, SPADE_WORKERS,
  SHIPPING_COST, SHIPPING_MAX, BRIDGE_COST, BRIDGE_MAX, TOWN_VP, TOWN_THRESHOLD,
  TOWN_MIN_BUILDINGS, PRIEST_CAP, START, wheelDist,
} from './tables.js';
import { HEXES, ADJACENCY, BRIDGE_PAIRS } from './map-data.js';
import { FACTIONS as FACTIONS_ALL, factionById } from './data-factions.js';

// 阶段种类常量（避免魔术字符串散落）
const PH_FACTION = 'chooseFaction';
const PH_PLACE = 'placeDwelling';
const PH_ACT = 'act';
const PH_RESOLVE = 'resolve';
const PH_OVER = 'gameOver';

// —— 基础工具 ——

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffle 原地洗牌（Fisher-Yates，用 state 随机源）
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
}

// factionOf / homeTerrain / hasSH / lockedPriests 派系与状态便捷查询
function factionOf(p) { return factionById(p.faction); }
function homeTerrain(p) { return factionOf(p).terrain; }
function hasSH(p) { return builtCount(p, ['SH']) > 0; }
function lockedPriests(p) {
  return CULT_TRACKS.reduce((a, tr) => a + p.priestsOnCult[tr], 0);
}
function builtCount(p, keys) {
  return Object.values(p.buildings).filter((b) => keys.includes(b)).length;
}

// chainOf 升级链（TP2 视同 TP）
function chainOf(bldKey) {
  return UPGRADE_CHAIN[bldKey === 'TP2' ? 'TP' : bldKey] || [];
}

// —— 资源与能量 ——

// grant 发放资源（祭司受总数上限约束；powerGain 走三碗流转）
function grant(s, p, gain) {
  if (gain.coins) p.coins += gain.coins;
  if (gain.workers) p.workers += gain.workers;
  if (gain.vp) p.vp += gain.vp;
  if (gain.spades) p.spades += gain.spades;
  if (gain.priests) {
    const room = PRIEST_CAP - lockedPriests(p) - p.priests;
    p.priests += Math.max(0, Math.min(gain.priests, room));
  }
  if (gain.powerGain) gainPower(p, gain.powerGain);
}

// gainPower 得能量：碗 I→II，I 空则 II→III（近似官方流转）
function gainPower(p, n) {
  for (let k = 0; k < n; k++) {
    if (p.power.i > 0) { p.power.i--; p.power.ii++; }
    else if (p.power.ii > 0) { p.power.ii--; p.power.iii++; }
    else break;
  }
}

// payPower 支付能量：碗 III → 碗 I
function payPower(p, n) {
  p.power.iii -= n;
  p.power.i += n;
}

// afford 费用支付能力检查（priests 为可用祭司，支付即弃置）
function afford(p, cost) {
  return p.coins >= (cost.coins || 0) && p.workers >= (cost.workers || 0) && p.priests >= (cost.priests || 0);
}

// pay 扣费（调用前须 afford 校验）
function pay(p, cost) {
  p.coins -= cost.coins || 0;
  p.workers -= cost.workers || 0;
  p.priests -= cost.priests || 0;
}

// —— 邪教轨 ——

// advanceCult 推进（每步发该格空格奖励；不放置祭司——仅 priestSend 锁祭司）
function advanceCult(s, p, track, steps) {
  for (let k = 0; k < steps && p.cult[track] < CULT_TOP; k++) {
    p.cult[track] += 1;
    grant(s, p, cultSpaceReward(p.cult[track]));
  }
}

// —— 吸能（leech）——

// leechFrom 对手从新建建筑吸能：得建筑能量值，付 1 碗 III→I 代价（自动接受，近似）
function leechFrom(s, hexId, bldKey, builderSeat) {
  const builder = s.players[builderSeat];
  const power = BUILDINGS[bldKey].power;
  const seen = new Set(); // 每个对手只吸一次（与拥有几座邻接建筑无关）
  for (const nid of ADJACENCY[hexId]) {
    const h = s.hexes[nid];
    if (h.owner === null || h.owner === builderSeat || !h.bld || seen.has(h.owner)) continue;
    seen.add(h.owner);
    const q = s.players[h.owner];
    if (q.power.iii < 1) continue; // 付不起代价则不吸（? 待核对）
    gainPower(q, power);
    payPower(q, 1);
    // 蜂灵专长：他人吸你建筑能量时你得 1 工人（需 SH）
    if (factionOf(builder).special === 'leechWorker' && hasSH(builder)) builder.workers += 1;
  }
}

// —— 建造范围与城镇检测 ——

// buildRangeSet 可建民居格集合：陆地邻接（苦行僧距离 3）+ 船运跨河 + 自有桥。
// 官方语义（jsnell check_reachable）：船运跨「河流格」——从己方建筑出发，
// 连续跨越 ≤shipping 个河格后的陆地格可达；河格只作通道不可建。
function buildRangeSet(s, p) {
  const fakir = factionOf(p).special === 'range3';
  const maxLand = fakir ? 3 : 1;
  const seen = new Set();
  const reach = new Set();
  const queue = [];
  for (const id of Object.keys(p.buildings)) {
    seen.add(`${id}|0|0`);
    queue.push({ id, land: 0, chain: 0 });
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const nid of adjPlusBridges(s, p, cur.id)) {
      const h = s.hexes[nid];
      if (h.terrain === 'river') {
        // 河格仅作船运通道（连续河格数 ≤ shipping），不可建
        if (cur.chain + 1 <= p.shipping) pushState(nid, cur.land, cur.chain + 1);
      } else if (cur.land + 1 <= maxLand) {
        if (h.owner === null) reach.add(nid);
        pushState(nid, cur.land + 1, 0);
      }
    }
  }
  return reach;

  // pushState BFS 去重入队
  function pushState(id, land, chain) {
    const key = `${id}|${land}|${chain}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ id, land, chain });
  }
}

// adjPlusBridges 邻格 + 自有桥对岸
function adjPlusBridges(s, p, id) {
  const out = [...ADJACENCY[id]];
  for (const br of s.bridges) {
    if (br.owner !== p.seat) continue;
    if (br.a === id) out.push(br.b);
    if (br.b === id) out.push(br.a);
  }
  return out;
}

// townEdges 城镇连接边：直接邻接 + 自有桥 +（美人鱼）河格连接
function townEdges(s, p) {
  const own = Object.keys(p.buildings);
  const edges = {};
  for (const id of own) edges[id] = new Set();
  for (const id of own) {
    for (const nid of ADJACENCY[id]) {
      if (p.buildings[nid]) edges[id].add(nid);
    }
    for (const br of s.bridges) {
      if (br.owner !== p.seat) continue;
      if (br.a === id && p.buildings[br.b]) edges[id].add(br.b);
      if (br.b === id && p.buildings[br.a]) edges[id].add(br.a);
    }
  }
  if (factionOf(p).special === 'shipTown') addShippingEdges(p, edges);
  return edges;
}

// addShippingEdges 美人鱼：单个河格作连接点——与同一河格相邻的己方建筑
// 互相连通（官方 connect 语义，jsnell towns.pm check_mermaid_river_connection_town；
// 与船运等级无关）
function addShippingEdges(p, edges) {
  for (const h of HEXES) {
    if (h.terrain !== 'river') continue;
    const adjOwn = ADJACENCY[h.id].filter((id) => p.buildings[id]);
    for (const a of adjOwn) {
      for (const b of adjOwn) {
        if (a !== b) edges[a].add(b);
      }
    }
  }
}

// townGroups 连通分量（每组 = hexId 数组）
function townGroups(s, p) {
  const edges = townEdges(s, p);
  const own = Object.keys(p.buildings);
  const seen = new Set();
  const groups = [];
  for (const id of own) {
    if (seen.has(id)) continue;
    const group = [];
    const queue = [id];
    seen.add(id);
    while (queue.length) {
      const cur = queue.shift();
      group.push(cur);
      for (const nid of edges[cur]) {
        if (!seen.has(nid)) { seen.add(nid); queue.push(nid); }
      }
    }
    groups.push(group);
  }
  return groups;
}

// checkTowns 建镇检测：城镇值 ≥7 且 ≥4 座建筑（SA 双计）的连通组 → +VP 并记录（每组仅一次）
function checkTowns(s, seat) {
  const p = s.players[seat];
  for (const group of townGroups(s, p)) {
    const key = [...group].sort().join('|');
    if (p.towns.includes(key)) continue;
    const value = group.reduce((a, id) => a + BUILDINGS[p.buildings[id]].town, 0);
    // SA 计 2 座建筑（官方）
    const count = group.reduce((a, id) => a + (p.buildings[id] === 'SA' ? 2 : 1), 0);
    if (value >= TOWN_THRESHOLD && count >= TOWN_MIN_BUILDINGS) {
      p.towns.push(key);
      p.vp += TOWN_VP;
      log(s, seat, 'tm.log.town', { n: p.name, hexes: group.length });
    }
  }
}

// —— 费用计算 ——

// spadesNeeded 挖到家园地形所需铲数（巨人 1 铲 = 2 步）
function spadesNeeded(p, terrain) {
  const d = wheelDist(terrain, homeTerrain(p));
  return factionOf(p).special === 'digDouble' ? Math.ceil(d / 2) : d;
}

// buildCost 建民居总费用：铲（存货优先）+ 民居造价；coinDig = 炼金以币代工
function buildCost(s, p, hex, coinDig) {
  const spades = spadesNeeded(p, s.hexes[hex].terrain);
  const fromStore = Math.min(p.spades, spades);
  const rem = spades - fromStore;
  const cost = { coins: BUILDINGS.D.cost.coins, workers: BUILDINGS.D.cost.workers, spades };
  if (rem > 0) {
    if (coinDig && factionOf(p).special === 'coinSpade') cost.coins += rem;
    else cost.workers += rem * SPADE_WORKERS;
  }
  return cost;
}

// canAffordBuild 建民居支付能力
function canAffordBuild(s, p, hex, coinDig) {
  const c = buildCost(s, p, hex, coinDig);
  return p.coins >= c.coins && p.workers >= c.workers;
}

// tpVariant 交易站变体：邻接他人建筑 = 本地 TP（便宜低能），否则远程 TP2
function tpVariant(s, hexId) {
  const enemyAdj = ADJACENCY[hexId].some((nid) => {
    const h = s.hexes[nid];
    return h.owner !== null && h.bld;
  });
  return enemyAdj ? 'TP' : 'TP2';
}

// freeFavorTiles 未被任何玩家持有的恩惠板块
function freeFavorTiles(s) {
  const held = new Set(s.players.flatMap((q) => q.favor));
  return FAVOR_TILES.filter((f) => !held.has(f.id));
}

// —— 收入与回合流转 ——

// incomeOf 某玩家本轮收入（建筑 + 奖励板块 + 恩惠 + 回合板块）
function incomeOf(s, p) {
  const g = { coins: 0, workers: 0, priests: 0, powerGain: 0 };
  for (const hex of Object.keys(p.buildings)) {
    const inc = BUILDINGS[p.buildings[hex]].income;
    g.coins += inc.coins || 0;
    g.workers += inc.workers || 0;
    g.priests += inc.priests || 0;
  }
  if (p.bonus !== null) addIncome(g, BONUS_TILES[p.bonus].income);
  for (const fid of p.favor) addIncome(g, FAVOR_TILES.find((f) => f.id === fid).income);
  addIncome(g, s.roundTiles[s.round - 1].income);
  return g;
}

// addIncome 收入累加
function addIncome(g, inc) {
  g.coins += inc.coins || 0;
  g.workers += inc.workers || 0;
  g.priests += inc.priests || 0;
  g.powerGain += inc.powerGain || 0;
}

// startRound 开轮：全员收入、重置轮内状态、按 pass 顺序定行动顺位
function startRound(s, r) {
  s.round = r;
  for (const p of s.players) {
    grant(s, p, incomeOf(s, p));
    p.passed = false;
    p.chaosUsed = false;
  }
  s.powerActions = POWER_ACTIONS.map(() => null);
  s.turnOrder = r === 1 ? s.players.map((p) => p.seat) : s.passOrder.slice();
  s.passOrder = [];
  s.phase = { kind: PH_ACT, cur: s.turnOrder[0] };
  log(s, -1, 'tm.log.round', { r });
}

// advanceTurn 轮到下一个未 pass 的玩家；全部 pass 则进入回合末
function advanceTurn(s) {
  const order = s.turnOrder;
  for (let i = 1; i <= order.length; i++) {
    const seat = order[(order.indexOf(s.phase.cur) + i) % order.length];
    if (!s.players[seat].passed) {
      s.phase = { kind: PH_ACT, cur: seat };
      return;
    }
  }
  endRound(s);
}

// pushPending 压入待决微阶段并切换到 resolve
function pushPending(s, item) {
  s.pending.push(item);
  s.phase = { kind: PH_RESOLVE, cur: item.seat };
}

// afterAction 行动后：有 pending 先解决，否则推进回合
function afterAction(s) {
  if (s.pending.length > 0) {
    s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
  } else {
    advanceTurn(s);
  }
}

// endRound 回合末：回合板块邪教结算（choice 逐人选择），随后 finishRound
function endRound(s) {
  const tile = s.roundTiles[s.round - 1];
  if (tile.cultEnd === 'choice') {
    for (const seat of s.turnOrder) {
      const p = s.players[seat];
      if (CULT_TRACKS.some((tr) => p.cult[tr] < CULT_TOP)) {
        s.pending.push({ seat, kind: 'cultChoice', amount: 1 });
      }
    }
    if (s.pending.length > 0) {
      s.roundEnding = true;
      s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
      return;
    }
  } else {
    for (const p of s.players) advanceCult(s, p, tile.cultEnd, 1);
  }
  finishRound(s);
}

// finishRound 回合收尾：第 6 轮终局计分，否则开下一轮
function finishRound(s) {
  s.pending = [];
  s.roundEnding = false;
  if (s.round >= ROUNDS) {
    finalScoring(s);
    s.gameOver = true;
    s.phase = { kind: PH_OVER };
    log(s, -1, 'tm.log.gameEnd', {});
  } else {
    startRound(s, s.round + 1);
  }
}

// finalScoring 终局：四轨名次分（并列取高名次）+ 锁死祭司每枚 1 VP
function finalScoring(s) {
  for (const p of s.players) {
    p.finalCult = {};
    p.finalPriestVp = lockedPriests(p);
    p.vp += p.finalPriestVp;
  }
  for (const tr of CULT_TRACKS) {
    const ranked = s.players.slice().sort((a, b) => b.cult[tr] - a.cult[tr]);
    let rank = 0;
    let prev = -1;
    ranked.forEach((p, i) => {
      if (p.cult[tr] !== prev) { rank = i + 1; prev = p.cult[tr]; }
      if (rank <= 3) {
        p.finalCult[tr] = CULT_RANK_VP[rank - 1];
        p.vp += CULT_RANK_VP[rank - 1];
      }
    });
  }
}

// —— 开局 ——

// newPlayer 从座位信息建玩家初态
function newPlayer(seat, info) {
  return {
    seat, name: info.name, isAI: !!info.isAI, color: info.color,
    faction: null, coins: START.coins, workers: START.workers, priests: START.priests,
    vp: START.vp, power: { ...START.power }, spades: 0, shipping: 0,
    buildings: {}, cult: { fire: 0, water: 0, earth: 0, air: 0 },
    priestsOnCult: { fire: 0, water: 0, earth: 0, air: 0 },
    favor: [], bonus: null, passed: false, chaosUsed: false, towns: [],
  };
}

// initialState 开局：座位 → 选派系 → 蛇形放 2 民居 → 第 1 轮
export function initialState(setup) {
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: setup.seats.length,
    round: 0,
    gameOver: false,
    phase: { kind: PH_FACTION, cur: 0 },
    players: setup.seats.map((info, i) => newPlayer(i, info)),
    hexes: {},
    bridges: [],
    takenFactions: [],
    bonusAvail: BONUS_TILES.map(() => true),
    powerActions: POWER_ACTIONS.map(() => null),
    roundTiles: [],
    turnOrder: [], passOrder: [],
    pending: [], roundEnding: false,
    log: [],
  };
  for (const h of HEXES) s.hexes[h.id] = { terrain: h.terrain, owner: null, bld: null };
  // 回合板块：8 选 6 洗牌排序
  s.roundTiles = shuffle(s, ROUND_TILES.map((t) => t)).slice(0, ROUNDS);
  log(s, -1, 'tm.log.start', { n: s.n });
  return s;
}

// placeIdxToSeat 蛇形放置顺序（前 n 正序、后 n 逆序）
function placeIdxToSeat(s, idx) {
  return idx < s.n ? idx : 2 * s.n - 1 - idx;
}

// assignBonus 放置完毕后随机分配互异奖励板块
function assignBonus(s) {
  const order = shuffle(s, BONUS_TILES.map((b) => b.id));
  s.players.forEach((p, i) => {
    p.bonus = order[i];
    s.bonusAvail[order[i]] = false;
  });
}

// —— legalActions ——

export function legalActions(state) {
  const s = state;
  switch (s.phase.kind) {
    case PH_FACTION: return legalFaction(s);
    case PH_PLACE: return legalPlace(s);
    case PH_ACT: return legalAct(s);
    case PH_RESOLVE: return legalResolve(s);
    default: return [];
  }
}

// legalFaction 未被选走的派系
function legalFaction(s) {
  return FACTIONS_ALL.filter((f) => !s.takenFactions.includes(f.id))
    .map((f) => ({ kind: 'faction', faction: f.id }));
}

// legalPlace 本家园地形的空格
function legalPlace(s) {
  const p = s.players[placeIdxToSeat(s, s.phase.idx)];
  return HEXES
    .filter((h) => h.terrain === homeTerrain(p) && s.hexes[h.id].owner === null)
    .map((h) => ({ kind: 'placeDwelling', hex: h.id }));
}

// legalAct 主行动枚举
function legalAct(s) {
  const p = s.players[s.phase.cur];
  const acts = [];
  for (const hex of buildRangeSet(s, p)) {
    // 民居配件数上限 7：建满后不可再新建（升级链不受此限）
    if (builtCount(p, ['D']) < BLD_CAP.D && canAffordBuild(s, p, hex, false)) acts.push({ kind: 'build', hex });
    if (builtCount(p, ['D']) < BLD_CAP.D && canAffordBuild(s, p, hex, true) && spadesNeeded(p, s.hexes[hex].terrain) > p.spades) {
      acts.push({ kind: 'build', hex, coinDig: true });
    }
  }
  pushUpgradeActions(s, p, acts);
  for (const tr of CULT_TRACKS) {
    if (p.priests >= 1 && p.cult[tr] < CULT_TOP) acts.push({ kind: 'priestSend', track: tr });
  }
  POWER_ACTIONS.forEach((pa, i) => {
    if (s.powerActions[i] === null && p.power.iii >= pa.power) acts.push({ kind: 'powerAction', slot: i });
  });
  for (let k = 1; k * 2 <= p.power.ii; k++) acts.push({ kind: 'burn', pairs: k });
  if (p.shipping < SHIPPING_MAX && afford(p, SHIPPING_COST)) acts.push({ kind: 'shipping' });
  pushBridgeActions(s, p, acts);
  pushChaosAction(s, p, acts);
  for (const b of passableBonus(s, p)) acts.push({ kind: 'pass', bonus: b });
  return acts;
}

// pushUpgradeActions 升级枚举。官方建筑配件数上限：民居 7 / 交易站 6 / 神殿 3 / 要塞 1 / 圣所 1
const BLD_CAP = { D: 7, TP: 6, TE: 3, SH: 1, SA: 1 };
function pushUpgradeActions(s, p, acts) {
  const favors = freeFavorTiles(s);
  for (const [hex, cur] of Object.entries(p.buildings)) {
    for (const to of chainOf(cur)) {
      const key = to === 'TP' ? tpVariant(s, hex) : to;
      // TP2 与 TP 共享交易站配件数
      const cnt = key === 'TP2' ? builtCount(p, ['TP', 'TP2']) : builtCount(p, [key]);
      if (cnt >= BLD_CAP[key]) continue;
      if (!afford(p, BUILDINGS[key].cost)) continue;
      if (to === 'TE' || to === 'SA') {
        for (const f of favors) acts.push({ kind: 'upgrade', hex, to, favor: f.id });
      } else {
        acts.push({ kind: 'upgrade', hex, to });
      }
    }
  }
}

// pushBridgeActions 造桥：官方 29 对桥位 × 任一端有己方建筑。
// 每派系全局限 3 座、每对至多 1 座（jsnell command_bridge 语义）
function pushBridgeActions(s, p, acts) {
  const cost = bridgeCostFor(p);
  if (!afford(p, cost)) return;
  if (s.bridges.filter((br) => br.owner === p.seat).length >= BRIDGE_MAX) return;
  for (const [a, b] of BRIDGE_PAIRS) {
    if (s.bridges.some((br) => (br.a === a && br.b === b) || (br.a === b && br.b === a))) continue;
    if (p.buildings[a] || p.buildings[b]) acts.push({ kind: 'bridge', a, b });
  }
}

// bridgeCostFor 桥费：标准 2 币 + 1 祭司；工程师 2 工人
// （官方 ACTE 开放行动的简化，innate 无需 SH）
function bridgeCostFor(p) {
  return factionOf(p).special === 'cheapBridge' ? { workers: 2 } : BRIDGE_COST;
}

// pushChaosAction 混沌法师：付 1 祭司任一轨迹推进 2（每轮 1 次，需 SH）
function pushChaosAction(s, p, acts) {
  if (factionOf(p).special !== 'chaosCult' || !hasSH(p) || p.chaosUsed || p.priests < 1) return;
  for (const tr of CULT_TRACKS) {
    if (p.cult[tr] < CULT_TOP) acts.push({ kind: 'chaosCult', track: tr });
  }
}

// passableBonus pass 可选奖励板块：可用池 + 自己当前持有的
function passableBonus(s, p) {
  const out = BONUS_TILES.filter((b) => s.bonusAvail[b.id]).map((b) => b.id);
  if (p.bonus !== null && !out.includes(p.bonus)) out.push(p.bonus);
  return out;
}

// legalResolve 微阶段：邪教轨迹选择 / 女巫免费民居
function legalResolve(s) {
  const item = s.pending[0];
  const p = s.players[item.seat];
  if (item.kind === 'cultChoice') {
    return CULT_TRACKS.filter((tr) => p.cult[tr] < CULT_TOP)
      .map((tr) => ({ kind: 'cultChoice', track: tr }));
  }
  return HEXES
    .filter((h) => h.terrain === 'forest' && s.hexes[h.id].owner === null)
    .map((h) => ({ kind: 'witchDwelling', hex: h.id }))
    .concat([{ kind: 'witchSkip' }]);
}

// —— apply ——

export function apply(state, action) {
  const s = clone(state);
  switch (s.phase.kind) {
    case PH_FACTION: applyFaction(s, action); break;
    case PH_PLACE: applyPlace(s, action); break;
    case PH_ACT: applyAct(s, action); break;
    case PH_RESOLVE: applyResolve(s, action); break;
    default: break;
  }
  return s;
}

// applyFaction 选派系
function applyFaction(s, a) {
  if (!FACTIONS_ALL.some((f) => f.id === a.faction) || s.takenFactions.includes(a.faction)) return;
  const p = s.players[s.phase.cur];
  p.faction = a.faction;
  s.takenFactions.push(a.faction);
  log(s, p.seat, 'tm.log.faction', { n: p.name, f: factionOf(p).name });
  if (s.takenFactions.length >= s.n) {
    s.phase = { kind: PH_PLACE, idx: 0 }; // 奖励板块在放置完毕时统一分配
  } else {
    s.phase = { kind: PH_FACTION, cur: s.phase.cur + 1 };
  }
}

// applyPlace 蛇形放初始民居（免挖免费）
function applyPlace(s, a) {
  const seat = placeIdxToSeat(s, s.phase.idx);
  const p = s.players[seat];
  const h = s.hexes[a.hex];
  if (!h || h.owner !== null || h.terrain !== homeTerrain(p)) return;
  h.owner = seat;
  h.bld = 'D';
  p.buildings[a.hex] = 'D';
  log(s, seat, 'tm.log.place', { n: p.name, hex: a.hex });
  if (s.phase.idx + 1 >= 2 * s.n) {
    assignBonus(s);
    startRound(s, 1);
  } else {
    s.phase = { kind: PH_PLACE, idx: s.phase.idx + 1 };
  }
}

// applyAct 主行动分发
function applyAct(s, a) {
  const p = s.players[s.phase.cur];
  switch (a.kind) {
    case 'build': applyBuild(s, p, a); break;
    case 'upgrade': applyUpgrade(s, p, a); break;
    case 'priestSend': applyPriestSend(s, p, a); break;
    case 'powerAction': applyPowerAction(s, p, a); break;
    case 'burn': applyBurn(s, p, a); break;
    case 'shipping': applyShipping(s, p, a); break;
    case 'bridge': applyBridge(s, p, a); break;
    case 'chaosCult': applyChaosCult(s, p, a); break;
    case 'pass': applyPass(s, p, a); break;
    default: return;
  }
}

// applyBuild 改造并建民居
function applyBuild(s, p, a) {
  // 合法性：目标在建造范围内、空格、非河流
  if (!buildRangeSet(s, p).has(a.hex) || s.hexes[a.hex].owner !== null || s.hexes[a.hex].terrain === 'river') return;
  const c = buildCost(s, p, a.hex, a.coinDig);
  if (!canAffordBuild(s, p, a.hex, a.coinDig)) return;
  const spadesUsed = c.spades;
  pay(p, { coins: c.coins, workers: c.workers });
  p.spades -= Math.min(p.spades, spadesNeeded(p, s.hexes[a.hex].terrain));
  // 半身人：每挖 1 铲得 1 金币
  if (factionOf(p).special === 'digCoin') p.coins += spadesUsed;
  s.hexes[a.hex].terrain = homeTerrain(p);
  s.hexes[a.hex].owner = p.seat;
  s.hexes[a.hex].bld = 'D';
  p.buildings[a.hex] = 'D';
  // 游牧民：免挖建于家园地形得 1 工人
  if (factionOf(p).special === 'homeWorker' && spadesUsed === 0) p.workers += 1;
  log(s, p.seat, 'tm.log.build', { n: p.name, hex: a.hex });
  leechFrom(s, a.hex, 'D', p.seat);
  checkTowns(s, p.seat);
  afterAction(s);
}

// applyUpgrade 升级（D→TP/SH、TP→TE、TE→SA；TE/SA 选恩惠）
function applyUpgrade(s, p, a) {
  const cur = p.buildings[a.hex];
  if (!cur || !chainOf(cur).includes(a.to)) return;
  const key = a.to === 'TP' ? tpVariant(s, a.hex) : a.to;
  const cost = BUILDINGS[key].cost;
  if (!afford(p, cost)) return;
  const favor = a.to === 'TE' || a.to === 'SA' ? FAVOR_TILES.find((f) => f.id === a.favor) : null;
  if ((a.to === 'TE' || a.to === 'SA') && (!favor || freeFavorTiles(s).every((f) => f.id !== favor.id))) return;
  pay(p, cost);
  s.hexes[a.hex].bld = key;
  p.buildings[a.hex] = key;
  if (favor) {
    p.favor.push(favor.id);
    advanceCult(s, p, favor.track, favor.advance);
  }
  log(s, p.seat, 'tm.log.upgrade', { n: p.name, hex: a.hex, b: BLD_NAME[key] });
  leechFrom(s, a.hex, key, p.seat);
  checkTowns(s, p.seat);
  // 邪教徒专长：每次建造/升级后邪教推进 1（需 SH）
  if (factionOf(p).special === 'cultBuild' && hasSH(p) && CULT_TRACKS.some((tr) => p.cult[tr] < CULT_TOP)) {
    pushPending(s, { seat: p.seat, kind: 'cultChoice', amount: 1 });
  }
  // 女巫专长：升级后可免费在空森林格放民居（需 SH）
  if (factionOf(p).special === 'witchDwelling' && hasSH(p) && HEXES.some((h) => h.terrain === 'forest' && s.hexes[h.id].owner === null)) {
    pushPending(s, { seat: p.seat, kind: 'witchDwelling' });
  }
  afterAction(s);
}

// applyPriestSend 发祭司上邪教轨（锁死至终局）
function applyPriestSend(s, p, a) {
  if (p.priests < 1 || p.cult[a.track] >= CULT_TOP) return;
  p.priests -= 1;
  p.priestsOnCult[a.track] += 1;
  advanceCult(s, p, a.track, 1);
  log(s, p.seat, 'tm.log.priestSend', { n: p.name, track: CULT_NAME[a.track] });
  afterAction(s);
}

// applyPowerAction 能量动作（先到先得，占槽）
function applyPowerAction(s, p, a) {
  const pa = POWER_ACTIONS[a.slot];
  if (!pa || s.powerActions[a.slot] !== null || p.power.iii < pa.power) return;
  s.powerActions[a.slot] = p.seat;
  payPower(p, pa.power);
  grant(s, p, pa.gain);
  log(s, p.seat, 'tm.log.powerAction', { n: p.name, power: pa.power });
  afterAction(s);
}

// applyBurn 燃烧能量：碗 II 每 2 枚换碗 III 1 枚
function applyBurn(s, p, a) {
  if (a.pairs < 1 || p.power.ii < a.pairs * 2) return;
  p.power.ii -= a.pairs * 2;
  p.power.iii += a.pairs;
  log(s, p.seat, 'tm.log.burn', { n: p.name, pairs: a.pairs });
  afterAction(s);
}

// applyShipping 升船运
function applyShipping(s, p, a) {
  if (p.shipping >= SHIPPING_MAX || !afford(p, SHIPPING_COST)) return;
  pay(p, SHIPPING_COST);
  p.shipping += 1;
  log(s, p.seat, 'tm.log.shipping', { n: p.name, v: p.shipping });
  afterAction(s);
}

// applyBridge 造桥（私有，连接桥位两端）
function applyBridge(s, p, a) {
  const cost = bridgeCostFor(p);
  const taken = s.bridges.some((br) => (br.a === a.a && br.b === a.b) || (br.a === a.b && br.b === a.a));
  const valid = BRIDGE_PAIRS.some(([x, y]) => (x === a.a && y === a.b) || (x === a.b && y === a.a))
    && !taken
    && (p.buildings[a.a] || p.buildings[a.b])
    && s.bridges.filter((br) => br.owner === p.seat).length < BRIDGE_MAX;
  if (!valid || !afford(p, cost)) return;
  pay(p, cost);
  s.bridges.push({ a: a.a, b: a.b, owner: p.seat });
  log(s, p.seat, 'tm.log.bridge', { n: p.name, a: a.a, b: a.b });
  checkTowns(s, p.seat);
  afterAction(s);
}

// applyChaosCult 混沌法师轮内一次：祭司换双格推进
function applyChaosCult(s, p, a) {
  if (p.chaosUsed || p.priests < 1 || p.cult[a.track] >= CULT_TOP) return;
  p.priests -= 1;
  p.chaosUsed = true;
  advanceCult(s, p, a.track, 2);
  log(s, p.seat, 'tm.log.chaos', { n: p.name, track: CULT_NAME[a.track] });
  afterAction(s);
}

// applyPass 过牌：换奖励板块，进 pass 顺位
function applyPass(s, p, a) {
  if (!passableBonus(s, p).includes(a.bonus)) return;
  if (p.bonus !== null) s.bonusAvail[p.bonus] = true;
  s.bonusAvail[a.bonus] = false;
  p.bonus = a.bonus;
  p.passed = true;
  s.passOrder.push(p.seat);
  log(s, p.seat, 'tm.log.pass', { n: p.name });
  if (s.players.every((q) => q.passed)) endRound(s);
  else advanceTurn(s);
}

// applyResolve 微阶段处理：处理队首后无余项则回到主流程
function applyResolve(s, a) {
  const item = s.pending[0];
  const p = s.players[item.seat];
  if (item.kind === 'cultChoice') {
    if (p.cult[a.track] < CULT_TOP) {
      advanceCult(s, p, a.track, item.amount);
      log(s, item.seat, 'tm.log.cult', { n: p.name, track: CULT_NAME[a.track], steps: item.amount });
    }
  } else if (item.kind === 'witchDwelling' && a.kind === 'witchDwelling') {
    const h = s.hexes[a.hex];
    if (h && h.owner === null && h.terrain === 'forest') {
      h.owner = item.seat;
      h.bld = 'D';
      p.buildings[a.hex] = 'D';
      log(s, item.seat, 'tm.log.witch', { n: p.name, hex: a.hex });
      leechFrom(s, a.hex, 'D', item.seat);
      checkTowns(s, item.seat);
    }
  }
  s.pending.shift();
  if (s.pending.length > 0) {
    s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
  } else if (s.roundEnding) {
    finishRound(s);
  } else {
    afterAction(s);
  }
}

// —— 框架契约 ——

export function currentPlayer(s) {
  switch (s.phase.kind) {
    case PH_FACTION: return s.phase.cur;
    case PH_PLACE: return placeIdxToSeat(s, s.phase.idx);
    case PH_ACT: return s.phase.cur;
    case PH_RESOLVE: return s.pending[0] ? s.pending[0].seat : 0;
    default: return 0;
  }
}

export function isGameOver(s) { return !!s.gameOver; }

// score 终局计分（含明细 breakdown，键为 i18n key）
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.vp,
    breakdown: [
      ['tm.score.base', START.vp],
      ['tm.score.towns', p.towns.length * TOWN_VP],
      ['tm.score.cult', Object.values(p.finalCult || {}).reduce((a, b) => a + b, 0)],
      ['tm.score.priests', p.finalPriestVp || 0],
    ],
  }));
}

// —— 供渲染/自测导出的内部工具 ——
export { buildRangeSet, townGroups, spadesNeeded, buildCost, tpVariant, incomeOf, finalScoring };
const BLD_NAME = { D: { zh: '民居', en: 'Dwelling' }, TP: { zh: '交易站', en: 'Trading Post' }, TP2: { zh: '交易站', en: 'Trading Post' }, TE: { zh: '神殿', en: 'Temple' }, SH: { zh: '要塞', en: 'Stronghold' }, SA: { zh: '圣所', en: 'Sanctuary' } };
const CULT_NAME = {
  fire: { zh: '火', en: 'Fire' }, water: { zh: '水', en: 'Water' },
  earth: { zh: '土', en: 'Earth' }, air: { zh: '风', en: 'Air' },
};
export { BLD_NAME, CULT_NAME };
