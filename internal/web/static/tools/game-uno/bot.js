// 巫诺（UNO）AI：启发式 1-ply——优先出功能牌压制下家，其次出最「孤」的颜色减少手牌阻塞，
// 手里只剩 2 张时优先保留万能牌收尾。同步函数，供框架驱动。

import { DECK, WILD, V_SKIP, V_REV, V_DRAW2, V_WILD4 } from './data-cards.js';

// bot 入口：微阶段优先处理，再走主行动决策
export function bot(s, legal) {
  if (!legal.length) return null;
  if (s.pending) return pickPending(s, legal);
  const plays = legal.filter((a) => a.kind === 'play');
  if (plays.length) return pickPlay(s, plays);
  if (s.rules.stacking && s.drawStack > 0) return legal.find((a) => a.kind === 'drawPenalty') || legal[0];
  return legal.find((a) => a.kind === 'draw') || legal[0];
}

// pickPending 微阶段：选色取手上最多的颜色；喊 UNO 必喊；摸到的牌能出就出
function pickPending(s, legal) {
  const k = s.pending.kind;
  if (k === 'chooseColor') {
    const color = mostCommonColor(s, s.pending.seat);
    return legal.find((a) => a.color === color) || legal[0];
  }
  if (k === 'uno') return legal.find((a) => a.kind === 'unoCall') || legal[0];
  // drawPlay：有牌就打出（早出完早赢）
  return legal.find((a) => a.kind === 'playDrawn') || legal[0];
}

// mostCommonColor 手上最多的颜色（万能牌不计；全为万能牌时默认红）
function mostCommonColor(s, seat) {
  const counts = [0, 0, 0, 0];
  for (const id of s.players[seat].hand) {
    const c = DECK[id].c;
    if (c !== WILD) counts[c]++;
  }
  let best = 0;
  for (let c = 1; c < 4; c++) if (counts[c] > counts[best]) best = c;
  return best;
}

// pickPlay 出牌估值：功能牌压制 + 出掉手上最孤立的颜色 + 避免过早打出万能牌
function pickPlay(s, plays) {
  const p = s.players[s.cur];
  const colorCount = [0, 0, 0, 0];
  const numCount = {};
  for (const id of p.hand) {
    const card = DECK[id];
    if (card.c !== WILD) colorCount[card.c]++;
    numCount[card.v] = (numCount[card.v] || 0) + 1;
  }
  const total = p.hand.length;
  let best = plays[0];
  let bestV = -Infinity;
  for (const a of plays) {
    const card = DECK[a.card];
    const v = playValue(card, colorCount, numCount, total);
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// playValue 单张出牌估值
function playValue(card, colorCount, numCount, total) {
  // 牌越「重」（计分越高）越该先出掉，减少被对手吃分
  let v = cardValue_toWeight(card);
  if (card.c === WILD) {
    // 万能牌是收尾资源：手牌还多时压着不出
    v -= total > 2 ? 40 : 0;
    return v;
  }
  v += (9 - colorCount[card.c]) * 1.5; // 该色余量少 → 尽早清空这条路
  v += (numCount[card.v] || 1) > 1 ? 3 : 0; // 有同数字备份则先出
  return v;
}

// cardValue_toWeight 功能牌进攻权重（+4/+2 压制下家，跳过/反转打断节奏）
function cardValue_toWeight(card) {
  if (card.v === V_WILD4) return 30;
  if (card.v === V_DRAW2) return 26;
  if (card.v === V_SKIP) return 22;
  if (card.v === V_REV) return 20;
  return card.v * 0.5;
}
