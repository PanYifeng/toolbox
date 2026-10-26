// 卡坦岛引擎自测：node 直接运行（node selftest.js）。
// 覆盖：棋盘数据断言（19 格/54 顶点/72 边/30 海岸/18 数字 token/25 发展卡/9 港口）、
// 确定性与纯度、随机对局不变量（资源守恒 95、棋子上限、距离规则、建筑/道路登记一致、
// 发展卡守恒 25）、规则定点测试（蛇形放置、第二轮收入、7 弃牌折半、强盗封生产、
// 距离规则、连路规则、港口汇率、最长路授予/易主/被截断、最大军队、
// 发展卡购入当回合禁打与每回合一张、垄断/丰年、银行交易、10 分回合内获胜）、
// AI 全局对局。

import * as E from './engine.js';
import * as D from './data-board.js';
import { bot } from './bot.js';

let pass = 0;
let fail = 0;
const failures = [];

// ok 断言
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(msg);
}

// section 分组标题
function section(name) {
  console.log(`—— ${name} ——`);
}

// lcg 自测用确定性随机（独立于引擎 rng）
function lcg(seed) {
  let st = seed >>> 0 || 1;
  return () => {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    return st / 4294967296;
  };
}

// mkSeats 造座位
function mkSeats(n) {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, isAI: true, color: '#888' }));
}

// findDiceSeed 找一个 rng.state 使下两次 rnd 恰好掷出 (d1, d2)
function lcgNext(st) {
  return (Math.imul(st, 1664525) + 1013904223) >>> 0;
}

function findDiceSeed(d1, d2) {
  for (let st = 1; st < 5000000; st++) {
    const s1 = lcgNext(st);
    if (Math.floor((s1 / 4294967296) * 6) !== d1 - 1) continue;
    const s2 = lcgNext(s1);
    if (Math.floor((s2 / 4294967296) * 6) === d2 - 1) return st;
  }
  throw new Error(`no seed for dice ${d1},${d2}`);
}

// forceMain 强造主阶段（定点测试用）
function forceMain(s, seat) {
  s.phase = 'main';
  s.cur = seat;
  s.pending = null;
}

// give 直接设置玩家资源
function give(p, res) {
  p.res = res.slice();
}

// putSettle 手工放建筑（绕过费用，测试布景用）
function putSettle(s, seat, v, city) {
  s.players[seat].settlements.push(v);
  if (city) {
    s.players[seat].settlements.pop();
    s.players[seat].cities.push(v);
  }
  s.buildings[v] = { seat, city: !!city };
}

// putRoad 手工放路（测试布景用）
function putRoad(s, seat, e) {
  s.players[seat].roads.push(e);
  s.roads[e] = seat;
}

// vertOfHex 找格子某顶点
function vertOfHex(hi, k) {
  return D.HEX_VERTS[hi][k];
}

// ==== 1. 棋盘数据 ====
section('棋盘数据');
ok(D.HEXES.length === 19, `应 19 格，实际 ${D.HEXES.length}`);
ok(D.VERTICES.length === 54, `应 54 顶点，实际 ${D.VERTICES.length}`);
ok(D.EDGES.length === 72, `应 72 边，实际 ${D.EDGES.length}`);
ok(D.COASTAL_EDGES.length === 30, `应 30 海岸边，实际 ${D.COASTAL_EDGES.length}`);
ok(new Set(D.SPIRAL_HEXES).size === 19 && D.SPIRAL_HEXES.length === 19, '螺旋序应为 19 格不重复');
ok(D.NUMBER_TOKENS.length === 18 && !D.NUMBER_TOKENS.includes(7), '数字 token 应 18 枚无 7');
const devTotal = Object.values(D.DEV_COUNTS).reduce((a, b) => a + b, 0);
ok(devTotal === 25, `发展卡应 25 张，实际 ${devTotal}`);
// 港口：5 专属 + 4 通用，均在海岸边上且互不共顶点
ok(D.HARBOR_SPOTS.length === 9, `应 9 港口位，实际 ${D.HARBOR_SPOTS.length}`);
const hv = new Set();
for (const e of D.HARBOR_SPOTS) {
  const ed = D.EDGES[e];
  ok(ed.hexes.length === 1, `港口边 ${e} 应为海岸边`);
  ok(!hv.has(ed.a) && !hv.has(ed.b), `港口边 ${e} 与其他港口共顶点`);
  hv.add(ed.a);
  hv.add(ed.b);
}
// 顶点度数：内点 3、海岸 2-3，边数 = 度数和 / 2
const degSum = D.VERTICES.reduce((a, v) => a + v.adj.length, 0);
ok(degSum === 2 * D.EDGES.length, `度数和 ${degSum} 应等于 2×边数`);
// 每格 6 顶点 6 边
for (let hi = 0; hi < 19; hi++) {
  ok(new Set(D.HEX_VERTS[hi]).size === 6, `格 ${hi} 应 6 个不同顶点`);
  ok(new Set(D.HEX_EDGES[hi]).size === 6, `格 ${hi} 应 6 条不同边`);
}

// ==== 2. 开局：地形/数字/强盗/港口 ====
section('开局布景');
ok(E.isGameOver(E.initialState({ seats: mkSeats(3), seed: 42 })) === false, '开局不应终局');
for (const seed of [1, 42, 777]) {
  const s = E.initialState({ seats: mkSeats(4), seed });
  const terr = [0, 0, 0, 0, 0, 0];
  s.hexes.forEach((h) => { terr[h.terrain]++; });
  ok(JSON.stringify(terr) === '[4,3,4,4,3,1]', `地形组成应 4/3/4/4/3/1，实际 ${terr}（seed ${seed}）`);
  const nums = s.hexes.filter((h) => h.number !== null).map((h) => h.number).sort((a, b) => a - b);
  ok(JSON.stringify(nums) === JSON.stringify([...D.NUMBER_TOKENS].sort((a, b) => a - b)),
    `数字 token 组合应一致（seed ${seed}）`);
  const desert = s.hexes.findIndex((h) => h.terrain === 5);
  ok(s.hexes[desert].number === null, '沙漠应无数字');
  ok(s.robber === desert, '强盗应在沙漠');
  const hres = s.harbors.map((h) => h.res).sort();
  ok(JSON.stringify(hres) === JSON.stringify([-1, -1, -1, -1, 0, 1, 2, 3, 4]),
    `港口应 5 专属 + 4 通用（seed ${seed}）`);
  ok(s.devDeck.length === 25, '发展卡堆应 25 张');
}

// ==== 3. 确定性与纯度 ====
section('确定性与纯度');
{
  const a = E.initialState({ seats: mkSeats(3), seed: 9 });
  const b = E.initialState({ seats: mkSeats(3), seed: 9 });
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子初始状态应完全一致');
}
function checkInvariants(s, tag) {
  for (let r = 0; r < 5; r++) {
    const tot = s.bank[r] + s.players.reduce((x, p) => x + p.res[r], 0);
    ok(tot === 19, `${tag}: 资源 ${r} 总量应守恒 19，实际 ${tot}`);
    ok(s.bank[r] >= 0 && s.bank[r] <= 19, `${tag}: 银行资源 ${r} 越界`);
  }
  const played = s.log.filter((e) => ['ct.log.knight', 'ct.log.roadbuild',
    'ct.log.yopStart', 'ct.log.monoStart'].includes(e.key)).length;
  const held = s.players.reduce((a, p) => a + p.dev.length, 0);
  ok(s.devDeck.length + held + played === 25, `${tag}: 发展卡应守恒 25`);
  for (const p of s.players) {
    ok(p.roads.length <= 15, `${tag}: ${p.name} 路 >15`);
    ok(p.settlements.length <= 5, `${tag}: ${p.name} 村 >5`);
    ok(p.cities.length <= 4, `${tag}: ${p.name} 城 >4`);
    ok(p.settlements.length + p.cities.length <= 5 + 4, `${tag}: ${p.name} 建筑数异常`);
  }
  // 距离规则：任意两个建筑顶点不相邻
  const blds = Object.keys(s.buildings).map(Number);
  for (const v of blds) {
    for (const w of D.VERTICES[v].adj) {
      ok(!s.buildings[w], `${tag}: V${v} 与 V${w} 相邻建筑违反距离规则`);
    }
  }
  // 登记一致性：buildings/roads 映射与玩家列表互查
  const bMap = {};
  for (const p of s.players) {
    for (const v of p.settlements) bMap[v] = { seat: p.seat, city: false };
    for (const v of p.cities) bMap[v] = { seat: p.seat, city: true };
  }
  ok(JSON.stringify(bMap) === JSON.stringify(s.buildings), `${tag}: buildings 登记不一致`);
  const rMap = {};
  for (const p of s.players) for (const e of p.roads) rMap[e] = p.seat;
  ok(JSON.stringify(rMap) === JSON.stringify(s.roads), `${tag}: roads 登记不一致`);
  ok(s.robber >= 0 && s.robber < 19, `${tag}: 强盗位置越界`);
}
function playout(seed, n, maxSteps = 6000) {
  let s = E.initialState({ seats: mkSeats(n), seed });
  const rand = lcg(seed * 31 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空（pending ${s.pending && s.pending.kind}）`);
    checkInvariants(s, `playout${seed}`);
    const snap = JSON.stringify(s);
    const next = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    ok(snap === JSON.stringify(s), `playout ${seed}: apply 改了入参`);
    s = next;
    steps++;
    if (steps > maxSteps) return { s, done: false };
  }
  return { s, done: true };
}

// ==== 4. 随机对局（不变量）====
section('随机对局');
{
  const a = playout(101, 3, 3000);
  const b = playout(101, 3, 3000);
  ok(JSON.stringify(a.s) === JSON.stringify(b.s), '同种子随机对局应完全一致');
}
for (const n of [3, 4]) {
  const { s } = playout(200 + n, n, 2500);
  ok(E.score(s).length === n, `${n} 人局 score 长度异常`);
}

// postSetup 驱动初始放置到掷骰阶段（首合法策略）
function postSetup(n, seed) {
  let s = E.initialState({ seats: mkSeats(n), seed });
  let guard = 0;
  while (s.phase === 'setup' && guard++ < 60) s = E.apply(s, E.legalActions(s)[0]);
  return s;
}

// pushTurns 把 seat 之外的座位推完直到轮回 seat
function pushTurns(st, seat) {
  while (st.cur !== seat && !st.gameOver) {
    if (st.phase === 'roll') st = E.apply(st, { kind: 'roll' });
    while (st.pending) st = E.apply(st, E.legalActions(st)[0]);
    if (st.cur !== seat && st.phase === 'main') st = E.apply(st, { kind: 'endTurn' });
  }
  return st;
}

// ==== 5. 初始放置：蛇形 + 第二轮收入 ====
section('初始放置');
{
  const s = E.initialState({ seats: mkSeats(3), seed: 5 });
  const order = [];
  const second = {};
  let st = s;
  let guard = 0;
  while (st.phase === 'setup' && guard++ < 60) {
    const a = E.legalActions(st)[0];
    if (a.kind === 'placeSettlement') {
      order.push(st.pending.seat);
      if (st.pending.round === 2) second[st.pending.seat] = a.v;
    }
    st = E.apply(st, a);
  }
  ok(JSON.stringify(order) === '[0,1,2,2,1,0]', `3 人蛇形序应 0,1,2,2,1,0，实际 ${order}`);
  ok(st.phase === 'roll' && st.turn === 1 && st.cur === 0, '开局结束应进入掷骰且从 0 号起');
  const expect = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  for (const seat of Object.keys(second).map(Number)) {
    for (const hi of D.VERTICES[second[seat]].hexes) {
      const res = D.TERRAIN_RES[st.hexes[hi].terrain];
      if (res >= 0) expect[seat][res]++;
    }
  }
  st.players.forEach((p, i) => ok(JSON.stringify(p.res) === JSON.stringify(expect[i]),
    `P${i + 1} 第二轮收入应 ${expect[i]}，实际 ${p.res}`));
}

// ==== 6. 掷骰生产 / 强盗封生产 / 银行枯竭 ====
section('生产与强盗');
{
  const base = postSetup(3, 11);
  // 找 0 号第一村庄旁的产数字格
  const v0 = base.players[0].settlements[0];
  const hi = D.VERTICES[v0].hexes.find((h) => base.hexes[h].terrain !== 5);
  const num = base.hexes[hi].number;
  const d1 = Math.min(6, num - 1);
  const d2 = num - d1;
  // 生产：结算 0 号全部建筑的该数字产出
  const s1 = JSON.parse(JSON.stringify(base));
  s1.rng.state = findDiceSeed(d1, d2);
  const after = E.apply(s1, { kind: 'roll' });
  const got = after.players[0].res.reduce((a, b) => a + b, 0)
    - base.players[0].res.reduce((a, b) => a + b, 0);
  ok(got >= 1, `掷 ${num} 应有产出（实际 +${got}）`);
  ok(after.phase === 'main', '生产后应进主阶段');
  // 强盗封生产
  const s2 = JSON.parse(JSON.stringify(base));
  s2.robber = hi;
  s2.rng.state = findDiceSeed(d1, d2);
  const after2 = E.apply(s2, { kind: 'roll' });
  const got2 = after2.players[0].res.reduce((a, b) => a + b, 0)
    - base.players[0].res.reduce((a, b) => a + b, 0);
  ok(got2 === 0, '强盗格应无产出');
  // 银行枯竭：该格产出资源清空银行
  const s3 = JSON.parse(JSON.stringify(base));
  const res = D.TERRAIN_RES[s3.hexes[hi].terrain];
  s3.bank[res] = 0;
  s3.rng.state = findDiceSeed(d1, d2);
  const after3 = E.apply(s3, { kind: 'roll' });
  const got3 = after3.players[0].res[res] - base.players[0].res[res];
  ok(got3 === 0, '银行枯竭应无产出');
  // 城市双倍：把 0 号村升级成城再掷
  const s4 = JSON.parse(JSON.stringify(base));
  s4.players[0].settlements = s4.players[0].settlements.filter((x) => x !== v0);
  s4.players[0].cities.push(v0);
  s4.buildings[v0].city = true;
  s4.rng.state = findDiceSeed(d1, d2);
  const after4 = E.apply(s4, { kind: 'roll' });
  ok(after4.players[0].res[res] - base.players[0].res[res] >= 2, '城市应双倍产出');
}

// ==== 7. 掷 7：弃牌折半 + 强盗 + 抢牌 ====
section('掷 7');
{
  const base = postSetup(3, 11);
  give(base.players[0], [3, 3, 2, 2, 0]); // 10 张 → 弃 5
  give(base.players[1], [4, 4, 0, 0, 0]); // 8 张 → 弃 4
  give(base.players[2], [1, 1, 1, 1, 1]); // 5 张不弃
  base.rng.state = findDiceSeed(3, 4);
  let st = E.apply(base, { kind: 'roll' });
  ok(st.pending && st.pending.kind === 'discard' && st.pending.seat === 0, '7 点应从当前玩家起弃牌');
  ok(st.pending.remaining === 5, '10 张应弃 5（折半下取整）');
  let guard = 0;
  while (st.pending && st.pending.kind === 'discard' && guard++ < 40) {
    st = E.apply(st, E.legalActions(st).find((a) => a.kind === 'discardRes'));
  }
  ok(st.pending && st.pending.kind === 'robber', '弃完应进强盗阶段');
  ok(st.players[0].res.reduce((a, b) => a + b, 0) === 5, 'P1 弃后应 5 张');
  ok(st.players[1].res.reduce((a, b) => a + b, 0) === 4, 'P2 弃后应 4 张');
  ok(st.players[2].res.reduce((a, b) => a + b, 0) === 5, 'P3 不弃');
}
{
  // 无弃牌直接强盗 + 抢 1 张
  const base = postSetup(3, 11);
  const v1 = base.players[1].settlements[0];
  const hi = D.VERTICES[v1].hexes.find((h) => base.hexes[h].terrain !== 5);
  give(base.players[1], [0, 2, 0, 0, 0]);
  give(base.players[0], [0, 2, 0, 0, 0]);
  base.rng.state = findDiceSeed(1, 6);
  let st = E.apply(base, { kind: 'roll' });
  ok(st.pending && st.pending.kind === 'robber', '无人超 7 张应直接强盗');
  const move = E.legalActions(st).find((a) => a.kind === 'moveRobber' && a.hex === hi);
  st = E.apply(st, move);
  ok(st.robber === hi, '强盗应移到目标格');
  ok(st.pending && st.pending.kind === 'steal', '有相邻受害者应进抢牌');
  const steal = E.legalActions(st).find((a) => a.kind === 'steal');
  ok(steal.victim === 1, '受害方应为格旁玩家');
  st = E.apply(st, steal);
  ok(st.players[0].res[steal.res] === 3 && st.players[1].res[steal.res] === 1, '应抢走 1 张');
  ok(!st.pending && st.phase === 'main', '抢完回主阶段');
  // 强盗必须移动
  ok(!E.legalActions(st).some((a) => a.kind === 'moveRobber'), '主阶段不应有强盗动作');
}

// ==== 8. 距离规则与连路规则 ====
section('距离与连路');
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [9, 9, 9, 9, 9]);
  const v0 = s.players[0].settlements[0];
  putRoad(s, 0, D.VERTICES[v0].edges[0]);
  const e0 = D.VERTICES[v0].edges[0];
  const far = D.EDGES[e0].a === v0 ? D.EDGES[e0].b : D.EDGES[e0].a;
  // 沿路再铺一段找到可放的空点
  let placed = false;
  for (const e1 of D.VERTICES[far].edges) {
    if (e1 === e0 || s.roads[e1] !== undefined) continue;
    putRoad(s, 0, e1);
    const w = D.EDGES[e1].a === far ? D.EDGES[e1].b : D.EDGES[e1].a;
    if (s.buildings[w]) continue;
    if (D.VERTICES[w].adj.some((x) => s.buildings[x])) continue;
    const legal = E.legalActions(s);
    ok(!legal.some((a) => a.kind === 'settlement' && a.v === far), '邻村顶点不可放村（距离规则）');
    ok(!!legal.find((a) => a.kind === 'settlement' && a.v === w), '连路空点应可放村');
    ok(!legal.some((a) => a.kind === 'settlement' && a.v === v0), '已有建筑顶点不可放村');
    placed = true;
    break;
  }
  ok(placed, '应找到可放的连路空点');
  // 未连路的孤立空点不可放
  const anyEmpty = D.VERTICES.findIndex((_, v) => !s.buildings[v]
    && D.VERTICES[v].adj.every((x) => !s.buildings[x])
    && D.VERTICES[v].edges.every((e) => s.roads[e] !== 0));
  ok(anyEmpty >= 0 && !E.legalActions(s).some((a) => a.kind === 'settlement' && a.v === anyEmpty),
    '未连路空点不可放村');
}

// ==== 9. 建造与升级 ====
section('建造与升级');
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [0, 0, 0, 3, 3]);
  const v0 = s.players[0].settlements[0];
  const act = E.legalActions(s).find((a) => a.kind === 'city' && a.v === v0);
  ok(!!act, '己方村庄应可升级城市');
  const s2 = E.apply(s, act);
  ok(s2.players[0].cities.length === 1 && s2.players[0].settlements.length === 1, '升级后村 1 城 1');
  ok(s2.buildings[v0].city === true, '建筑应标记为城市');
  ok(!E.legalActions(s2).some((a) => a.kind === 'city' && a.v === v0), '城市不可再升级');
  // 费用不足不可升级
  give(s2.players[0], [0, 0, 0, 1, 3]);
  ok(!E.legalActions(s2).some((a) => a.kind === 'city'), '缺麦不可升级城市');
}
{
  // 棋子上限：路 15 / 村 5 / 城 4（手工布景后无对应动作）
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [99, 99, 99, 99, 99]);
  s.players[0].roads = [];
  const freeEdges = D.EDGES.map((_, i) => i).filter((e) => s.roads[e] === undefined).slice(0, 15);
  for (const e of freeEdges) s.roads[e] = 0;
  s.players[0].roads = freeEdges.slice();
  ok(!E.legalActions(s).some((a) => a.kind === 'road'), '路满 15 不可再建');
}

// ==== 10. 港口与银行交易 ====
section('港口与交易');
{
  const s = postSetup(3, 11);
  const hb = s.harbors.find((h) => {
    const { a, b } = D.EDGES[h.edge];
    return !s.buildings[a] && !s.buildings[b];
  });
  putSettle(s, 0, D.EDGES[hb.edge].a, false);
  ok(E.harborRatio(s, 0, hb.res) === (hb.res === -1 ? 3 : 2), '港口村应享 2:1 或 3:1 汇率');
  ok(E.harborRatio(s, 1, 0) === 4, '无港村应 4:1');
  forceMain(s, 0);
  give(s.players[0], [4, 0, 0, 0, 0]);
  const act = E.legalActions(s).find((a) => a.kind === 'bank' && a.give === 0 && a.get === 1);
  ok(!!act, '应可 4 木换 1 砖');
  const s2 = E.apply(s, act);
  ok(s2.players[0].res[0] === 0 && s2.players[0].res[1] === 1, '交易后应 0 木 1 砖');
  ok(s2.bank[0] === s.bank[0] + 4 && s2.bank[1] === s.bank[1] - 1, '银行账目应相应变动');
  // 2:1 专属港：补足港口资源后再换
  if (hb.res >= 0) {
    give(s2.players[0], [0, 0, 0, 0, 0]);
    s2.players[0].res[hb.res] = 2;
    const act2 = E.legalActions(s2).find((a) => a.kind === 'bank' && a.give === hb.res);
    ok(!!act2 && E.harborRatio(s2, 0, hb.res) === 2, '专属港应 2:1');
    const s3 = E.apply(s2, act2);
    ok(s3.players[0].res[hb.res] === 0, '2:1 应只付 2 张');
  }
  // 银行缺货不可换入
  s2.bank[4] = 0;
  ok(!E.legalActions(s2).some((a) => a.kind === 'bank' && a.get === 4), '银行无货不可换入');
}

// ==== 11. 最长路：授予 / 易主 / 截断 ====
section('最长路');

// findFreeChain 从 v 出发找一条 len 段的空闲路径（DFS，返回边序列）
function findFreeChain(s, v, len) {
  const used = new Set();
  function dfs(cur, acc) {
    if (acc.length === len) return acc;
    for (const e of D.VERTICES[cur].edges) {
      if (used.has(e) || s.roads[e] !== undefined) continue;
      used.add(e);
      const next = D.EDGES[e].a === cur ? D.EDGES[e].b : D.EDGES[e].a;
      const out = dfs(next, [...acc, e]);
      used.delete(e);
      if (out) return out;
    }
    return null;
  }
  return dfs(v, []);
}

{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [99, 99, 99, 99, 99]);
  // 从 v0 找 5 段空闲链铺路
  const chain = findFreeChain(s, s.players[0].settlements[0], 5);
  ok(!!chain, '棋盘上应能找到 5 段空闲链');
  for (const e of chain) putRoad(s, 0, e);
  ok(E.longestRoadFor(s, 0) >= 5, `5 段链应 ≥5（含初始路），实际 ${E.longestRoadFor(s, 0)}`);
  // 用合法动作再铺 1 段触发授予
  let st = s;
  const extra = E.legalActions(st).find((a) => a.kind === 'road');
  ok(!!extra, '应还有可建的路');
  st = E.apply(st, extra);
  ok(st.longestRoad.seat === 0 && st.longestRoad.len >= 5, '5+ 段应获最长路 +2VP');
  ok(E.vpOf(st, 0) >= 4, '最长路应计入 VP');
  // 分支网络取最深
  ok(E.longestRoadFor(st, 0) >= 5, '链 + 延伸后仍应 ≥5');
  // P1 铺 6 段易主
  forceMain(st, 1);
  give(st.players[1], [99, 99, 99, 99, 99]);
  const chain1 = findFreeChain(st, st.players[1].settlements[0], 6);
  ok(!!chain1, '应能找到 6 段空闲链');
  for (const e of chain1) putRoad(st, 1, e);
  const extra1 = E.legalActions(st).find((a) => a.kind === 'road');
  st = E.apply(st, extra1);
  ok(st.longestRoad.seat === 1, `6+ 段应易主（实际 seat ${st.longestRoad.seat}）`);
  // P2 在 P1 链中段放村截断 → P1 最长路跌破 5
  const mid = st.players[1].roads[2];
  const midV = D.EDGES[mid].a;
  putSettle(st, 2, midV, false);
  ok(E.longestRoadFor(st, 1) < 6, '中段放村应截断最长路');
  // P0 再建一段触发重判：P1 若 <5 则让位
  forceMain(st, 0);
  const extra2 = E.legalActions(st).find((a) => a.kind === 'road');
  if (extra2) {
    st = E.apply(st, extra2);
    if (E.longestRoadFor(st, 1) < 5) {
      ok(st.longestRoad.seat === 0, 'P1 路被截断后最长路应回到 P0');
    }
  }
}

// ==== 12. 最大军队 ====
section('最大军队');
{
  const s = postSetup(3, 11);
  s.players[0].dev = [
    { t: 'knight', turn: 0 }, { t: 'knight', turn: 0 }, { t: 'knight', turn: 0 },
    { t: 'monopoly', turn: 0 },
  ];
  let st = s;
  for (let k = 0; k < 3; k++) {
    forceMain(st, 0);
    ok(!!E.legalActions(st).find((a) => a.kind === 'playKnight'), `第 ${k + 1} 张骑士应可打`);
    st = E.apply(st, { kind: 'playKnight' });
    while (st.pending) st = E.apply(st, E.legalActions(st)[0]);
    if (k === 0) {
      ok(!E.legalActions(st).some((a) => a.kind === 'playMono'), '每回合限打一张发展卡');
    }
    if (k < 2) {
      st = E.apply(st, { kind: 'endTurn' });
      st = pushTurns(st, 0);
    }
  }
  ok(st.largestArmy.seat === 0 && st.largestArmy.size === 3, '3 骑士应获最大军队');
  ok(st.players[0].knights === 3, '骑士计数应为 3');
}

// ==== 13. 发展卡：购入当回合禁打 / 垄断 / 丰年 ====
section('发展卡');
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [0, 0, 1, 1, 1]);
  s.devDeck[s.devDeck.length - 1] = 'knight'; // 堆顶（数组尾）安排为骑士
  const s2 = E.apply(s, { kind: 'buyDev' });
  ok(s2.players[0].dev[0].t === 'knight', '应买到堆顶骑士');
  ok(!E.legalActions(s2).some((a) => a.kind === 'playKnight'), '购入当回合不可打');
  let st = E.apply(s2, { kind: 'endTurn' });
  st = pushTurns(st, 0);
  // 轮回后先掷骰（可能触发 7 微阶段），再验证骑士可打
  st = E.apply(st, { kind: 'roll' });
  while (st.pending) st = E.apply(st, E.legalActions(st)[0]);
  ok(E.legalActions(st).some((a) => a.kind === 'playKnight'), '下回合应可打骑士');
}
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  s.players[0].dev.push({ t: 'monopoly', turn: 0 });
  give(s.players[1], [3, 0, 0, 0, 0]);
  give(s.players[2], [2, 0, 0, 0, 0]);
  let st = E.apply(s, { kind: 'playMono' });
  ok(st.pending && st.pending.kind === 'mono', '垄断应进选资源微阶段');
  st = E.apply(st, { kind: 'monoPick', res: 0 });
  ok(st.players[0].res[0] === 5, '垄断应收走他家全部木材');
  ok(st.players[1].res[0] === 0 && st.players[2].res[0] === 0, '他家木材应清零');
}
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  s.players[0].dev.push({ t: 'yearOfPlenty', turn: 0 });
  let st = E.apply(s, { kind: 'playYop' });
  ok(st.pending && st.pending.kind === 'yop', '丰年应进取资源微阶段');
  st = E.apply(st, { kind: 'yopTake', res: 4 });
  st = E.apply(st, { kind: 'yopTake', res: 4 });
  ok(st.players[0].res[4] === 2 && !st.pending, '丰年应取 2 张');
}
{
  // 修路：2 条免费路
  const s = postSetup(3, 11);
  forceMain(s, 0);
  s.players[0].dev.push({ t: 'roadBuild', turn: 0 });
  let st = E.apply(s, { kind: 'playRoadBuild' });
  ok(st.pending && st.pending.kind === 'freeRoad' && st.pending.left === 2, '修路应得 2 条免费路');
  const r1 = E.legalActions(st).find((a) => a.kind === 'freeRoad');
  const before = st.players[0].res.reduce((a, b) => a + b, 0);
  st = E.apply(st, r1);
  ok(st.players[0].res.reduce((a, b) => a + b, 0) === before, '免费路不扣资源');
  ok(st.pending && st.pending.left === 1, '还应放第 2 条');
  st = E.apply(st, E.legalActions(st).find((a) => a.kind === 'freeRoad'));
  ok(!st.pending, '2 条放完应回主阶段');
}

// ==== 14. 国内交易（明牌主屏裁决）====
section('国内交易');
{
  const s = postSetup(3, 11);
  forceMain(s, 0);
  give(s.players[0], [2, 0, 0, 0, 0]);
  give(s.players[1], [0, 1, 0, 0, 0]);
  const offer = { kind: 'trade', to: 1, give: [2, 0, 0, 0, 0], get: [0, 1, 0, 0, 0] };
  let st = E.apply(s, offer);
  ok(st.pending && st.pending.kind === 'tradeOffer' && st.pending.seat === 1, '提议应交对手方裁决');
  ok(E.currentPlayer(st) === 1, '待决策应为对手方');
  st = E.apply(st, { kind: 'tradeAccept' });
  ok(st.players[0].res[0] === 0 && st.players[0].res[1] === 1, '成交后提议方过户');
  ok(st.players[1].res[0] === 2, '对手方应收 2 木');
  let st2 = E.apply(s, offer);
  st2 = E.apply(st2, { kind: 'tradeDecline' });
  ok(st2.players[0].res[0] === 2 && st2.players[1].res[1] === 1, '拒绝应无过户');
  let threw = false;
  try { E.apply(s, { kind: 'trade', to: 1, give: [9, 0, 0, 0, 0], get: [0, 1, 0, 0, 0] }); }
  catch { threw = true; }
  ok(threw, '资源不足的提议应抛错');
}

// ==== 15. 10 分回合内获胜 ====
section('终局');
{
  const s = postSetup(3, 11);
  // 0 号布景 4 城 + 1 分卡 = 9 分，合法建村即 10 分获胜
  const empty = D.VERTICES.map((_, v) => v).filter((v) => !s.buildings[v]);
  for (const v of s.players[0].settlements.slice()) {
    s.players[0].settlements = s.players[0].settlements.filter((x) => x !== v);
    s.players[0].cities.push(v);
    s.buildings[v].city = true;
  }
  for (const v of empty.slice(0, 2)) putSettle(s, 0, v, true);
  s.players[0].dev.push({ t: 'vp', turn: 0 });
  ok(E.vpOf(s, 0) === 9, `布景应 9 分，实际 ${E.vpOf(s, 0)}`);
  forceMain(s, 0);
  give(s.players[0], [1, 1, 1, 1, 0]);
  // 手工铺边开出一个合法放村点
  const spotV = D.VERTICES.findIndex((_, v) => !s.buildings[v]
    && D.VERTICES[v].adj.every((x) => !s.buildings[x]));
  const edgeTo = D.VERTICES[spotV].edges[0];
  putRoad(s, 0, edgeTo);
  const spot = E.legalActions(s).find((a) => a.kind === 'settlement');
  ok(!!spot, '布景后应有可放村点');
  if (spot) {
    const st = E.apply(s, spot);
    ok(st.gameOver && st.winner === 0, '回合内达 10 分应立即获胜');
    ok(!E.isGameOver(s), '建造前不应终局');
  }
}
{
  // 轮到即胜：下家带 10 分（2 初始村 + 4 城布景）
  const s = postSetup(3, 11);
  const empty = D.VERTICES.map((_, v) => v).filter((v) => !s.buildings[v]);
  for (const v of empty.slice(0, 4)) putSettle(s, 1, v, true);
  ok(E.vpOf(s, 1) === 10, `布景应 10 分，实际 ${E.vpOf(s, 1)}`);
  forceMain(s, 0);
  const st = E.apply(s, { kind: 'endTurn' });
  ok(st.gameOver && st.winner === 1, '轮到 10 分玩家应即胜');
}

// ==== 16. AI 全局对局 ====
section('AI 对局');
for (const [seed, n] of [[7, 3], [8, 4], [9, 3]]) {
  let s = E.initialState({ seats: mkSeats(n), seed });
  let steps = 0;
  let stuck = null;
  while (!E.isGameOver(s) && steps <= 25000) {
    const legal = E.legalActions(s);
    const a = bot(s, legal);
    if (!a) { stuck = `无动作（pending ${s.pending && s.pending.kind}）`; break; }
    s = E.apply(s, a);
    if (steps % 40 === 0) checkInvariants(s, `bot${seed}`);
    steps++;
  }
  ok(E.isGameOver(s), `AI seed=${seed} n=${n} 应终局（${steps} 步${stuck ? '，' + stuck : ''}）`);
  checkInvariants(s, `bot${seed}final`);
  if (E.isGameOver(s)) {
    console.log(`  AI 对局 seed=${seed} n=${n}: ${steps} 步，得分 ${E.score(s).map((r) => r.total).join('/')}`);
  }
}

// ==== 汇总 ====
section('汇总');
console.log(`PASS ${pass} / FAIL ${fail}`);
if (failures.length) {
  console.log('失败项（前 20 条）:');
  failures.slice(0, 20).forEach((m) => console.log(`  ✗ ${m}`));
  process.exit(1);
}
console.log('ALL PASS');
