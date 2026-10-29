// 电力公司机器人：确定性启发式（零 Math.random，同种子重放一致）。
// 策略：电厂按「容量×10 − 编号」估值竞拍；资源逐件贪心买最便宜缺口；
// 建城贪心最低总价（留余额缓冲，终局无缓冲）；发电枚举子集最大化「收入 − 燃料成本」。
import { buildTotalCost, resStorageLeft, marketSorted } from './engine.js';
import { PLANT_BY_ID } from './plant-data.js';
import { resPrice, incomeOf, SETUP } from './tables.js';

const RES_KINDS = ['coal', 'oil', 'garbage', 'uranium'];
// 燃料保留价值（近似市场中位价）：发电机会成本
const FUEL_VALUE = { coal: 4, oil: 4, garbage: 4, uranium: 10 };

export function bot(s, legal) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  switch (ph.kind) {
    case 'chooseRegion': return botRegion(s, legal);
    case 'auction': return ph.plant !== null ? botBid(s, ph, p, legal) : botOffer(s, ph, p, legal);
    case 'discardPlant': return botDiscard(legal);
    case 'resources': return botResources(s, p, legal);
    case 'cities': return botCities(s, p, legal);
    case 'bureaucracy': return botPower(p);
    default: return legal[0];
  }
}

// botRegion 从合法区中按种子稳定挑一个（跨种子有差异，同种子确定）
function botRegion(s, legal) {
  const i = (s.rng.seed + s.regions.length * 7 + s.players[s.phase.cur].seat * 13) % legal.length;
  return legal[i];
}

// plantValue 电厂估值：容量主导，编号低者同容量更优，缺的类型加多样性分
function plantValue(p, id) {
  const d = PLANT_BY_ID[id];
  let v = d.cap * 10 - id * 0.6;
  const types = new Set(p.plants.map((x) => x.type));
  if (!types.has(d.type)) v += 3;
  return v;
}

// botOffer 起拍：首轮必买；产能缺口（总容量撑不起城数 + 余量）才升级，否则弃拍。
// 无节制换厂会把钱烧进产能军备竞赛，城数常年停滞（实测卡 1 城拖到 14 轮）
function botOffer(s, ph, p, legal) {
  const offers = legal.filter((a) => a.kind === 'offer');
  const pass = legal.find((a) => a.kind === 'passOffer');
  if (!offers.length) return pass;
  let best = null, bestV = -Infinity;
  for (const a of offers) {
    const v = plantValue(p, a.plant);
    if (v > bestV) { bestV = v; best = a; }
  }
  const must = s.round === 1 && !ph.bought.includes(p.seat);
  if (must || p.plants.length < 2) return best;
  const cap = p.plants.reduce((a, x) => a + PLANT_BY_ID[x.id].cap, 0);
  if (cap < p.cities.length + 4) return best; // 容量缺口：值得补厂
  return (pass || best);
}

// botBid 竞拍：最小加价，出价上限 = 估值
function botBid(s, ph, p, legal) {
  const next = ph.bid + 1;
  const val = plantValue(p, ph.plant);
  if (next <= p.electro && next <= val) return { kind: 'bid', amount: next };
  return { kind: 'dropBid' };
}

// botDiscard 弃厂：留容量最高者，弃最低
function botDiscard(legal) {
  let worst = legal[0], worstCap = Infinity;
  for (const a of legal) {
    const cap = PLANT_BY_ID[a.plant].cap;
    if (cap < worstCap) { worstCap = cap; worst = a; }
  }
  return worst;
}

// needRes 玩家是否用得上该资源（hybrid 用煤/油）
function needRes(p, res) {
  return p.plants.some((pl) => pl.type === res
    || (pl.type === 'hybrid' && (res === 'coal' || res === 'oil')));
}

// botResources 逐件贪心：买「下一件单价最低」的自有电厂可用资源，留余额缓冲。
// 终局期发电即分数——燃料几乎总是值回票价（1 件铀点亮 5-6 城收入 60+），
// 价格帽放到梯子顶（铀 16）且缓冲降到 4，别揣着钱饿死电厂
function botResources(s, p, legal) {
  const endCities = SETUP[s.n].endCities;
  const endgame = s.step === 3 || s.players.some((x) => x.cities.length >= endCities - 4);
  const buffer = endgame ? 4 : (s.round <= 2 ? 25 : 10);
  let best = null, bestPrice = Infinity;
  for (const res of RES_KINDS) {
    const remain = s.resMarket[res];
    if (!remain || resStorageLeft(p, res) <= 0 || !needRes(p, res)) continue;
    const price = resPrice(res, remain - 1);
    const cap = res === 'uranium' ? 16 : 8;
    if (price <= cap && price < bestPrice && p.electro - price >= buffer) {
      bestPrice = price; best = res;
    }
  }
  return best ? { kind: 'buyRes', res: best, count: 1 } : { kind: 'passRes' };
}

// botCities 建城：贪心最低总价；产能覆盖（能点亮再建）+ 余额缓冲（终局两者皆免，全力冲城）
function botCities(s, p, legal) {
  const builds = legal.filter((a) => a.kind === 'build');
  if (!builds.length) return { kind: 'passBuild' };
  const endCities = SETUP[s.n].endCities;
  const endgame = s.step === 3 || p.cities.length >= endCities - 3;
  let best = null, bestCost = Infinity;
  for (const a of builds) {
    const c = buildTotalCost(s, p, a.city);
    if (c < bestCost) { bestCost = c; best = a; }
  }
  const cap = p.plants.reduce((a, x) => a + x.cap, 0);
  const headroom = cap > p.cities.length; // 建了能供电，否则先升电厂
  const buffer = endgame ? 8 : 20; // 终局仍留少量余钱买燃料，避免冲城后发不动电
  return endgame || (headroom && p.electro - bestCost >= buffer) ? best : { kind: 'passBuild' };
}

// botPower 发电：枚举电厂子集（≤2^4），最大化「收入 − 燃料机会成本」
function botPower(p) {
  const cities = p.cities.length;
  let best = [], bestScore = -Infinity;
  const total = 1 << p.plants.length;
  for (let mask = 0; mask < total; mask++) {
    const subset = p.plants.filter((_, i) => mask & (1 << i));
    const pool = { ...p.res };
    let ok = true, fuelCost = 0, cap = 0;
    for (const pl of subset) {
      cap += pl.cap;
      if (pl.type === 'eco') continue;
      if (pl.type === 'hybrid') {
        if (pool.coal + pool.oil < pl.fuel) { ok = false; break; }
        let need = pl.fuel;
        const takeCoal = Math.min(pool.coal, need);
        pool.coal -= takeCoal; need -= takeCoal; pool.oil -= need;
        fuelCost += pl.fuel * FUEL_VALUE.coal;
      } else {
        if (pool[pl.type] < pl.fuel) { ok = false; break; }
        pool[pl.type] -= pl.fuel;
        fuelCost += pl.fuel * FUEL_VALUE[pl.type];
      }
    }
    if (!ok) continue;
    const sc = incomeOf(Math.min(cap, cities)) - fuelCost;
    if (sc > bestScore) { bestScore = sc; best = subset.map((x) => x.id); }
  }
  return { kind: 'power', plants: best };
}
