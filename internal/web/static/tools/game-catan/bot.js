// 卡坦岛 AI：同步启发式。初始放置按产出概率选点；主阶段按城市 > 村庄 >
// 发展卡 > 修路扩张 > 银行交易凑料 的优先级推进 VP；强盗避开己方高产格，
// 抢领跑者；弃牌保目标资源。1-ply，无搜索。

import { RESOURCES, VERTICES, EDGES } from './data-board.js';
import {
  COST_ROAD, COST_SETTLEMENT, COST_CITY, COST_DEV, WIN_VP,
} from './data-board.js';

// DOTS 数字 token 概率点数（2/12=1 … 6/8=5）
const DOTS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

// vertPotential 顶点生产潜力（相邻格概率点数和，沙漠 0；含港口小加成）
function vertPotential(s, v) {
  let pts = 0;
  for (const hi of VERTICES[v].hexes) {
    const h = s.hexes[hi];
    pts += h.number === null ? 0 : DOTS[h.number] || 0;
  }
  return pts;
}

// bot 入口：微阶段优先，再走掷骰 / 主行动
export function bot(s, legal) {
  if (!legal.length) return null;
  if (s.pending) return botPending(s, legal);
  if (s.phase === 'roll') return legal[0];
  return botMain(s, legal);
}

// botPending 微阶段决策分发
function botPending(s, legal) {
  const kind = s.pending.kind;
  if (kind === 'setupSettle') return bestOf(legal, (a) => vertPotential(s, a.v) + harborBonus(s, a.v));
  if (kind === 'setupRoad') return bestOf(legal, (a) => roadEdgeScore(s, a.e, s.pending.seat));
  if (kind === 'discard') return pickDiscard(s, legal);
  if (kind === 'robber') return pickRobberHex(s, legal);
  if (kind === 'steal') return pickSteal(s, legal);
  if (kind === 'freeRoad') return bestOf(legal, (a) => roadEdgeScore(s, a.e, s.pending.seat));
  if (kind === 'yop') return bestOf(legal, (a) => needOf(s, s.pending.seat, a.res));
  if (kind === 'mono') return bestOf(legal, (a) => othersHold(s, a.res));
  if (kind === 'tradeOffer') return decideOffer(s);
  return legal[0];
}

// harborBonus 港口顶点小加成（专属港对应资源潜力时更高，这里统一 +0.3）
function harborBonus(s, v) {
  const ok = s.harbors.some((h) => EDGES[h.edge].a === v || EDGES[h.edge].b === v);
  return ok ? 0.3 : 0;
}

// roadEdgeScore 边扩展价值：远端顶点潜力（朝高产与开阔方向铺路）
function roadEdgeScore(s, e, seat) {
  const { a, b } = EDGES[e];
  const va = vertPotential(s, a);
  const vb = vertPotential(s, b);
  const ownA = s.buildings[a] && s.buildings[a].seat === seat;
  const ownB = s.buildings[b] && s.buildings[b].seat === seat;
  return (ownA ? vb : ownB ? va : va + vb);
}

// bestOf 按估值取最大（并列取先出现）
function bestOf(legal, score) {
  let best = legal[0];
  let bestV = -Infinity;
  for (const a of legal) {
    const v = score(a);
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// goalCost 当前最优先建造目标成本（城 > 村 > 卡）
function goalCost(s, seat) {
  const p = s.players[seat];
  if (p.settlements.length > 0) return COST_CITY;
  return COST_SETTLEMENT;
}

// needOf 座位对某资源的缺口（目标成本 − 持有）
function needOf(s, seat, res) {
  const p = s.players[seat];
  const cost = goalCost(s, seat);
  return Math.max(0, cost[res] - p.res[res]);
}

// othersHold 其他家合计持有量（垄断目标）
function othersHold(s, res) {
  return s.players.reduce((a, p) => (p.seat === s.pending.seat ? a : a + p.res[res]), 0);
}

// pickDiscard 弃牌：弃目标盈余最大的资源
function pickDiscard(s, legal) {
  const seat = s.pending.seat;
  return bestOf(legal, (a) => s.players[seat].res[a.res] - needOf(s, seat, a.res));
}

// pickRobberHex 强盗格：对手产出点数 − 己方产出点数 最大（须移动）
function pickRobberHex(s, legal) {
  const me = s.pending.seat;
  return bestOf(legal, (a) => {
    let v = 0;
    for (const vtx of s.hexes[a.hex].verts) {
      const b = s.buildings[vtx];
      if (!b) continue;
      const h = s.hexes[a.hex];
      const dots = h.number === null ? 0 : DOTS[h.number] || 0;
      v += (b.seat === me ? -1 : 1) * dots * (b.city ? 2 : 1);
    }
    return v;
  });
}

// pickSteal 抢牌：领跑者优先，资源按目标缺口
function pickSteal(s, legal) {
  const leader = leaderSeat(s);
  return bestOf(legal, (a) => (a.victim === leader ? 3 : 0) + needOf(s, s.pending.seat, a.res));
}

// leaderSeat 当前 VP 最高他方
function leaderSeat(s) {
  let best = 0;
  let bestV = -1;
  for (const p of s.players) {
    const v = p.settlements.length + 2 * p.cities.length
      + p.dev.filter((c) => c.t === 'vp').length;
    if (v > bestV) { bestV = v; best = p.seat; }
  }
  return best;
}

// decideOffer AI 收到交易提议：收到的对目标缺口大、付出的盈余大则接受
function decideOffer(s) {
  const pd = s.pending;
  const me = s.players[pd.seat];
  let gain = 0;
  let loss = 0;
  pd.get.forEach((c, i) => { if (c > 0) gain += c * (1 + needOf(s, pd.seat, i)); });
  pd.give.forEach((c, i) => {
    if (c > 0) loss += c * (1 + Math.max(0, me.res[i] - needOf(s, pd.seat, i) - c));
  });
  return gain >= loss ? { kind: 'tradeAccept' } : { kind: 'tradeDecline' };
}

// —— 主阶段决策 ——

// botMain 主行动：城 > 村 > 卡 > 骑士 > 修路 > 银行交易凑料 > 过牌
function botMain(s, legal) {
  const by = (k) => legal.filter((a) => a.kind === k);
  const tries = [
    () => pickCity(s, by('city')),
    () => pickSettlement(s, by('settlement')),
    () => pickDev(s, by('buyDev')),
    () => pickKnight(s, by('playKnight')),
    () => pickOtherDev(s, legal),
    () => pickRoad(s, by('road')),
    () => pickBankForGoal(s, by('bank')),
  ];
  for (const fn of tries) {
    const a = fn();
    if (a) return a;
  }
  return by('endTurn')[0] || legal[legal.length - 1];
}

// pickCity 升城（能升就升，最接近获胜时优先）
function pickCity(s, legal) {
  return legal.length ? legal[0] : null;
}

// pickSettlement 建村（选产出潜力最高的点）
function pickSettlement(s, legal) {
  return legal.length ? bestOf(legal, (a) => vertPotential(s, a.v) + harborBonus(s, a.v)) : null;
}

// pickDev 买发展卡：手头宽裕（>4 张）或已无村庄点时买
function pickDev(s, legal) {
  if (!legal.length) return null;
  const p = s.players[s.cur];
  const hand = p.res.reduce((a, b) => a + b, 0);
  if (hand > 4 || p.settlements.length === 5) return legal[0];
  return null;
}

// pickKnight 打骑士：手上有就打（抢最大军队）
function pickKnight(s, legal) {
  return legal.length ? legal[0] : null;
}

// pickOtherDev 打修路/丰年/垄断（有就择机打）
function pickOtherDev(s, legal) {
  const yop = legal.find((a) => a.kind === 'playYop');
  if (yop) return yop;
  const mono = legal.find((a) => a.kind === 'playMono');
  if (mono) return mono;
  return legal.find((a) => a.kind === 'playRoadBuild') || null;
}

// pickRoad 修路：有村庄可扩（无连路空点）或冲最长路时铺
function pickRoad(s, legal) {
  if (!legal.length) return null;
  const p = s.players[s.cur];
  if (p.settlements.length >= 5) return null; // 无村可建就不铺路
  return bestOf(legal, (a) => roadEdgeScore(s, a.e, s.cur));
}

// pickBankForGoal 银行交易：目标只差 1 张时用盈余换
function pickBankForGoal(s, legal) {
  if (!legal.length) return null;
  const p = s.players[s.cur];
  for (const cost of [COST_CITY, COST_SETTLEMENT, COST_DEV]) {
    const missing = RESOURCES.filter((r) => p.res[r] < cost[r]);
    if (missing.length !== 1) continue;
    const need = cost[missing[0]] - p.res[missing[0]];
    if (need !== 1) continue;
    const give = RESOURCES.filter((r) => r !== missing[0])
      .find((r) => legal.some((a) => a.kind === 'bank' && a.give === r && a.get === missing[0]));
    if (give !== undefined) {
      return legal.find((a) => a.kind === 'bank' && a.give === give && a.get === missing[0]);
    }
  }
  return null;
}
