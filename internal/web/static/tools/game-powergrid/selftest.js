// 电力公司引擎自测：node 直接运行（引擎零 DOM/i18n 依赖）。
// 用法：node selftest.js
import {
  initialState, legalActions, apply, isGameOver, score,
  reachCost, buildTotalCost, cityBuildable, regionAdjacency, turnOrderOf,
} from './engine.js';
import { bot } from './bot.js';
import { resPrice, incomeOf, resCostTotal, RES_CAPACITY } from './tables.js';
import { PLANT_BY_ID, makeDeck, STEP3_CARD } from './plant-data.js';
import { buildMap, CITY_IDS, REGIONS } from './map-data.js';

const RES_KINDS = ['coal', 'oil', 'garbage', 'uranium'];
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', msg); }
}
function eq(a, b, msg) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

// —— 定点测试：价格梯 / 收入表 / 牌堆 / 地图 ——

// 资源价格梯：资源占最贵端区块、购买从区块最便宜格取 → 市场越空越贵
eq(resPrice('uranium', 11), 1, '铀满 12 件 → 下一件 1');
eq(resPrice('uranium', 1), 14, '铀剩 2 件 → 下一件 14（开局价）');
eq(resPrice('uranium', 0), 16, '铀剩 1 件 → 16');
eq(resPrice('uranium', 3), 10, '铀第 9 档 = 10（剩 4 件）');
eq(resPrice('coal', 23), 1, '煤满 24 件 → 下一件 1（开局价）');
eq(resPrice('coal', 0), 8, '煤剩 1 件 → 8');
eq(resPrice('oil', 17), 3, '油开局 18 件 → 下一件 3');
eq(resCostTotal('coal', 24, 3), 3, '满市场连买 3 煤 = 1+1+1（前 3 格都是 1 档）');

// 收入表
eq(incomeOf(0), 10, '0 城供电收入 10');
eq(incomeOf(10), 82, '10 城收入 82');
eq(incomeOf(20), 102, '20 城收入 102');
eq(incomeOf(21), 104, '21 城收入 104');

// 牌堆：确定性 + 数量守恒
{
  let c = 0;
  const rng = () => ((c = (c * 1664525 + 1013904223) >>> 0) / 4294967296);
  const d1 = makeDeck(8, rng);
  c = 0;
  const d2 = makeDeck(8, rng);
  eq(d1, d2, 'makeDeck 同随机序列确定性');
  eq(d1.length, 26, '2 人局牌堆 = 33 池 - 8 移除 + 1 Step3 卡');
  eq(d1.filter((x) => x === STEP3_CARD).length, 1, '牌堆恰含 1 张 Step3 卡');
  ok(d1.indexOf(STEP3_CARD) >= 3, 'Step3 卡不在顶 3 张');
}

// 地图：42 城、双向邻接、目标存在、每区 7 城、区域连通
{
  const m = buildMap();
  eq(CITY_IDS.length, 42, '42 城');
  const regionCount = {};
  for (const c of Object.values(m)) {
    regionCount[c.region] = (regionCount[c.region] || 0) + 1;
    for (const [nb, cost] of Object.entries(c.adj)) {
      ok(m[nb] !== undefined, `邻接目标存在: ${nb}`);
      ok(m[nb].adj[c.id] === cost, `邻接双向: ${c.id}<->${nb}`);
    }
  }
  for (const r of Object.keys(REGIONS)) eq(regionCount[r], 7, `区域 ${r} 恰 7 城`);
  const adj = regionAdjacency(m);
  const first = Object.keys(REGIONS)[0];
  const seen = new Set([first]);
  const queue = [first];
  while (queue.length) {
    const r = queue.shift();
    for (const nb of adj[r] || []) if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
  }
  eq(seen.size, 6, '六区域互相连通（任选 3-5 区可行）');
}

// 首城免连接费 + 区域门槛
{
  const s = mkGame(2, 1);
  s.regions = ['northwest', 'east', 'west'];
  s.phase = { kind: 'cities', queue: [1, 0], idx: 0, cur: 1 };
  eq(reachCost(s, s.players[1], 'kiel'), 0, '首城连接费 0');
  eq(buildTotalCost(s, s.players[1], 'kiel'), 10, 'step1 首城总价 = 房价 10');
  ok(!cityBuildable(s, s.players[1], 'muenchen'), '未选区域城市不可建');
}

// 首轮拍卖强制购厂
{
  const s = mkGame(3, 2);
  s.regions = ['northwest', 'east', 'west'];
  s.phase = { kind: 'auction', order: turnOrderOf(s), turnIdx: 0, cur: 0, plant: null, bid: 0, bidders: [], bidderIdx: 0, bought: [], passedOffer: [] };
  const legal = legalActions(s);
  ok(!legal.some((a) => a.kind === 'passOffer'), '首轮无人可弃拍');
  ok(legal.some((a) => a.kind === 'offer'), '首轮必须开拍');
}

// 发电收入与燃料消耗
{
  const s = mkGame(2, 3);
  s.regions = ['northwest', 'east', 'west'];
  const p = s.players[0];
  p.plants = [{ ...PLANT_BY_ID[7] }, { ...PLANT_BY_ID[13] }]; // 煤2cap2 + 生态cap1
  p.res.coal = 2;
  p.cities = ['kiel', 'hamburg', 'berlin'];
  for (const c of p.cities) s.map[c].owners.push(0);
  s.phase = { kind: 'bureaucracy', queue: [0, 1], idx: 0, cur: 0 };
  const s2 = apply(s, { kind: 'power', plants: [7, 13] });
  eq(s2.players[0].res.coal, 0, '发电消耗煤 2');
  eq(s2.players[0].lastPowered, 3, 'cap 3 供 3 城');
  eq(s2.players[0].electro - p.electro, incomeOf(3), '收入按供电城数支付');
}

// —— 随机对局：不变量 + 纯度 + 确定性 + 终局 ——

function mkSeats(n) {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  return names.slice(0, n).map((name, i) => ({ name, human: i === 0 }));
}

function mkGame(n, seed) { return initialState({ seats: mkSeats(n), seed }); }

function invariants(s, tag) {
  // 资源：市场 + 供应 + 玩家持有 ≤ 总量（发电消耗只减不增）
  for (const k of RES_KINDS) {
    const held = s.players.reduce((a, p) => a + p.res[k], 0);
    ok(s.resMarket[k] + s.resSupply[k] + held <= RES_CAPACITY[k], `${tag} 资源不超总量 ${k}`);
    ok(s.resMarket[k] >= 0 && s.resSupply[k] >= 0, `${tag} 市场资源非负 ${k}`);
  }
  // 电厂无重复：市场 + 牌堆 + 玩家
  const all = [...s.plantMarket.current, ...s.plantMarket.future,
    ...s.deck.filter((x) => x !== STEP3_CARD),
    ...s.players.flatMap((p) => p.plants.map((x) => x.id))];
  eq(new Set(all).size, all.length, `${tag} 电厂无重复`);
  // Step3 卡：step<3 恰 1 张在堆，step3 后 0 张
  eq(s.deck.filter((x) => x === STEP3_CARD).length, s.step < 3 ? 1 : 0, `${tag} Step3 卡数量`);
  // step1/2 现货恒为可见牌最低 4 张（官方市场不变式）
  if (s.step < 3) {
    const visible = [...s.plantMarket.current, ...s.plantMarket.future].sort((a, b) => a - b);
    eq([...s.plantMarket.current].sort((a, b) => a - b), visible.slice(0, 4), `${tag} 现货=最低 4 张`);
  }
  // 城市：owners 唯一 ≤3、玩家城市与地图双向一致、均在所选区域
  for (const [id, c] of Object.entries(s.map)) {
    ok(new Set(c.owners).size === c.owners.length, `${tag} 城市 Owners 无重复 ${id}`);
    ok(c.owners.length <= 3, `${tag} 城市 Owners ≤3 ${id}`);
  }
  for (const p of s.players) {
    for (const city of p.cities) {
      ok(s.map[city].owners.includes(p.seat), `${tag} 玩家城市在地图 owners 中 ${city}`);
      ok(s.regions.includes(s.map[city].region), `${tag} 城市在所选区域 ${city}`);
    }
    eq(p.cities.length, Object.values(s.map).filter((c) => c.owners.includes(p.seat)).length,
      `${tag} 玩家 ${p.seat} 城市数与地图一致`);
    ok(p.electro >= 0, `${tag} 余额非负 ${p.seat}`);
    ok(p.plants.length <= 4, `${tag} 电厂数 ≤4 ${p.seat}`);
    // 资源不超电厂存储容量（hybrid 煤油合并）
    for (const k of ['garbage', 'uranium']) {
      const cap = p.plants.filter((x) => x.type === k).reduce((a, x) => a + x.fuel * 2, 0);
      ok(p.res[k] <= cap, `${tag} 资源在容量内 ${k}/${p.seat}`);
    }
    const hyb = p.plants.filter((x) => ['hybrid', 'coal', 'oil'].includes(x.type))
      .reduce((a, x) => a + x.fuel * 2, 0);
    ok(p.res.coal + p.res.oil <= hyb, `${tag} 煤油合并在容量内 ${p.seat}`);
  }
}

// playGame 全 AI 对局（含开局逐区选择），逐步校验不变量与 apply 纯度
function playGame(n, seed, maxRounds, verbose) {
  let s = mkGame(n, seed);
  let steps = 0;
  const stats = { step2: false, step3: false, rounds: 0 };
  while (!s.gameOver) {
    if (steps >= 30000) { ok(false, `seed=${seed} 行动数上限`); break; }
    const legal = legalActions(s);
    ok(legal.length > 0, `seed=${seed} 合法行动非空 phase=${s.phase.kind} round=${s.round}`);
    if (!legal.length) break;
    const a = bot(s, legal);
    const snap = JSON.stringify(s);
    s = apply(s, a);
    ok(JSON.stringify(s) !== snap || s.gameOver, `seed=${seed} 状态应前进`);
    steps++;
    if (s.step >= 2) stats.step2 = true;
    if (s.step === 3) stats.step3 = true;
    stats.rounds = s.round;
    if (verbose) invariants(s, `seed=${seed} step${steps}`);
    if (s.round > maxRounds) {
      ok(false, `seed=${seed} 超过 ${maxRounds} 轮未终局（step=${s.step}, cities=${s.players.map((p) => p.cities.length)}）`);
      return { s, steps, stats, timeout: true };
    }
  }
  invariants(s, `seed=${seed} 终局`);
  ok(s.gameOver, `seed=${seed} 正常终局`);
  ok(s.players.every((p) => p.lastPowered >= 0), `seed=${seed} 终局有供电记录`);
  const sc = score(s);
  eq(sc.length, n, `seed=${seed} 计分覆盖全员`);
  return { s, steps, stats, timeout: false };
}

// apply 纯度：不修改入参对象
{
  let s = mkGame(2, 7);
  for (let i = 0; i < 300 && !s.gameOver; i++) {
    const legal = legalActions(s);
    if (!legal.length) break;
    const a = bot(s, legal);
    const before = JSON.parse(JSON.stringify(s));
    const next = apply(s, a);
    eq(s, before, `纯度 step${i}：apply 不修改入参`);
    s = next;
  }
}

// 同种子确定性：两次完整对局终局 state 完全一致
{
  const a = playGame(3, 42, 120);
  const b = playGame(3, 42, 120);
  eq(a.s, b.s, '同种子双局终局一致（确定性）');
}

// 各人数 × 多种子：全部终局 + 不变量全程校验（抽样局 verbose）
{
  const maxRounds = { 2: 150, 3: 150, 4: 150, 5: 150 };
  const summary = [];
  for (const n of [2, 3, 4, 5]) {
    for (const seed of [1, 2, 3]) {
      const verbose = n === 2 && seed === 1; // 一局全程逐步校验
      const r = playGame(n, seed, maxRounds[n], verbose);
      summary.push(`${n}p/seed${seed}: ${r.timeout ? 'TIMEOUT' : 'OK'} `
        + `${r.stats.rounds}轮 step=${r.s.step} ${r.steps}行动 `
        + `城=${r.s.players.map((p) => p.cities.length).join('/')} `
        + `胜者分=${Math.max(...score(r.s).map((x) => x.total))}`);
    }
  }
  console.log(summary.join('\n'));
}

console.log(`\n电力公司 selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
