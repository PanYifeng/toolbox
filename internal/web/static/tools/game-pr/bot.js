// 波多黎各启发式 AI：按阶段分发 + 局面启发，追求「不犯低级错误」的中等强度。
// 纯函数、确定性（无 Math.random）：bot(state, legal) -> legal 中一个动作。
import { GOODS, GOOD_VALUE, BUILDING_BY_ID, hasOccupied } from './data.js';
import { prodCapacity, buildCost, sellPrice } from './engine.js';

export function bot(s, legal) {
  switch (s.phase.kind) {
    case 'pickRole': return botPickRole(s, legal);
    case 'settler': return botSettler(s, legal);
    case 'builder': return botBuilder(s, legal);
    case 'mayor': return botMayor(s);
    case 'craftsman': return botCraftsman(legal);
    case 'trader': return botTrader(s, legal);
    case 'captain': return botCaptain(s, legal);
    case 'discard': return botDiscard(s);
    default: return legal[0];
  }
}

// —— 选角 ——

// botPickRole 角色启发价值 + 悬赏金币 + 确定性微噪声（避免每局行棋完全一致）
function botPickRole(s, legal) {
  const p = s.players[s.phase.cur];
  let best = legal[0], bestScore = -1e9;
  for (const a of legal) {
    const role = s.roles.find((r) => r.id === a.role);
    const sc = roleScore(s, p, a.role) + role.bonus * 0.45 + noise(s, a.role);
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best;
}

function roleScore(s, p, roleId) {
  const goodsTotal = GOODS.reduce((a, g) => a + p.goods[g], 0);
  const capacity = GOODS.reduce((a, g) => a + prodCapacity(p, g), 0);
  const emptyCity = p.city.filter((c) => !c.id).length;
  const circles = emptyCirclesOf(p);
  const sellable = GOODS.some((g) => p.goods[g] > 0 && s.tradingHouse.includes(null)
    && (hasOccupied(p, 'office') || !s.tradingHouse.includes(g)));
  switch (roleId) {
    case 'settler': return p.island.length < 7 ? 3.5 - p.island.length * 0.25 : 0.4;
    case 'builder': return emptyCity > 0 ? 1.2 + Math.min(p.doubloons * 0.25, 3) : 0.2;
    case 'mayor': return circles > 0 ? Math.min(circles * 0.5, 3) : 0.1;
    case 'craftsman': return capacity > 0 ? 1.5 + capacity * 0.6 : 0.1;
    case 'trader': return sellable ? 2.2 : 0.2;
    case 'captain': return goodsTotal >= 2 ? 3.2 : goodsTotal === 1 ? 1.6 : 0.1;
    default: return 1; // prospector
  }
}

// noise 确定性微噪声：由 rng 计数器与角色名派生
function noise(s, roleId) {
  return ((s.rng.counter * 31 + roleId.length * 17) % 13) / 40;
}

// —— 开拓者 ——

function botSettler(s, legal) {
  const p = s.players[s.phase.cur];
  let best = legal[legal.length - 1], bestScore = 0; // 兜底取 pass（排在最后）
  for (const a of legal) {
    let sc = 0;
    if (a.tile === 'quarry') sc = (hasOccupied(p, 'construction_hut') || s.round <= 2) ? 2.6 : 0.9;
    else if (a.tile === 'random') sc = 1.1;
    else if (a.tile !== 'pass') sc = tileScore(p, s.offers[a.tile]);
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best;
}

// tileScore 地块价值：匹配已占生产建筑 > 玉米（免建筑即产）> 匹配已有建筑 > 其他
function tileScore(p, g) {
  if (g === 'corn') return 2.4;
  const hasMill = p.city.some((c) => c.id && BUILDING_BY_ID[c.id].prod === g);
  const millOcc = p.city.some((c) => c.id && c.occ && BUILDING_BY_ID[c.id].prod === g);
  if (millOcc) return 3;
  if (hasMill) return 2.6;
  return p.island.some((t) => t.type === g) ? 1.6 : 1.2;
}

// —— 建筑师 ——

function botBuilder(s, legal) {
  const p = s.players[s.phase.cur];
  const chooser = p.seat === s.phase.chooser;
  let best = null, bestScore = 0.9; // 价值低于阈值宁可省钱 pass
  for (const a of legal) {
    if (a.kind !== 'build') continue;
    const sc = buildingValue(p, a.building) - buildCost(p, a.building, chooser) * 0.12;
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best || legal.find((a) => a.kind === 'buildPass');
}

// buildingValue 建筑启发价值（不含费用）；大建筑在城市将满时才值得抢
function buildingValue(p, id) {
  const b = BUILDING_BY_ID[id];
  const goodsTotal = GOODS.reduce((a, g) => a + p.goods[g], 0);
  if (b.type === 'prod') {
    const dup = p.city.some((c) => c.id && BUILDING_BY_ID[c.id].prod === b.prod);
    if (dup) return 0.2;
    return 1.5 + p.island.filter((t) => t.type === b.prod).length * 1.2;
  }
  if (b.type === 'large') return p.city.filter((c) => !c.id).length <= 4 ? 4.2 : 0.3;
  switch (id) {
    case 'small_market': return 2.2;
    case 'large_market': case 'factory': return 2.4;
    case 'harbor': return goodsTotal >= 2 ? 2.6 : 1.4;
    case 'wharf': return 2.6;
    case 'small_warehouse': case 'large_warehouse': return 1.5;
    default: return 1.4;
  }
}

// —— 市长 ——

// botMayor 按优先级安置：已占建筑匹配的岛格 > 已占岛格匹配的磨坊 > 其余建筑圆圈 > 其余岛格
function botMayor(s) {
  const p = s.players[s.phase.cur];
  const count = Math.min((s.phase.pending[p.seat] || 0) + p.san, emptyCirclesOf(p));
  const assigns = mayorTargets(p).slice(0, count).map((t) => ({ where: t.where, i: t.i }));
  return { kind: 'mayorPlace', assigns };
}

// mayorTargets 安置目标展开到圆圈粒度（建筑每圆圈一个目标；大建筑只认首格，第 2 格为影子格）
function mayorTargets(p) {
  const tiles = p.island.map((t, i) => ({ t, i })).filter((x) => !x.t.occ);
  const slots = p.city
    .map((c, i) => ({ c, i, b: c.id ? BUILDING_BY_ID[c.id] : null }))
    .filter((x) => x.b && x.c.occ < x.b.circles)
    // 同 id 的第 2 格是影子格，不承载圆圈
    .filter((x) => p.city.findIndex((c) => c.id === x.c.id) === x.i);
  const millFor = (g) => p.city.some((x) => x.id && x.occ >= BUILDING_BY_ID[x.id].circles && BUILDING_BY_ID[x.id].prod === g);
  const tileFor = (g) => p.island.some((t) => t.type === g && t.occ);
  const out = [];
  const tileDone = new Set(), slotDone = new Set();
  const pushTile = (x) => { if (tileDone.has(x.i)) return; tileDone.add(x.i); out.push({ where: 'island', i: x.i }); };
  const pushSlot = (x) => {
    if (slotDone.has(x.i)) return; slotDone.add(x.i);
    for (let k = 0; k < x.b.circles - x.c.occ; k++) out.push({ where: 'city', i: x.i });
  };
  for (const x of tiles) if (x.t.type === 'corn' || millFor(x.t.type)) pushTile(x);
  for (const x of slots) if (x.b.prod && tileFor(x.b.prod)) pushSlot(x);
  for (const x of slots) pushSlot(x);
  for (const x of tiles) pushTile(x);
  return out;
}

// —— 工匠 / 商人 / 船长 ——

function botCraftsman(legal) {
  const extras = legal.filter((a) => a.kind === 'craftsmanExtra');
  if (!extras.length) return legal[0];
  extras.sort((a, b) => GOOD_VALUE[b.good] - GOOD_VALUE[a.good]);
  return extras[0];
}

function botTrader(s, legal) {
  const p = s.players[s.phase.cur];
  const chooser = p.seat === s.phase.chooser;
  let best = null, bestPrice = 0; // 卖价 0 的交易无意义，兜底 pass
  for (const a of legal) {
    if (a.kind !== 'sell') continue;
    const price = sellPrice(p, a.good, chooser);
    if (price > bestPrice) { bestPrice = price; best = a; }
  }
  return best || legal.find((a) => a.kind === 'sellPass');
}

// botCaptain 有船可装先装（量大优先，恰好装满加分），否则码头，否则 pass
function botCaptain(s, legal) {
  const ships = legal.filter((a) => a.kind === 'ship');
  if (ships.length) {
    let best = null, bestScore = -1;
    for (const a of ships) {
      const exact = s.ships[a.ship].load + a.count === s.ships[a.ship].cap ? 0.6 : 0;
      const sc = a.count + GOOD_VALUE[a.good] * 0.08 + exact;
      if (sc > bestScore) { bestScore = sc; best = a; }
    }
    return best;
  }
  const wharfs = legal.filter((a) => a.kind === 'wharf');
  if (wharfs.length) {
    wharfs.sort((a, b) => b.count + GOOD_VALUE[b.good] * 0.1 - (a.count + GOOD_VALUE[a.good] * 0.1));
    return wharfs[0];
  }
  return legal.find((a) => a.kind === 'captainPass') || legal[0];
}

// —— 弃货 ——

// botDiscard 弃货（✅ 对照 engine keepFeasible 语义）：
// 可全保留时全保留（goodsAllFit）；否则按「余量×价值」选出仓库锁定种类（小仓 1 种/大仓 2 种），
// 被锁种类全保留，恰留一种 1 件货上风 ros，其余清空。
function botDiscard(s) {
  const p = s.players[s.phase.cur];
  let slots = 0;
  if (hasOccupied(p, 'small_warehouse')) slots += 1;
  if (hasOccupied(p, 'large_warehouse')) slots += 2;
  const kinds = GOODS.filter((g) => p.goods[g] > 0);
  const keep = {};
  const allFit = kinds.length <= slots
    || (kinds.length === slots + 1 && kinds.some((g) => p.goods[g] === 1));
  if (allFit) {
    for (const g of kinds) keep[g] = p.goods[g];
    return { kind: 'discard', keep };
  }
  // 须选 slots 种全保留 + 1 种留 1 件（或全保留种类中恰 1 件者作风 ros）
  const byValue = [...kinds].sort((a, b) => GOOD_VALUE[b] * p.goods[b] - GOOD_VALUE[a] * p.goods[a]);
  const locked = byValue.slice(0, slots);
  for (const g of kinds) keep[g] = locked.includes(g) ? p.goods[g] : 0;
  const rest = kinds.filter((g) => !locked.includes(g));
  if (rest.length) {
    // 余下种类中价值最高的留 1 件上风 ros（若某全保留种类恰 1 件也可作风 ros，优先显式指派简单方案）
    const windrose = rest.sort((a, b) => GOOD_VALUE[b] - GOOD_VALUE[a])[0];
    keep[windrose] = 1;
  } else if (byValue.some((g) => p.goods[g] === 1)) {
    // 全部种类被锁但仍有 slots+1 种（某种恰 1 件已可全保留）——不应发生，防御处理
    for (const g of kinds) keep[g] = p.goods[g];
  }
  return { kind: 'discard', keep };
}

// emptyCirclesOf 空圆圈数（engine 内部函数的同款实现，bot 独立计算避免依赖私有导出）
// 大建筑占 2 格但只有一组圆圈，按去重建筑计（第 2 格是影子格）
function emptyCirclesOf(p) {
  let n = p.island.filter((t) => !t.occ).length;
  const seen = new Set();
  for (const slot of p.city) {
    if (!slot.id || seen.has(slot.id)) continue;
    seen.add(slot.id);
    let occ = 0;
    for (const other of p.city) if (other.id === slot.id) occ = Math.max(occ, other.occ);
    n += BUILDING_BY_ID[slot.id].circles - Math.min(occ, BUILDING_BY_ID[slot.id].circles);
  }
  return n;
}
