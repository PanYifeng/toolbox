// 璀璨宝石引擎：拿宝石 / 预留 / 购卡、贵族来访、15 分终局。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 官方规则（基础版 2-4 人）：每回合三选一——拿 3 颗不同色宝石（供应不足
// 3 色时降为可得色数）/ 拿 2 颗同色宝石（该色供应 ≥4）/ 预留 1 张牌
// （明牌或牌堆顶盲留）并得 1 金（金尽则无）；或支付宝石（金为万能色）
// 购买明牌 / 预留牌。发展卡永久提供产出色折扣（ Bonus ）。
// 回合末结算顺序：手牌宝石（含金）>10 先弃至 10 → 满足在场贵族需求者
// 强制来访 +3 分（同时满足多位择一，每回合至多 1 位）→ 轮转。
// 有人 ≥15 分后各补一回合（机会均等），VP 最高者胜，平分看购卡数少者。

import {
  GEMS, CARDS, NOBLES, GEMS_BY_PLAYERS, GOLD_SUPPLY, NOBLES_IN_PLAY,
  MARKET_SLOTS, RESERVE_CAP, GEM_CAP, VP_TO_END,
} from './data-cards.js';

// GEM_NAMES 宝石色名（日志/渲染用双语对象，避免引擎 import i18n）
export const GEM_NAMES = GEMS.map((g, i) => ({
  zh: ['白', '蓝', '绿', '红', '黑'][i],
  en: ['white', 'blue', 'green', 'red', 'black'][i],
}));
const GOLD_NAME = { zh: '金', en: 'gold' };

// —— 基础工具 ——

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffle 洗牌副本（Fisher-Yates，用 state 随机源，返回新数组）
function shuffled(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
}

// gemNames 色索引列表转双语名（日志参数）
function gemNames(colors) {
  const zh = colors.map((c) => GEM_NAMES[c].zh).join('/');
  const en = colors.map((c) => GEM_NAMES[c].en).join('/');
  return { zh, en };
}

// combos 组合枚举（k 个不同元素，输入数组元素互异）
function combos(arr, k) {
  if (k <= 0) return [[]];
  if (arr.length < k) return [];
  const out = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combos(arr.slice(i + 1), k - 1)) out.push([arr[i], ...rest]);
  }
  return out;
}

// —— 卡牌查询 ——

// needFor 购卡净需求（成本 − 产出色折扣，负值截 0）
function needFor(p, cid) {
  return CARDS[cid][3].map((c, i) => Math.max(0, c - p.bonus[i]));
}

// canAfford 是否买得起（缺口用金补）
function canAfford(p, cid) {
  const need = needFor(p, cid);
  let goldNeed = 0;
  for (let c = 0; c < 5; c++) goldNeed += Math.max(0, need[c] - p.gems[c]);
  return goldNeed <= p.gold;
}

// payFor 支付购卡（先付本色宝石，缺口扣金；支付的宝石/金回到供应堆）
function payFor(p, supply, cid) {
  const need = needFor(p, cid);
  for (let c = 0; c < 5; c++) {
    const g = Math.min(p.gems[c], need[c]);
    p.gems[c] -= g;
    supply.gems[c] += g;
    const goldUse = need[c] - g;
    p.gold -= goldUse;
    supply.gold += goldUse;
  }
}

// gemTotal 手牌宝石总数（含金）
function gemTotal(p) {
  return p.gold + p.gems.reduce((a, b) => a + b, 0);
}

// qualifies 是否满足某贵族需求
function qualifies(p, j) {
  return NOBLES[j].every((need, c) => p.bonus[c] >= need);
}

// takeFromMarket 取走明牌并即时从牌堆补位（堆尽留空槽）
function takeFromMarket(s, tier, slot) {
  const cid = s.market[tier][slot];
  s.market[tier][slot] = s.decks[tier].length > 0 ? s.decks[tier].shift() : null;
  return cid;
}

// —— initialState / 查询 ——

// initialState 开局：按人数配宝石、洗三阶牌堆各翻 4 张、翻 4 位贵族
export function initialState(setup) {
  const seats = setup.seats;
  const n = seats.length;
  const perGem = GEMS_BY_PLAYERS[n];
  const byTier = [[], [], []];
  CARDS.forEach((c, i) => byTier[c[0] - 1].push(i));
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n,
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      gems: [0, 0, 0, 0, 0], gold: 0, bonus: [0, 0, 0, 0, 0],
      vp: 0, bought: 0, reserved: [], nobles: [],
    })),
    supply: { gems: [perGem, perGem, perGem, perGem, perGem], gold: GOLD_SUPPLY },
    market: [[], [], []],
    decks: [[], [], []],
    nobles: [],
    cur: 0,
    pending: null,
    endTrigger: null,
    log: [],
    gameOver: false,
  };
  for (let t = 0; t < 3; t++) {
    s.decks[t] = shuffled(s, byTier[t]);
    for (let k = 0; k < MARKET_SLOTS; k++) {
      s.market[t].push(s.decks[t].length > 0 ? s.decks[t].shift() : null);
    }
  }
  s.nobles = shuffled(s, NOBLES.map((_, i) => i)).slice(0, NOBLES_IN_PLAY);
  log(s, -1, 'sl.log.start', { n });
  return s;
}

// currentPlayer 当前待决策座位（弃宝石/择贵族微阶段也精确到人）
export function currentPlayer(s) {
  return s.pending ? s.pending.seat : s.cur;
}

// isGameOver 是否终局
export function isGameOver(s) {
  return s.gameOver;
}

// score 终局计分：VP 为总分；平分时官方以购卡数少者为胜（明示于明细）
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.vp,
    breakdown: [
      ['sl.score.vp', p.vp],
      ['sl.score.nobles', p.nobles.length],
      ['sl.score.cards', p.bought],
    ],
  }));
}

// —— legalActions ——

// legalActions 唯一合法性来源：微阶段（弃宝石 / 择贵族）优先，其次主行动
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.pending && s.pending.kind === 'discard') return discardActions(s);
  if (s.pending && s.pending.kind === 'noble') {
    return s.pending.options.map((idx) => ({ kind: 'noble', idx }));
  }
  return mainActions(s);
}

// discardActions 弃宝石选项：手上有量的每色宝石 + 金（每次弃 1 颗）
function discardActions(s) {
  const p = s.players[s.pending.seat];
  const acts = [];
  for (let c = 0; c < 5; c++) {
    if (p.gems[c] > 0) acts.push({ kind: 'discard', color: c });
  }
  if (p.gold > 0) acts.push({ kind: 'discard', color: -1 });
  return acts;
}

// mainActions 主行动枚举：拿宝石 / 预留 / 购卡；无任何行动时兜底过牌
function mainActions(s) {
  const acts = [];
  const p = s.players[s.cur];
  const avail = [];
  for (let c = 0; c < 5; c++) if (s.supply.gems[c] > 0) avail.push(c);
  // 拿 3 颗不同色（可得色不足 3 时降为可得色数，官方供应受限规则）
  for (const colors of combos(avail, Math.min(3, avail.length))) {
    acts.push({ kind: 'take3', colors });
  }
  // 拿 2 颗同色（该色供应 ≥4）
  for (const c of avail) {
    if (s.supply.gems[c] >= 4) acts.push({ kind: 'take2', color: c });
  }
  // 预留（手上 ≤3 张；牌堆顶盲留或任一明牌）
  if (p.reserved.length < RESERVE_CAP) {
    for (let t = 0; t < 3; t++) {
      if (s.decks[t].length > 0) acts.push({ kind: 'reserve', tier: t, slot: -1 });
      for (let k = 0; k < MARKET_SLOTS; k++) {
        if (s.market[t][k] !== null) acts.push({ kind: 'reserve', tier: t, slot: k });
      }
    }
  }
  // 购买：买得起的明牌与预留牌
  for (let t = 0; t < 3; t++) {
    for (let k = 0; k < MARKET_SLOTS; k++) {
      const cid = s.market[t][k];
      if (cid !== null && canAfford(p, cid)) acts.push({ kind: 'buy', tier: t, slot: k });
    }
  }
  p.reserved.forEach((cid, i) => {
    if (canAfford(p, cid)) acts.push({ kind: 'buy', reserved: i });
  });
  // 官方无主动过牌；仅在牌堆尽 + 预留满 + 无宝石可拿 + 买不起时兜底
  if (acts.length === 0) acts.push({ kind: 'pass' });
  return acts;
}

// —— apply ——

// apply 执行行动：微阶段优先分发，主行动后走回合末结算链
export function apply(state, action) {
  const s = clone(state);
  if (s.pending && s.pending.kind === 'discard') applyDiscard(s, action);
  else if (s.pending && s.pending.kind === 'noble') applyNoblePick(s, action);
  else applyMain(s, action);
  return s;
}

// applyMain 主行动执行 + 进入回合末结算
function applyMain(s, a) {
  const p = s.players[s.cur];
  if (a.kind === 'take3') {
    for (const c of a.colors) { s.supply.gems[c] -= 1; p.gems[c] += 1; }
    log(s, s.cur, 'sl.log.take3', { n: p.name, c: gemNames(a.colors) });
  } else if (a.kind === 'take2') {
    s.supply.gems[a.color] -= 2;
    p.gems[a.color] += 2;
    log(s, s.cur, 'sl.log.take2', { n: p.name, c: GEM_NAMES[a.color] });
  } else if (a.kind === 'reserve') {
    const cid = a.slot < 0 ? s.decks[a.tier].shift() : takeFromMarket(s, a.tier, a.slot);
    p.reserved.push(cid);
    if (s.supply.gold > 0) { s.supply.gold -= 1; p.gold += 1; }
    log(s, s.cur, a.slot < 0 ? 'sl.log.reserveBlind' : 'sl.log.reserve', {
      n: p.name, t: a.tier + 1,
    });
  } else if (a.kind === 'buy') {
    const cid = a.reserved !== undefined ? p.reserved.splice(a.reserved, 1)[0]
      : takeFromMarket(s, a.tier, a.slot);
    payFor(p, s.supply, cid);
    p.bonus[CARDS[cid][2]] += 1;
    p.vp += CARDS[cid][1];
    p.bought += 1;
    log(s, s.cur, 'sl.log.buy', {
      n: p.name, t: CARDS[cid][0], c: GEM_NAMES[CARDS[cid][2]], v: CARDS[cid][1],
    });
  } else if (a.kind === 'pass') {
    log(s, s.cur, 'sl.log.pass', { n: p.name });
  }
  endOfTurn(s);
}

// applyDiscard 弃 1 颗宝石（回供应堆）；回到 ≤10 后进入贵族结算
function applyDiscard(s, a) {
  const p = s.players[s.pending.seat];
  const name = a.color === -1 ? GOLD_NAME : GEM_NAMES[a.color];
  if (a.color === -1) { p.gold -= 1; s.supply.gold += 1; }
  else { p.gems[a.color] -= 1; s.supply.gems[a.color] += 1; }
  log(s, p.seat, 'sl.log.discard', { n: p.name, c: name });
  if (gemTotal(p) <= GEM_CAP) {
    s.pending = null;
    nobleCheck(s);
  }
}

// applyNoblePick 择一位贵族来访（每回合至多 1 位）
function applyNoblePick(s, a) {
  s.pending = null;
  visitNoble(s, a.idx);
  finishTurn(s);
}

// endOfTurn 回合末结算链：先查 10 颗上限，再查贵族
function endOfTurn(s) {
  const p = s.players[s.cur];
  if (gemTotal(p) > GEM_CAP) {
    s.pending = { kind: 'discard', seat: s.cur };
    return;
  }
  nobleCheck(s);
}

// nobleCheck 贵族来访：满足 1 位自动来访，多位进入择一微阶段
function nobleCheck(s) {
  const p = s.players[s.cur];
  const options = s.nobles.filter((j) => qualifies(p, j));
  if (options.length === 0) { finishTurn(s); return; }
  if (options.length === 1) {
    visitNoble(s, options[0]);
    finishTurn(s);
    return;
  }
  s.pending = { kind: 'noble', seat: s.cur, options };
}

// visitNoble 贵族来访：+3 分并移出在场行列
function visitNoble(s, j) {
  const p = s.players[s.cur];
  p.nobles.push(j);
  p.vp += 3;
  s.nobles = s.nobles.filter((x) => x !== j);
  log(s, s.cur, 'sl.log.noble', { n: p.name });
}

// finishTurn 轮转换席：≥15 分记录触发者；轮回到触发者时终局
function finishTurn(s) {
  const p = s.players[s.cur];
  if (p.vp >= VP_TO_END && s.endTrigger === null) {
    s.endTrigger = s.cur;
    log(s, s.cur, 'sl.log.reachEnd', { n: p.name, v: p.vp });
  }
  const next = (s.cur + 1) % s.n;
  if (s.endTrigger !== null && next === s.endTrigger) {
    s.gameOver = true;
    log(s, -1, 'sl.log.gameEnd', {});
    return;
  }
  s.cur = next;
}
