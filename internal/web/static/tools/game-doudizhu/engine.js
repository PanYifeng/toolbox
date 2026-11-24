// 斗地主引擎：3 人经典叫分制（54 张牌，每人 17 张 + 3 张底牌）。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 规则要点：
//   · 发牌后进入叫分阶段，依次可叫 1/2/3 分（须高于当前最高分）或「不叫」。
//     有人叫满 3 分立即成为地主；三人各表态一次后最高叫分者当地主，底分 = 叫分。
//     三人都不叫则重新发牌。
//   · 地主获得 3 张底牌，先出牌。
//   · 每次出牌须压过上一手（领出时任意合法牌型）；压不过可过牌，其余两人连续过牌
//     则上一手出牌者重新领出。领出时不能过牌。
//   · 炸弹 / 王炸使本局倍数 ×2（可叠加）；地主获胜且两农民一张未出为「春天」，
//     农民获胜且地主只出过一手为「反春」，均再 ×2。
//   · 一方出完手牌即终局：地主胜则地主 +2×分数、两农民各 −分数；农民胜则反之。
//     分数 = 底分 × 倍数。

import { buildDeck, sortHand, cardName, rankOf } from './data-cards.js';
import { legalPlays, canPlayCards } from './combos.js';

const HAND_COUNT = 17;   // 每人手牌数
const BOTTOM_COUNT = 3;  // 底牌数
const LOG_CAP = 400;

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

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
}

// namesOf 多张牌的双语名串（底牌公示、出牌明细用）
function namesOf(cards) {
  const zh = cards.map((id) => cardName(id).zh).join(' ');
  const en = cards.map((id) => cardName(id).en).join(' ');
  return { zh, en };
}

// —— 发牌 ——

// initialState 开局：发牌并进入叫分阶段
export function initialState(setup) {
  const seats = setup.seats;
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: seats.length,
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      hand: [], isLandlord: false, playedCount: 0,
    })),
    bottom: [],
    phase: 'bid',
    bid: null,
    landlord: -1,
    baseScore: 0,
    multiplier: 1,
    lastPlay: null,
    playChain: 0,
    cur: 0,
    spring: null,
    result: null,
    gameOver: false,
    log: [],
  };
  deal(s);
  return s;
}

// deal 发一局：洗 54 张 → 每人 17 张 → 3 张底牌 → 进入叫分
function deal(s) {
  const deck = shuffled(s, buildDeck());
  for (const p of s.players) { p.hand = []; p.isLandlord = false; p.playedCount = 0; }
  for (let i = 0; i < HAND_COUNT; i++) {
    for (const p of s.players) p.hand.push(deck.shift());
  }
  for (const p of s.players) p.hand = sortHand(p.hand);
  s.bottom = deck.slice(0, BOTTOM_COUNT);
  s.phase = 'bid';
  s.bid = { cur: Math.floor(rnd(s) * s.n), best: 0, bestSeat: -1, spoken: 0 };
  s.landlord = -1;
  s.baseScore = 0;
  s.multiplier = 1;
  s.lastPlay = null;
  s.playChain = 0;
  s.spring = null;
  s.result = null;
  s.gameOver = false;
  s.cur = s.bid.cur;
  log(s, -1, 'dd.log.deal', {});
  log(s, -1, 'dd.log.bidStart', { n: s.players[s.bid.cur].name });
}

// —— 查询 ——

// currentPlayer 当前待决策座位
export function currentPlayer(s) {
  return s.phase === 'bid' ? s.bid.cur : s.cur;
}

// isGameOver 是否终局
export function isGameOver(s) {
  return s.gameOver;
}

// score 终局分数：地主 ±2×分数，农民各 ∓分数
export function score(s) {
  const r = s.result;
  return s.players.map((p) => {
    let total = 0;
    let role = 'dd.score.peasant';
    if (r) {
      if (p.seat === r.landlord) { total = r.landlordWin ? 2 * r.points : -2 * r.points; role = 'dd.score.landlord'; }
      else total = r.landlordWin ? -r.points : r.points;
    }
    return {
      seat: p.seat,
      total,
      breakdown: [
        [role, total],
        ['dd.score.base', s.baseScore],
        ['dd.score.multiplier', s.multiplier],
      ],
    };
  });
}

// —— legalActions ——

// legalActions 唯一合法性来源
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.phase === 'bid') return bidActions(s);
  return playActions(s);
}

// bidActions 叫分：高于当前最高分的叫分 + 不叫
function bidActions(s) {
  const acts = [];
  for (let p = s.bid.best + 1; p <= 3; p++) acts.push({ kind: 'bid', points: p });
  acts.push({ kind: 'bidPass' });
  return acts;
}

// playActions 出牌：领出枚举全部牌型，跟牌枚举能压过的牌型 + 过牌
function playActions(s) {
  const p = s.players[s.cur];
  const last = s.lastPlay ? s.lastPlay.combo : null;
  const plays = legalPlays(p.hand, last);
  const acts = plays.map((cards) => ({ kind: 'play', cards }));
  if (last) acts.push({ kind: 'pass' });
  return acts;
}

// —— apply ——

// apply 执行行动
export function apply(state, action) {
  const s = clone(state);
  if (s.gameOver) return s;
  if (!action || typeof action.kind !== 'string') return s;
  if (s.phase === 'bid') applyBid(s, action);
  else applyPlay(s, action);
  return s;
}

// applyBid 叫分处理
function applyBid(s, a) {
  const p = s.players[s.bid.cur];
  if (a.kind === 'bid') {
    if (!Number.isInteger(a.points) || a.points <= s.bid.best || a.points > 3) return;
    s.bid.best = a.points;
    s.bid.bestSeat = s.bid.cur;
    s.bid.spoken += 1;
    log(s, p.seat, 'dd.log.bid', { n: p.name, p: a.points });
    if (a.points === 3) { settleBid(s); return; }
  } else if (a.kind === 'bidPass') {
    s.bid.spoken += 1;
    log(s, p.seat, 'dd.log.bidPass', { n: p.name });
  } else {
    return;
  }
  advanceBid(s);
}

// advanceBid 叫分轮转：三人各表态一次后结算，全不叫则重新发牌
function advanceBid(s) {
  if (s.bid.spoken >= s.n) { settleBid(s); return; }
  s.bid.cur = (s.bid.cur + 1) % s.n;
  s.cur = s.bid.cur;
}

// settleBid 定地主：最高叫分者当地主，底分 = 叫分；无人叫分则重新发牌
function settleBid(s) {
  if (s.bid.bestSeat < 0) {
    log(s, -1, 'dd.log.redeal', {});
    deal(s);
    return;
  }
  const seat = s.bid.bestSeat;
  const p = s.players[seat];
  p.isLandlord = true;
  p.hand = sortHand([...p.hand, ...s.bottom]);
  s.landlord = seat;
  s.baseScore = s.bid.best;
  s.phase = 'play';
  s.cur = seat;
  s.lastPlay = null;
  s.playChain = 0;
  log(s, -1, 'dd.log.landlord', {
    n: p.name, p: s.baseScore, b: namesOf(s.bottom),
  });
}

// applyPlay 出牌 / 过牌
function applyPlay(s, a) {
  if (a.kind === 'play') applyCards(s, a);
  else if (a.kind === 'pass') applyPass(s);
}

// applyCards 打出牌组：复核合法性 → 扣手牌 → 更新倍数与压制状态
function applyCards(s, a) {
  const p = s.players[s.cur];
  const last = s.lastPlay ? s.lastPlay.combo : null;
  const cmb = canPlayCards(p.hand, a.cards, last);
  if (!cmb) return;
  const used = new Set(a.cards);
  p.hand = p.hand.filter((id) => !used.has(id));
  p.playedCount += 1;
  s.lastPlay = { seat: s.cur, cards: a.cards.slice(), combo: cmb };
  s.playChain = 0;
  log(s, s.cur, 'dd.log.play', { n: p.name, c: namesOf(a.cards), k: a.cards.length });
  if (cmb.type === 'bomb' || cmb.type === 'rocket') {
    s.multiplier *= 2;
    log(s, -1, 'dd.log.bomb', { n: p.name, m: s.multiplier });
  }
  if (p.hand.length === 0) { finishGame(s); return; }
  s.cur = (s.cur + 1) % s.n;
}

// applyPass 过牌：领出时不能过牌；连续两人过牌则由上一手出牌者重新领出
function applyPass(s) {
  if (!s.lastPlay) return;
  s.playChain += 1;
  log(s, s.cur, 'dd.log.pass', { n: s.players[s.cur].name });
  if (s.playChain >= s.n - 1) {
    s.cur = s.lastPlay.seat;
    s.lastPlay = null;
    s.playChain = 0;
    log(s, -1, 'dd.log.newTrick', { n: s.players[s.cur].name });
    return;
  }
  s.cur = (s.cur + 1) % s.n;
}

// finishGame 有人出完手牌：判春天/反春，结算分数
function finishGame(s) {
  const winner = s.cur;
  const landlordWin = winner === s.landlord;
  const peasants = s.players.filter((p) => p.seat !== s.landlord);
  let spring = null;
  if (landlordWin && peasants.every((p) => p.playedCount === 0)) spring = 'spring';
  if (!landlordWin && s.players[s.landlord].playedCount <= 1) spring = 'anti';
  if (spring) s.multiplier *= 2;
  const points = s.baseScore * s.multiplier;
  s.result = { winner, landlord: s.landlord, landlordWin, points };
  s.spring = spring;
  s.gameOver = true;
  log(s, -1, 'dd.log.gameEnd', {
    n: s.players[winner].name, w: landlordWin ? 'landlord' : 'peasant', p: points,
  });
  if (spring) log(s, -1, spring === 'spring' ? 'dd.log.spring' : 'dd.log.antiSpring', { m: s.multiplier });
}

// comboLabel 牌型双语名（渲染层与日志共用）
export const COMBO_NAMES = {
  single: { zh: '单张', en: 'Single' },
  pair: { zh: '对子', en: 'Pair' },
  trio: { zh: '三张', en: 'Triple' },
  trio1: { zh: '三带一', en: 'Triple + 1' },
  trio2: { zh: '三带二', en: 'Triple + 2' },
  straight: { zh: '顺子', en: 'Straight' },
  pairs: { zh: '连对', en: 'Pair run' },
  plane: { zh: '飞机', en: 'Plane' },
  plane1: { zh: '飞机带单', en: 'Plane + singles' },
  plane2: { zh: '飞机带对', en: 'Plane + pairs' },
  four2: { zh: '四带二', en: 'Four + 2' },
  four2p: { zh: '四带两对', en: 'Four + 2 pairs' },
  bomb: { zh: '炸弹', en: 'Bomb' },
  rocket: { zh: '王炸', en: 'Rocket' },
};

// comboName 取牌型双语名（未知名返回空对象）
export function comboName(type) {
  return COMBO_NAMES[type] || { zh: '', en: '' };
}

// rankLabelOf 主点数显示串（对子/顺子等提示用）；王炸无主点显示
export function rankLabelOf(rank) {
  if (rank >= 16) return '🃏';
  return ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'][rank - 3] || '';
}

// topRank 手牌最高点数（AI 决策辅助）
export function topRank(hand) {
  return hand.reduce((m, id) => Math.max(m, rankOf(id)), 0);
}
