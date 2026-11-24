// 大富翁引擎：完整官方规则（40 格标准棋盘、22 地产 + 4 铁路 + 2 公用事业、
// 机会/命运各 16 张、所得税/奢侈税、监狱三种出狱方式、购买/竞拍、房屋与旅馆
// （均匀建造 + 4 房屋规则 + 银行库存限制）、抵押与赎回、玩家间交易、破产与债权人接管。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
//
// 回合流程：掷骰 → 移动 → 结算落地格 → （买地/竞拍/还款等微阶段）→ 玩家经营（建房/交易/抵押）→ 结束回合。
// 掷出同点可再掷一次；连续三次同点直接入狱。负债不足先进入还款微阶段，
// 可变卖资产；净值仍不足则只能宣告破产。

import { SPACES, isOwnable, groupSpaces } from './data-board.js';
import { CHANCE, CHEST } from './data-cards.js';
import {
  ownerOf, ownsAll, canBuild, canSellHouse, canMortgage, canUnmortgage,
  unmortgageCost, buildCost, rentFor, netWorth, ownableOf,
} from './rules.js';

const START_CASH = 1500;      // 起始现金
const GO_SALARY = 200;        // 经过起点工资
const JAIL_FINE = 50;         // 出狱罚金
const JAIL_POS = 10;          // 监狱格
const JAIL_TURNS_MAX = 3;     // 监狱最多尝试次数
const HOUSES_TOTAL = 32;      // 银行房屋库存
const HOTELS_TOTAL = 12;      // 银行旅馆库存
const BOARD_SIZE = 40;
const LOG_CAP = 600;
const AUCTION_STEP = 10;      // 竞拍最小加价
const CARD_DEPTH_MAX = 6;     // 卡牌连锁移动深度保护

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffled 洗牌副本（Fisher-Yates，用 state 随机源）
function shuffled(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// d6 掷一个六面骰
function d6(s) { return 1 + Math.floor(rnd(s) * 6); }

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
}

// —— 开局 ——

// initialState 开局：每人 1500 元站起点，洗好两副牌
export function initialState(setup) {
  const seats = setup.seats;
  const extras = setup.extras || {};
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: seats.length,
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      cash: START_CASH, pos: 0, inJail: false, jailTurns: 0, jailCardIds: [], bankrupt: false,
    })),
    owner: {},       // 格下标 -> 座位
    houses: {},      // 格下标 -> 0..5（5 = 旅馆）
    mortgaged: {},   // 格下标 -> true
    housesLeft: HOUSES_TOTAL,
    hotelsLeft: HOTELS_TOTAL,
    chance: [],      // 机会牌堆（牌 id 数组，头部为下一张）
    chest: [],
    phase: 'roll',   // roll / action / over
    pending: null,   // 微阶段：buy / auction / debt / tradeRespond
    resume: null,    // 还款后待续动作（目前仅监狱第三次出狱移动）
    cur: 0,
    turn: 0,
    doubles: 0,
    rolled: false,
    rollAgain: false,
    dice: null,
    maxRounds: Number.isInteger(extras.maxRounds) ? extras.maxRounds : 0,
    result: null,
    gameOver: false,
    log: [],
  };
  s.chance = shuffled(s, CHANCE.map((c) => c.id));
  s.chest = shuffled(s, CHEST.map((c) => c.id));
  log(s, -1, 'mo.log.start', { n: seats.map((x) => x.name) });
  return s;
}

// —— 查询接口 ——

// currentPlayer 当前待决策座位（微阶段精确到人）
export function currentPlayer(s) {
  if (s.gameOver) return s.cur;
  if (s.pending) return s.pending.kind === 'auction' ? s.pending.turnSeat : s.pending.seat;
  return s.cur;
}

// isGameOver 是否终局
export function isGameOver(s) { return s.gameOver; }

// score 终局分数：净资产（现金 + 地价 + 房屋）
export function score(s) {
  return s.players.map((p) => {
    const worth = p.bankrupt ? 0 : netWorth(s, p.seat);
    const props = ownableOf(s, p.seat).length;
    const houses = ownableOf(s, p.seat).reduce((a, i) => a + (s.houses[i] || 0), 0);
    return {
      seat: p.seat,
      total: worth,
      breakdown: [
        ['mo.score.cash', p.bankrupt ? 0 : p.cash],
        ['mo.score.props', props],
        ['mo.score.houses', houses],
        ['mo.score.net', worth],
      ],
    };
  });
}

// aliveSeats 未破产座位
export function aliveSeats(s) {
  return s.players.filter((p) => !p.bankrupt).map((p) => p.seat);
}

// nextAlive 从 from 起（不含）下一个未破产座位
function nextAlive(s, from) {
  for (let k = 1; k <= s.n; k++) {
    const seat = (from + k) % s.n;
    if (!s.players[seat].bankrupt) return seat;
  }
  return from;
}

// —— legalActions ——

// legalActions 唯一合法性来源
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.pending) return pendingActions(s);
  const seat = s.cur;
  const acts = [];
  if (s.phase === 'roll') pushRollActions(s, seat, acts);
  else acts.push({ kind: 'endTurn' });
  pushManageActions(s, seat, acts);
  // 交易动作无法穷举（对手 + 资产组合），不进枚举；UI 组包后经 validateAction 深校验
  return acts;
}

// pushRollActions 掷骰与出狱选项
function pushRollActions(s, seat, acts) {
  const p = s.players[seat];
  acts.push({ kind: 'roll' });
  if (!p.inJail) return;
  if (p.cash >= JAIL_FINE) acts.push({ kind: 'payJailFine' });
  if (p.jailCardIds.length > 0) acts.push({ kind: 'useJailCard' });
}

// manageSeat 经营动作的作用座位：负债微阶段由负债者本人变现
function manageSeat(s) {
  return s.pending && s.pending.kind === 'debt' ? s.pending.seat : s.cur;
}

// pushManageActions 经营动作：建房 / 拆屋 / 抵押 / 赎回
function pushManageActions(s, seat, acts) {
  for (const i of ownableOf(s, seat)) {
    if (canBuild(s, seat, i)) acts.push({ kind: 'build', i });
    if (canSellHouse(s, seat, i)) acts.push({ kind: 'sellHouse', i });
    if (canMortgage(s, seat, i)) acts.push({ kind: 'mortgage', i });
  }
  for (const i of ownableOf(s, seat)) {
    if (s.mortgaged[i] && canUnmortgage(s, seat, i, s.players[seat].cash)) {
      acts.push({ kind: 'unmortgage', i });
    }
  }
}

// pendingActions 微阶段动作枚举
function pendingActions(s) {
  const pd = s.pending;
  if (pd.kind === 'buy') {
    const p = s.players[pd.seat];
    const acts = [{ kind: 'declineBuy' }];
    if (p.cash >= SPACES[pd.i].price) acts.unshift({ kind: 'buy', i: pd.i });
    return acts;
  }
  if (pd.kind === 'auction') return auctionActions(s);
  if (pd.kind === 'debt') return debtActions(s);
  if (pd.kind === 'tradeRespond') return [{ kind: 'tradeAccept' }, { kind: 'tradeDecline' }];
  return [];
}

// auctionActions 竞拍动作：固定加价阶梯（10/20/50/100 及全额）或退出
function auctionActions(s) {
  const pd = s.pending;
  const p = s.players[pd.turnSeat];
  const ladder = [10, 20, 50, 100, 200, 500];
  const amounts = new Set();
  for (const step of ladder) {
    const v = pd.high + step;
    if (v <= p.cash && v % AUCTION_STEP === 0) amounts.add(v);
  }
  if (p.cash > pd.high) amounts.add(p.cash);
  const acts = [...amounts].sort((a, b) => a - b).map((amount) => ({ kind: 'bid', amount }));
  acts.push({ kind: 'bidPass' });
  return acts;
}

// debtActions 还款微阶段：变现 + 还款 + 破产
function debtActions(s) {
  const pd = s.pending;
  const seat = pd.seat;
  const acts = [];
  if (s.players[seat].cash >= pd.amount) acts.push({ kind: 'payDebt' });
  for (const i of ownableOf(s, seat)) {
    if (canSellHouse(s, seat, i)) acts.push({ kind: 'sellHouse', i });
    if (canMortgage(s, seat, i)) acts.push({ kind: 'mortgage', i });
  }
  acts.push({ kind: 'bankrupt' });
  return acts;
}

// —— 行动深校验（交易等无法穷举的动作由 apply 前统一复核）——

// validateAction 供框架/联机层做提交前校验：已知种类走枚举比对，交易走明细校验
export function validateAction(s, a) {
  if (!a || typeof a.kind !== 'string') return false;
  if (a.kind === 'trade') return tradeValid(s, a);
  return legalActions(s).some((x) => JSON.stringify(x) === JSON.stringify(a));
}

// —— apply ——

// apply 执行行动：深拷贝入参后分发；非法动作原样返回（不抛异常）
export function apply(state, action) {
  const s = clone(state);
  if (s.gameOver || !action || typeof action.kind !== 'string') return s;
  const handler = HANDLERS[action.kind];
  if (!handler) return s;
  if (!validateAction(s, action)) return s;
  handler(s, action);
  return s;
}

// HANDLERS 动作分发表
const HANDLERS = {
  roll: applyRoll, payJailFine: applyPayFine, useJailCard: applyUseCard,
  buy: applyBuy, declineBuy: applyDeclineBuy, bid: applyBid, bidPass: applyBidPass,
  build: applyBuild, sellHouse: applySellHouse, mortgage: applyMortgage,
  unmortgage: applyUnmortgage, trade: applyTrade, tradeAccept: applyTradeAccept,
  tradeDecline: applyTradeDecline, payDebt: applyPayDebt, bankrupt: applyBankrupt,
  endTurn: applyEndTurn,
};

// —— 掷骰与移动 ——

// applyRoll 掷骰：同点计数、连续三次入狱，否则移动并结算落地格
function applyRoll(s) {
  const seat = s.cur;
  const p = s.players[seat];
  const d1 = d6(s);
  const d2 = d6(s);
  s.dice = [d1, d2];
  const sum = d1 + d2;
  const dbl = d1 === d2;
  log(s, seat, 'mo.log.roll', { n: p.name, d1, d2 });
  s.rollAgain = false;
  s.rolled = true;
  if (p.inJail) { jailRoll(s, p, sum, dbl); return; }
  if (dbl) {
    s.doubles += 1;
    if (s.doubles >= JAIL_TURNS_MAX) {
      log(s, seat, 'mo.log.triple', { n: p.name });
      toJail(s, seat);
      settleFlow(s);
      return;
    }
  }
  s.rollAgain = dbl;
  moveBy(s, p, sum);
  resolveLanding(s, seat, { diceSum: sum });
  settleFlow(s);
}

// jailRoll 狱中掷骰：同点出狱并移动；超过 3 次必须缴罚金后移动
function jailRoll(s, p, sum, dbl) {
  if (dbl) {
    p.inJail = false;
    p.jailTurns = 0;
    log(s, p.seat, 'mo.log.jailOut', { n: p.name });
    moveBy(s, p, sum);
    resolveLanding(s, p.seat, { diceSum: sum });
    settleFlow(s);
    return;
  }
  p.jailTurns += 1;
  if (p.jailTurns < JAIL_TURNS_MAX) {
    log(s, p.seat, 'mo.log.jailStay', { n: p.name, k: p.jailTurns });
    settleFlow(s);
    return;
  }
  p.inJail = false;
  p.jailTurns = 0;
  log(s, p.seat, 'mo.log.jailForced', { n: p.name, a: JAIL_FINE });
  charge(s, p.seat, JAIL_FINE, -1, 'mo.log.jailFine');
  s.resume = { kind: 'jailMove', seat: p.seat, sum };
  settleFlow(s);
}

// moveBy 前进 steps 格，经过起点领工资
function moveBy(s, p, steps) {
  if (p.pos + steps >= BOARD_SIZE) {
    p.cash += GO_SALARY;
    log(s, p.seat, 'mo.log.passGo', { n: p.name, a: GO_SALARY });
  }
  p.pos = (p.pos + steps) % BOARD_SIZE;
}

// moveTo 直接移动到目标格；collectGo 为真时途经起点领工资
function moveTo(s, p, target, collectGo) {
  if (collectGo && target < p.pos) {
    p.cash += GO_SALARY;
    log(s, p.seat, 'mo.log.passGo', { n: p.name, a: GO_SALARY });
  }
  p.pos = target;
}

// moveBack 后退 steps 格（不领工资）
function moveBack(s, p, steps) {
  p.pos = (p.pos - steps + BOARD_SIZE) % BOARD_SIZE;
}

// toJail 入狱：位置设到监狱格，不领工资
function toJail(s, seat) {
  const p = s.players[seat];
  p.pos = JAIL_POS;
  p.inJail = true;
  p.jailTurns = 0;
  s.rollAgain = false;
  log(s, seat, 'mo.log.toJail', { n: p.name });
}

// —— 落地结算 ——

// resolveLanding 结算当前格（卡牌连锁移动受深度保护）
function resolveLanding(s, seat, opts, depth) {
  const d = depth || 0;
  if (d > CARD_DEPTH_MAX) return;
  const i = s.players[seat].pos;
  const sp = SPACES[i];
  if (sp.type === 'prop' || sp.type === 'rail' || sp.type === 'util') { landProperty(s, seat, i, opts); return; }
  if (sp.type === 'tax' || sp.type === 'luxury') { charge(s, seat, sp.amount, -1, 'mo.log.tax'); return; }
  if (sp.type === 'gotojail') { toJail(s, seat); return; }
  if (sp.type === 'chance') { drawCard(s, seat, 'chance', d); return; }
  if (sp.type === 'cc') { drawCard(s, seat, 'chest', d); }
}

// landProperty 落在可购买格：无主 → 询问购买；他人持有 → 付租
function landProperty(s, seat, i, opts) {
  const owner = ownerOf(s, i);
  if (owner < 0) { s.pending = { kind: 'buy', seat, i }; return; }
  if (owner === seat || s.mortgaged[i]) return;
  let rent;
  if (opts.railDouble && SPACES[i].type === 'rail') rent = rentFor(s, i, 0) * 2;
  else if (opts.utilTen && SPACES[i].type === 'util') rent = 10 * (opts.diceSum || 0);
  else rent = rentFor(s, i, opts.diceSum || 0);
  if (rent <= 0) return;
  log(s, seat, 'mo.log.rent', {
    n: s.players[seat].name, m: s.players[owner].name,
    h: SPACES[i].short, a: rent,
  });
  charge(s, seat, rent, owner, 'mo.log.rentPaid');
}

// —— 抽牌 ——

// drawCard 抽机会/命运牌并执行效果
function drawCard(s, seat, which, depth) {
  const deck = which === 'chance' ? s.chance : s.chest;
  const card = cardById(deck[0]);
  if (!card) return;
  log(s, seat, 'mo.log.draw', {
    n: s.players[seat].name,
    d: { zh: which === 'chance' ? '机会' : '命运', en: which === 'chance' ? 'Chance' : 'Community Chest' },
    c: card.text,
  });
  // 出狱卡离开牌堆（由玩家持有），其余牌执行后回到牌堆底
  if (card.t === 'jailfree') {
    deck.shift();
    s.players[seat].jailCardIds.push(card.id);
    return;
  }
  deck.push(deck.shift());
  applyCardEffect(s, seat, card, depth);
}

// cardById 按 id 查牌（两副牌合并查找）
function cardById(id) {
  return CHANCE.find((c) => c.id === id) || CHEST.find((c) => c.id === id) || null;
}

// applyCardEffect 执行卡牌效果
function applyCardEffect(s, seat, card, depth) {
  const p = s.players[seat];
  switch (card.t) {
    case 'advance':
      moveTo(s, p, card.to, card.collectGo);
      resolveLanding(s, seat, { diceSum: s.dice ? s.dice[0] + s.dice[1] : 0 }, depth + 1);
      return;
    case 'nearestRail': nearest(s, seat, [5, 15, 25, 35], { railDouble: true }, depth); return;
    case 'nearestUtil': nearest(s, seat, [12, 28], { utilTen: true }, depth); return;
    case 'back3':
      moveBack(s, p, 3);
      resolveLanding(s, seat, { diceSum: s.dice ? s.dice[0] + s.dice[1] : 0 }, depth + 1);
      return;
    case 'money':
      if (card.amount >= 0) { p.cash += card.amount; log(s, seat, 'mo.log.gain', { n: p.name, a: card.amount }); }
      else charge(s, seat, -card.amount, -1, 'mo.log.pay', { a: -card.amount });
      return;
    case 'jail': toJail(s, seat); return;
    case 'repair': {
      const cost = repairCost(s, seat, card);
      if (cost > 0) charge(s, seat, cost, -1, 'mo.log.pay', { a: cost });
      return;
    }
    case 'payEach': payEach(s, seat, card.amount, true); return;
    case 'collectEach': payEach(s, seat, card.amount, false); return;
    default: return;
  }
}

// nearest 前往最近的指定格（含当前格本身）
function nearest(s, seat, targets, opts, depth) {
  const p = s.players[seat];
  const target = targets.find((t) => t > p.pos) ?? targets[0];
  moveTo(s, p, target, true);
  resolveLanding(s, seat, { diceSum: s.dice ? s.dice[0] + s.dice[1] : 0, ...opts }, depth + 1);
}

// repairCost 按房屋/旅馆数量计算的维修费
function repairCost(s, seat, card) {
  let total = 0;
  for (const i of ownableOf(s, seat)) {
    const h = s.houses[i] || 0;
    if (h === 5) total += card.perHotel;
    else total += h * card.perHouse;
  }
  return total;
}

// payEach 向其他所有玩家统一支付 / 收取。
// 支付：一次性核算总额，负债只需建模一次（银行中转，经济等价）；
// 收取：逐位收款方结算，收不上来的记为欠款前先记账（保持引擎状态一致）。
function payEach(s, seat, amount, paying) {
  const others = s.players.filter((q) => q.seat !== seat && !q.bankrupt);
  log(s, seat, 'mo.log.each', {
    n: s.players[seat].name, a: amount,
    d: { zh: paying ? '支付' : '收取', en: paying ? 'paid' : 'collected' },
  });
  if (paying) {
    charge(s, seat, amount * others.length, -1, 'mo.log.payEach');
    if (!s.pending) for (const q of others) q.cash += amount;
    return;
  }
  for (const q of others) {
    if (s.pending) { s.players[seat].cash += amount; continue; } // 前一位已进入负债：后续按现金结算
    charge(s, q.seat, amount, seat, 'mo.log.payEach');
  }
}

// —— 付款与负债 ——

// charge 收费：现金足够直接支付，否则进入还款微阶段
function charge(s, seat, amount, creditor, key, extra) {
  if (amount <= 0) return;
  const p = s.players[seat];
  log(s, seat, key || 'mo.log.pay', { n: p.name, a: amount, ...(extra || {}) });
  if (p.cash >= amount) {
    p.cash -= amount;
    if (creditor >= 0) s.players[creditor].cash += amount;
    return;
  }
  s.pending = { kind: 'debt', seat, amount, creditor, key: key || 'mo.log.pay', extra: extra || {} };
}

// applyPayDebt 结清欠款
function applyPayDebt(s) {
  const pd = s.pending;
  const p = s.players[pd.seat];
  if (p.cash < pd.amount) return;
  p.cash -= pd.amount;
  if (pd.creditor >= 0 && !s.players[pd.creditor].bankrupt) s.players[pd.creditor].cash += pd.amount;
  log(s, pd.seat, 'mo.log.debtPaid', { n: p.name, a: pd.amount });
  s.pending = null;
  settleFlow(s);
}

// applyBankrupt 宣告破产：房屋退回银行、地产与现金移交债权人（银行为债主则收归无主）
function applyBankrupt(s) {
  const pd = s.pending;
  const seat = pd.seat;
  const p = s.players[seat];
  const creditor = pd.creditor >= 0 && !s.players[pd.creditor].bankrupt ? pd.creditor : -1;
  let cash = p.cash;
  for (const i of ownableOf(s, seat)) {
    cash += clearHouses(s, i);
    const wasMortgaged = !!s.mortgaged[i];
    delete s.owner[i];
    delete s.mortgaged[i];
    if (creditor >= 0) {
      s.owner[i] = creditor;
      // 抵押地产随产权转移，接收方需继续承担抵押状态
      if (wasMortgaged) s.mortgaged[i] = true;
    }
  }
  p.cash = 0;
  p.bankrupt = true;
  p.inJail = false;
  if (creditor >= 0) s.players[creditor].cash += cash;
  log(s, seat, 'mo.log.bankrupt', {
    n: p.name,
    m: creditor >= 0 ? s.players[creditor].name : { zh: '银行', en: 'the bank' },
  });
  s.pending = null;
  s.resume = null;
  if (checkGameOver(s)) return;
  // 破产者若是本回合行动人，回合结束；否则（卡牌向他人收费的情形）继续当前回合
  if (seat === s.cur) endTurnNow(s);
  else settleFlow(s);
}

// clearHouses 清空该格房屋并退还银行库存，返回变卖所得
function clearHouses(s, i) {
  const h = s.houses[i] || 0;
  if (h === 0) return 0;
  const price = SPACES[i].house || 0;
  delete s.houses[i];
  if (h === 5) { s.hotelsLeft += 1; s.housesLeft += 4; return Math.floor(price * 2.5); }
  s.housesLeft += h;
  return Math.floor((price * h) / 2);
}

// —— 购买与竞拍 ——

// applyBuy 直接买下无主地产
function applyBuy(s) {
  const pd = s.pending;
  const sp = SPACES[pd.i];
  const p = s.players[pd.seat];
  s.owner[pd.i] = pd.seat;
  p.cash -= sp.price;
  log(s, pd.seat, 'mo.log.buy', { n: p.name, h: sp.short, a: sp.price });
  s.pending = null;
  settleFlow(s);
}

// applyDeclineBuy 放弃购买 → 进入竞拍
function applyDeclineBuy(s) {
  const pd = s.pending;
  const first = nextAlive(s, pd.seat);
  s.pending = { kind: 'auction', i: pd.i, high: 0, highSeat: -1, turnSeat: first, passed: [], by: pd.seat };
  log(s, -1, 'mo.log.auctionStart', { h: SPACES[pd.i].short });
}

// applyBid 竞拍出价
function applyBid(s, a) {
  const pd = s.pending;
  if (!Number.isInteger(a.amount) || a.amount <= pd.high) return;
  if (a.amount > s.players[pd.turnSeat].cash) return;
  pd.high = a.amount;
  pd.highSeat = pd.turnSeat;
  log(s, pd.turnSeat, 'mo.log.bid', { n: s.players[pd.turnSeat].name, a: a.amount });
  auctionNext(s);
}

// applyBidPass 竞拍退出
function applyBidPass(s) {
  const pd = s.pending;
  pd.passed.push(pd.turnSeat);
  log(s, pd.turnSeat, 'mo.log.bidPass', { n: s.players[pd.turnSeat].name });
  auctionNext(s);
}

// auctionNext 竞拍轮转：只剩唯一出价者则成交，全员退出则流拍
function auctionNext(s) {
  const pd = s.pending;
  const active = aliveSeats(s).filter((x) => !pd.passed.includes(x));
  if (pd.highSeat >= 0 && active.length <= 1 && active[0] === pd.highSeat) { auctionSettle(s); return; }
  if (!active.length) { auctionSettle(s); return; }
  let next = pd.turnSeat;
  do { next = (next + 1) % s.n; } while (s.players[next].bankrupt || pd.passed.includes(next));
  pd.turnSeat = next;
}

// auctionSettle 竞拍结算：有人出价则成交，否则流拍
function auctionSettle(s) {
  const pd = s.pending;
  s.pending = null;
  if (pd.highSeat >= 0) {
    s.owner[pd.i] = pd.highSeat;
    s.players[pd.highSeat].cash -= pd.high;
    log(s, pd.highSeat, 'mo.log.auctionWin', {
      n: s.players[pd.highSeat].name, h: SPACES[pd.i].short, a: pd.high,
    });
  } else {
    log(s, -1, 'mo.log.auctionNone', { h: SPACES[pd.i].short });
  }
  settleFlow(s);
}

// —— 经营动作 ——

// applyBuild 加盖房屋 / 旅馆
function applyBuild(s, a) {
  const seat = manageSeat(s);
  const i = a.i;
  if (!canBuild(s, seat, i)) return;
  const h = s.houses[i] || 0;
  s.players[seat].cash -= buildCost(i);
  if (h === 4) {
    s.houses[i] = 5;
    s.hotelsLeft -= 1;
    s.housesLeft += 4;
    log(s, seat, 'mo.log.hotel', { n: s.players[seat].name, h: SPACES[i].short, a: buildCost(i) });
  } else {
    s.houses[i] = h + 1;
    s.housesLeft -= 1;
    log(s, seat, 'mo.log.house', {
      n: s.players[seat].name, h: SPACES[i].short, k: h + 1, a: buildCost(i),
    });
  }
}

// applySellHouse 拆除房屋 / 旅馆（半价回收）
function applySellHouse(s, a) {
  const seat = manageSeat(s);
  const i = a.i;
  if (!canSellHouse(s, seat, i)) return;
  const h = s.houses[i];
  if (h === 5) {
    s.houses[i] = 4;
    s.hotelsLeft += 1;
    s.housesLeft -= 4;
  } else if (h === 1) {
    delete s.houses[i];
    s.housesLeft += 1;
  } else {
    s.houses[i] = h - 1;
    s.housesLeft += 1;
  }
  const refund = Math.floor((SPACES[i].house || 0) / 2);
  s.players[seat].cash += refund;
  log(s, seat, 'mo.log.sellHouse', { n: s.players[seat].name, h: SPACES[i].short, a: refund });
}

// applyMortgage 抵押地产
function applyMortgage(s, a) {
  const seat = manageSeat(s);
  if (!canMortgage(s, seat, a.i)) return;
  s.mortgaged[a.i] = true;
  s.players[seat].cash += SPACES[a.i].mortgage;
  log(s, seat, 'mo.log.mortgage', {
    n: s.players[seat].name, h: SPACES[a.i].short, a: SPACES[a.i].mortgage,
  });
}

// applyUnmortgage 赎回地产
function applyUnmortgage(s, a) {
  const seat = manageSeat(s);
  if (!canUnmortgage(s, seat, a.i, s.players[seat].cash)) return;
  const cost = unmortgageCost(a.i);
  s.players[seat].cash -= cost;
  delete s.mortgaged[a.i];
  log(s, seat, 'mo.log.unmortgage', { n: s.players[seat].name, h: SPACES[a.i].short, a: cost });
}

// —— 玩家间交易 ——

// tradeValid 交易明细校验：双方各至少让出一样资产，财产归属与房屋状态须合法
function tradeValid(s, a) {
  const from = s.cur;
  if (s.pending || s.phase === 'over') return false;
  if (!Number.isInteger(a.to) || a.to === from || a.to < 0 || a.to >= s.n) return false;
  if (s.players[a.to].bankrupt || s.players[from].bankrupt) return false;
  const give = a.give || {};
  const get = a.get || {};
  const gp = Array.isArray(give.props) ? give.props : [];
  const rp = Array.isArray(get.props) ? get.props : [];
  const gc = Number(give.cash) || 0;
  const rc = Number(get.cash) || 0;
  if (!gp.length && !rp.length && gc <= 0 && rc <= 0) return false;
  if (gc < 0 || rc < 0) return false;
  if (gc > s.players[from].cash || rc > s.players[a.to].cash) return false;
  if (!gp.every((i) => tradeable(s, i, from))) return false;
  if (!rp.every((i) => tradeable(s, i, a.to))) return false;
  return true;
}

// tradeable 该格能否作为交易标的（归属正确、无房屋；抵押地产可整体转让）
function tradeable(s, i, seat) {
  if (!isOwnable(i) || ownerOf(s, i) !== seat) return false;
  if ((s.houses[i] || 0) > 0) return false;
  const g = SPACES[i].group;
  if (g && g !== 'rail' && g !== 'util' && groupSpaces(g).some((x) => (s.houses[x] || 0) > 0)) return false;
  return true;
}

// applyTrade 发起交易：挂起后由对方裁决
function applyTrade(s, a) {
  const pd = {
    kind: 'tradeRespond', seat: a.to, from: s.cur,
    give: { props: a.give.props || [], cash: Number(a.give.cash) || 0 },
    get: { props: a.get.props || [], cash: Number(a.get.cash) || 0 },
  };
  s.pending = pd;
  log(s, s.cur, 'mo.log.tradeOffer', {
    n: s.players[s.cur].name, m: s.players[a.to].name,
    g: tradeBrief(s, pd.give), t: tradeBrief(s, pd.get),
  });
}

// tradeBrief 交易内容摘要（双语）
function tradeBrief(s, side) {
  const names = side.props.map((i) => SPACES[i].short);
  const cash = side.cash > 0 ? `$${side.cash}` : '';
  const parts = [...names, cash].filter(Boolean);
  if (!parts.length) return { zh: '无', en: 'nothing' };
  return {
    zh: parts.map((x) => (typeof x === 'string' ? x : x.zh)).join(' + '),
    en: parts.map((x) => (typeof x === 'string' ? x : x.en)).join(' + '),
  };
}

// applyTradeAccept 接受交易：交割地产与现金
function applyTradeAccept(s) {
  const pd = s.pending;
  if (pd.kind !== 'tradeRespond') return;
  transfer(s, pd.from, pd.seat, pd.give);
  transfer(s, pd.seat, pd.from, pd.get);
  log(s, pd.seat, 'mo.log.tradeAccept', { n: s.players[pd.seat].name, m: s.players[pd.from].name });
  s.pending = null;
  settleFlow(s);
}

// applyTradeDecline 拒绝交易
function applyTradeDecline(s) {
  const pd = s.pending;
  if (pd.kind !== 'tradeRespond') return;
  log(s, pd.seat, 'mo.log.tradeDecline', { n: s.players[pd.seat].name, m: s.players[pd.from].name });
  s.pending = null;
  settleFlow(s);
}

// transfer 一方把地产与现金交给另一方（抵押状态随地产转移）
function transfer(s, from, to, side) {
  for (const i of side.props) {
    s.owner[i] = to;
  }
  if (side.cash > 0) {
    s.players[from].cash -= side.cash;
    s.players[to].cash += side.cash;
  }
}

// —— 回合流转 ——

// settleFlow 结算后流转：仍有微阶段则等待，否则按「是否已掷骰」回到掷骰或经营阶段
function settleFlow(s) {
  if (s.gameOver || s.pending) return;
  if (s.resume) {
    const r = s.resume;
    s.resume = null;
    runResume(s, r);
    return;
  }
  s.phase = s.rolled && !s.rollAgain ? 'action' : 'roll';
}

// runResume 执行挂起的续动作（目前仅监狱强制出狱后的移动）
function runResume(s, r) {
  if (r.kind === 'jailMove') {
    const p = s.players[r.seat];
    moveBy(s, p, r.sum);
    resolveLanding(s, r.seat, { diceSum: r.sum });
  }
  settleFlow(s);
}

// applyEndTurn 结束回合
function applyEndTurn(s) {
  endTurnNow(s);
}

// endTurnNow 移交下一个未破产玩家（回合数上限到了则结算）
function endTurnNow(s) {
  s.rollAgain = false;
  s.rolled = false;
  s.doubles = 0;
  s.dice = null;
  s.turn += 1;
  if (s.maxRounds > 0 && s.turn >= s.maxRounds * s.n) { finishByRounds(s); return; }
  s.cur = nextAlive(s, s.cur);
  s.phase = 'roll';
}

// finishByRounds 达到回合上限：净资产最高者获胜
function finishByRounds(s) {
  const ranked = aliveSeats(s).map((seat) => ({ seat, worth: netWorth(s, seat) }));
  ranked.sort((a, b) => b.worth - a.worth || a.seat - b.seat);
  s.gameOver = true;
  s.phase = 'over';
  s.result = { winner: ranked[0] ? ranked[0].seat : -1, byRounds: true };
  log(s, -1, 'mo.log.roundsEnd', {
    n: ranked[0] ? s.players[ranked[0].seat].name : '', k: s.maxRounds,
  });
}

// checkGameOver 只剩一家未破产即终局
function checkGameOver(s) {
  const alive = aliveSeats(s);
  if (alive.length > 1) return false;
  s.gameOver = true;
  s.phase = 'over';
  s.result = { winner: alive.length ? alive[0] : -1 };
  if (alive.length) log(s, -1, 'mo.log.win', { n: s.players[alive[0]].name });
  return true;
}

// —— 出狱动作 ——

// applyPayFine 缴罚金出狱
function applyPayFine(s) {
  const p = s.players[s.cur];
  if (!p.inJail || p.cash < JAIL_FINE) return;
  p.cash -= JAIL_FINE;
  p.inJail = false;
  p.jailTurns = 0;
  log(s, p.seat, 'mo.log.payFine', { n: p.name, a: JAIL_FINE });
}

// applyUseCard 使用出狱卡（卡片按出处回到对应牌堆底）
function applyUseCard(s) {
  const p = s.players[s.cur];
  if (!p.inJail || !p.jailCardIds.length) return;
  const id = p.jailCardIds.shift();
  p.inJail = false;
  p.jailTurns = 0;
  ((id.startsWith('ch_') ? s.chance : s.chest)).push(id);
  log(s, p.seat, 'mo.log.useCard', { n: p.name });
}

// —— 供 UI 复用的判定 ——

export const RULES_API = {
  canBuild, canSellHouse, canMortgage, canUnmortgage, unmortgageCost, buildCost, rentFor, netWorth,
  ownerOf, ownsAll,
};
