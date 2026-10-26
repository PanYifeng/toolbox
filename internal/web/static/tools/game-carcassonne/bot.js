// 卡卡颂机器人（同步启发式）：
// 落块——模拟每种摆法，估即时完成得分 + 可派随从的后续潜力 - 助涨对手惩罚；
// 派随从——按特征潜在价值打分（城市 > 修道院 > 农田 > 道路），低于阈值留手。
// 决策只读 state（含确定性平手加成），联机重放两端一致。

import {
  apply, legalActions, cityComp, roadComp, farmComp, compMeeples,
} from './engine.js';
import { TILES } from './data-tiles.js';

const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W

// bot 入口：落块阶段选摆法，随从阶段选特征或跳过
export function bot(s, legal) {
  if (!legal || !legal.length) return null;
  const places = legal.filter((a) => a.kind === 'place');
  if (places.length) return bestPlace(s, places);
  return bestMeeple(s, legal);
}

// —— 落块评估 ——

// bestPlace 逐摆法估值取最优（确定性平手加成，联机两端一致）
function bestPlace(s, places) {
  const me = s.turn;
  let best = null;
  let bestV = -Infinity;
  for (const a of places) {
    const tie = ((s.log.length * 31 + a.x * 7 + a.y * 13 + a.r * 3) % 100) / 10000;
    const v = placeValue(s, a) + tie;
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

// placeValue 摆法价值：即时得分×10 + 随从潜力×2 + 延伸己方分量 - 助涨对手×8
function placeValue(s, a) {
  const me = s.turn;
  const sim = apply(s, a);
  let v = (sim.players[me].score - s.players[me].score) * 10;
  let oppGain = 0;
  sim.players.forEach((p, i) => {
    if (i !== me) oppGain += p.score - s.players[i].score;
  });
  v -= oppGain * 8;
  if (sim.phase === 'meeple') {
    let mv = 0;
    for (const o of legalActions(sim)) {
      if (o.kind === 'meeple') mv = Math.max(mv, featPotential(sim, o));
    }
    v += mv * 2;
  }
  v += myExtendBonus(s, a);
  return v;
}

// myExtendBonus 延伸己方已驻守的开放城市/道路分量 → 后续得分潜力
function myExtendBonus(s, a) {
  const me = s.turn;
  const t = TILES[s.current];
  let bonus = 0;
  for (let e = 0; e < 4; e++) {
    const nc = s.board[(a.x + DIR[e][0]) + ',' + (a.y + DIR[e][1])];
    if (!nc) continue;
    const ne = (e + 2) % 4;
    const ty = t.e[(e - a.r + 4) % 4];
    const nf = ty === 'C'
      ? TILES[nc.t].edgeCity[(ne - nc.r + 4) % 4]
      : ty === 'R' ? TILES[nc.t].edgeRoad[(ne - nc.r + 4) % 4] : -1;
    if (nf < 0) continue;
    const comp = ty === 'C'
      ? cityComp(s, a.x + DIR[e][0], a.y + DIR[e][1], nf)
      : roadComp(s, a.x + DIR[e][0], a.y + DIR[e][1], nf);
    if (comp.open) {
      const counts = compMeeples(comp.members);
      if (counts[me]) bonus += 2;
    }
  }
  return bonus;
}

// —— 随从评估 ——

// featPotential 特征潜在价值：完成回收 = 即得分；开放 = 期望封顶估值
function featPotential(s, o) {
  const cell = s.board[o.x + ',' + o.y];
  const feat = TILES[cell.t].feats[o.f];
  const tilesOf = (comp) => new Set(comp.members.map((m) => m.x + ',' + m.y)).size;
  const pennantsOf = (comp) => comp.members.reduce((a, m) => a + (m.feat.p || 0), 0);
  if (feat.k === 'M') {
    let miss = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        if (!s.board[(o.x + dx) + ',' + (o.y + dy)]) miss++;
      }
    }
    return 9 - miss * 1.2;
  }
  if (feat.k === 'C') {
    const comp = cityComp(s, o.x, o.y, o.f);
    if (!comp.open) return tilesOf(comp) * 2 + pennantsOf(comp) * 2;
    return Math.min(12, tilesOf(comp) * 2 + pennantsOf(comp) * 2 + 2);
  }
  if (feat.k === 'R') {
    const comp = roadComp(s, o.x, o.y, o.f);
    if (!comp.open) return tilesOf(comp);
    return Math.min(5, tilesOf(comp) + 1.5);
  }
  // 农田：相邻城市加权（完成 3/个、开放 1.2/个），封顶 12
  const comp = farmComp(s, o.x, o.y, o.f);
  const seen = new Set();
  let val = 0;
  for (const m of comp.members) {
    for (const ci of TILES[m.cell.t].feats[m.f].adj) {
      const sig = m.x + ',' + m.y + ':' + ci;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const cc = cityComp(s, m.x, m.y, ci);
      val += cc.open ? 1.2 : 3;
    }
  }
  return Math.min(12, val);
}

// bestMeeple 随从阶段：最高估值过阈值才放；早期随从吃紧时要求更高
function bestMeeple(s, legal) {
  const p = s.players[s.turn];
  const opts = legal.filter((a) => a.kind === 'meeple');
  if (!opts.length || p.meeples <= 0) return { kind: 'skip' };
  let best = null;
  let bestV = -Infinity;
  for (const o of opts) {
    let v = featPotential(s, o);
    const feat = TILES[s.board[o.x + ',' + o.y].t].feats[o.f];
    if (feat.k === 'F') v -= 1.5; // 农夫终局才回收，机会成本高
    if (feat.k === 'R') v -= 1;   // 道路期望低
    if (s.deck.length > 30 && p.meeples <= 2) v -= 2; // 早期留手
    if (v > bestV) {
      bestV = v;
      best = o;
    }
  }
  const threshold = s.deck.length > 30 ? 3.5 : s.deck.length > 10 ? 2 : 0.5;
  return bestV >= threshold ? best : { kind: 'skip' };
}
