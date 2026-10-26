// 方舟动物园引擎：终局卡选择 → 行动卡驱动的主循环（动物/协会/建造/卡牌/赞助 5 类行动）。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 核心机制：行动卡用后降 1 档、其余 +1 档（超 5 进 break 区）、他人可付 2 币借用
// break 区卡（按 1 档执行后归位）、牌堆内 5 张 X 卡集齐触发打烊结算（收入 + 归还 + 手牌上限 8）、
// 市场左侧免费右侧递增、声望轨 1-5 有入场费、终局 = 任一玩家声望 5 且保护点达门槛或牌堆二次耗尽。

import { ANIMALS, SPONSORS, PROJECTS, ENDGAMES, VARIANTS, BOARD, RULES } from './data-cards.js';

// —— 数据索引 ——
const A_BY = {};
for (const a of ANIMALS) A_BY[a.i] = a;
const S_BY = {};
for (const x of SPONSORS) S_BY[x.i] = x;
// 繁育项目槽位补 n（开源数据缺阈值：按槽位序 1/2/3 对递增）
const P_BY = {};
for (const p of PROJECTS) {
  P_BY[p.i] = p;
  p.slots.forEach((sl, i) => { if (!sl.n) sl.n = i + 1; });
}
const E_BY = {};
for (const e of ENDGAMES) E_BY[e.i] = e;

export const animalOf = (id) => A_BY[id] || null;
export const sponsorOf = (id) => S_BY[id] || null;
export const projectOf = (id) => P_BY[id] || null;
export const endgameOf = (id) => E_BY[id] || null;

// CATS 五类行动卡（固定顺序 = 起始档位 1-5）
const CATS = ['animals', 'association', 'build', 'cards', 'sponsors'];
const CAT_NAME = {
  animals: { zh: '动物', en: 'Animals' }, association: { zh: '协会', en: 'Association' },
  build: { zh: '建造', en: 'Build' }, cards: { zh: '卡牌', en: 'Cards' },
  sponsors: { zh: '赞助', en: 'Sponsors' },
};
export const catName = (c) => CAT_NAME[c];
export const encIds = ['std5', 'std3', 'std2', 'pz', 'rh0', 'rh1', 'av'];

// ENC_META 围栏元数据（容量/基础地形/是否标准栏）
const ENC_META = {
  std5: { cap: 5, rk: 1, wt: 1, std: true }, std3: { cap: 3, rk: 1, wt: 0, std: true },
  std2: { cap: 2, rk: 0, wt: 1, std: true }, pz: { cap: 5, rk: 0, wt: 0, std: false },
  rh0: { cap: 6, rk: 1, wt: 0, std: false }, rh1: { cap: 6, rk: 1, wt: 0, std: false },
  av: { cap: 5, rk: 1, wt: 0, std: false },
};
export const encMeta = (id) => ENC_META[id];

// —— 基础工具 ——
function clone(s) { return JSON.parse(JSON.stringify(s)); }

function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

function shuffled(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function log(s, seat, key, args) { s.log.push({ seat, key, args }); }

// —— 玩家派生量（不入 state，按需计算）——

// effEffects 汇总协会卡的持续效果 + 在岗行动卡变体修正
export function effEffects(p) {
  const out = {
    income: 0, anDisc: 0, bDisc: 0, cDraw: 0, cTake: 0, aMoney: 0,
    endA: 0, endAUni: 0, ignT: [], endATag: [], spMoney: false, terrainBuild: false,
  };
  for (const id of p.sponsors) {
    for (const e of (S_BY[id] ? S_BY[id].eff : [])) {
      if (e.k === 'income') out.income += e.v;
      else if (e.k === 'anDisc') out.anDisc += e.v;
      else if (e.k === 'bDisc') out.bDisc += e.v;
      else if (e.k === 'cDraw') out.cDraw += e.v;
      else if (e.k === 'cTake') out.cTake += e.v;
      else if (e.k === 'aMoney') out.aMoney += e.v;
      else if (e.k === 'endA') out.endA += e.v;
      else if (e.k === 'endAUni') out.endAUni += e.v;
      else if (e.k === 'ignT') out.ignT.push(e.v);
      else if (e.k === 'endATag') out.endATag.push(e.v);
    }
  }
  for (const c of p.cards) {
    if (c.broken || !c.variant) continue;
    const def = (VARIANTS[c.cat] || []).find((v) => v.id === c.variant);
    if (!def) continue;
    if (def.eff === 'anDisc2') out.anDisc += 2;
    else if (def.eff === 'buildDisc3') out.bDisc += 3;
    else if (def.eff === 'extraDraw1') out.cDraw += 1;
    else if (def.eff === 'extraTake1') out.cTake += 1;
    else if (def.eff === 'assocMoney3') out.aMoney += 3;
    else if (def.eff === 'spMoney1') out.spMoney = true;
    else if (def.eff === 'ignReq1') out.ignT.push('*');
    else if (def.eff === 'terrainBuild') out.terrainBuild = true;
  }
  return out;
}

// zooAnimals 玩家全园动物（围栏存 id，此处解析为卡数据；含围栏信息）
export function zooAnimals(p) {
  const out = [];
  for (const id of encIds) {
    for (const cid of p.enc[id].animals) out.push({ a: A_BY[cid], id: cid, enc: id });
  }
  return out;
}

// tagCounts 动物标签计数（可选计入待放置动物自身）
export function tagCounts(p, extra) {
  const m = {};
  let total = 0;
  const add = (a) => { total++; for (const t of a.tg) m[t] = (m[t] || 0) + 1; };
  for (const { a } of zooAnimals(p)) add(a);
  if (extra) add(extra);
  m.__total = total;
  return m;
}

// reqCheck 需求图标核验：返回 {ok, missing:[{key,need,have}]}
// ignT 协会卡各忽略 1 个对应图标，'*' 忽略任意 1 个（行动卡变体）
export function reqCheck(p, req, extra) {
  const eff = effEffects(p);
  const counts = tagCounts(p, extra);
  const need = {};
  for (const r of req) need[r] = (need[r] || 0) + 1;
  let wild = eff.ignT.filter((t) => t === '*').length;
  const missing = [];
  for (const key of Object.keys(need)) {
    let have;
    if (key === 'Science') have = p.universities;
    else if (key === 'Partner_Zoo') have = p.partnerZoos;
    else if (key === 'AnimalsII') have = Math.floor(counts.__total / 2);
    else if (key === 'Reputation') have = p.rep >= RULES.repReq ? 1 : 0;
    else if (key === 'Appeal') have = p.appeal >= RULES.appealReq ? 1 : 0;
    else if (key === 'SponsorsII') have = p.sponsors.length + 1;
    else have = counts[key] || 0;
    let n = need[key];
    if (eff.ignT.includes(key)) n -= 1;
    else if (wild > 0 && key !== 'Reputation' && key !== 'Appeal' && key !== 'SponsorsII') { n -= 1; wild--; }
    if (n > have) missing.push({ key, need: n, have });
  }
  return { ok: missing.length === 0, missing };
}

// effTerrain 围栏有效地形（基础 + 协会加建，各封顶 2）
export function effTerrain(encId, enc) {
  const m = ENC_META[encId];
  return { rk: Math.min(2, m.rk + (enc.pr || 0)), wt: Math.min(2, m.wt + (enc.pw || 0)) };
}

// encUsed 围栏已占用空间（标准栏按体型，特殊栏按 se.n）
export function encUsed(encId, enc) {
  let n = 0;
  for (const cid of enc.animals) {
    const a = A_BY[cid];
    n += ENC_META[encId].std ? a.s : (a.se ? a.se.n : 0);
  }
  return n;
}

// canPlaceAnimal 单点合法性：返回 {ok, reason, ...}（reason 供 UI 白话提示）
export function canPlaceAnimal(p, cardId, encId, spent, budget) {
  const a = A_BY[cardId];
  const enc = p.enc[encId];
  if (!a || !enc || !enc.on) return { ok: false, reason: 'notBuilt' };
  if (p.enc[encId].animals.includes(cardId) || zooAnimals(p).some(({ id }) => id === cardId)) {
    return { ok: false, reason: 'dupSpecies' };
  }
  const meta = ENC_META[encId];
  const spec = a.se ? a.se.t : null;
  if (meta.std) {
    if (a.pz) return { ok: false, reason: 'petOnly' };
  } else if (encId === 'pz') {
    if (!a.pz) return { ok: false, reason: 'pzPetsOnly' };
  } else if (spec !== (encId === 'av' ? 'AV' : 'RH')) return { ok: false, reason: 'specialMismatch' };
  const used = encUsed(encId, enc);
  const cost = meta.std ? a.s : (a.se ? a.se.n : 0);
  if (used + cost > meta.cap) return { ok: false, reason: 'noSpace' };
  const t = effTerrain(encId, enc);
  if (a.rk > t.rk) return { ok: false, reason: 'needRock', need: a.rk, have: t.rk };
  if (a.wt > t.wt) return { ok: false, reason: 'needWater', need: a.wt, have: t.wt };
  const price = Math.max(0, a.p - effEffects(p).anDisc);
  if (spent + price > budget) return { ok: false, reason: 'noBudget', need: price, left: budget - spent };
  const rq = reqCheck(p, a.req, a);
  if (!rq.ok) return { ok: false, reason: 'req', missing: rq.missing };
  return { ok: true, price };
}

// cardName 日志用卡名（动物/协会通用）
export function cardName(id) {
  if (A_BY[id]) return A_BY[id].n;
  if (S_BY[id]) return S_BY[id].n;
  return { zh: 'X', en: 'X' };
}

// —— 摸牌 / X 卡 / 打烊 ——

// drawCard 摸 1 张：X 卡入计数（第 5 张触发打烊）；堆尽一次重洗弃牌，二次置死；
// X 亡锁兜底——堆空且重洗后仅剩 breakX 而第 5 张 X 无法凑齐时，置 finalRound 结束对局
function drawCard(s, depth = 0) {
  if (depth > 50) return null; // 防御：连续 X 超常（不可达，保护栈）
  if (!s.deck.length) {
    if (s.deckDead) return null;
    if (s.reshuffles === 0) {
      s.deck = shuffled(s, [...s.discard, ...Array(s.breakX).fill('X')]);
      s.discard = [];
      s.reshuffles = 1;
      log(s, -1, 'an.log.reshuffle', { n: s.deck.length });
    } else {
      s.deckDead = true;
      return null;
    }
  }
  const c = s.deck.shift();
  if (c === 'X') {
    s.breakX++;
    if (s.breakX >= RULES.xCards) breakEvent(s);
    return drawCard(s, depth + 1);
  }
  return c;
}

// breakEvent 打烊（第 5 张 X）：全体收入 + break 卡归还 + X 洗回牌堆 + 手牌超额入弃牌队列
function breakEvent(s) {
  for (const p of s.players) {
    const eff = effEffects(p);
    const inc = RULES.breakIncome + p.kiosk * 2 + p.rest * 4 + eff.income;
    p.money += inc;
    log(s, p.seat, 'an.log.income', { n: inc });
    for (const c of p.cards) if (c.broken) { c.broken = false; c.str = 1; }
    if (p.hand.length > RULES.handMax) s.discardQueue.push(p.seat);
  }
  s.deck = shuffled(s, [...s.deck, ...Array(s.breakX).fill('X')]);
  s.breakX = 0;
  log(s, -1, 'an.log.breakEvent', {});
}

// takeFromMarket 从市场拿牌：付位置费 → 左移 → 右端补摸
function takeFromMarket(s, seat, pos) {
  const p = s.players[seat];
  const id = s.market[pos];
  if (!id || pos >= RULES.marketOpen || p.money < pos) return false;
  p.money -= pos;
  p.hand.push(id);
  for (let i = pos; i < 7; i++) s.market[i] = s.market[i + 1];
  s.market[7] = drawCard(s);
  log(s, seat, 'an.log.take', { card: cardName(id), pos });
  return true;
}

// moveRep 声望移动：升档付入场费（付不起停在原地），降档免费
function moveRep(s, p, delta) {
  if (delta > 0) {
    while (delta > 0) {
      const next = p.rep + 1;
      if (next > 5) break;
      const fee = RULES.repCost[next];
      if (p.money < fee) break;
      p.money -= fee;
      p.rep = next;
      delta--;
      log(s, p.seat, 'an.log.repUp', { n: p.rep, c: fee });
    }
  } else if (delta < 0) {
    p.rep = Math.max(0, p.rep + delta);
    log(s, p.seat, 'an.log.repDown', { rep: p.rep });
  }
}

// attachTerrain 协会地形效果：自动挂到第一个有容量的已建围栏（确定性）
function attachTerrain(s, p, kind) {
  const isRock = kind.startsWith('rk');
  const add = kind.endsWith('2') ? 2 : 1;
  for (const id of encIds) {
    const enc = p.enc[id];
    if (!enc.on) continue;
    const t = effTerrain(id, enc);
    if (isRock && t.rk + add <= 2) { enc.pr += add; log(s, p.seat, 'an.log.terr', { enc: encShow(id), n: add, kind: { zh: '岩石', en: 'rock' } }); return; }
    if (!isRock && t.wt + add <= 2) { enc.pw += add; log(s, p.seat, 'an.log.terr', { enc: encShow(id), n: add, kind: { zh: '水域', en: 'water' } }); return; }
  }
}

// —— 项目 / 终局卡计量 ——

// projCount 项目/终局卡计量值
export function projCount(p, tag) {
  if (tag === 'ALL_ANIMALS') return zooAnimals(p).length;
  if (tag === 'ALL_CONTINENTS') {
    const set = new Set();
    for (const { a } of zooAnimals(p)) {
      for (const c of ['Africa', 'Americas', 'Asia', 'Europe', 'Australia']) if (a.tg.includes(c)) set.add(c);
    }
    return set.size;
  }
  if (tag === 'Size2') return zooAnimals(p).filter(({ a }) => a.s <= 2).length;
  if (tag === 'Size4') return zooAnimals(p).filter(({ a }) => a.s >= 4).length;
  if (tag === 'Water') return zooAnimals(p).filter(({ a }) => a.wt > 0).length;
  if (tag === 'Rock') return zooAnimals(p).filter(({ a }) => a.rk > 0).length;
  if (tag === 'Science') return p.universities;
  if (tag === 'Sponsors') return p.sponsors.length;
  return zooAnimals(p).filter(({ a }) => a.tg.includes(tag)).length;
}

// breedPairs 繁育对数：各围栏内同类标签雌雄配对数求和
export function breedPairs(p, tag) {
  let n = 0;
  for (const id of encIds) {
    let m = 0; let f = 0;
    for (const cid of p.enc[id].animals) {
      const a = A_BY[cid];
      if (!a.tg.includes(tag)) continue;
      if (a.g === 'M') m++; else f++;
    }
    n += Math.min(m, f);
  }
  return n;
}

// projFulfilled 项目已达最高档阈值（-1 = 未达第 1 档）
export function projFulfilled(p, proj) {
  const cnt = proj.breed ? breedPairs(p, proj.tag) : projCount(p, proj.tag);
  let best = -1;
  for (const sl of proj.slots) if (cnt >= sl.n) best = Math.max(best, sl.n);
  return best;
}

// egMetric 终局卡计量
export function egMetric(p, metric) {
  if (metric === 'size4') return projCount(p, 'Size4');
  if (metric === 'size2') return projCount(p, 'Size2');
  if (metric === 'universities') return p.universities;
  if (metric === 'buildings') return p.kiosk + p.rest;
  if (metric === 'projects') return p.projects.length;
  if (metric === 'continents') return projCount(p, 'ALL_CONTINENTS');
  if (metric === 'appeal10') return Math.floor(p.appeal / 10);
  if (metric === 'sponsors') return p.sponsors.length;
  if (metric === 'rocks' || metric === 'waters') {
    let n = 0;
    for (const id of encIds) { const t = effTerrain(id, p.enc[id]); n += metric === 'rocks' ? t.rk : t.wt; }
    return n;
  }
  return 0;
}

// egBonusCP 终局卡奖励 CP（仅计入终局门槛，不进终局分）
export function egBonusCP(p) {
  const eg = p.endgame ? E_BY[p.endgame] : null;
  if (!eg) return 0;
  const v = egMetric(p, eg.metric);
  let cp = 0;
  for (const [n, c] of eg.slots) if (v >= n) cp = Math.max(cp, c);
  return cp;
}

// finalAppeal 终局魅力（含员工 +1/人 与协会终局加成）
export function finalAppeal(p) {
  const eff = effEffects(p);
  let a = p.appeal + p.workers + eff.endA + p.universities * eff.endAUni;
  for (const tag of eff.endATag) a += projCount(p, tag);
  return a;
}

// —— 开局 ——

function mkPlayer(seat, x) {
  const enc = {};
  for (const id of encIds) enc[id] = { on: false, animals: [], pr: 0, pw: 0 };
  return {
    seat, name: x.name, isAI: x.isAI, color: x.color,
    money: RULES.startMoney, rep: 1, appeal: 0, cp: 0,
    hand: [], sponsors: [], projects: [], endgame: null,
    cards: CATS.map((cat, i) => ({ cat, str: i + 1, broken: false, variant: null })),
    enc, kiosk: 0, rest: 0, partnerZoos: 0, universities: 0, workers: 0,
  };
}

// initialState 开局：洗 192 主牌堆 + 项目堆 + 终局卡堆，发 4 手牌，随机替换 1 张一档变体
export function initialState(setup) {
  const seats = setup.seats;
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    players: seats.map((x, i) => mkPlayer(i, x)),
    deck: [], discard: [], breakX: 0, reshuffles: 0, deckDead: false,
    market: [null, null, null, null, null, null, null, null],
    projects: [], projectDeck: [],
    endgameDeck: [], endgameOffer: [],
    turn: 0, phase: 'endgame', sub: null, using: null, turnCount: 0,
    discardQueue: [], finalRound: false, gameOver: false, log: [],
  };
  const ids = [...ANIMALS.map((a) => a.i), ...SPONSORS.map((x) => x.i)];
  s.deck = shuffled(s, [...ids, ...Array(RULES.xCards).fill('X')]);
  s.projectDeck = shuffled(s, PROJECTS.map((p) => p.i));
  s.endgameDeck = shuffled(s, ENDGAMES.map((e) => e.i));
  for (const p of s.players) {
    const ci = Math.floor(rnd(s) * 5);
    const vars = VARIANTS[CATS[ci]];
    p.cards[ci].variant = vars[Math.floor(rnd(s) * vars.length)].id;
  }
  for (let i = 0; i < RULES.startHand; i++) {
    for (const p of s.players) { const c = drawCard(s); if (c) p.hand.push(c); }
  }
  for (let i = 0; i < 8; i++) s.market[i] = drawCard(s);
  for (let i = 0; i < 4 && s.projectDeck.length; i++) s.projects.push(s.projectDeck.shift());
  s.endgameOffer = [s.endgameDeck.shift(), s.endgameDeck.shift()];
  log(s, -1, 'an.log.start', { n: seats.length });
  return s;
}

// usedCard 当前行动使用中的卡（自家或借用）
function usedCard(s) {
  if (!s.using) return null;
  return s.players[s.using.seat].cards[s.using.ci] || null;
}

// —— 合法性 ——

function legalPlace(s) {
  const p = s.players[s.turn];
  const out = [];
  for (const id of [...new Set(p.hand)]) {
    if (!A_BY[id]) continue;
    for (const e of encIds) {
      if (canPlaceAnimal(p, id, e, s.sub.spent, s.sub.budget).ok) out.push({ kind: 'place', card: id, enc: e });
    }
  }
  out.push({ kind: 'finish' });
  return out;
}

function legalTake(s) {
  const p = s.players[s.turn];
  const out = [];
  for (let i = 0; i < RULES.marketOpen; i++) {
    if (s.market[i] && p.money >= i) out.push({ kind: 'take', pos: i });
  }
  out.push({ kind: 'finish' });
  return out;
}

function legalSponsor(s) {
  const p = s.players[s.turn];
  const out = [];
  for (const id of [...new Set(p.hand)]) {
    if (!S_BY[id]) continue;
    if (p.money < S_BY[id].c) continue;
    if (!reqCheck(p, S_BY[id].req).ok) continue;
    out.push({ kind: 'playSponsor', card: id });
  }
  out.push({ kind: 'finish' });
  return out;
}

// legalBuild 建造选项（str = 使用中建造卡的档位；不修改 state）
function legalBuild(p, str) {
  const eff = effEffects(p);
  const out = [];
  const push = (what, minStr, cost, ok) => {
    const real = Math.max(0, cost - eff.bDisc);
    if (ok && str >= minStr && p.money >= real) out.push({ kind: 'build', what, cost: real });
  };
  push('std5', 4, 10, !p.enc.std5.on);
  push('std3', 2, 6, !p.enc.std3.on);
  push('std2', 1, 4, !p.enc.std2.on);
  push('pz', 2, 8, !p.enc.pz.on);
  push('rh0', 3, 12, !p.enc.rh0.on);
  push('rh1', 3, 12, !p.enc.rh1.on);
  push('av', 4, 12, !p.enc.av.on);
  push('kiosk', 2, 5, p.kiosk < BOARD.shops[0].cap);
  push('rest', 3, 10, p.rest < BOARD.shops[1].cap);
  return out;
}

function legalAssoc(s) {
  const p = s.players[s.turn];
  const out = [
    { kind: 'assoc', opt: 'money' }, { kind: 'assoc', opt: 'pz' },
    { kind: 'assoc', opt: 'uni' }, { kind: 'assoc', opt: 'worker' },
  ];
  if (p.rep < 5 && p.money >= RULES.repCost[p.rep + 1]) out.push({ kind: 'assoc', opt: 'rep' });
  for (let i = 0; i < s.projects.length; i++) {
    if (projFulfilled(p, P_BY[s.projects[i]]) >= 1) out.push({ kind: 'assoc', opt: 'project', proj: i });
  }
  return out;
}

// legalActions 唯一合法性来源
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.phase === 'endgame') return [{ kind: 'pickEndgame', idx: 0 }, { kind: 'pickEndgame', idx: 1 }];
  if (s.phase === 'discard') {
    const p = s.players[s.sub.seat];
    const out = p.hand.length > RULES.handMax
      ? [...new Set(p.hand)].map((c) => ({ kind: 'discardCard', card: c })) : [];
    out.push({ kind: 'finish' });
    return out;
  }
  if (s.phase === 'place') return legalPlace(s);
  if (s.phase === 'take') return legalTake(s);
  if (s.phase === 'sponsor') return legalSponsor(s);
  if (s.phase === 'assoc') return legalAssoc(s);
  if (s.phase === 'build') {
    const c = usedCard(s);
    return legalBuild(s.players[s.turn], c ? c.str : 1);
  }
  // action 主阶段：自家在岗行动卡（建造无选项时不可选）+ 任意 break 区借用
  const out = [];
  const me = s.players[s.turn];
  s.players.forEach((p, owner) => {
    p.cards.forEach((c, ci) => {
      if (c.broken) out.push({ kind: 'useBreak', owner, card: ci });
      else if (owner === s.turn) {
        const ok = c.cat !== 'build' || legalBuild(me, c.str).length > 0;
        if (ok) out.push({ kind: 'act', card: ci });
      }
    });
  });
  return out;
}

// —— 行动结算 ——

// applyPlace 放置 1 只动物（子阶段可连续放置直到预算用尽或主动结束）
function applyPlace(s, a) {
  const p = s.players[s.turn];
  const r = canPlaceAnimal(p, a.card, a.enc, s.sub.spent, s.sub.budget);
  if (!r.ok) return;
  p.hand = p.hand.filter((x) => x !== a.card);
  p.enc[a.enc].animals.push(a.card);
  p.appeal += A_BY[a.card].a;
  p.cp += A_BY[a.card].cp;
  s.sub.spent += r.price;
  log(s, s.turn, 'an.log.place', { animal: A_BY[a.card].n, enc: encShow(a.enc) });
  if (A_BY[a.card].rep) moveRep(s, p, A_BY[a.card].rep);
  if (!legalPlace(s).some((x) => x.kind === 'place')) endAction(s);
}

// applyAssoc 协会行动（资金/合作动物园/大学/声望/员工/项目）
function applyAssoc(s, a) {
  const p = s.players[s.turn];
  const str = usedCard(s) ? usedCard(s).str : 1;
  const eff = effEffects(p);
  if (a.opt === 'money') {
    const n = RULES.assocMoney * str + eff.aMoney;
    p.money += n;
    log(s, s.turn, 'an.log.assocMoney', { n });
  } else if (a.opt === 'pz') { p.partnerZoos++; log(s, s.turn, 'an.log.assocPz', {}); }
  else if (a.opt === 'uni') { p.universities++; log(s, s.turn, 'an.log.assocUni', {}); }
  else if (a.opt === 'worker') { p.workers++; log(s, s.turn, 'an.log.assocWorker', {}); }
  else if (a.opt === 'rep') { moveRep(s, p, 1); }
  else if (a.opt === 'project') {
    const pid = s.projects[a.proj];
    const proj = P_BY[pid];
    const bestN = projFulfilled(p, proj);
    const best = proj.slots.filter((sl) => sl.n <= bestN).sort((x, y) => y.n - x.n)[0];
    p.projects.push(pid);
    s.projects[a.proj] = s.projectDeck.shift() || null;
    s.projects = s.projects.filter((x) => x);
    if (best) {
      p.cp += best.cp;
      if (best.rep) moveRep(s, p, best.rep);
      log(s, s.turn, 'an.log.project', { project: proj.n, cp: best.cp });
    }
  }
  endAction(s);
}

// applyBuild 建造（标准栏/特殊栏/小卖部/餐厅）
function applyBuild(s, a) {
  const p = s.players[s.turn];
  const eff = effEffects(p);
  p.money -= a.cost;
  if (a.what === 'kiosk') { p.kiosk++; p.appeal += 1; }
  else if (a.what === 'rest') { p.rest++; p.appeal += 2; }
  else {
    p.enc[a.what].on = true;
    if (eff.terrainBuild && a.what.startsWith('std')) {
      p.enc[a.what].pr += 1;
      p.enc[a.what].pw += 1;
    }
  }
  log(s, s.turn, 'an.log.build', { what: buildName(a.what), cost: a.cost });
  endAction(s);
}

// applyCards 卡牌行动：摸牌 → 进入拿牌子阶段
function applyCards(s) {
  const p = s.players[s.turn];
  const c = usedCard(s);
  const str = c ? c.str : 1;
  const eff = effEffects(p);
  const draws = 1 + Math.ceil(str / 2) + eff.cDraw;
  let got = 0;
  for (let i = 0; i < draws; i++) { const x = drawCard(s); if (x) { p.hand.push(x); got++; } }
  log(s, s.turn, 'an.log.draw', { n: got });
  const takes = Math.floor(str / 2) + eff.cTake;
  if (takes > 0) {
    s.phase = 'take';
    s.sub = { kind: 'take', left: takes };
  } else endAction(s);
}

// applyAct 主阶段选卡入口（自家在岗行动卡）
function applyAct(s, a) {
  const p = s.players[s.turn];
  const c = p.cards[a.card];
  if (!c || c.broken) return;
  s.using = { seat: s.turn, ci: a.card };
  log(s, s.turn, 'an.log.act', { card: CAT_NAME[c.cat], str: c.str });
  if (c.cat === 'animals') {
    s.phase = 'place';
    s.sub = { kind: 'place', budget: RULES.animalBudget * c.str, spent: 0 };
    if (!legalPlace(s).some((x) => x.kind === 'place')) endAction(s);
  } else if (c.cat === 'association') {
    s.phase = 'assoc';
    s.sub = { kind: 'assoc' };
  } else if (c.cat === 'build') {
    s.phase = 'build';
    s.sub = { kind: 'build' };
  } else if (c.cat === 'cards') applyCards(s);
  else if (c.cat === 'sponsors') {
    const eff = effEffects(p);
    const n = (RULES.sponsorMoney + (eff.spMoney ? 1 : 0)) * c.str;
    p.money += n;
    log(s, s.turn, 'an.log.sponsorMoney', { n });
    s.phase = 'sponsor';
    s.sub = { kind: 'sponsor' };
    if (!legalSponsor(s).some((x) => x.kind === 'playSponsor')) endAction(s);
  }
}

// applyUseBreak 借用 break 区卡：付持有人 2 币，按 1 档执行，卡归还持有人 1 档
function applyUseBreak(s, a) {
  const owner = s.players[a.owner];
  const c = owner.cards[a.card];
  const me = s.players[s.turn];
  if (!c || !c.broken) return;
  if (a.owner !== s.turn) {
    if (me.money < RULES.breakFee) return;
    me.money -= RULES.breakFee;
    owner.money += RULES.breakFee;
  }
  log(s, s.turn, 'an.log.useBreak', {
    owner: owner.name, card: CAT_NAME[c.cat], fee: a.owner === s.turn ? 0 : RULES.breakFee,
  });
  c.broken = false;
  c.str = 1;
  s.using = { seat: a.owner, ci: a.card };
  if (c.cat === 'animals') {
    s.phase = 'place';
    s.sub = { kind: 'place', budget: RULES.animalBudget, spent: 0 };
    if (!legalPlace(s).some((x) => x.kind === 'place')) endAction(s);
  } else if (c.cat === 'cards') applyCards(s);
  else if (c.cat === 'sponsors') {
    const eff = effEffects(me);
    me.money += RULES.sponsorMoney + (eff.spMoney ? 1 : 0);
    log(s, s.turn, 'an.log.sponsorMoney', { n: RULES.sponsorMoney + (eff.spMoney ? 1 : 0) });
    s.phase = 'sponsor';
    s.sub = { kind: 'sponsor' };
    if (!legalSponsor(s).some((x) => x.kind === 'playSponsor')) endAction(s);
  } else if (c.cat === 'association') {
    s.phase = 'assoc';
    s.sub = { kind: 'assoc' };
  } else if (c.cat === 'build') {
    s.phase = 'build';
    s.sub = { kind: 'build' };
    if (!legalBuild(me, 1).length) endAction(s);
  }
}

// shiftCards 档位迁移：used 卡降 1 档，其余在岗卡 +1 档（超 5 进 break 区）
function shiftCards(s, p, used) {
  const aloneBefore = p.cards.filter((x) => !x.broken).length === (used ? 1 : 0);
  if (used) used.str = 1;
  for (const c of p.cards) {
    if (c === used || c.broken) continue;
    c.str += 1;
    if (c.str > 5) {
      c.broken = true;
      c.str = 5;
      log(s, p.seat, 'an.log.cardBreak', { card: CAT_NAME[c.cat] });
    }
  }
  // 用掉最后一张在岗卡：break 区全部归还填低档（2-5）
  if (used && aloneBefore && p.cards.some((x) => x.broken)) {
    let slot = 2;
    for (const c of p.cards) {
      if (!c.broken || c === used) continue;
      c.broken = false;
      c.str = Math.min(5, slot++);
      log(s, p.seat, 'an.log.cardReturn', { card: CAT_NAME[c.cat] });
    }
  }
}

// endAction 单次行动收尾：档位迁移 → 终局检查 → 弃牌队列（行动者超额 + 打烊全员）→ 过回合
function endAction(s) {
  const p = s.players[s.turn];
  const using = s.using;
  if (using) {
    if (using.seat === s.turn) shiftCards(s, p, p.cards[using.ci]);
    else shiftCards(s, p, null); // 借用：己方在岗卡整体 +1 档
  }
  s.using = null;
  s.sub = null;
  checkEndgame(s);
  if (p.hand.length > RULES.handMax && !s.discardQueue.includes(s.turn)) s.discardQueue.push(s.turn);
  if (s.discardQueue.length) {
    s.phase = 'discard';
    s.sub = { kind: 'discard', seat: s.discardQueue[0] };
    return;
  }
  nextTurn(s);
}

// checkEndgame 终局触发：声望 5 且保护点达门槛（含终局卡奖励 CP）或牌堆二次耗尽；
// 回合上限兜底（防 AI 死循环：官方对局约 25-35 行动/人，上限 60 留足余量）
function checkEndgame(s) {
  const goal = RULES.cpGoal[s.players.length] || 10;
  for (const q of s.players) {
    if (q.rep >= 5 && q.cp + egBonusCP(q) >= goal && !s.finalRound) {
      s.finalRound = true;
      log(s, -1, 'an.log.endTrigger', { who: q.name });
    }
  }
  if (s.deckDead && !s.finalRound) {
    s.finalRound = true;
    log(s, -1, 'an.log.endTrigger', { who: { zh: '牌堆二次耗尽', en: 'double deck exhaustion' } });
  }
  if (!s.finalRound && s.turnCount >= RULES.maxTurnsPerPlayer * s.players.length) {
    s.finalRound = true;
    log(s, -1, 'an.log.turnLimit', { n: RULES.maxTurnsPerPlayer });
  }
}

// nextTurn 过回合：终局轮走完一圈收束
function nextTurn(s) {
  s.phase = 'action';
  s.turnCount++;
  if (s.finalRound && s.turn === s.players.length - 1) {
    finalize(s);
    return;
  }
  s.turn = (s.turn + 1) % s.players.length;
}

// applyDiscard 弃牌子阶段（打烊后手牌上限 8）
function applyDiscard(s, a) {
  const p = s.players[s.sub.seat];
  if (a.kind === 'discardCard') {
    p.hand = p.hand.filter((x) => x !== a.card);
    s.discard.push(a.card);
    log(s, s.sub.seat, 'an.log.discard', { card: cardName(a.card) });
  }
  if (p.hand.length <= RULES.handMax) {
    s.discardQueue.shift();
    if (s.discardQueue.length) {
      s.sub = { kind: 'discard', seat: s.discardQueue[0] };
    } else {
      s.sub = null;
      nextTurn(s);
    }
  }
}

// applyPickEndgame 开局终局卡二选一
function applyPickEndgame(s, a) {
  const p = s.players[s.turn];
  const pick = s.endgameOffer[a.idx];
  if (!pick) return;
  p.endgame = pick;
  s.endgameDeck.push(s.endgameOffer[1 - a.idx]);
  s.endgameOffer = [];
  log(s, s.turn, 'an.log.endgamePick', { card: E_BY[pick].n });
  if (s.turn === s.players.length - 1) {
    s.phase = 'action';
    s.turn = 0;
  } else {
    s.turn++;
    s.endgameOffer = [s.endgameDeck.shift(), s.endgameDeck.shift()];
  }
}

// applySponsorPlay 打出协会卡：付费用 → 入列 → 即时效果结算（持续效果经 effEffects 生效）
function applySponsorPlay(s, a) {
  const p = s.players[s.turn];
  const sp = S_BY[a.card];
  if (!sp || p.money < sp.c || !reqCheck(p, sp.req).ok) return;
  p.money -= sp.c;
  p.hand = p.hand.filter((x) => x !== a.card);
  p.sponsors.push(a.card);
  p.appeal += sp.ap;
  p.cp += sp.cp;
  if (sp.rep) moveRep(s, p, sp.rep);
  for (const e of sp.eff) {
    if (e.k === 'money') p.money += e.v;
    else if (e.k === 'appeal') p.appeal += e.v;
    else if (e.k === 'draw') { for (let i = 0; i < e.v; i++) { const x = drawCard(s); if (x) p.hand.push(x); } }
    else if (e.k === 'pz') p.partnerZoos += e.v;
    else if (e.k === 'uni') p.universities += e.v;
    else if (e.k === 'staff') p.workers += e.v;
    else if (e.k === 'rep') moveRep(s, p, e.v);
    else if (e.k === 'cp') p.cp += e.v;
    else if (e.k === 'terr') attachTerrain(s, p, e.v);
  }
  log(s, s.turn, 'an.log.sponsorPlay', { card: sp.n, cost: sp.c });
  endAction(s);
}

// apply 纯函数入口：深拷贝 → 派发 → 返回新 state
export function apply(state, action) {
  const s = clone(state);
  const k = action.kind;
  if (k === 'pickEndgame' && s.phase === 'endgame') applyPickEndgame(s, action);
  else if (k === 'act' && s.phase === 'action') applyAct(s, action);
  else if (k === 'useBreak' && s.phase === 'action') applyUseBreak(s, action);
  else if (k === 'place' && s.phase === 'place') applyPlace(s, action);
  else if (k === 'take' && s.phase === 'take') {
    if (takeFromMarket(s, s.turn, action.pos)) {
      s.sub.left--;
      if (s.sub.left <= 0) endAction(s);
    }
  } else if (k === 'assoc' && s.phase === 'assoc') applyAssoc(s, action);
  else if (k === 'build' && s.phase === 'build') applyBuild(s, action);
  else if (k === 'playSponsor' && s.phase === 'sponsor') applySponsorPlay(s, action);
  else if (k === 'discardCard' && s.phase === 'discard') applyDiscard(s, action);
  else if (k === 'finish') applyFinish(s);
  return s;
}

// applyFinish 子阶段收束（放置/拿牌/赞助/弃牌/协会/建造）
function applyFinish(s) {
  if (s.phase === 'discard') {
    applyDiscard(s, { kind: 'noop' });
    return;
  }
  const cats = { place: 'animals', take: 'cards', sponsor: 'sponsors', assoc: 'association', build: 'build' };
  const cat = cats[s.phase];
  if (!cat) return;
  if (s.using && s.using.seat === s.turn && s.players[s.turn].cards[s.using.ci].cat !== cat) return;
  endAction(s);
}

// —— 终局 ——

function finalize(s) {
  s.gameOver = true;
  s.phase = 'over';
  s.sub = null;
  log(s, -1, 'an.log.final', {});
}

export function currentPlayer(s) {
  if (s.phase === 'discard' && s.sub) return s.sub.seat;
  return s.turn;
}
export function isGameOver(s) { return !!s.gameOver; }

// score 结算：总分 = 终局魅力 × 2 − 保护点（终局卡奖励 CP 仅计入门槛不进分）
export function score(s) {
  return s.players.map((p) => {
    const ap = finalAppeal(p);
    return {
      seat: p.seat,
      total: ap * 2 - p.cp,
      breakdown: [
        ['an.bd.appeal', ap],
        ['an.bd.workers', p.workers],
        ['an.bd.cp', p.cp],
        ['an.bd.egcp', egBonusCP(p)],
      ],
    };
  });
}

// encShow 日志用围栏名
export function encShow(id) {
  if (id.startsWith('std')) return { zh: `${id.slice(3)} 空间围栏`, en: `size-${id.slice(3)} enclosure` };
  const names = {
    pz: { zh: '宠物角', en: 'Petting zoo' }, rh0: { zh: '爬行馆一', en: 'Reptile house 1' },
    rh1: { zh: '爬行馆二', en: 'Reptile house 2' }, av: { zh: '大鸟舍', en: 'Aviary' },
  };
  return names[id];
}

function buildName(what) {
  const m = {
    std5: { zh: '5 空间围栏', en: 'size-5 enclosure' }, std3: { zh: '3 空间围栏', en: 'size-3 enclosure' },
    std2: { zh: '2 空间围栏', en: 'size-2 enclosure' }, pz: { zh: '宠物角', en: 'Petting zoo' },
    rh0: { zh: '爬行馆一', en: 'Reptile house 1' }, rh1: { zh: '爬行馆二', en: 'Reptile house 2' },
    av: { zh: '大鸟舍', en: 'Aviary' }, kiosk: { zh: '小卖部', en: 'Kiosk' }, rest: { zh: '餐厅', en: 'Restaurant' },
  };
  return m[what];
}
