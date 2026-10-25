// 电力公司引擎：五阶段（顺位/拍卖/资源/建城/结算）× 三 Step 状态机。
// 纯函数、JSON-safe、零 DOM/i18n 依赖，node 可直接自测。
import { PLANT_BY_ID, STARTER_MARKET, STEP3_CARD, makeDeck } from './plant-data.js';
import { buildMap, CITY_NAMES, REGIONS } from './map-data.js';
import {
  REFILL, RES_CAPACITY, RES_INITIAL, RES_NAMES, resCostTotal, CITY_COST, SETUP, incomeOf,
} from './tables.js';

const RES_KINDS = ['coal', 'oil', 'garbage', 'uranium'];

// —— 基础工具 ——

function cl(o) { return JSON.parse(JSON.stringify(o)); }

function log(s, seat, key, args) {
  s.log.push({ seat, key, args: args || {} });
}

// rand splitmix32：随机数入 state（seed 混入 counter 初值），悔棋/重放确定性
export function rand(s) {
  s.rng.counter = (s.rng.counter + 0x9e3779b9) >>> 0;
  let z = (s.rng.counter ^ Math.imul(s.rng.seed | 0, 0x9e3779b9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
}

// —— 查询辅助（导出供 render/bot 复用） ——

// regionAdjacency 从城市邻接推导区域邻接（选区规则：后续所选区域须与已选区域相邻）
export function regionAdjacency(cities) {
  const out = {};
  for (const c of Object.values(cities)) {
    out[c.region] = out[c.region] || new Set();
    for (const nb of Object.keys(c.adj)) out[c.region].add(cities[nb].region);
  }
  const plain = {};
  for (const [r, set] of Object.entries(out)) plain[r] = [...set];
  return plain;
}

// turnOrderOf 顺位：城市多者在前，同数比电厂数，再同按座位
export function turnOrderOf(s) {
  return s.players.map((p) => p.seat)
    .sort((a, b) => {
      const A = s.players[a], B = s.players[b];
      return B.cities.length - A.cities.length || B.plants.length - A.plants.length || a - b;
    });
}

// marketSorted 当前市场升序（current 前 4 / step3 全 6）
export function marketSorted(s) {
  return [...s.plantMarket.current, ...s.plantMarket.future].sort((a, b) => a - b);
}

// reachableCost Dijkstra：从玩家网络（已建城市集）到目标城的最短连接费；首城免费
export function reachCost(s, p, cityId) {
  if (p.cities.length === 0) return 0;
  const dist = {};
  const pq = [];
  for (const c of p.cities) { dist[c] = 0; pq.push(c); }
  while (pq.length) {
    pq.sort((a, b) => dist[a] - dist[b]);
    const cur = pq.shift();
    if (cur === cityId) return dist[cur];
    for (const [nb, cost] of Object.entries(s.map[cur].adj)) {
      const nd = dist[cur] + cost;
      if (dist[nb] === undefined || nd < dist[nb]) { dist[nb] = nd; pq.push(nb); }
    }
  }
  return dist[cityId] !== undefined ? dist[cityId] : Infinity;
}

// cityBuildable 城市可建：选中区域内 + 该 step 产权槽未满
export function cityBuildable(s, p, cityId) {
  const city = s.map[cityId];
  if (!city || !s.regions.includes(city.region)) return false;
  const maxOwners = s.step >= 3 ? 3 : s.step === 2 ? 2 : 1;
  return city.owners.length < maxOwners && !city.owners.includes(p.seat);
}

// buildTotalCost 建城总价 = 房价 + 最短连接费
export function buildTotalCost(s, p, cityId) {
  return CITY_COST[s.step] + reachCost(s, p, cityId);
}

// canPowerPlant 电厂燃料是否满足（hybrid 煤油合计）
export function canPowerPlant(p, plantId) {
  const pl = p.plants.find((x) => x.id === plantId);
  if (!pl) return false;
  if (pl.type === 'eco') return true;
  if (pl.type === 'hybrid') return p.res.coal + p.res.oil >= pl.fuel;
  return p.res[pl.type] >= pl.fuel;
}

// consumeFuel 发电消耗（hybrid 自动取存量较多的一种优先，满额后补另一种）。简化：非玩家手选
export function consumeFuel(p, plantId) {
  const pl = p.plants.find((x) => x.id === plantId);
  if (pl.type === 'eco') return;
  if (pl.type === 'hybrid') {
    let need = pl.fuel;
    const first = p.res.coal >= p.res.oil ? 'coal' : 'oil';
    const second = first === 'coal' ? 'oil' : 'coal';
    const take1 = Math.min(p.res[first], need);
    p.res[first] -= take1; need -= take1;
    p.res[second] -= take1 === pl.fuel ? 0 : Math.min(p.res[second], need);
    return;
  }
  p.res[pl.type] -= pl.fuel;
}

// plantResCap 电厂资源存储上限：免燃料厂 0，其余 2× 消耗（hybrid 煤油合计）
export function plantResCap(pl) { return pl.type === 'eco' ? 0 : pl.fuel * 2; }

// —— 初始状态 ——

export function initialState(setup) {
  const n = setup.seats.length;
  const cfg = SETUP[n];
  const cities = buildMap();
  const rngState = { seed: setup.seed || 1, counter: 0 };
  const tmp = { rng: rngState };
  const s = {
    players: setup.seats.map((seat, i) => ({
      ...seat, seat: i, electro: cfg.electro,
      cities: [], plants: [], res: { coal: 0, oil: 0, garbage: 0, uranium: 0 },
      lastPowered: 0,
    })),
    step: 1, round: 1, n,
    map: cities, regions: [], regionAdj: regionAdjacency(cities),
    plantMarket: { current: STARTER_MARKET.slice(0, 4), future: STARTER_MARKET.slice(4) },
    deck: makeDeck(cfg.removePlants, () => rand(tmp)),
    resMarket: { ...RES_INITIAL },
    // 梯外供应（ refill 来源）= 总量 - 初始市场
    resSupply: { coal: 0, oil: 6, garbage: 18, uranium: 10 },
    builtAny: false,
    phase: { kind: 'chooseRegion', idx: 0, cur: 0 },
    gameOver: false,
    log: [], rng: rngState,
  };
  log(s, -1, 'pg.log.start', { n });
  settle(s);
  return s;
}

// —— 对外接口 ——

export function currentPlayer(s) { return s.phase.cur; }
export function isGameOver(s) { return s.gameOver; }

// score 终局计分：最终结算供电城数为总分（同分按座位序——官方为比余额/产能/城数，见 manifest 说明）
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.lastPowered,
    breakdown: [
      ['pg.score.powered', p.lastPowered],
      ['pg.score.cities', p.cities.length],
      ['pg.score.electro', p.electro],
      ['pg.score.capacity', p.plants.reduce((a, x) => a + PLANT_BY_ID[x.id].cap, 0)],
    ],
  }));
}

// —— 合法行动 ——

export function legalActions(s) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  switch (ph.kind) {
    case 'chooseRegion': {
      const free = Object.keys(REGIONS).filter((r) => !s.regions.includes(r));
      // 首选任意区；后续须与已选区相邻（官方规则）
      const legal = s.regions.length === 0
        ? free
        : free.filter((r) => s.regions.some((x) => s.regionAdj[x].includes(r)));
      return legal.map((r) => ({ kind: 'chooseRegion', region: r }));
    }
    case 'auction': return legalAuction(s, ph, p);
    case 'discardPlant':
      return p.plants.map((x) => ({ kind: 'discardPlant', plant: x.id }));
    case 'resources': return legalResources(s, ph, p);
    case 'cities': return legalCities(s, ph, p);
    case 'bureaucracy': return legalBureaucracy(p);
    default: return [];
  }
}

// legalAuction 拍卖：轮到出价者 bid/drop；轮到起拍者 offer/passOffer（首轮已购者除外）
function legalAuction(s, ph, p) {
  if (ph.plant !== null) {
    // 正在竞拍：当前 bidderIdx 指向的玩家加价或退出
    const acts = [];
    for (let amt = ph.bid + 1; amt <= p.electro; amt++) acts.push({ kind: 'bid', amount: amt });
    acts.push({ kind: 'dropBid' });
    return acts;
  }
  // 起拍回合：可选当前市场（step3 为全部 6 张）中买得起的厂
  const market = s.step === 3 ? [...s.plantMarket.current] : marketSorted(s).slice(0, 4);
  const acts = market.filter((id) => id <= p.electro)
    .map((id) => ({ kind: 'offer', plant: id }));
  const mustOffer = s.round === 1 && !ph.bought.includes(p.seat);
  if (!mustOffer) acts.push({ kind: 'passOffer' });
  return acts;
}

// legalResources 资源：逐种可购组合（受市场余量、电厂存储上限、余额约束）+ 完成购买
function legalResources(s, ph, p) {
  const acts = [];
  for (const res of RES_KINDS) {
    const remain = s.resMarket[res];
    for (let cnt = 1; cnt <= remain; cnt++) {
      if (resCostTotal(res, remain, cnt) > p.electro) break;
      if (resStorageLeft(p, res) >= cnt) acts.push({ kind: 'buyRes', res, count: cnt });
    }
  }
  acts.push({ kind: 'passRes' });
  return acts;
}

// resStorageLeft 某资源还能存多少。hybrid 煤/油共享一份容量，约束为：
// 该资源 ≤ 自身电厂容量 + hybrid 容量，且 煤+油 ≤ 煤容量 + 油容量 + hybrid 容量
export function resStorageLeft(p, res) {
  if (res !== 'coal' && res !== 'oil') {
    return capOf(p, res) - p.res[res];
  }
  const other = res === 'coal' ? 'oil' : 'coal';
  const combined = capOf(p, 'coal') + capOf(p, 'oil') + capOf(p, 'hybrid')
    - p.res.coal - p.res.oil; // 合并池剩余
  const own = capOf(p, res) + capOf(p, 'hybrid') - p.res[res]; // 该资源专属上限剩余
  return Math.min(combined, own);
}

// capOf 某类型电厂的存储容量合计（2× 每次发电消耗）
function capOf(p, type) {
  return p.plants.filter((x) => x.type === type).reduce((a, x) => a + x.fuel * 2, 0);
}

// legalCities 建城：所有可建且付得起的城市 + 完成建造
function legalCities(s, ph, p) {
  const acts = Object.keys(s.map)
    .filter((id) => cityBuildable(s, p, id) && buildTotalCost(s, p, id) <= p.electro)
    .map((id) => ({ kind: 'build', city: id }));
  acts.push({ kind: 'passBuild' });
  return acts;
}

// legalBureaucracy 结算：返回「最大可发电子集」与「不发电」两个合法行动；
// UI/bot 可自组任意子集（apply 校验燃料），与 PR 多步收集同范式
function legalBureaucracy(p) {
  const max = maxPowerSet(p);
  return [
    { kind: 'power', plants: max.map((x) => x.id) },
    { kind: 'power', plants: [] },
  ];
}

// maxPowerSet 贪心最大发电子集（按容量降序逐厂尝试，燃料池模拟）
export function maxPowerSet(p) {
  const pool = { ...p.res };
  const sorted = [...p.plants].sort((a, b) => PLANT_BY_ID[b.id].cap - PLANT_BY_ID[a.id].cap);
  const out = [];
  for (const pl of sorted) {
    const d = PLANT_BY_ID[pl.id];
    if (d.type === 'eco') { out.push(pl); continue; }
    if (d.type === 'hybrid') {
      if (pool.coal + pool.oil >= d.fuel) {
        let need = d.fuel;
        const takeCoal = Math.min(pool.coal, need);
        pool.coal -= takeCoal; need -= takeCoal; pool.oil -= need;
        out.push(pl);
      }
      continue;
    }
    if (pool[d.type] >= d.fuel) { pool[d.type] -= d.fuel; out.push(pl); }
  }
  return out;
}
// —— apply 主入口（Part 2：阶段推进与结算）——

export function apply(state, action) {
  const s = cl(state);
  applyUnchecked(s, action);
  settle(s);
  return s;
}

function applyUnchecked(s, a) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  const legal = legalActions(s);
  const ok = legal.some((x) => JSON.stringify(x) === JSON.stringify(a));
  // power 行动的 plants 子集由 UI/bot 自组（legal 仅含最大/空两档），此处单独校验燃料
  if (a.kind === 'power') validatePower(p, a);
  else if (!ok) throw new Error('illegal action: ' + JSON.stringify(a));
  switch (a.kind) {
    case 'chooseRegion': return applyChooseRegion(s, a, ph);
    case 'offer': return applyOffer(s, a, ph, p);
    case 'bid': return applyBid(s, a, ph, p);
    case 'dropBid': return applyDropBid(s, ph, p);
    case 'passOffer': return applyPassOffer(s, ph, p);
    case 'discardPlant': return applyDiscardPlant(s, a, ph, p);
    case 'buyRes': return applyBuyRes(s, a, ph, p);
    case 'passRes': return stepQueue(s, 'resources');
    case 'build': return applyBuild(s, a, ph, p);
    case 'passBuild': return stepQueue(s, 'cities');
    case 'power': return applyPower(s, a, ph, p);
    default: throw new Error('unknown action: ' + a.kind);
  }
}

// validatePower 校验自组发电子集的燃料可行性
function validatePower(p, a) {
  const ids = a.plants || [];
  const pool = { ...p.res };
  for (const id of ids) {
    const pl = p.plants.find((x) => x.id === id);
    const d = PLANT_BY_ID[id];
    if (!pl) throw new Error('power: plant not owned');
    if (d.type === 'eco') continue;
    if (d.type === 'hybrid') {
      if (pool.coal + pool.oil < d.fuel) throw new Error('power: hybrid fuel short');
      let need = d.fuel;
      const takeCoal = Math.min(pool.coal, need);
      pool.coal -= takeCoal; need -= takeCoal; pool.oil -= need;
      continue;
    }
    if (pool[d.type] < d.fuel) throw new Error('power: fuel short');
    pool[d.type] -= d.fuel;
  }
}

// —— 选区（开局）——

function applyChooseRegion(s, a, ph) {
  s.regions.push(a.region);
  log(s, ph.cur, 'pg.log.region', { n: s.players[ph.cur].name, r: REGIONS[a.region] });
  if (s.regions.length >= SETUP[s.n].regions) {
    startAuction(s);
  } else {
    ph.idx = (ph.idx + 1) % s.players.length;
    ph.cur = ph.idx;
  }
}

// startAuction 每轮拍卖开始：重算顺位，起拍者为顺位第一
function startAuction(s) {
  const order = turnOrderOf(s);
  s.phase = {
    kind: 'auction', order, turnIdx: 0, cur: order[0],
    plant: null, bid: 0, offerer: null, bidders: [], passedBid: [], bidderIdx: 0,
    bought: [], passedOffer: [],
  };
}

// applyOffer 起拍：底价 = 厂号（起拍者的站桩出价），从下一位活跃竞拍者开始轮转
function applyOffer(s, a, ph, p) {
  const market = s.step === 3 ? s.plantMarket.current : marketSorted(s).slice(0, 4);
  if (!market.includes(a.plant)) throw new Error('offer: plant not in current market');
  ph.offerer = p.seat;
  ph.plant = a.plant;
  ph.bid = a.plant;
  ph.bidders = ph.order.filter((seat) => !ph.bought.includes(seat) && !ph.passedOffer.includes(seat));
  ph.passedBid = [];
  if (ph.bidders.length === 1) return awardPlant(s, ph, p.seat); // 无人可竞，底价成交
  ph.bidderIdx = ph.bidders.indexOf(p.seat);
  advanceBidder(s, ph);
  log(s, p.seat, 'pg.log.offer', { n: p.name, c: a.plant });
}

// applyBid 加价
function applyBid(s, a, ph, p) {
  if (a.amount <= ph.bid || a.amount > p.electro) throw new Error('bad bid');
  ph.bid = a.amount;
  log(s, p.seat, 'pg.log.bid', { n: p.name, c: a.amount });
  advanceBidder(s, ph);
}

// applyDropBid 退出竞拍：只剩一人（或仅剩站桩起拍者）则成交
function applyDropBid(s, ph, p) {
  ph.passedBid.push(p.seat);
  log(s, p.seat, 'pg.log.dropBid', { n: p.name });
  const active = activeBidders(ph);
  if (active.length <= 1) return awardPlant(s, ph, active[0]);
  advanceBidder(s, ph);
}

// activeBidders 仍在竞拍中的座位（未退出）
function activeBidders(ph) {
  return ph.bidders.filter((x) => !ph.passedBid.includes(x));
}

// advanceBidder 轮转到下一位活跃竞拍者；起拍者未被加价时视为「站桩底价」跳过
// （官方：起拍者不可退出自己的拍卖，除非已被加价；其余人全退则其以底价成交）
function advanceBidder(s, ph) {
  const n = ph.bidders.length;
  for (let k = 1; k <= n; k++) {
    const idx = (ph.bidderIdx + k) % n;
    const seat = ph.bidders[idx];
    if (ph.passedBid.includes(seat)) continue;
    if (seat === ph.offerer && ph.bid === ph.plant) continue; // 站桩，不行动
    ph.bidderIdx = idx;
    ph.cur = seat;
    return;
  }
  awardPlant(s, ph, ph.offerer); // 只剩站桩起拍者，底价成交
}

// awardPlant 成交：付款、入厂、补市场；第 4 厂触发弃厂微阶段
function awardPlant(s, ph, seat) {
  const p = s.players[seat];
  p.electro -= ph.bid;
  p.plants.push({ ...PLANT_BY_ID[ph.plant] }); // 存全量数据（type/fuel 供发电与容量计算）
  ph.bought.push(seat);
  log(s, seat, 'pg.log.win', { n: p.name, c: ph.plant, b: ph.bid });
  marketRemove(s, ph.plant);
  ph.plant = null; ph.bid = 0; ph.bidders = [];
  if (p.plants.length > 3) {
    // 暂存拍卖上下文（深拷贝），弃厂后恢复
    s.phase = { kind: 'discardPlant', cur: seat, saved: cl(ph) };
    return;
  }
  nextOfferer(s, ph);
}

// rebalanceMarket 官方不变式：step1/2 现货恒为可见牌中最低 4 张
// （新抽牌号低于现货最高时入现货、原最高落入期货）
function rebalanceMarket(s) {
  if (s.step === 3) return; // step3 无期货，现货 6 张即全部
  const mk = s.plantMarket;
  const visible = [...mk.current, ...mk.future].sort((a, b) => a - b);
  mk.current = visible.slice(0, 4);
  mk.future = visible.slice(4);
}

// marketRemove 官方补牌序列：移除（现货或期货）→ 现货重排（期货最低升入）
// → 翻牌（可能触发 Step3）→ 再重排
function marketRemove(s, plantId) {
  const mk = s.plantMarket;
  mk.current = mk.current.filter((x) => x !== plantId);
  if (s.step !== 3) {
    mk.future = mk.future.filter((x) => x !== plantId);
    rebalanceMarket(s);
  }
  drawToMarket(s);
  if (s.step !== 3) rebalanceMarket(s);
}

// drawToMarket 牌堆顶补入期货（step3 补入现货）；抽到 Step3 卡即触发换阶段。
// Step3 卡本身就是这次补牌（移出游戏），不再递归补抽——
// 触发时现货 4 + 期货 3（顶替缺位未补）− 最低 1 = 6 张，恰为 step3 市场规格
function drawToMarket(s) {
  if (!s.deck.length) return;
  const card = s.deck.shift();
  if (card === STEP3_CARD) { triggerStep3(s); return; }
  if (s.step === 3) s.plantMarket.current.push(card);
  else s.plantMarket.future.push(card);
}

// triggerStep3 Step2→Step3：移出现货最低厂、期货并入现货成 6 张、牌堆重洗（去掉 Step3 卡）
function triggerStep3(s) {
  s.step = 3;
  const mk = s.plantMarket;
  const all = [...mk.current, ...mk.future].sort((a, b) => a - b);
  if (all.length > 1) all.shift(); // 最低厂移出本局
  mk.current = all;
  mk.future = [];
  s.deck = s.deck.filter((x) => x !== STEP3_CARD);
  shuffle(s, s.deck);
  log(s, -1, 'pg.log.step3', {});
}

// shuffle Fisher-Yates（引擎 rng）
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// applyDiscardPlant 弃到 3 厂后恢复拍卖上下文；超容量资源移出本局（? 待核对）
function applyDiscardPlant(s, a, ph, p) {
  p.plants = p.plants.filter((x) => x.id !== a.plant);
  clampResources(p);
  log(s, p.seat, 'pg.log.discardPlant', { n: p.name, c: a.plant });
  s.phase = ph.saved;
  nextOfferer(s, s.phase);
}

// clampResources 弃厂后将资源截到剩余电厂存储容量内（超容量部分移出本局）
function clampResources(p) {
  for (const k of ['garbage', 'uranium']) {
    const cap = p.plants.filter((x) => x.type === k).reduce((a, x) => a + x.fuel * 2, 0);
    p.res[k] = Math.min(p.res[k], cap);
  }
  const capCO = p.plants.filter((x) => ['hybrid', 'coal', 'oil'].includes(x.type))
    .reduce((a, x) => a + x.fuel * 2, 0);
  while (p.res.coal + p.res.oil > capCO) {
    if (p.res.coal >= p.res.oil) p.res.coal -= 1;
    else p.res.oil -= 1;
  }
}

// applyPassOffer 放弃起拍（本轮退出拍卖）
function applyPassOffer(s, ph, p) {
  ph.passedOffer.push(p.seat);
  log(s, p.seat, 'pg.log.passOffer', { n: p.name });
  nextOfferer(s, ph);
}

// nextOfferer 找下一位未购未弃的起拍者；全员退出 → 全员流拍则移最低厂，进入资源阶段
function nextOfferer(s, ph) {
  const remaining = ph.order.filter((seat) => !ph.bought.includes(seat) && !ph.passedOffer.includes(seat));
  if (!remaining.length) {
    if (!ph.bought.length) { // 整轮无人买厂：最低厂移出并补牌。? 待核对
      const low = Math.min(...s.plantMarket.current);
      log(s, -1, 'pg.log.plantRemoved', { c: low });
      marketRemove(s, low);
    }
    return startResources(s);
  }
  ph.turnIdx = ph.order.indexOf(remaining[0]);
  ph.cur = remaining[0];
}

// —— 资源阶段（倒序）——

function startResources(s) {
  const queue = [...turnOrderOf(s)].reverse();
  s.phase = { kind: 'resources', queue, idx: 0, cur: queue[0] };
}

// applyBuyRes 逐件计价（越买越贵），受电厂存储上限约束
function applyBuyRes(s, a, ph, p) {
  const remain = s.resMarket[a.res];
  const cost = resCostTotal(a.res, remain, a.count);
  if (cost > p.electro || a.count > remain || resStorageLeft(p, a.res) < a.count) {
    throw new Error('bad resource buy');
  }
  p.electro -= cost;
  p.res[a.res] += a.count;
  s.resMarket[a.res] -= a.count;
  log(s, p.seat, 'pg.log.buyRes', { n: p.name, r: RES_NAMES[a.res], c: a.count, m: cost });
}

// —— 建城阶段（倒序）——

function startCities(s) {
  const queue = [...turnOrderOf(s)].reverse();
  s.phase = { kind: 'cities', queue, idx: 0, cur: queue[0] };
  s.builtAny = false; // 本轮是否有人建城（轮末移厂判定用）
}

function applyBuild(s, a, ph, p) {
  const cost = buildTotalCost(s, p, a.city);
  if (!cityBuildable(s, p, a.city) || cost > p.electro) throw new Error('bad build');
  p.electro -= cost;
  p.cities.push(a.city);
  s.map[a.city].owners.push(p.seat);
  s.builtAny = true;
  log(s, p.seat, 'pg.log.build', { n: p.name, c: CITY_NAMES[a.city], m: cost });
  // step2 触发：任一玩家达到 step2 城数门槛立即切换（房价 15、同城可 2 家）
  if (s.step === 1 && p.cities.length >= SETUP[s.n].step2Cities) {
    s.step = 2;
    log(s, -1, 'pg.log.step2', {});
  }
}

// stepQueue resources/cities/bureaucracy 阶段的逐人推进
function stepQueue(s, kind) {
  const ph = s.phase;
  ph.idx += 1;
  if (ph.idx < ph.queue.length) { ph.cur = ph.queue[ph.idx]; return; }
  if (kind === 'resources') return startCities(s);
  if (kind === 'cities') return startBureaucracy(s);
  return finishBureaucracy(s);
}

// —— 结算阶段（顺位）——

function startBureaucracy(s) {
  const queue = turnOrderOf(s);
  s.phase = { kind: 'bureaucracy', queue, idx: 0, cur: queue[0] };
}

// applyPower 发电：消耗燃料、按供电城数付收入
function applyPower(s, a, ph, p) {
  const ids = a.plants || [];
  let cap = 0;
  for (const id of ids) {
    consumeFuel(p, id);
    cap += PLANT_BY_ID[id].cap;
  }
  const powered = Math.min(cap, p.cities.length);
  const income = incomeOf(powered);
  p.electro += income;
  p.lastPowered = powered;
  log(s, p.seat, 'pg.log.power', { n: p.name, c: powered, m: income });
  stepQueue(s, 'bureaucracy');
}

// finishBureaucracy 轮末：补资源 → 移厂/翻牌 → 终局判定 → 下一轮
function finishBureaucracy(s) {
  refillResources(s);
  removePlantEndRound(s);
  const endCities = SETUP[s.n].endCities;
  if (s.players.some((p) => p.cities.length >= endCities)) {
    s.gameOver = true;
    log(s, -1, 'pg.log.end', {});
    return;
  }
  s.round += 1;
  log(s, -1, 'pg.log.round', { c: s.round });
  startAuction(s);
}

// refillResources 按补给表从供应（梯外）补入市场，容量满则滞留供应
function refillResources(s) {
  const tab = REFILL[s.n][s.step];
  for (const res of RES_KINDS) {
    const free = RES_CAPACITY[res] - s.resMarket[res];
    const take = Math.min(tab[res], free, s.resSupply[res]);
    s.resMarket[res] += take;
    s.resSupply[res] -= take;
  }
}

// removePlantEndRound step1/2 有人建城 → 「现货」最高厂移出 + 补牌；
// step3 有人建城 → 牌堆顶直接移出
function removePlantEndRound(s) {
  if (s.step === 3) {
    if (s.builtAny && s.deck.length) s.deck.shift();
    return;
  }
  if (!s.builtAny) return;
  const high = Math.max(...s.plantMarket.current); // 官方：现货市场的最高厂移出
  log(s, -1, 'pg.log.plantRemoved', { c: high });
  marketRemove(s, high);
}

// —— settle：本作所有阶段均有合法行动（含 pass），仅防御性保底 ——

function needsAutoSkip() { return false; }

function settle(s) {
  let guard = 0;
  while (!s.gameOver && needsAutoSkip(s)) {
    if (++guard > 10000) throw new Error('settle loop detected');
  }
}
