// 波多黎各规则引擎：纯函数、state JSON-safe、零 DOM/i18n 依赖（node 可直接自测）。
// ✅ 规则已对照 dae-hany/PuertoRico_AI_Competition engine.py（注释含规则书原文引用）核对，2026-11。
// 架构：legalActions(state) 是唯一合法性来源；apply 深拷贝后推进；settle 循环自动
// 跳过「无真实决策」的微步骤（无可装之货、无可产之货、无可建之楼等），
// 保证轮到 currentPlayer 时 legalActions 必非空。
// 角色按「选择顺序」结算（✅ 对照 dae-hany：roleQueue 语义一致）。
import {
  GOODS, GOOD_VALUE, BUILDINGS, BUILDING_BY_ID, SETUP, PLANTATION_SUPPLY,
  QUARRY_SUPPLY, FACTORY_INCOME, hasOccupied, ROLE_NAMES, GOOD_NAMES,
} from './data.js';

const cl = (s) => JSON.parse(JSON.stringify(s));

// log 追加日志：seat=-1 为系统条目；args 中卡牌/货物等用 {zh,en} 数据对象，由 UI 层解析
function log(s, seat, key, args) { s.log.push({ seat, key, args: args || {} }); }

// rand 确定性伪随机（splitmix32 单步）：种子+计数器入 state，悔棋/存档/重放确定性
function rand(s) {
  s.rng.counter++;
  let t = (s.rng.seed + s.rng.counter * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function seatOrderFrom(start, n) { return Array.from({ length: n }, (_, i) => (start + i) % n); }

// —— 查询辅助 ——

function occIsland(p, type) { return p.island.filter((t) => t.type === type && t.occ).length; }

// emptyCircles 玩家全部空移民圆圈数（岛格 + 已建建筑的未满圆圈）
function emptyCircles(p) {
  let n = p.island.filter((t) => !t.occ).length;
  for (const slot of p.city) if (slot.id) n += BUILDING_BY_ID[slot.id].circles - slot.occ;
  return n;
}

// totalColonists 玩家移民总数（圣胡安 + 岛 + 城市）
function totalColonists(p) {
  let n = p.san;
  for (const t of p.island) if (t.occ) n++;
  for (const slot of p.city) if (slot.id) n += slot.occ;
  return n;
}

// prodCapacity 生产产能：min(已占种植园数, 已占匹配生产建筑圆圈数)；玉米免建筑
// ✅ 对照 dae-hany engine：生产按「每个圆圈一个移民」计，部分占用的建筑按已占圆圈数贡献产能
export function prodCapacity(p, good) {
  const plants = occIsland(p, good);
  if (good === 'corn') return plants;
  let circles = 0;
  for (const slot of p.city) {
    const b = slot.id ? BUILDING_BY_ID[slot.id] : null;
    if (b && b.prod === good) circles += Math.min(slot.occ, b.circles);
  }
  return Math.min(plants, circles);
}

// buildCost 建筑实际费用：建筑师特权 -1；每个已占采石场 -1，折扣上限 = 建筑 VP 值（所有建筑通用）
// ✅ 对照 dae-hany engine：max_q_reduction = BUILDING_DATA[b][1]（即印刷 VP），非「紫建筑至多 -1」
export function buildCost(p, buildingId, isChooser) {
  const b = BUILDING_BY_ID[buildingId];
  let c = b.cost - (isChooser ? 1 : 0) - Math.min(occIsland(p, 'quarry'), b.vp);
  return Math.max(0, c);
}

// sellPrice 卖价：货值 + 小市场 +1 + 大市场 +2 + 商人特权 +1
export function sellPrice(p, good, isChooser) {
  let v = GOOD_VALUE[good] + (hasOccupied(p, 'small_market') ? 1 : 0) + (hasOccupied(p, 'large_market') ? 2 : 0);
  if (isChooser) v += 1;
  return v;
}

// warehouseSlots 已占用仓库可锁定的货物种类数（小仓 1 种 / 大仓 2 种，可叠加 3 种）
function warehouseSlots(p) {
  let slots = 0;
  if (hasOccupied(p, 'small_warehouse')) slots += 1;
  if (hasOccupied(p, 'large_warehouse')) slots += 2;
  return slots;
}

// goodsAllFit 全保留是否可行（✅ 对照 dae-hany goods_all_fit）：
// 仓库可全保留的种类数 ≤ 现有货堆数，或恰多 1 堆且其中某堆仅 1 件（该堆上风 ros 即全保留）
export function goodsAllFit(p, goods) {
  const slots = warehouseSlots(p);
  const kinds = GOODS.filter((g) => goods[g] > 0);
  return kinds.length <= slots
    || (kinds.length === slots + 1 && kinds.some((g) => goods[g] === 1));
}

// keepFeasible 保留方案是否合法（✅ 对照 dae-hany CAPTAIN_STORE 语义）：
// 风 ros 仅存 1 桶（单一种类）；每个已占用仓库槽锁定 1 种货的全部；弃货时所有仓库槽必须用满。
// 全保留可行时强制全保留；否则方案须形如「slots 种全保留 + 1 种留 1 桶 + 其余 0」。
export function keepFeasible(p, keep) {
  const slots = warehouseSlots(p);
  const goods = p.goods;
  const kinds = GOODS.filter((g) => goods[g] > 0);
  for (const g of kinds) if ((keep[g] || 0) > goods[g]) return false;
  if (goodsAllFit(p, goods)) {
    return kinds.every((g) => (keep[g] || 0) === goods[g]);
  }
  const full = kinds.filter((g) => (keep[g] || 0) === goods[g]);
  const partial = kinds.filter((g) => (keep[g] || 0) > 0 && (keep[g] || 0) < goods[g]);
  if (partial.length > 1) return false;
  if (partial.length === 1) {
    // 情形 A：partial 即风 ros（恰留 1 桶），其余全保留种类须正好填满所有仓库槽
    return keep[partial[0]] === 1 && full.length === slots;
  }
  // 情形 B：无部分保留 → 风 ros 落在某个「恰 1 件且全保留」的种类上，仓库装其余全保留种类
  return full.length === slots + 1 && full.some((g) => goods[g] === 1);
}

// hasOverflow 船长阶段后是否须进入弃货流程（全保留不可行即超）
function hasOverflow(p) { return !goodsAllFit(p, p.goods); }

// —— 初始状态 ——

export function initialState(setup) {
  const n = setup.seats.length;
  const cfg = SETUP[n];
  const s = {
    players: setup.seats.map((seat, i) => ({
      // 开局每人在圣胡安放 1 移民（官方规则）
      ...seat, seat: i, doubloons: cfg.doubloons, vp: 0, san: 1,
      island: [{ type: cfg.plantations[i], occ: false }],
      city: Array.from({ length: 12 }, () => ({ id: null, occ: 0 })),
      goods: { corn: 0, indigo: 0, sugar: 0, tobacco: 0, coffee: 0 },
    })),
    round: 1, governor: 0,
    roles: ROLE_LIST(n),
    roleQueue: [],
    phase: { kind: 'pickRole', order: seatOrderFrom(0, n), idx: 0, cur: 0 },
    offers: [],
    plantationSupply: { ...PLANTATION_SUPPLY }, quarrySupply: QUARRY_SUPPLY,
    // 开局移民船装载 n 人；总数守恒：供应 = 总额 - 圣胡安 n - 船 n
    colonistShip: n, colonistSupply: cfg.colonists - 2 * n,
    tradingHouse: [null, null, null, null],
    ships: cfg.ships.map((cap) => ({ cap, good: null, load: 0 })),
    buildingStock: Object.fromEntries(BUILDINGS.map((b) => [b.id, b.stock])),
    vpSupply: cfg.vp,
    endTriggered: false, gameOver: false,
    log: [], rng: { seed: setup.seed || 1, counter: 0 },
  };
  log(s, -1, 'pr.log.start', { n });
  settle(s);
  return s;
}

function ROLE_LIST(n) {
  const ids = ['settler', 'builder', 'mayor', 'craftsman', 'trader', 'captain'];
  for (let i = 0; i < SETUP[n].prospectors; i++) ids.push('prospector');
  return ids.map((id) => ({ id, taken: null, bonus: 0 }));
}

// —— 对外接口 ——

export function currentPlayer(s) { return s.phase.cur; }
export function isGameOver(s) { return s.gameOver; }

export function score(s) {
  return s.players.map((p) => {
    const b = buildingScore(p);
    const parts = [['pr.score.chips', p.vp], ['pr.score.buildings', b.base]];
    if (b.guild) parts.push(['pr.score.guildHall', b.guild]);
    if (b.residence) parts.push(['pr.score.residence', b.residence]);
    if (b.fortress) parts.push(['pr.score.fortress', b.fortress]);
    if (b.customs) parts.push(['pr.score.customsHouse', b.customs]);
    if (b.cityHall) parts.push(['pr.score.cityHall', b.cityHall]);
    const total = p.vp + b.base + b.guild + b.residence + b.fortress + b.customs + b.cityHall;
    return { seat: p.seat, total, breakdown: parts };
  });
}

// buildingScore 终局建筑计分（✅ 对照 dae-hany scoring，逐条核对）：
// - 基础分 = 印刷 VP（vp 字段，非价格），不论是否占用
// - 大建筑须自身有移民，加成才计分
// - 行会馆：小生产建筑每座 +1，大生产建筑每座 +2
// - 官邸：按已占岛格数 ≤9→4 / 10→5 / 11→6 / 12→7
// - 要塞 floor(移民总数/3)；海关 floor(VP 筹码/4)；市政厅每紫建筑（含大建筑与自身）+1
function buildingScore(p) {
  const r = { base: 0, guild: 0, residence: 0, fortress: 0, customs: 0, cityHall: 0 };
  let smallProd = 0, largeProd = 0, violet = 0;
  for (const slot of p.city) {
    if (!slot.id) continue;
    const b = BUILDING_BY_ID[slot.id];
    r.base += b.vp;
    if (b.type === 'prod') {
      if (b.circles === 1) smallProd++; else largeProd++;
    } else violet++;
  }
  if (hasOccupied(p, 'guild_hall')) r.guild = smallProd * 1 + largeProd * 2;
  if (hasOccupied(p, 'city_hall')) r.cityHall = violet;
  if (hasOccupied(p, 'residence')) {
    const filled = p.island.filter((t) => t.occ).length;
    r.residence = filled <= 9 ? 4 : filled === 10 ? 5 : filled === 11 ? 6 : 7;
  }
  if (hasOccupied(p, 'fortress')) r.fortress = Math.floor(totalColonists(p) / 3);
  if (hasOccupied(p, 'customs_house')) r.customs = Math.floor(p.vp / 4);
  return r;
}

// —— 合法动作 ——

export function legalActions(s) {
  if (s.gameOver) return [];
  const ph = s.phase;
  const p = s.players[ph.cur];
  switch (ph.kind) {
    case 'pickRole': return s.roles.filter((r) => r.taken === null).map((r) => ({ kind: 'pickRole', role: r.id }));
    case 'settler': return legalSettler(s, p, ph);
    case 'builder': return legalBuilder(s, p, ph);
    case 'mayor': return [{ kind: 'mayorPlace', count: mayorWant(p, ph) }];
    case 'craftsman': return legalCraftsman(s, p, ph);
    case 'trader': return legalTrader(s, p, ph);
    case 'captain': return legalCaptain(s, p, ph);
    case 'discard': return [{ kind: 'discard' }];
    default: return [];
  }
}

// mayorWant 本回合须安置的移民数：min(船上待领+圣胡安, 空圆圈)；
// 圣胡安安置是强制的（官方规则：必须填满所有可填的空圆圈）
function mayorWant(p, ph) {
  return Math.min((ph.pending[p.seat] || 0) + p.san, emptyCircles(p));
}

// legalSettler 开拓者（✅ 对照 dae-hany action_settler）：岛满必须弃权；
// 庄园随机地块可与常规拿地并存（同回合先随机后常规，随机地块无农舍移民）
function legalSettler(s, p, ph) {
  const acts = [];
  if (p.island.length >= 12) {
    acts.push({ kind: 'settler', tile: 'pass' });
    return acts;
  }
  const mayRandom = hasOccupied(p, 'hacienda') && !ph.haciendaUsed
    && supplyCount(s) > 0;
  const mayQuarry = (p.seat === ph.chooser || hasOccupied(p, 'construction_hut')) && s.quarrySupply > 0;
  s.offers.forEach((g, i) => { if (g) acts.push({ kind: 'settler', tile: i }); });
  if (mayQuarry) acts.push({ kind: 'settler', tile: 'quarry' });
  if (mayRandom) acts.push({ kind: 'settler', tile: 'random' });
  acts.push({ kind: 'settler', tile: 'pass' });
  return acts;
}
function supplyCount(s) { return GOODS.reduce((a, g) => a + s.plantationSupply[g], 0); }

// legalBuilder 建筑师（✅ 对照 dae-hany）：可负担 + 有库存 + 城市有足够空位（大建筑需 2 格）
//   + 每人每建筑限 1 座，或弃权
function legalBuilder(s, p, ph) {
  const acts = [];
  const first = p.city.findIndex((c) => !c.id);
  const hasPair = first >= 0 && first + 1 < p.city.length && !p.city[first + 1].id;
  if (first >= 0) {
    for (const b of BUILDINGS) {
      if (s.buildingStock[b.id] <= 0) continue;
      if (p.city.some((slot) => slot.id === b.id)) continue;
      if ((b.size || 1) === 2 && !hasPair) continue;
      if (buildCost(p, b.id, p.seat === ph.chooser) <= p.doubloons) acts.push({ kind: 'build', building: b.id });
    }
  }
  acts.push({ kind: 'buildPass' });
  return acts;
}

// legalCraftsman 工匠：仅选择者可额外取 1 件「本回合实际生产过」的货物（✅ 对照 dae-hany action_craftsman）
function legalCraftsman(s, p, ph) {
  if (p.seat !== ph.chooser) return [{ kind: 'craftsmanPass' }];
  const produced = ph.produced || [];
  const acts = produced.map((g) => ({ kind: 'craftsmanExtra', good: g }));
  acts.push({ kind: 'craftsmanPass' });
  return acts;
}

// legalTrader 商人：交易所有空位且该货未在所内（事务所例外），或弃权
function legalTrader(s, p, ph) {
  const acts = [];
  const office = hasOccupied(p, 'office');
  for (const g of GOODS) {
    if (p.goods[g] <= 0) continue;
    if (!s.tradingHouse.includes(null)) continue;
    if (!office && s.tradingHouse.includes(g)) continue;
    acts.push({ kind: 'sell', good: g });
  }
  acts.push({ kind: 'sellPass' });
  void ph;
  return acts;
}

// shipLoadable 货船 i 可装 good 的件数（空船他船无此货 / 同种船），0 = 不可装
function shipLoadable(s, i, p, g) {
  const ship = s.ships[i];
  if (ship.load >= ship.cap) return 0;
  if (ship.good !== null && ship.good !== g) return 0;
  if (ship.good === null && s.ships.some((os, j) => j !== i && os.good === g)) return 0;
  if (s.phase.loaded[g] !== undefined && s.phase.loaded[g] !== i) return 0;
  return Math.min(ship.cap - ship.load, p.goods[g]);
}

// maxShipLoad 各货船装载 good 的最大可选量（✅ 规则：能装必装且必须选「装得最多」的船）
function maxShipLoad(s, p, g) {
  let m = 0;
  for (let i = 0; i < s.ships.length; i++) m = Math.max(m, shipLoadable(s, i, p, g));
  return m;
}

// legalCaptain 船长（✅ 对照 dae-hany action_captain_load/pass 逐条核对）：
// - 货船只能装「该种货装得最多」的船，且必须全量装满到上限（能装必装）
// - 无可装之货且无可用码头 → 必须弃权；有可用码头 → 弃权保留轮位（有人装货后再轮回来）
// - 码头全自愿（不计入强制装载），装载该种货的全部（不限船容量），每阶段限一次
function legalCaptain(s, p, ph) {
  const acts = [];
  for (const g of GOODS) {
    if (p.goods[g] <= 0) continue;
    const max = maxShipLoad(s, p, g);
    for (let i = 0; i < s.ships.length; i++) {
      if (max > 0 && shipLoadable(s, i, p, g) === max) {
        acts.push({ kind: 'ship', ship: i, good: g, count: max });
      }
    }
  }
  if (hasOccupied(p, 'wharf') && !ph.wharfUsed[p.seat]) {
    for (const g of GOODS) {
      if (p.goods[g] > 0) acts.push({ kind: 'wharf', good: g, count: p.goods[g] });
    }
  }
  const canShip = acts.some((a) => a.kind === 'ship');
  const wharfAvailable = acts.some((a) => a.kind === 'wharf');
  if (!canShip || wharfAvailable) acts.push({ kind: 'captainPass' });
  return acts;
}

// —— apply ——

export function apply(state, action) {
  const s = cl(state);
  applyUnchecked(s, action);
  settle(s);
  return s;
}

function applyUnchecked(s, a) {
  switch (a.kind) {
    case 'pickRole': return applyPickRole(s, a);
    case 'settler': return applySettler(s, a);
    case 'build': return applyBuild(s, a);
    case 'buildPass': return stepRole(s);
    case 'mayorPlace': return applyMayorPlace(s, a);
    case 'craftsmanExtra': return applyCraftsmanExtra(s, a);
    case 'craftsmanPass': return stepRole(s);
    case 'sell': return applySell(s, a);
    case 'sellPass': return stepRole(s);
    case 'ship': return applyShip(s, a);
    case 'wharf': return applyWharf(s, a);
    case 'captainPass': return captainAdvance(s, true);
    case 'discard': return applyDiscard(s, a);
    default: throw new Error('unknown action: ' + a.kind);
  }
}

// applyPickRole 选角：拿角色+悬赏金币并入执行队列；全员选完开始第一个角色阶段
function applyPickRole(s, a) {
  const role = s.roles.find((r) => r.id === a.role && r.taken === null);
  if (!role) throw new Error('role taken');
  const seat = s.phase.cur;
  role.taken = seat;
  if (role.bonus > 0) {
    s.players[seat].doubloons += role.bonus;
    log(s, seat, 'pr.log.roleBonus', { r: ROLE_NAMES[role.id], c: role.bonus });
    role.bonus = 0;
  }
  s.roleQueue.push(role.id);
  log(s, seat, 'pr.log.pickRole', { n: s.players[seat].name, r: ROLE_NAMES[role.id] });
  s.phase.idx++;
  if (s.phase.idx >= s.phase.order.length) startNextRole(s);
  else s.phase.cur = s.phase.order[s.phase.idx];
}

// startNextRole 从执行队列取下一角色开阶段；队列空则本轮结束。
// 淘金者无阶段，直接拿 1 金币递归推进。
function startNextRole(s) {
  if (s.gameOver) return;
  const roleId = s.roleQueue.shift();
  if (!roleId) return endRound(s);
  const role = s.roles.find((r) => r.id === roleId);
  const chooser = role.taken;
  const order = seatOrderFrom(chooser, s.players.length);
  switch (roleId) {
    case 'prospector': {
      s.players[chooser].doubloons += 1;
      log(s, chooser, 'pr.log.prospector', { n: s.players[chooser].name, c: 1 });
      return startNextRole(s);
    }
    case 'settler':
      revealOffers(s);
      s.phase = { kind: 'settler', chooser, order, idx: 0, cur: chooser };
      return;
    case 'craftsman': {
      // produceAll 写入 s.phase.produced，随后立即被 phase 覆盖——须先存后传
      produceAll(s);
      const produced = s.phase.produced;
      s.phase = { kind: 'craftsman', chooser, order, idx: 0, cur: chooser, produced };
      return;
    }
    case 'mayor': return startMayor(s, chooser, order);
    case 'captain':
      s.phase = { kind: 'captain', chooser, order, idx: 0, cur: chooser,
        loaded: {}, shipped: {}, wharfUsed: {}, done: [], declined: [], privVP: false };
      return;
    default:
      s.phase = { kind: roleId, chooser, order, idx: 0, cur: chooser };
  }
}

// revealOffers 开拓者翻牌：人数+1 张（供应不足则尽出）
function revealOffers(s) {
  const want = s.players.length + 1;
  s.offers = [];
  const pool = [];
  for (const g of GOODS) for (let i = 0; i < s.plantationSupply[g]; i++) pool.push(g);
  for (let i = 0; i < want && pool.length; i++) {
    const j = Math.floor(rand(s) * pool.length);
    const g = pool.splice(j, 1)[0];
    s.plantationSupply[g]--;
    s.offers.push(g);
  }
  log(s, -1, 'pr.log.offers', {});
}

// startMayor 市长（✅ 对照 dae-hany _start_phase MAYOR + action_mayor）：
// 先特权（供应有 1 人即拿，供应空只是跳过特权，不触发终局）→ 船上移民轮流分发到 pending。
// 移民船补船发生在阶段结束（endMayorRefill），补船量 = max(Σ全体建筑空圆圈, 人数)，
// 供应不足才触发终局。
function startMayor(s, chooser, order) {
  if (s.colonistSupply > 0) {
    s.colonistSupply--;
    s.players[chooser].san += 1;
  } else {
    log(s, -1, 'pr.log.mayorNoPrivilege', {});
  }
  const pending = {};
  let i = 0;
  while (s.colonistShip > 0) {
    const seat = order[i % order.length];
    pending[seat] = (pending[seat] || 0) + 1;
    s.colonistShip--; i++;
  }
  s.phase = { kind: 'mayor', chooser, order, idx: 0, pending, cur: chooser };
}

// endMayorRefill 市长阶段收尾：补移民船至 need（need = max(Σ建筑空圆圈, 人数)），
// 补不足（供应 < need）触发终局——补船用的是「补船量 vs 供应」，不是 0 才触发。
function endMayorRefill(s) {
  const need = Math.max(
    s.players.reduce((a, p) => a + buildingEmptyCircles(p), 0),
    s.players.length,
  );
  const add = Math.max(0, need - s.colonistShip);
  if (s.colonistSupply >= add) {
    s.colonistSupply -= add;
    s.colonistShip += add;
  } else {
    s.colonistShip += s.colonistSupply;
    s.colonistSupply = 0;
    s.endTriggered = true;
    log(s, -1, 'pr.log.endColonists', {});
  }
  log(s, -1, 'pr.log.mayorShip', { c: s.colonistShip });
}

// buildingEmptyCircles 玩家已建建筑的空移民圆圈数（岛格不计入补船公式）
function buildingEmptyCircles(p) {
  let n = 0;
  for (const slot of p.city) if (slot.id) n += BUILDING_BY_ID[slot.id].circles - slot.occ;
  return n;
}

// produceAll 工匠阶段开始：全体生产 + 工厂收入（按本次实际生产种类数）；
// 返回选择者本回合实际生产的种类（特权额外货必须从中取）
function produceAll(s) {
  let produced = [];
  for (const p of s.players) {
    let types = 0;
    const isChooser = p.seat === s.roleQueue[0];
    for (const g of GOODS) {
      const n = prodCapacity(p, g);
      if (n > 0) {
        p.goods[g] += n; types++;
        log(s, p.seat, 'pr.log.produce', { n: p.name, g: GOOD_NAMES[g], c: n });
        if (isChooser) produced.push(g);
      }
    }
    if (types >= 2 && hasOccupied(p, 'factory')) {
      p.doubloons += FACTORY_INCOME[types];
      log(s, p.seat, 'pr.log.factory', { n: p.name, c: FACTORY_INCOME[types] });
    }
  }
  s.phase.produced = produced;
}

// endRole 阶段内全员行动完毕：市长阶段结束补移民船；商人阶段满 4 货清空交易所，然后进下一角色
function endRole(s) {
  if (s.phase.kind === 'mayor') endMayorRefill(s);
  if (s.phase.kind === 'trader' && s.tradingHouse.every((g) => g !== null)) {
    s.tradingHouse = [null, null, null, null];
    log(s, -1, 'pr.log.tradeHouseClear', {});
  }
  startNextRole(s);
}

// stepRole 阶段内轮转到下一人；走完则 endRole
function stepRole(s) {
  s.phase.idx++;
  if (s.phase.idx >= s.phase.order.length) return endRole(s);
  s.phase.cur = s.phase.order[s.phase.idx];
}

// endRound 本轮结束：终局判定 / 未选角色悬赏 +1 / 总督轮转 / 角色复位
function endRound(s) {
  if (s.endTriggered) { s.gameOver = true; return; }
  s.round++;
  s.governor = (s.governor + 1) % s.players.length;
  for (const r of s.roles) {
    if (r.taken === null) r.bonus++;
    r.taken = null;
  }
  s.roleQueue = [];
  s.phase = { kind: 'pickRole', order: seatOrderFrom(s.governor, s.players.length), idx: 0, cur: s.governor };
  log(s, -1, 'pr.log.newRound', { r: s.round, n: s.players[s.governor].name });
}

// —— 各角色 apply ——

// applySettler 拿地（✅ 对照 dae-hany：庄园随机地块可与常规拿地同回合并存（先随机地块后常规拿地），
// 随机地块无农舍移民；岛满 12 格必须弃权；农舍移民供应空时从移民船拿）
function applySettler(s, a) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  const isRandom = a.tile === 'random';
  if (isRandom) {
    const type = drawTile(s, 'random');
    if (type) {
      ph.haciendaUsed = true;
      p.island.push({ type, occ: false });
      log(s, p.seat, 'pr.log.settlerHacienda', { n: p.name, t: tileName(type) });
    }
    return; // 随机地块不结束回合，继续选择常规拿地或弃权
  }
  const islandFull = p.island.length >= 12;
  if (a.tile === 'pass' || islandFull) {
    log(s, p.seat, 'pr.log.settlerPass', { n: p.name });
  } else {
    const type = drawTile(s, a.tile);
    if (type) {
      // 农舍移民只作用于「翻牌行/采石场」常规地块，庄园随机地块不适用
      const withColonist = hasOccupied(p, 'hospice') && takeColonist(s, 1) > 0;
      p.island.push({ type, occ: withColonist });
      log(s, p.seat, 'pr.log.settlerTake', { n: p.name, t: tileName(type) });
    }
  }
  delete ph.haciendaUsed;
  stepRole(s);
  if (s.phase.kind !== 'settler' && s.offers.some((g) => g !== null)) returnOffers(s);
}

// takeColonist 从供应（空则从移民船）拿 n 个移民，返回实际拿到数（农舍/大学专用）
function takeColonist(s, n) {
  const fromSupply = Math.min(n, s.colonistSupply);
  s.colonistSupply -= fromSupply;
  let got = fromSupply;
  if (got < n && s.colonistShip > 0) {
    const fromShip = Math.min(n - got, s.colonistShip);
    s.colonistShip -= fromShip;
    got += fromShip;
  }
  return got;
}

// drawTile 按 action.tile 取地类型并扣供应（quarry/random/翻牌行下标）
function drawTile(s, tile) {
  if (tile === 'quarry') {
    if (s.quarrySupply <= 0) return null;
    s.quarrySupply--;
    return 'quarry';
  }
  if (tile === 'random') {
    const pool = [];
    for (const g of GOODS) for (let i = 0; i < s.plantationSupply[g]; i++) pool.push(g);
    if (!pool.length) return null;
    const g = pool[Math.floor(rand(s) * pool.length)];
    s.plantationSupply[g]--;
    return g;
  }
  const g = s.offers[tile];
  s.offers[tile] = null;
  return g || null;
}

function returnOffers(s) {
  for (const g of s.offers) if (g) s.plantationSupply[g]++;
  s.offers = [];
}
function tileName(type) { return type === 'quarry' ? { zh: '采石场', en: 'Quarry' } : GOOD_NAMES[type]; }

// applyBuild 建造（✅ 对照 dae-hany）：大建筑占 2 格城市空间；大学附带移民（供应空从船拿）；
// 城市最后一格被占满触发终局（大建筑恰好填满第 11+12 格也触发）
function applyBuild(s, a) {
  const p = s.players[s.phase.cur];
  const b = BUILDING_BY_ID[a.building];
  if (s.buildingStock[a.building] <= 0) throw new Error('out of stock');
  if (p.city.some((slot) => slot.id === a.building)) throw new Error('duplicate building');
  const cost = buildCost(p, a.building, p.seat === s.phase.chooser);
  if (cost > p.doubloons) throw new Error('cannot afford');
  const size = b.size || 1;
  const first = p.city.findIndex((c) => !c.id);
  // 大建筑需要 2 个空位（模型按顺序填充，取首个空位起的对）
  const hasPair = first >= 0 && first + 1 < p.city.length && !p.city[first + 1].id;
  if (first < 0 || (size === 2 && !hasPair)) throw new Error('city full');
  p.doubloons -= cost;
  s.buildingStock[a.building]--;
  p.city[first].id = a.building;
  p.city[first].occ = 0;
  if (size === 2) {
    p.city[first + 1].id = a.building;
    p.city[first + 1].occ = 0;
  }
  if (hasOccupied(p, 'university') && takeColonist(s, 1) > 0) p.city[first].occ = 1;
  log(s, p.seat, 'pr.log.build', { n: p.name, b: b.name, c: cost });
  if (!p.city.some((c) => !c.id)) {
    s.endTriggered = true;
    log(s, -1, 'pr.log.endCity', { n: p.name });
  }
  stepRole(s);
}

// applyMayorPlace 安置移民：assigns=[{where:'island'|'city',i}]；放不下的滞留圣胡安
function applyMayorPlace(s, a) {
  const p = s.players[s.phase.cur];
  const got = s.phase.pending[p.seat] || 0;
  const want = mayorWant(p, s.phase);
  const assigns = a.assigns || [];
  if (assigns.length !== want) throw new Error('must place ' + want + ' colonists, got ' + assigns.length);
  placeAssigns(p, assigns);
  // 船上未安置的滞留圣胡安；安置超出船上所得的部分从圣胡安补足
  const fromSan = Math.max(0, assigns.length - got);
  p.san += Math.max(0, got - assigns.length) - fromSan;
  delete s.phase.pending[p.seat];
  log(s, p.seat, 'pr.log.mayorPlace', { n: p.name, c: assigns.length });
  stepRole(s);
}

// placeAssigns 校验安置方案并落位：岛格一格一移民；建筑逐圆圈递增（同楼可多次安置）
function placeAssigns(p, assigns) {
  for (const asg of assigns) {
    if (asg.where === 'island') {
      if (!p.island[asg.i] || p.island[asg.i].occ) throw new Error('bad island slot');
      p.island[asg.i].occ = true;
    } else {
      const slot = p.city[asg.i];
      const b = slot.id ? BUILDING_BY_ID[slot.id] : null;
      if (!b || slot.occ >= b.circles) throw new Error('bad city slot');
      slot.occ++;
    }
  }
}

// applyCraftsmanExtra 工匠特权：额外取 1 件本回合实际生产过的货物
function applyCraftsmanExtra(s, a) {
  const p = s.players[s.phase.cur];
  const produced = s.phase.produced || [];
  if (p.seat !== s.phase.chooser || !produced.includes(a.good)) throw new Error('cannot take extra');
  p.goods[a.good] += 1;
  log(s, p.seat, 'pr.log.craftsmanExtra', { n: p.name, g: GOOD_NAMES[a.good] });
  stepRole(s);
}

// applySell 卖货：入交易所 1 槽（不可同种，事务所除外），得款
function applySell(s, a) {
  const p = s.players[s.phase.cur];
  const slot = s.tradingHouse.indexOf(null);
  if (slot < 0) throw new Error('trading house full');
  if (p.goods[a.good] <= 0) throw new Error('no good');
  if (!hasOccupied(p, 'office') && s.tradingHouse.includes(a.good)) throw new Error('duplicate good');
  p.goods[a.good]--;
  s.tradingHouse[slot] = a.good;
  const price = sellPrice(p, a.good, p.seat === s.phase.chooser);
  p.doubloons += price;
  log(s, p.seat, 'pr.log.sell', { n: p.name, g: GOOD_NAMES[a.good], c: price });
  stepRole(s);
}

// applyShip 装货船（✅ 对照 dae-hany）：必须装满到该船该种货的上限；同种货锁定一船；
// 每件 1 VP；船长特权首次装货（含码头）+1 VP；港口每次装货（含码头）+1 VP。
// 任何装货都让「持码头弃权者」重获轮位。装完轮转下一人。
function applyShip(s, a) {
  const p = s.players[s.phase.cur];
  const ship = s.ships[a.ship];
  const loadable = shipLoadable(s, a.ship, p, a.good);
  if (loadable <= 0 || a.count !== loadable || a.count !== maxShipLoad(s, p, a.good)) {
    throw new Error('must load max on the max ship');
  }
  ship.good = a.good; ship.load += a.count;
  p.goods[a.good] -= a.count;
  s.phase.loaded[a.good] = a.ship;
  s.phase.shipped[p.seat] = true;
  awardVP(s, p.seat, a.count);
  if (p.seat === s.phase.chooser && !s.phase.privVP) { s.phase.privVP = true; awardVP(s, p.seat, 1); }
  if (hasOccupied(p, 'harbor')) awardVP(s, p.seat, 1);
  log(s, p.seat, 'pr.log.ship', { n: p.name, g: GOOD_NAMES[a.good], c: a.count });
  captainAdvance(s, false);
}

// applyWharf 码头（✅ 对照 dae-hany）：每船长阶段一次，装载该种货的全部（不受船容量限制），
// 不受货船同种锁限制；每件 1 VP；港口适用；船长特权适用（首次装货含码头）。
function applyWharf(s, a) {
  const p = s.players[s.phase.cur];
  if (p.goods[a.good] <= 0) throw new Error('no goods');
  if (s.phase.wharfUsed[p.seat]) throw new Error('wharf used');
  p.goods[a.good] -= a.count;
  s.phase.wharfUsed[p.seat] = true;
  s.phase.shipped[p.seat] = true;
  awardVP(s, p.seat, a.count);
  if (p.seat === s.phase.chooser && !s.phase.privVP) { s.phase.privVP = true; awardVP(s, p.seat, 1); }
  if (hasOccupied(p, 'harbor')) awardVP(s, p.seat, 1);
  log(s, p.seat, 'pr.log.wharf', { n: p.name, g: GOOD_NAMES[a.good], c: a.count });
  captainAdvance(s, false);
}

// captainAdvance 船长阶段轮转（✅ 对照 dae-hany _captain_done/_captain_declined）：
// - 装货：清空 declined（持可用码头弃权者重获轮位），done 不变
// - 弃权：有可用码头 → declined（保留轮位）；否则 → done（本轮不再回来）
// - done∪declined 覆盖全员 → 阶段结束进弃货检查
function captainAdvance(s, passed) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  ph.done = ph.done || [];
  ph.declined = ph.declined || [];
  if (passed) {
    const wharfAvailable = hasOccupied(p, 'wharf') && !ph.wharfUsed[p.seat]
      && GOODS.some((g) => p.goods[g] > 0);
    const set = wharfAvailable ? ph.declined : ph.done;
    if (!set.includes(p.seat)) set.push(p.seat);
  } else {
    ph.declined = [];
  }
  const n = ph.order.length;
  if (ph.done.length + ph.declined.length >= n) return endCaptain(s);
  do { ph.idx = (ph.idx + 1) % n; ph.cur = ph.order[ph.idx]; }
  while (ph.done.includes(ph.cur));
}

// endCaptain 船长阶段收尾：满船清空 → 有超限者进弃货阶段，否则下一角色
function endCaptain(s) {
  for (const ship of s.ships) {
    if (ship.load >= ship.cap) { ship.good = null; ship.load = 0; }
  }
  const order = seatOrderFrom(s.phase.chooser, s.players.length)
    .filter((seat) => hasOverflow(s.players[seat]));
  if (!order.length) return startNextRole(s);
  s.phase = { kind: 'discard', order, idx: 0, cur: order[0] };
}

// awardVP 发 VP 筹码（✅ 对照 dae-hany：VP 供应耗尽后继续记分（纸笔记录），只触发终局标记，
// 不截断本次得分、不立即结束游戏——打完当前轮才结算）
function awardVP(s, seat, n) {
  s.players[seat].vp += n;
  s.vpSupply -= n;
  if (s.vpSupply <= 0 && !s.endTriggered) {
    s.endTriggered = true;
    log(s, -1, 'pr.log.endVp', {});
  }
}
// applyDiscard 弃货：keep 为保留方案（可省略种类），校验合法性后落袋（风 ros 1 桶/仓库全保留语义）
function applyDiscard(s, a) {
  const p = s.players[s.phase.cur];
  const keep = {};
  for (const g of GOODS) {
    keep[g] = Math.min(keep[g] = (a.keep && a.keep[g]) || 0, p.goods[g]);
  }
  if (!keepFeasible(p, keep)) throw new Error('keep plan infeasible');
  for (const g of GOODS) {
    const dropped = p.goods[g] - keep[g];
    if (dropped > 0) {
      p.goods[g] = keep[g];
      log(s, p.seat, 'pr.log.discard', { n: p.name, g: GOOD_NAMES[g], c: dropped });
    }
  }
  stepRole(s);
}

// —— settle：自动推进无决策微步骤 ——

// settle 使状态推进到「当前玩家面临真实决策」或终局；防御性循环上限。
function settle(s) {
  let guard = 0;
  while (!s.gameOver && needsAutoSkip(s)) {
    autoSkip(s);
    if (++guard > 10000) throw new Error('settle loop detected');
  }
}

// needsAutoSkip 当前微步骤是否无真实决策（只剩弃权 / 无可产 / 无可装 / 无须安置等）
function needsAutoSkip(s) {
  if (s.gameOver) return false;
  const ph = s.phase;
  if (!ph || ph.cur === undefined || !s.players[ph.cur]) return false;
  const p = s.players[ph.cur];
  const onlyPass = (isPass) => {
    const acts = legalActions(s);
    return acts.length === 1 && isPass(acts[0]);
  };
  switch (ph.kind) {
    case 'settler': return onlyPass((a) => a.tile === 'pass');
    case 'builder': return onlyPass((a) => a.kind === 'buildPass');
    case 'trader': return onlyPass((a) => a.kind === 'sellPass');
    case 'craftsman': return onlyPass((a) => a.kind === 'craftsmanPass');
    case 'mayor': return mayorWant(p, ph) <= 0;
    case 'captain': return !legalActions(s).some((a) => a.kind === 'ship' || a.kind === 'wharf');
    case 'discard': return !hasOverflow(p);
    default: return false; // pickRole 永不自动跳过
  }
}

// autoSkip 执行一次自动跳过：静默推进（生产/淘金等已有日志，跳过本身不记日志）
function autoSkip(s) {
  const ph = s.phase;
  switch (ph.kind) {
    case 'settler': case 'builder': case 'trader': case 'craftsman': case 'discard':
      return stepRole(s);
    case 'mayor': {
      const p = s.players[ph.cur];
      p.san += ph.pending[p.seat] || 0;
      delete ph.pending[p.seat];
      return stepRole(s);
    }
    case 'captain': return captainAdvance(s, true);
    default:
  }
}
