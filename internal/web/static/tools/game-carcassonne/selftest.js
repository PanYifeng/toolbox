// 卡卡颂引擎自测：node 直接运行（node selftest.js）。
// 覆盖：块数据断言（25 形/72 块/71 牌堆/纹章 10/修道院 6）、旋转与放置合法性、
// 确定性与纯度、随机对局不变量（随从守恒 7/人、块守恒 72、明细一致、
// 合法动作非空、apply 不改入参）、规则定点测试（城市完成 2/块、纹章 +2、
// 道路 1/块、修道院围满 9、终局未完成减半、农夫 3/完成城市、多数并列均得、
// 农田槽位镜像连通、不可放块弃掉重抽、堆尽终局）、AI 全程对局。

import * as E from './engine.js';
import * as D from './data-tiles.js';
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

// mkGame 开局
function mkGame(n, seed) {
  return E.initialState({ seats: mkSeats(n), seed });
}

// setCell 手工摆块（测试布景，绕过流程）
function setCell(s, x, y, t, r) {
  s.board[x + ',' + y] = { t, r, m: -1, mSeat: -1 };
}

// putMeeple 手工放随从
function putMeeple(s, x, y, f, seat) {
  const c = s.board[x + ',' + y];
  c.m = f;
  c.mSeat = seat;
  s.players[seat].meeples--;
}

// forceTile 强造抽块阶段
function forceTile(s, t, deck) {
  s.phase = 'tile';
  s.current = t;
  s.deck = deck || [];
  s.last = null;
}

// typeOf 字母 → 类型索引
function typeOf(letter) {
  return D.TILES.findIndex((t) => t.l === letter);
}

// —— 棋盘数据 ——

section('块数据');
ok(D.TILES.length === 25, `类型数 ${D.TILES.length} != 25`);
ok(D.START_TYPE === 0, '起始块应为 type 0');
ok(D.TILES[0].l === 'D', '起始块应为 D 形');
let qsum = 0;
for (let i = 1; i < D.TILES.length; i++) qsum += D.TILES[i].q;
ok(qsum === 71, `牌堆数量 ${qsum} != 71`);
ok(D.DECK_TYPES.length === 71, `DECK_TYPES ${D.DECK_TYPES.length} != 71`);
const penTiles = D.DECK_TYPES.filter((t) => D.TILES[t].feats.some((f) => f.k === 'C' && f.p)).length;
ok(penTiles === 10, `纹章块数 ${penTiles} != 10`);
const monTiles = D.DECK_TYPES.filter((t) => D.TILES[t].feats.some((f) => f.k === 'M')).length;
ok(monTiles === 6, `修道院块数 ${monTiles} != 6`);
for (const t of D.TILES) {
  ok(t.e.length === 4 && /^[CGR]{4}$/.test(t.e), `块 ${t.l} 边串非法`);
  for (const f of t.feats) {
    if (f.k === 'C') ok(f.e.every((e) => t.e[e] === 'C'), `块 ${t.l} 城市边不一致`);
    if (f.k === 'R') ok(f.e.every((e) => t.e[e] === 'R'), `块 ${t.l} 道路边不一致`);
    if (f.k === 'F') ok(f.c.every(([e, s2]) => e >= 0 && e < 4 && s2 >= 0 && s2 < 3), `块 ${t.l} 农田槽位非法`);
  }
}

// —— 旋转与放置合法性 ——

section('旋转与放置');
{
  const s = mkGame(2, 1);
  ok(E.canPlace(s, typeOf('E'), 2, 0, -1), 'E 块 r2 应可放 (0,-1)');
  ok(!E.canPlace(s, typeOf('E'), 0, 0, -1), 'E 块 r0 草边对城边应不可放');
  ok(!E.canPlace(s, typeOf('E'), 2, 0, 0), '已占格应不可放');
  ok(!E.canPlace(s, typeOf('E'), 2, 5, 5), '悬空格应不可放');
  ok(E.canPlace(s, typeOf('U'), 1, 1, 0), 'U 块 r1 应可放 (1,0)');
  // B 块（全草地）在纯草地邻位四个朝向均可
  forceTile(s, typeOf('B'), []);
  const rot4 = E.legalActions(s).filter((a) => a.kind === 'place' && a.x === 0 && a.y === 1);
  ok(rot4.length === 4, `B 块 (0,1) 应 4 朝向可放，实际 ${rot4.length}`);
}

// —— 随机对局不变量 ——

// checkInvariants 对局不变量
function checkInvariants(s, tag) {
  let onBoard = 0;
  for (const k of Object.keys(s.board)) {
    if (s.board[k].m >= 0) onBoard++;
  }
  const totalM = s.players.reduce((a, p) => a + p.meeples, 0) + onBoard;
  ok(totalM === 7 * s.players.length, `${tag}: 随从守恒 ${totalM} != ${7 * s.players.length}`);
  const tiles = Object.keys(s.board).length + s.deck.length + s.discarded + (s.current >= 0 ? 1 : 0);
  ok(tiles === 72, `${tag}: 块守恒 ${tiles} != 72`);
  for (const p of s.players) {
    ok(p.city + p.road + p.mon + p.farm === p.score, `${tag}: ${p.name} 明细不一致`);
  }
}

// playout 随机对局（返回终局 state）
function playout(seed, n, maxSteps = 800) {
  let s = mkGame(n, seed);
  const rand = lcg(seed * 31 + n);
  let steps = 0;
  while (!s.gameOver && steps++ < maxSteps) {
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空`);
    const snap = JSON.stringify(s);
    const prev = s;
    s = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    ok(JSON.stringify(prev) === snap, `playout ${seed}: apply 改了入参`);
    checkInvariants(s, `playout${seed}`);
  }
  ok(s.gameOver, `playout ${seed}: ${maxSteps} 步未终局`);
  return s;
}

section('随机对局（含确定性与纯度）');
{
  const a = playout(101, 3);
  const b = playout(101, 3);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子对局应完全一致');
  for (let n = 1; n <= 200; n++) {
    const s = playout(n, 2 + (n % 4));
    const sc = E.score(s);
    ok(sc.length === s.players.length, `playout ${n}: score 长度异常`);
    ok(sc.every((r) => r.total === s.players[r.seat].score), `playout ${n}: score 总分不一致`);
  }
}

// —— 城市完成计分（2/块）——

section('城市完成');
{
  const s = mkGame(2, 1);
  putMeeple(s, 0, 0, 0, 0); // P0 驻守起始块城市
  forceTile(s, typeOf('E'), []);
  let s2 = E.apply(s, { kind: 'place', x: 0, y: -1, r: 2 });
  ok(s2.phase === 'meeple', '放块后应进随从阶段');
  s2 = E.apply(s2, { kind: 'skip' });
  ok(s2.players[0].score === 4, `2 块完成城市应得 4 分，实际 ${s2.players[0].score}`);
  ok(s2.players[0].meeples === 7, '结算后随从应归还');
  ok(s2.players[0].city === 4, '城市明细应为 4');
}

// —— 纹章与多数并列 ——

section('纹章与并列');
{
  // 起始城(P0) + N(0,-1) + E(-2,-1)城(P1) 三段，F 块落 (-1,-1) 合拢：
  // 4 块 + F 纹章 1 → 10 分；P0/P1 各 1 随从并列均得
  const s = mkGame(2, 1);
  setCell(s, 0, -1, typeOf('N'), 2);
  setCell(s, -2, -1, typeOf('E'), 1);
  putMeeple(s, -2, -1, 0, 1);
  putMeeple(s, 0, 0, 0, 0);
  forceTile(s, typeOf('F'), []);
  let s2 = E.apply(s, { kind: 'place', x: -1, y: -1, r: 0 });
  s2 = E.apply(s2, { kind: 'skip' });
  ok(s2.players[0].score === 10, `P0 应得 10 分，实际 ${s2.players[0].score}`);
  ok(s2.players[1].score === 10, `P1 并列应同样得 10 分，实际 ${s2.players[1].score}`);
  ok(s2.players[0].meeples === 7 && s2.players[1].meeples === 7, '并列双方随从均应归还');
}

// —— 道路完成计分（1/块）——

section('道路完成');
{
  const s = mkGame(2, 1);
  putMeeple(s, 0, 0, 1, 0); // P0 驻守起始块道路
  forceTile(s, typeOf('A'), [typeOf('A')]);
  let s2 = E.apply(s, { kind: 'place', x: 1, y: 0, r: 1 });
  s2 = E.apply(s2, { kind: 'skip' });
  ok(s2.players[0].score === 0, '单端闭合道路未完成不应得分');
  s2 = E.apply(s2, { kind: 'place', x: -1, y: 0, r: 3 });
  s2 = E.apply(s2, { kind: 'skip' });
  ok(s2.players[0].score === 3, `3 块完成道路应得 3 分，实际 ${s2.players[0].score}`);
  ok(s2.players[0].road === 3, '道路明细应为 3');
}

// —— 修道院围满（9 分）——

section('修道院');
{
  const s = mkGame(2, 1);
  setCell(s, 1, 1, typeOf('B'), 0);
  putMeeple(s, 1, 1, 1, 0); // P0 驻守修道院
  for (const [x, y] of [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]) setCell(s, x, y, typeOf('B'), 0);
  forceTile(s, typeOf('B'), []);
  let s2 = E.apply(s, { kind: 'place', x: 2, y: 2, r: 0 });
  s2 = E.apply(s2, { kind: 'skip' });
  ok(s2.players[0].score === 9, `围满修道院应得 9 分，实际 ${s2.players[0].score}`);
  ok(s2.players[0].mon === 9, '修道院明细应为 9');
}

// —— 终局：未完成减半 + 农夫 ——

section('终局结算');
{
  // 未完成城市 2 块 → 2 分；未完成道路 2 块 → 2 分
  const s = mkGame(2, 1);
  setCell(s, 0, -1, typeOf('N'), 2); // 城市西侧开放
  setCell(s, 1, 0, typeOf('A'), 1);
  putMeeple(s, 0, 0, 0, 0); // P0 城市随从
  putMeeple(s, 1, 0, 0, 1); // P1 道路随从
  forceTile(s, -1, []); // 牌堆已尽
  s.current = -1;
  const s2 = E.apply(s, { kind: 'skip' });
  ok(s2.gameOver, '牌堆尽应终局');
  ok(s2.players[0].score === 2, `未完成 2 块城市应得 2 分，实际 ${s2.players[0].score}`);
  ok(s2.players[1].score === 2, `未完成 2 块道路应得 2 分，实际 ${s2.players[1].score}`);

  // 农夫 3 分/相邻完成城市；修道院按已占格数
  const f = mkGame(2, 2);
  setCell(f, 0, -1, typeOf('N'), 2);
  setCell(f, -1, -1, typeOf('E'), 1); // 三块城市闭合（无随从）
  putMeeple(f, 0, 0, 2, 0); // P0 农夫驻守起始块北农田（邻该城市）
  setCell(f, 1, 1, typeOf('B'), 0);
  putMeeple(f, 1, 1, 1, 1); // P1 修道院：仅 (0,0) 一格相邻 → 2 分
  forceTile(f, -1, []);
  f.current = -1;
  const f2 = E.apply(f, { kind: 'skip' });
  ok(f2.players[0].farm === 3, `农夫应得 3 分，实际 ${f2.players[0].farm}`);
  ok(f2.players[1].mon === 2, `未围满修道院应得 2 分，实际 ${f2.players[1].mon}`);
  ok(f2.players[0].meeples === 7 && f2.players[1].meeples === 7, '终局随从应全部归还');
}

// —— 农田槽位镜像连通 ——

section('农田连通');
{
  const s = mkGame(2, 1);
  setCell(s, 1, 0, typeOf('U'), 1);
  const comp = E.farmComp(s, 0, 0, 2); // 起始块北农田
  ok(comp.members.length === 2, `跨块农田应连通 2 成员，实际 ${comp.members.length}`);
  ok(comp.members.some((m) => m.x === 1 && m.y === 0 && m.f === 2), 'U 块西农田应在同一分量');
}

// —— 不可放块弃掉重抽 ——

section('不可放块');
{
  const s = mkGame(2, 1);
  s.board = { '0,0': { t: typeOf('B'), r: 0, m: -1, mSeat: -1 } }; // 全草盘面
  forceTile(s, typeOf('C'), [typeOf('B')]); // C 全城块必无处可放
  const s2 = E.apply(s, { kind: 'skip' });
  ok(s2.discarded === 1, `应弃 1 块，实际 ${s2.discarded}`);
  ok(s2.current === typeOf('B'), '弃后应抽到 B 块');
  ok(!s2.gameOver, '牌堆有余不应终局');

  const g = mkGame(2, 1);
  g.board = { '0,0': { t: typeOf('B'), r: 0, m: -1, mSeat: -1 } };
  forceTile(g, typeOf('C'), []); // 全部不可放且无余牌
  const g2 = E.apply(g, { kind: 'skip' });
  ok(g2.gameOver, '无可放块且堆尽应终局');
  ok(g2.discarded === 1, '防御路径弃块计数');
}

// —— AI 对局 ——

section('AI 对局');
{
  for (let g = 1; g <= 5; g++) {
    const n = 2 + (g % 4);
    let s = mkGame(n, 700 + g);
    let steps = 0;
    while (!s.gameOver && steps++ < 800) {
      const legal = E.legalActions(s);
      ok(legal.length > 0, `AI 对局 ${g}: 合法动作为空`);
      s = E.apply(s, bot(s, legal));
      checkInvariants(s, `AI${g}`);
    }
    ok(s.gameOver, `AI 对局 ${g}: 未终局`);
    const ranked = E.score(s).every((r) => r.total >= 0);
    ok(ranked, `AI 对局 ${g}: 得分异常`);
    console.log(`  对局 ${g}: ${n} 人 — ${s.players.map((p) => p.score).join(' / ')}`);
  }
}

// —— 汇总 ——

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('失败项:');
  for (const m of failures) console.log('  - ' + m);
  process.exit(1);
}
