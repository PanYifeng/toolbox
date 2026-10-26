// 璀璨宝石 AI：启发式 1-ply——优先购卡（VP × 权重 + 产出色稀缺 + 贵族进度），
// 其次有金可拿时预留高价明牌，否则朝最便宜目标卡补宝石。同步函数，供框架驱动。

import { CARDS, NOBLES, MARKET_SLOTS } from './data-cards.js';

// bot 入口：微阶段（弃宝石 / 择贵族）优先处理，再走主行动决策
export function bot(s, legal) {
  if (!legal.length) return null;
  if (s.pending && s.pending.kind === 'discard') return pickDiscard(s, legal);
  if (s.pending && s.pending.kind === 'noble') return legal[0];

  const buys = legal.filter((a) => a.kind === 'buy');
  if (buys.length > 0) return bestBuy(s, buys);

  const reserves = legal.filter((a) => a.kind === 'reserve');
  const pick = pickReserve(s, reserves);
  if (pick) return pick;

  const take2 = legal.filter((a) => a.kind === 'take2');
  const take3 = legal.filter((a) => a.kind === 'take3');
  const gemPick = pickGems(s, take2, take3);
  if (gemPick) return gemPick;
  return legal[legal.length - 1]; // pass 兜底
}

// buyValue 购卡估值：VP×2 + 产出色稀缺（折扣列少的色优先）+ 贵族需求推进
function buyValue(s, p, cid) {
  const [, vp, gives] = CARDS[cid];
  let v = vp * 2 + (5 - p.bonus[gives]) * 0.25;
  for (const j of s.nobles) {
    if (NOBLES[j][gives] > 0 && p.bonus[gives] < NOBLES[j][gives]) v += 0.6;
  }
  return v;
}

// bestBuy 取估值最高的购卡（并列取低价低阶，先攒引擎后冲分）
function bestBuy(s, buys) {
  const p = s.players[s.cur];
  let best = null;
  let bestScore = -Infinity;
  for (const a of buys) {
    const cid = cardOfAction(s, p, a);
    const cost = CARDS[cid][3].reduce((x, y) => x + y, 0);
    const v = buyValue(s, p, cid) * 10 - cost * 2 - CARDS[cid][0];
    if (v > bestScore) { bestScore = v; best = a; }
  }
  return best;
}

// cardOfAction 购买动作对应的卡 id
function cardOfAction(s, p, a) {
  return a.reserved !== undefined ? p.reserved[a.reserved] : s.market[a.tier][a.slot];
}

// pickReserve 预留决策：有金可拿且场上存在三阶 / 高分卡时预留之（偏明牌卡人）
function pickReserve(s, reserves) {
  if (reserves.length === 0 || s.supply.gold === 0) return null;
  let best = null;
  let bestV = 0;
  for (const a of reserves) {
    if (a.slot < 0) continue; // 盲留信息量低，仅金才考虑，明牌优先
    const cid = s.market[a.tier][a.slot];
    const v = CARDS[cid][1] * 10 + CARDS[cid][0];
    if (v > bestV) { bestV = v; best = a; }
  }
  if (!best) {
    // 场上无高价明牌且手头预留未满：三阶盲留搏一张
    best = reserves.find((a) => a.tier === 2 && a.slot < 0) || null;
  }
  return best;
}

// pickGems 拿宝石决策：朝最便宜买不起的卡补色（缺 2 颗且供应 ≥4 优先拿 2）
function pickGems(s, take2, take3) {
  const p = s.players[s.cur];
  const target = cheapestTarget(s, p);
  if (!target) return take3[0] || take2[0] || null;
  const need = CARDS[target][3].map((c, i) => Math.max(0, c - p.bonus[i] - p.gems[i]));
  for (const a of take2) {
    if (need[a.color] >= 2) return a;
  }
  let best = null;
  let bestV = -1;
  for (const a of take3) {
    const v = a.colors.reduce((x, c) => x + (need[c] > 0 ? 1 + Math.min(need[c], 2) : 0), 0);
    if (v > bestV) { bestV = v; best = a; }
  }
  if (best) return best;
  return take2[0] || take3[0] || null;
}

// cheapestTarget 最便宜买不起的目标卡（明牌 + 预留，成本宝石数最少）
function cheapestTarget(s, p) {
  let best = null;
  let bestCost = Infinity;
  const consider = (cid) => {
    const cost = CARDS[cid][3].reduce((x, y) => x + y, 0);
    if (cost < bestCost) { bestCost = cost; best = cid; }
  };
  for (let t = 0; t < 3; t++) {
    for (let k = 0; k < MARKET_SLOTS; k++) {
      const cid = s.market[t][k];
      if (cid !== null && !afford(p, cid)) consider(cid);
    }
  }
  p.reserved.forEach((cid) => { if (!afford(p, cid)) consider(cid); });
  return best;
}

// afford 简易可负担判定（与引擎 canAfford 同式，避免循环 import）
function afford(p, cid) {
  let goldNeed = 0;
  CARDS[cid][3].forEach((c, i) => {
    goldNeed += Math.max(0, c - p.bonus[i] - p.gems[i]);
  });
  return goldNeed <= p.gold;
}

// pickDiscard 弃宝石：弃掉对目标需求盈余最大的色（无目标弃最多者）
function pickDiscard(s, legal) {
  const p = s.players[s.pending.seat];
  const target = cheapestTarget(s, p);
  const need = target
    ? CARDS[target][3].map((c, i) => Math.max(0, c - p.bonus[i]))
    : [0, 0, 0, 0, 0];
  let best = legal[0];
  let bestV = -Infinity;
  for (const a of legal) {
    const i = a.color;
    const surplus = i === -1 ? p.gold - 1 : p.gems[i] - need[i];
    if (surplus > bestV) { bestV = surplus; best = a; }
  }
  return best;
}
