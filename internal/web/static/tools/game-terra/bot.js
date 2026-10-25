// 神秘大地 AI：主行动 1-ply 评估（模拟 apply 后按局面价值取最优）；
// 选派系/初始放置/微阶段用确定性小启发式。
import * as engine from './engine.js';
import { BUILDINGS, BONUS_TILES, FAVOR_TILES, CULT_TRACKS, TOWN_VP } from './tables.js';
import { ADJACENCY } from './map-data.js';
import { factionById } from './data-factions.js';

// BLD_VALUE 建筑长期价值（评估用）
const BLD_VALUE = { D: 3, TP: 4.5, TP2: 5, TE: 6, SH: 5, SA: 7 };

// bot 框架入口：按阶段分发
export function bot(state, legal) {
  if (!legal.length) return null;
  switch (state.phase.kind) {
    case 'chooseFaction': return botFaction(state, legal);
    case 'placeDwelling': return botPlace(state, legal);
    case 'resolve': return botResolve(state, legal);
    default: return botAct(state, legal);
  }
}

// botFaction 选派系：按座位错开的确定性偏好
function botFaction(state, legal) {
  const seat = state.players[engine.currentPlayer(state)].seat;
  return legal[(seat * 3 + state.takenFactions.length) % legal.length];
}

// botPlace 初始民居：邻接同地形格多者优先，兼顾贴己方、避对手
function botPlace(state, legal) {
  const p = state.players[engine.currentPlayer(state)];
  const home = factionById(p.faction).terrain;
  let best = legal[0];
  let bestV = -Infinity;
  for (const a of legal) {
    let v = 0;
    for (const nid of ADJACENCY[a.hex]) {
      const h = state.hexes[nid];
      if (h.terrain === home) v += 2;
      if (h.owner === p.seat) v += 1.5;
      if (h.owner !== null && h.owner !== p.seat) v -= 0.5;
    }
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// botResolve 微阶段：邪教选最低轨迹；女巫民居贴己方建筑最多处
function botResolve(state, legal) {
  const item = state.pending[0];
  const p = state.players[item.seat];
  if (item.kind === 'cultChoice') {
    let best = legal[0];
    let bestV = Infinity;
    for (const a of legal) {
      if (p.cult[a.track] < bestV) { bestV = p.cult[a.track]; best = a; }
    }
    return best;
  }
  let best = legal.find((a) => a.kind === 'witchSkip') || legal[0];
  let bestV = 0;
  for (const a of legal) {
    if (a.kind !== 'witchDwelling') continue;
    const v = ADJACENCY[a.hex].filter((nid) => p.buildings[nid]).length;
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// botAct 主行动：恩惠变体去重后 1-ply 评估
function botAct(state, legal) {
  const seat = state.phase.cur;
  const acts = dedupeFavors(legal, state.players[seat]);
  let best = legal[0];
  let bestV = -Infinity;
  for (const a of acts) {
    const s2 = engine.apply(state, a);
    let v = evaluate(s2, seat);
    if (a.kind === 'pass') v += tileBonus(a.bonus); // pass 偏向更好的奖励板块
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// dedupeFavors TE/SA 升级按（格,目标）去重，只保留启发式挑中的恩惠变体
function dedupeFavors(legal, p) {
  const out = [];
  const seen = new Set();
  for (const a of legal) {
    if (a.kind !== 'upgrade' || (a.to !== 'TE' && a.to !== 'SA')) { out.push(a); continue; }
    const g = `${a.hex}|${a.to}`;
    if (seen.has(g)) continue;
    seen.add(g);
    out.push(pickFavor(legal, p, a));
  }
  return out;
}

// pickFavor 恩惠挑选：优先最低邪教轨迹，其次按资源稀缺度
function pickFavor(legal, p, base) {
  const cands = legal.filter((x) => x.kind === 'upgrade' && x.hex === base.hex && x.to === base.to);
  let best = cands[0];
  let bestV = -Infinity;
  for (const c of cands) {
    const tile = FAVOR_TILES.find((f) => f.id === c.favor);
    let v = -p.cult[tile.track] * 2;
    if (tile.income.workers && p.workers < 4) v += 2;
    if (tile.income.coins && p.coins < 6) v += 2;
    if (tile.income.powerGain) v += 1;
    if (v > bestV) { bestV = v; best = c; }
  }
  return best;
}

// evaluate 局面价值（当前资源 + 建筑投资 + 邪教期望 + 城镇进度 + 领先差）
function evaluate(s, seat) {
  const p = s.players[seat];
  let v = p.vp + p.coins * 0.25 + p.workers * 0.4 + p.priests * 1.2 + p.spades * 1.2;
  v += p.power.iii * 0.5 + p.power.ii * 0.25 + p.power.i * 0.05;
  v += p.shipping * 0.8;
  for (const b of Object.values(p.buildings)) v += BLD_VALUE[b];
  for (const tr of CULT_TRACKS) v += p.cult[tr] * 0.7;
  v += p.towns.length * 2;
  for (const g of engine.townGroups(s, p)) {
    const val = g.reduce((a, id) => a + BUILDINGS[p.buildings[id]].town, 0);
    if (val < 7) v += (val / 7) * TOWN_VP * 0.6;
  }
  for (const q of s.players) {
    if (q.seat !== seat) v += (p.vp - q.vp) * 0.15;
  }
  return v;
}

// tileBonus 奖励板块收入估值（pass 决策用）
function tileBonus(bonusId) {
  const inc = BONUS_TILES[bonusId].income;
  return (inc.coins || 0) * 0.3 + (inc.workers || 0) * 0.5 + (inc.priests || 0) * 1 + (inc.powerGain || 0) * 0.3;
}
