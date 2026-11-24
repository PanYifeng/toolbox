// 斗地主 AI：启发式 1-ply 估值——叫分按手牌强度；出牌优先甩小牌 / 拆散度低的连牌，
// 跟牌取「能压过的最小牌」，关键局面（对手即将出完）才动炸弹。同步函数，供框架驱动。

import { parseCombo } from './combos.js';
import { SMALL_JOKER, BIG_JOKER, rankOf } from './data-cards.js';

// bot 入口：叫分阶段走叫分决策，出牌阶段走出牌决策
export function bot(s, legal) {
  if (!legal.length) return null;
  if (s.phase === 'bid') return pickBid(s, legal);
  if (legal.length === 1) return legal[0]; // 只剩「过牌」时直接过
  return pickPlay(s, legal);
}

// handStrength 手牌强度评分：王/炸弹/2 权重高，连牌略加分
export function handStrength(hand) {
  let score = 0;
  const counts = {};
  for (const id of hand) {
    const r = rankOf(id);
    counts[r] = (counts[r] || 0) + 1;
    if (r === BIG_JOKER) score += 6;
    else if (r === SMALL_JOKER) score += 4;
    else if (r === 15) score += 2.2;
    else if (r === 14) score += 1.2;
  }
  for (const r of Object.keys(counts)) {
    if (counts[r] === 4) score += 5;
    else if (counts[r] === 3) score += 1.5;
  }
  return score;
}

// pickBid 叫分：强度够就叫最高可叫分，否则不叫
function pickBid(s, legal) {
  const p = s.players[s.bid.cur];
  const strength = handStrength(p.hand);
  const bids = legal.filter((a) => a.kind === 'bid');
  if (!bids.length) return legal[0];
  const want = strength >= 12 ? 3 : strength >= 8 ? 2 : strength >= 5 ? 1 : 0;
  const usable = bids.filter((a) => a.points <= want);
  if (usable.length) return usable[usable.length - 1]; // 最高可接受叫分
  return legal.find((a) => a.kind === 'bidPass') || legal[0];
}

// pickPlay 出牌决策
function pickPlay(s, legal) {
  const me = s.players[s.cur];
  const isLandlord = me.seat === s.landlord;
  const danger = opponentDanger(s);
  const plays = legal.filter((a) => a.kind !== 'pass');
  const pass = legal.find((a) => a.kind === 'pass');

  // 能一把出完直接赢
  for (const a of plays) if (a.cards.length === me.hand.length) return a;

  // 队友（农民视角）领出且能过就过，让队友走
  if (pass && s.lastPlay && !isLandlord && s.lastPlay.seat !== s.landlord) return pass;

  if (!plays.length) return pass || legal[0];

  const scored = plays.map((a) => ({ a, v: playValue(a.cards, me.hand, danger) }));
  scored.sort((x, y) => y.v - x.v);
  const best = scored[0];
  // 跟牌时若最优解代价过高（拆炸弹/王）且不紧急，宁可不跟
  if (pass && s.lastPlay && !danger && best.v < 0) return pass;
  return best.a;
}

// isOpponent 该座位是否为我方的对手（地主对两家，农民只对地主）
export function isOpponent(s, mySeat, otherSeat) {
  if (otherSeat === mySeat) return false;
  if (mySeat === s.landlord) return true; // 地主视角：两农民都是对手
  return otherSeat === s.landlord; // 农民视角：只盯着地主
}

// opponentDanger 是否有对手手牌很少（≤2 张，随时可能走完）
function opponentDanger(s) {
  return s.players.some((p) => p.seat !== s.cur && p.hand.length <= 2 && isOpponent(s, s.cur, p.seat));
}

// playValue 单次出牌估值：牌越散越该出，炸弹非紧急不动
function playValue(cards, hand, danger) {
  const cmb = parseCombo(cards);
  if (!cmb) return -1000;
  let v = 0;
  if (cmb.type === 'bomb' || cmb.type === 'rocket') v -= danger ? 4 : 40;
  // 出的牌越多越好（快速清手）
  v += cards.length * 1.2;
  // 主点数越低越早出（留大牌控场）
  v -= cmb.rank * 0.35;
  // 拆散同点组有代价：出单张拆开对子/三张不划算
  const cnt = {};
  for (const id of hand) { const r = rankOf(id); cnt[r] = (cnt[r] || 0) + 1; }
  const usedCnt = {};
  for (const id of cards) { const r = rankOf(id); usedCnt[r] = (usedCnt[r] || 0) + 1; }
  for (const r in usedCnt) {
    if (cnt[r] > usedCnt[r] && cnt[r] >= 2) v -= 1.5; // 拆对子
  }
  // 留大王/小王压场
  if (cmb.type === 'single' && (cmb.rank === BIG_JOKER || cmb.rank === SMALL_JOKER)) v -= 3;
  return v;
}