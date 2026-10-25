// 波多黎各规则引擎：纯函数、state JSON-safe、零 DOM/i18n 依赖（node 可直接自测）。
// ⚠ 规则数据见 data.js 头部「待核对」说明；本文件内个别规则取舍以「?」注释标出。
// 架构：legalActions(state) 是唯一合法性来源；apply 深拷贝后推进；settle 循环自动
// 跳过「无真实决策」的微步骤（无可装之货、无可产之货、无可建之楼等），
// 保证轮到 currentPlayer 时 legalActions 必非空。
// ? 待核对：角色按「选择顺序」结算（另一版本为按固定角色行顺序结算）。
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
export function prodCapacity(p, good) {
  const plants = occIsland(p, good);
  if (good === 'corn') return plants;
  let circles = 0;
  for (const slot of p.city) {
    const b = slot.id ? BUILDING_BY_ID[slot.id] : null;
    if (b && b.prod === good && slot.occ >= b.circles) circles += b.circles;
  }
  return Math.min(plants, circles);
}

// buildCost 建筑实际费用：建筑师特权 -1；采石场：生产建筑每个已占采石场 -1，紫建筑至多 -1
export function buildCost(p, buildingId, isChooser) {
  const b = BUILDING_BY_ID[buildingId];
  let c = b.cost - (isChooser ? 1 : 0);
  c -= b.type === 'prod' ? occIsland(p, 'quarry') : Math.min(occIsland(p, 'quarry'), 1);
  return Math.max(0, c);
}

// sellPrice 卖价：货值 + 小市场 +1 + 大市场 +2 + 商人特权 +1
export function sellPrice(p, good, isChooser) {
  let v = GOOD_VALUE[good] + (hasOccupied(p, 'small_market') ? 1 : 0) + (hasOccupied(p, 'large_market') ? 2 : 0);
  if (isChooser) v += 1;
  return v;
}

// warehouseExtras 已占用仓库提供的保留加成池（小仓 +1 / 大仓 +2，各对一种货物生效）
function warehouseExtras(p) {
  const extras = [];
  if (hasOccupied(p, 'small_warehouse')) extras.push(1);
  if (hasOccupied(p, 'large_warehouse')) extras.push(2);
  return extras;
}

// keepFeasible 保留方案是否可行：基础每种 1 件，仓库加成可分配到任意种货（可叠加同一种）。
// 枚举 ≤36 种分配（extras ≤2 × 货物 5 种 + 不使用），完全校验而非总量近似。
export function keepFeasible(p, keep) {
  const extras = warehouseExtras(p);
  const need = GOODS.map((g) => Math.max(0, (keep[g] || 0) - 1));
  const got = GOODS.map(() => 0);
  const tryAssign = (i) => {
    if (i >= extras.length) return need.every((n, gi) => n <= got[gi]);
    for (let gi = 0; gi <= GOODS.length; gi++) {
      if (gi < GOODS.length) got[gi] += extras[i];
      if (tryAssign(i + 1)) return true;
      if (gi < GOODS.length) got[gi] -= extras[i];
    }
    return false;
  };
  return tryAssign(0);
}

// hasOverflow 船长阶段后是否超保留上限（全保留不可行即超）
function hasOverflow(p) { return !keepFeasible(p, p.goods); }

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

// buildingScore 终局建筑计分：大建筑须自身有移民才计分
// ? 待核对：行会馆 +2/生产建筑（不要求占用）；官邸 max(4, 已占岛格-5)；
//   要塞 floor(移民总数/3)；海关 floor(VP筹码/4)；市政厅每紫建筑（含大建筑与自身）+1
function buildingScore(p) {
  const r = { base: 0, guild: 0, residence: 0, fortress: 0, customs: 0, cityHall: 0 };
  let prod = 0, violet = 0;
  for (const slot of p.city) {
    if (!slot.id) continue;
    r.base += BUILDING_BY_ID[slot.id].cost;
    if (BUILDING_BY_ID[slot.id].type === 'prod') prod++; else violet++;
  }
  if (hasOccupied(p, 'guild_hall')) r.guild = prod * 2;
  if (hasOccupied(p, 'city_hall')) r.cityHall = violet;
  if (hasOccupied(p, 'residence')) r.residence = Math.max(4, p.island.filter((t) => t.occ).length - 5);
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

// mayorWant 本回合须安置的移民数：min(船上待领+圣胡安, 空圆圈)；? 待核对：圣胡安安置是否强制
function mayorWant(p, ph) {
  return Math.min((ph.pending[p.seat] || 0) + p.san, emptyCircles(p));
}

// legalSettler 开拓者：拿翻牌行一张 / 采石场（特权或工棚）/ 庄园随机 / 弃权
function legalSettler(s, p, ph) {
  const acts = [];
  s.offers.forEach((g, i) => { if (g) acts.push({ kind: 'settler', tile: i }); });
  const mayQuarry = (p.seat === ph.chooser || hasOccupied(p, 'construction_hut')) && s.quarrySupply > 0;
  if (mayQuarry) acts.push({ kind: 'settler', tile: 'quarry' });
  if (hasOccupied(p, 'hacienda') && supplyCount(s) > 0) acts.push({ kind: 'settler', tile: 'random' });
  acts.push({ kind: 'settler', tile: 'pass' });
  return acts;
}
function supplyCount(s) { return GOODS.reduce((a, g) => a + s.plantationSupply[g], 0); }

// legalBuilder 建筑师：可负担 + 有库存 + 城市有空位 + 每人每建筑限 1 座，或弃权
function legalBuilder(s, p, ph) {
  const acts = [];
  const cityFull = !p.city.some((slot) => !slot.id);
  if (!cityFull) {
    for (const b of BUILDINGS) {
      if (s.buildingStock[b.id] <= 0) continue;
      if (p.city.some((slot) => slot.id === b.id)) continue;
      if (buildCost(p, b.id, p.seat === ph.chooser) <= p.doubloons) acts.push({ kind: 'build', building: b.id });
    }
  }
  acts.push({ kind: 'buildPass' });
  return acts;
}

// legalCraftsman 工匠：仅选择者可额外取 1 件可产货物；其他人无决策（settle 自动跳过）
function legalCraftsman(s, p, ph) {
  if (p.seat !== ph.chooser) return [{ kind: 'craftsmanPass' }];
  const acts = GOODS.filter((g) => prodCapacity(p, g) > 0).map((g) => ({ kind: 'craftsmanExtra', good: g }));
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

// legalCaptain 船长：装货船（同种货锁定一船；未装过者能装必装）/ 码头（每阶段一次，可选）
// ? 待核对：已装过者可继续装也可停；同种货不得拆装两船，码头亦受此锁
function legalCaptain(s, p, ph) {
  const acts = [];
  for (let i = 0; i < s.ships.length; i++) {
    const ship = s.ships[i];
    for (const g of GOODS) {
      if (p.goods[g] <= 0) continue;
      if (ship.good !== null && ship.good !== g) continue;
      if (ship.load >= ship.cap) continue;
      if (ph.loaded[g] !== undefined && ph.loaded[g] !== i) continue;
      const maxN = Math.min(ship.cap - ship.load, p.goods[g]);
      for (let n = 1; n <= maxN; n++) acts.push({ kind: 'ship', ship: i, good: g, count: n });
    }
  }
  if (hasOccupied(p, 'wharf') && !ph.wharfUsed[p.seat]) {
    for (const g of GOODS) {
      if (p.goods[g] > 0 && ph.loaded[g] === undefined) {
        for (let n = 1; n <= p.goods[g]; n++) acts.push({ kind: 'wharf', good: g, count: n });
      }
    }
  }
  const mustShip = !ph.shipped[p.seat] && acts.some((a) => a.kind === 'ship');
  if (!mustShip) acts.push({ kind: 'captainPass' });
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
    case 'craftsman':
      produceAll(s);
      s.phase = { kind: 'craftsman', chooser, order, idx: 0, cur: chooser };
      return;
    case 'mayor': return startMayor(s, chooser, order);
    case 'captain':
      s.phase = { kind: 'captain', chooser, order, idx: 0, passCount: 0, cur: chooser,
        loaded: {}, shipped: {}, wharfUsed: {}, privVP: false };
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

// startMayor 市长：补移民船至 need（开局船上已有 n 人，只补差额；不足触发终局）
//   → 特权从供应拿 1 → 船上移民轮流分发到 pending
// ? 待核对：特权移民在供应为 0 时触发终局
function startMayor(s, chooser, order) {
  const need = Math.max(s.players.reduce((a, p) => a + emptyCircles(p), 0), s.players.length);
  const add = Math.max(0, need - s.colonistShip);
  if (s.colonistSupply >= add) {
    s.colonistSupply -= add;
    s.colonistShip += add;
  } else {
    s.colonistShip += s.colonistSupply; s.colonistSupply = 0;
    s.endTriggered = true;
    log(s, -1, 'pr.log.endColonists', {});
  }
  log(s, -1, 'pr.log.mayorShip', { c: s.colonistShip });
  if (s.colonistSupply > 0) { s.colonistSupply--; s.players[chooser].san += 1; }
  else s.endTriggered = true;
  const pending = {};
  let i = 0;
  while (s.colonistShip > 0) {
    const seat = order[i % order.length];
    pending[seat] = (pending[seat] || 0) + 1;
    s.colonistShip--; i++;
  }
  s.phase = { kind: 'mayor', chooser, order, idx: 0, pending, cur: chooser };
}

// produceAll 工匠阶段开始：全体生产 + 工厂收入（按本次生产种类数）
function produceAll(s) {
  for (const p of s.players) {
    let types = 0;
    for (const g of GOODS) {
      const n = prodCapacity(p, g);
      if (n > 0) { p.goods[g] += n; types++; log(s, p.seat, 'pr.log.produce', { n: p.name, g: GOOD_NAMES[g], c: n }); }
    }
    if (types >= 2 && hasOccupied(p, 'factory')) {
      p.doubloons += FACTORY_INCOME[types];
      log(s, p.seat, 'pr.log.factory', { n: p.name, c: FACTORY_INCOME[types] });
    }
  }
}

// endRole 阶段内全员行动完毕：商人阶段结束时满 4 货的交易所清空，然后进下一角色
function endRole(s) {
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

// applySettler 拿地：翻牌行 / 采石场 / 庄园随机 / 弃权；农舍附带移民；阶段结束归还剩牌
function applySettler(s, a) {
  const p = s.players[s.phase.cur];
  if (a.tile === 'pass') {
    log(s, p.seat, 'pr.log.settlerPass', { n: p.name });
  } else {
    const type = drawTile(s, a.tile);
    if (type) {
      const withColonist = hasOccupied(p, 'hospice') && s.colonistSupply > 0;
      if (withColonist) s.colonistSupply--;
      p.island.push({ type, occ: withColonist });
      log(s, p.seat, 'pr.log.settlerTake', { n: p.name, t: tileName(type) });
    }
  }
  stepRole(s);
  if (s.phase.kind !== 'settler' && s.offers.some((g) => g !== null)) returnOffers(s);
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

// applyBuild 建造：扣费（特权+采石场折扣）、库存-1、城市放置；大学附带移民；第 12 格触发终局
function applyBuild(s, a) {
  const p = s.players[s.phase.cur];
  if (s.buildingStock[a.building] <= 0) throw new Error('out of stock');
  if (p.city.some((slot) => slot.id === a.building)) throw new Error('duplicate building');
  const cost = buildCost(p, a.building, p.seat === s.phase.chooser);
  if (cost > p.doubloons) throw new Error('cannot afford');
  const slot = p.city.find((c) => !c.id);
  if (!slot) throw new Error('city full');
  p.doubloons -= cost;
  s.buildingStock[a.building]--;
  slot.id = a.building;
  slot.occ = 0;
  if (hasOccupied(p, 'university') && s.colonistSupply > 0) { s.colonistSupply--; slot.occ = 1; }
  log(s, p.seat, 'pr.log.build', { n: p.name, b: BUILDING_BY_ID[a.building].name, c: cost });
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

// applyCraftsmanExtra 工匠特权：额外取 1 件可产货物
function applyCraftsmanExtra(s, a) {
  const p = s.players[s.phase.cur];
  if (p.seat !== s.phase.chooser || prodCapacity(p, a.good) < 1) throw new Error('cannot take extra');
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

// applyShip 装货船：同种货锁定一船；每件 1 VP；船长特权首次装货 +1 VP（? 待核对：仅货船）；
// 港口每次装货 +1 VP。装完轮转下一人（passCount 清零）。
function applyShip(s, a) {
  const p = s.players[s.phase.cur];
  const ship = s.ships[a.ship];
  if (!ship || ship.load + a.count > ship.cap) throw new Error('bad ship');
  if (p.goods[a.good] < a.count) throw new Error('not enough goods');
  if (ship.good !== null && ship.good !== a.good) throw new Error('ship type mismatch');
  if (s.phase.loaded[a.good] !== undefined && s.phase.loaded[a.good] !== a.ship) throw new Error('good split');
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

// applyWharf 码头：每船长阶段一次，任量单种货；港口适用；装完轮转下一人
function applyWharf(s, a) {
  const p = s.players[s.phase.cur];
  if (p.goods[a.good] < a.count) throw new Error('not enough goods');
  if (s.phase.wharfUsed[p.seat]) throw new Error('wharf used');
  if (s.phase.loaded[a.good] !== undefined) throw new Error('good split');
  p.goods[a.good] -= a.count;
  s.phase.wharfUsed[p.seat] = true;
  s.phase.loaded[a.good] = 'wharf';
  s.phase.shipped[p.seat] = true;
  awardVP(s, p.seat, a.count);
  if (hasOccupied(p, 'harbor')) awardVP(s, p.seat, 1);
  log(s, p.seat, 'pr.log.wharf', { n: p.name, g: GOOD_NAMES[a.good], c: a.count });
  captainAdvance(s, false);
}

// captainAdvance 船长阶段轮转：pass 计数 +1 或清零；连续全员 pass 则阶段结束进弃货检查
function captainAdvance(s, passed) {
  const ph = s.phase;
  ph.passCount = passed ? ph.passCount + 1 : 0;
  ph.idx = (ph.idx + 1) % ph.order.length;
  ph.cur = ph.order[ph.idx];
  if (ph.passCount >= ph.order.length) endCaptain(s);
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

// awardVP 发 VP 筹码：供应耗尽立即终局
function awardVP(s, seat, n) {
  const take = Math.min(n, s.vpSupply);
  s.players[seat].vp += take;
  s.vpSupply -= take;
  if (s.vpSupply <= 0) {
    s.gameOver = true;
    log(s, -1, 'pr.log.endVp', {});
  }
}

// applyDiscard 弃货：keep 为保留方案（可省略种类），校验可行性后落袋
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
