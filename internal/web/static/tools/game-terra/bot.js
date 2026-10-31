// 神秘大地 AI：主行动 1-ply 评估（模拟 apply 后按局面价值取最优）；
// 选派系/初始放置/微阶段用确定性小启发式。
import * as engine from './engine.js';
import { BONUS_TILES, FAVOR_TILES, CULT_TRACKS, BUILDING_STRENGTH, TOWN_TILES } from './tables.js';
import { ADJACENCY } from './map-data.js';
import { factionById } from './data-factions.js';

// BLD_VALUE 建筑长期价值（评估用，含后续轮收入折算）
const BLD_VALUE = { D: 4, TP: 6.5, TE: 8, SH: 7.5, SA: 9.5 };

// TOWN_VP_EST 建镇期望分（板块 VP 均值 7 + 终局网络收益折算）
const TOWN_VP_EST = 9;

// soft 资源软上限：过量囤积（工人 10+/金币 12+）几乎换不出价值，
// 线性估值会让 1-ply 觉得「留着不花」更优而从第 3 轮起全程空过
function soft(v, cap) { return Math.min(v, cap) + Math.max(0, v - cap) * 0.1; }

// bot 框架入口：按阶段分发
export function bot(state, legal) {
  if (!legal.length) return null;
  switch (state.phase.kind) {
    case 'chooseFaction': return botFaction(state, legal);
    case 'placeDwelling': return botPlace(state, legal);
    case 'pickBonus': return botBonus(state, legal);
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

// botBonus 开局奖励板块：按收入估值取最高（确定性）
function botBonus(state, legal) {
  let best = legal[0];
  let bestV = -Infinity;
  for (const a of legal) {
    const v = tileBonus(a.bonus);
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// botResolve 微阶段：城镇板块取 VP 最高；邪教选最低轨迹；恩惠按启发式
function botResolve(state, legal) {
  const item = state.pending[0];
  const p = state.players[item.seat];
  if (item.kind === 'townTile') {
    let best = legal[0];
    let bestV = -Infinity;
    for (const a of legal) {
      const v = townTileValue(a.idx);
      if (v > bestV) { bestV = v; best = a; }
    }
    return best;
  }
  if (item.kind === 'cultChoice') {
    let best = legal[0];
    let bestV = Infinity;
    for (const a of legal) {
      if (p.cult[a.track] < bestV) { bestV = p.cult[a.track]; best = a; }
    }
    return best;
  }
  if (item.kind === 'favorChoice') {
    let best = legal[0];
    let bestV = -Infinity;
    for (const a of legal) {
      const tile = FAVOR_TILES.find((f) => f.id === a.favor);
      let v = 0;
      if (tile.advance) v += Object.values(tile.advance)[0] * 0.9;
      if (tile.income) {
        v += (tile.income.coins || 0) * 0.3;
        v += (tile.income.workers || 0) * 0.5;
        v += (tile.income.priests || 0) * 0.8;
        v += (tile.income.powerGain || 0) * 0.25;
      }
      if (tile.vp) v += Object.values(tile.vp)[0] * 0.4;
      if (v > bestV) { bestV = v; best = a; }
    }
    return best;
  }
  return legal[0];
}

// townTileValue 城镇板块估值：VP + 资源增益折算
function townTileValue(idx) {
  const tw = TOWN_TILES[idx];
  if (!tw) return 0;
  let v = tw.vp;
  const g = tw.gain || {};
  v += (g.coins || 0) * 0.3 + (g.workers || 0) * 0.5 + (g.priests || 0) * 0.8
    + (g.powerGain || 0) * 0.25 + (g.fire || 0) * 0.7 * 4;
  return v;
}

// botAct 主行动：变体去重后 1-ply 评估；pass 加板块补偿
function botAct(state, legal) {
  const seat = state.phase.cur;
  const acts = dedupeVariants(legal);
  let best = null;
  let bestV = -Infinity;
  for (const a of acts) {
    // 免费子行动海量且多为等价小转换：只保留 coins→vp（直接得分），
    // 其余 convert 与 burn 交给需要时的付费行动自然发生
    if ((a.kind === 'convert' && !(a.from === 'coins' && a.to === 'vp')) || a.kind === 'burn') continue;
    const s2 = engine.apply(state, a);
    let v = evaluate(s2, seat);
    if (a.kind === 'pass') v += tileBonus(a.bonus) + 0.3;
    if (v > bestV) { bestV = v; best = a; }
  }
  // 兜底：全被过滤时取第一个
  return best || legal[0];
}

// dedupeVariants 同一（格,目标）的升级按恩惠去重； priestSend 每轨只留首个空位；
// powerAction 桥位变体只留首个
function dedupeVariants(legal) {
  const out = [];
  const seen = new Set();
  for (const a of legal) {
    let key = null;
    if (a.kind === 'upgrade') key = `up|${a.hex}|${a.to}`;
    else if (a.kind === 'priestSend') key = `ps|${a.track}`;
    else if (a.kind === 'powerAction' && a.a !== undefined) key = `pa|${a.slot}`;
    else if (a.kind === 'bridge') key = 'bridge';
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(a);
  }
  return out;
}

// evaluate 局面价值（当前资源 + 建筑投资 + 邪教期望 + 城镇进度 + 领先差）
function evaluate(s, seat) {
  const p = s.players[seat];
  let v = p.vp + soft(p.coins, 12) * 0.25 + soft(p.workers, 10) * 0.4 + soft(p.priests, 3) * 1.2 + soft(p.spades, 3) * 1.2;
  v += p.power.iii * .5 + p.power.ii * 0.25 + p.power.i * 0.05;
  v += p.shipping * 0.8;
  for (const b of Object.values(p.buildings)) v += BLD_VALUE[b];
  for (const tr of CULT_TRACKS) v += p.cult[tr] * 0.7;
  v += (p.towns || []).length * 2;
  // 城镇进度：用内部 townEdges 找连通组，强度和 < 7 时按比例给部分分
  try {
    const edges = engine.townEdges(s, p);
    const visited = new Set();
    for (const start of Object.keys(edges)) {
      if (visited.has(start)) continue;
      let strength = 0, n = 0;
      const stack = [start];
      visited.add(start);
      while (stack.length) {
        const id = stack.pop();
        strength += BUILDING_STRENGTH[p.buildings[id]] || 0;
        n++;
        for (const nid of edges[id]) {
          if (!visited.has(nid)) { visited.add(nid); stack.push(nid); }
        }
      }
      if (strength < 7) v += (strength / 7) * TOWN_VP_EST * 0.6;
    }
  } catch { /* townEdges 失败不影响主评估 */ }
  for (const q of s.players) {
    if (q.seat !== seat) v += (p.vp - q.vp) * 0.15;
  }
  return v;
}

// tileBonus 奖励板块收入估值（pass 决策用）
function tileBonus(bonusId) {
  const tile = BONUS_TILES.find((b) => b.id === bonusId);
  if (!tile) return 0;
  const inc = tile.income || {};
  return (inc.coins || 0) * 0.3 + (inc.workers || 0) * 0.5 + (inc.priests || 0) * 1 + (inc.powerGain || 0) * 0.3;
}
