// 璀璨宝石引擎自测：node 直接运行（node selftest.js）。
// 覆盖：卡池数据断言（三源核对结构：90 卡/原型×5 旋转/各色成本 117 均等/
// 各色产出 18 均等/贵族 5+5）、确定性/纯度、随机对局不变量（宝石守恒、
// 卡牌守恒、贵族守恒、预留 ≤3、手牌 ≤10）、规则定点测试（同色拿 2 需
// 供应 ≥4、供应受限降为 2 颗、预留得金、金万能支付、折扣购卡、市场补位、
// 弃宝石微阶段、贵族自动/择一来访、15 分终局机会均等）、AI 全局对局。

import * as E from './engine.js';
import { CARDS, NOBLES, GEMS_BY_PLAYERS, MARKET_SLOTS, RESERVE_CAP } from './data-cards.js';
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

// findAct 在合法动作里找
function findAct(s, pred) {
  return E.legalActions(s).find(pred);
}

// ==== 1. 卡池数据（三源核对结构）====
section('卡池数据');
ok(CARDS.length === 90, `应 90 张卡，实际 ${CARDS.length}`);
const tierCount = [0, 0, 0];
for (const c of CARDS) tierCount[c[0] - 1]++;
ok(JSON.stringify(tierCount) === '[40,30,20]', `各阶应为 40/30/20，实际 ${tierCount}`);
// 官方原型表：(vp, 成本形状) → 恰好 5 张（旋转对称）
const SHAPES = {
  1: [[0, [1, 1, 1, 1, 0]], [0, [2, 1, 0, 0, 0]], [0, [2, 1, 1, 1, 0]], [0, [2, 2, 0, 0, 0]],
      [0, [2, 2, 1, 0, 0]], [0, [3, 0, 0, 0, 0]], [0, [3, 1, 1, 0, 0]], [1, [4, 0, 0, 0, 0]]],
  2: [[1, [3, 2, 2, 0, 0]], [1, [3, 3, 2, 0, 0]], [2, [4, 2, 1, 0, 0]], [2, [5, 0, 0, 0, 0]],
      [2, [5, 3, 0, 0, 0]], [3, [6, 0, 0, 0, 0]]],
  3: [[3, [5, 3, 3, 3, 0]], [4, [6, 3, 3, 0, 0]], [4, [7, 0, 0, 0, 0]], [5, [7, 3, 0, 0, 0]]],
};
for (const tier of [1, 2, 3]) {
  for (const [vp, shape] of SHAPES[tier]) {
    const n = CARDS.filter((c) => c[0] === tier && c[1] === vp
      && JSON.stringify(c[3].slice().sort((a, b) => b - a)) === JSON.stringify(shape)).length;
    ok(n === 5, `${tier} 阶 vp=${vp} 成本 ${shape} 应 5 张，实际 ${n}`);
  }
}
// 各色成本总量均等 117、各色产出 18
const costTot = [0, 0, 0, 0, 0];
const gives = [0, 0, 0, 0, 0];
for (const c of CARDS) {
  c[3].forEach((n, i) => { costTot[i] += n; });
  gives[c[2]]++;
}
ok(costTot.every((x) => x === 117), `各色成本总量应均等 117，实际 ${costTot}`);
ok(gives.every((x) => x === 18), `各色产出应均等 18，实际 ${gives}`);
ok(NOBLES.length === 10, `应 10 位贵族，实际 ${NOBLES.length}`);
const n44 = NOBLES.filter((n) => n.reduce((a, b) => a + b, 0) === 8).length;
const n333 = NOBLES.filter((n) => n.reduce((a, b) => a + b, 0) === 9).length;
ok(n44 === 5 && n333 === 5, `贵族应 5×(4+4) + 5×(3+3+3)，实际 ${n44}/${n333}`);

// ==== 2. 确定性与纯度 ====
section('确定性与纯度');
{
  const s1 = E.initialState({ seats: mkSeats(3), seed: 7 });
  const s2 = E.initialState({ seats: mkSeats(3), seed: 7 });
  ok(JSON.stringify(s1) === JSON.stringify(s2), '同种子初始状态应完全一致');
}
function playout(seed, n, maxSteps = 3000) {
  let s = E.initialState({ seats: mkSeats(n), seed });
  const rand = lcg(seed * 31 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空`);
    checkInvariants(s, `playout${seed}`);
    const snap = JSON.stringify(s);
    const next = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    ok(snap === JSON.stringify(s), `playout ${seed}: apply 改了入参`);
    s = next;
    steps++;
    if (steps > maxSteps) { ok(false, `playout ${seed}: 超步数未终局`); return s; }
  }
  return s;
}
function checkInvariants(s, tag) {
  const perGem = GEMS_BY_PLAYERS[s.n];
  const gemSum = s.supply.gems.reduce((a, b) => a + b, 0)
    + s.players.reduce((a, p) => a + p.gems.reduce((x, y) => x + y, 0), 0);
  ok(gemSum === 5 * perGem, `${tag}: 宝石总量应守恒 ${5 * perGem}，实际 ${gemSum}`);
  const goldSum = s.supply.gold + s.players.reduce((a, p) => a + p.gold, 0);
  ok(goldSum === 5, `${tag}: 金总量应守恒 5，实际 ${goldSum}`);
  let cards = s.decks.flat().length + s.players.reduce((a, p) => a + p.reserved.length + p.bought, 0);
  for (const row of s.market) {
    for (const cid of row) if (cid !== null) cards++;
  }
  ok(cards === 90, `${tag}: 卡牌总量应守恒 90，实际 ${cards}`);
  const nobleSum = s.nobles.length + s.players.reduce((a, p) => a + p.nobles.length, 0);
  ok(nobleSum === 4, `${tag}: 贵族应守恒 4，实际 ${nobleSum}`);
  for (const p of s.players) {
    ok(p.reserved.length <= RESERVE_CAP, `${tag}: ${p.name} 预留超上限`);
    if (!s.pending) ok(p.gold + p.gems.reduce((a, b) => a + b, 0) <= 10, `${tag}: ${p.name} 手牌超 10`);
  }
}

// ==== 3. 随机对局 ====
section('随机对局');
{
  const a = playout(101, 2);
  const b = playout(101, 2);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子随机对局应完全一致');
}
for (const n of [2, 3, 4]) {
  const s = playout(200 + n, n);
  ok(E.isGameOver(s), `${n} 人随机对局应终局`);
  ok(s.endTrigger !== null, `${n} 人局终局应由 15 分触发`);
  ok(s.players.some((p) => p.vp >= 15), `${n} 人局应有玩家 ≥15 分`);
  ok(E.score(s).length === n, `${n} 人局 score 长度异常`);
}

// ==== 4. 拿宝石规则 ====
section('拿宝石规则');
{
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  // 2 人局每色 4 颗：同色拿 2 合法（供应 ≥4）
  ok(!!findAct(s, (a) => a.kind === 'take2'), '供应 4 颗应允许同色拿 2');
  s.supply.gems[0] = 3;
  ok(!findAct(s, (a) => a.kind === 'take2' && a.color === 0), '供应 3 颗不应允许同色拿 2');
  // 供应受限：只剩 2 色有量 → take3 降为 2 颗组合
  s.supply.gems = [0, 5, 0, 5, 0];
  const combos3 = E.legalActions(s).filter((a) => a.kind === 'take3');
  ok(combos3.length === 1 && combos3[0].colors.length === 2, '可得色不足 3 应降为 2 颗组合');
  const s2 = E.apply(s, combos3[0]);
  ok(s2.players[0].gems[1] === 1 && s2.players[0].gems[3] === 1, '2 颗组合应各得 1 颗');
  ok(s2.supply.gems[1] === 4 && s2.supply.gems[3] === 4, '供应应各扣 1 颗');
}
{
  // 拿 2 颗同色
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  const a = findAct(s, (x) => x.kind === 'take2' && x.color === 2);
  const s2 = E.apply(s, a);
  ok(s2.players[0].gems[2] === 2 && s2.supply.gems[2] === 2, '同色拿 2 应得 2 颗扣 2 颗');
}

// ==== 5. 预留与购卡 ====
section('预留与购卡');
{
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  const blind = findAct(s, (a) => a.kind === 'reserve' && a.slot < 0 && a.tier === 2);
  const deckTop = s.decks[2][0];
  const s2 = E.apply(s, blind);
  ok(s2.players[0].reserved.length === 1 && s2.players[0].reserved[0] === deckTop,
    '盲留应拿走牌堆顶');
  ok(s2.players[0].gold === 1 && s2.supply.gold === 4, '预留应得 1 金');
  const s3 = E.initialState({ seats: mkSeats(2), seed: 42 });
  s3.supply.gold = 0;
  const s4 = E.apply(s3, blind);
  ok(s4.players[0].gold === 0, '金尽时预留不得金');
}
{
  // 预留上限 3
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  s.players[0].reserved = [1, 2, 3];
  ok(E.legalActions(s).every((a) => a.kind !== 'reserve'), '预留满 3 不应再有预留动作');
}
{
  // 折扣 + 金万能：找市场里任一张 3 同色一阶卡，折扣 1 后 1 宝石 + 1 金买下
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  let tier = -1; let slot = -1; let color = -1;
  outer: for (let t = 0; t < 3; t++) {
    for (let k = 0; k < MARKET_SLOTS; k++) {
      const cid = s.market[t][k];
      if (cid !== null && CARDS[cid][0] === 1 && CARDS[cid][3].reduce((a, b) => a + b, 0) === 3) {
        tier = t; slot = k; color = CARDS[cid][3].findIndex((n) => n > 0); break outer;
      }
    }
  }
  ok(slot >= 0, '市场上应有 3 同色一阶卡');
  const cid = s.market[tier][slot];
  const gives = CARDS[cid][2];
  s.players[0].bonus = [0, 0, 0, 0, 0];
  s.players[0].bonus[color] = 1;
  s.players[0].gems = [0, 0, 0, 0, 0];
  s.players[0].gems[color] = 1;
  s.players[0].gold = 1;
  const act = findAct(s, (a) => a.kind === 'buy' && a.tier === tier && a.slot === slot);
  ok(!!act, '折扣 1 + 1 宝石 + 1 金应可购 3 同色卡');
  const deckLen = s.decks[tier].length;
  const s2 = E.apply(s, act);
  ok(s2.players[0].gems[color] === 0 && s2.players[0].gold === 0, '支付应扣净宝石与金');
  ok(s2.players[0].bonus[gives] === 1 && s2.players[0].bonus[color] === 1,
    '购卡应给产出色加折扣，购入折扣保留');
  ok(s2.players[0].vp === 0, '3 同色一阶卡应为 0 分');
  ok(s2.players[0].bought === 1, '购卡数应 +1');
  ok(s2.market[tier][slot] !== null && s2.decks[tier].length === deckLen - 1,
    '市场应即时补位且牌堆 -1');
}

// ==== 6. 弃宝石微阶段 ====
section('弃宝石');
{
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  s.players[0].gems = [3, 3, 2, 2, 0]; // 10 颗
  const blind = findAct(s, (a) => a.kind === 'reserve' && a.slot < 0);
  const s2 = E.apply(s, blind);
  ok(s2.pending && s2.pending.kind === 'discard', '11 颗应进入弃宝石微阶段');
  ok(s2.cur === 0, '弃宝石期间不应轮转');
  const d = E.legalActions(s2).find((a) => a.kind === 'discard');
  const s3 = E.apply(s2, d);
  ok(!s3.pending, '弃至 10 颗应结束微阶段');
  ok(s3.cur === 1, '弃完后应轮转到下家');
}

// ==== 7. 贵族 ====
section('贵族');
{
  // 恰好满足 1 位：自动来访
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  s.nobles = [0]; // NOBLES[0] = 白4 绿4
  s.players[0].bonus = [4, 0, 4, 0, 0];
  const a = findAct(s, (x) => x.kind === 'take3');
  const s2 = E.apply(s, a);
  ok(s2.players[0].nobles.length === 1 && s2.players[0].vp === 3, '满足 1 位应自动来访 +3 分');
  ok(s2.nobles.length === 0, '来访后应移出在场行列');
  ok(s2.cur === 1, '来访后应轮转');
}
{
  // 同时满足 2 位：择一微阶段
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  s.nobles = [0, 5]; // 0=白4绿4, 5=白3蓝3绿3
  s.players[0].bonus = [4, 3, 4, 0, 0];
  const a = findAct(s, (x) => x.kind === 'take3');
  const s2 = E.apply(s, a);
  ok(s2.pending && s2.pending.kind === 'noble' && s2.pending.options.length === 2,
    '满足 2 位应进入择一微阶段');
  const pick = E.legalActions(s2).find((x) => x.kind === 'noble' && x.idx === 5);
  const s3 = E.apply(s2, pick);
  ok(s3.players[0].nobles[0] === 5 && s3.players[0].vp === 3, '择一后来访所选贵族');
  ok(s3.nobles.length === 1 && s3.nobles[0] === 0, '另一位贵族应留在场');
  ok(s3.cur === 1, '择一后应轮转');
}
{
  // 不满足：无来访
  const s = E.initialState({ seats: mkSeats(2), seed: 42 });
  s.nobles = [0];
  s.players[0].bonus = [3, 0, 4, 0, 0];
  const a = findAct(s, (x) => x.kind === 'take3');
  const s2 = E.apply(s, a);
  ok(s2.players[0].nobles.length === 0 && s2.nobles.length === 1, '不满足不应来访');
}

// ==== 8. 15 分终局 ====
section('终局触发');
{
  // P0 14 分，从市场挑一张正分卡并从供应堆转入恰好够的宝石买下 → 15 分触发
  const s = E.initialState({ seats: mkSeats(3), seed: 42 });
  s.players[0].vp = 14;
  let tier = -1; let slot = -1;
  outer: for (let t = 0; t < 3; t++) {
    for (let k = 0; k < MARKET_SLOTS; k++) {
      const cid = s.market[t][k];
      if (cid !== null && CARDS[cid][1] >= 1 && CARDS[cid][3].reduce((a, b) => a + b, 0) <= 10) {
        tier = t; slot = k; break outer;
      }
    }
  }
  ok(slot >= 0, '市场上应有成本 ≤10 的正分卡');
  const cid = s.market[tier][slot];
  CARDS[cid][3].forEach((n, c) => {
    s.supply.gems[c] -= n;
    s.players[0].gems[c] += n;
  });
  const buy = findAct(s, (a) => a.kind === 'buy' && a.tier === tier && a.slot === slot);
  ok(!!buy, '恰好够的资源应可购卡');
  const s2 = E.apply(s, buy);
  checkInvariants(s2, 'endTrigger');
  ok(s2.endTrigger === 0, '达 15 分应记录触发者');
  ok(!s2.gameOver && s2.cur === 1, '其余玩家应各补一回合');
  // P1、P2 各行动一次后终局
  let st = s2;
  let guard = 0;
  while (!st.gameOver && guard++ < 40) {
    const a2 = findAct(st, () => true);
    st = E.apply(st, a2);
    while (st.pending) st = E.apply(st, E.legalActions(st)[0]);
  }
  ok(st.gameOver, '补完一整轮应终局');
  ok(st.endTrigger === 0, '触发者应保持为首达者');
}

// ==== 9. AI 全局对局 ====
section('AI 对局');
for (const [seed, n] of [[7, 2], [8, 3], [9, 4]]) {
  let s = E.initialState({ seats: mkSeats(n), seed });
  let steps = 0;
  while (!E.isGameOver(s) && steps <= 3000) {
    const legal = E.legalActions(s);
    const a = bot(s, legal);
    ok(!!a, `AI ${seed}: 无返回动作`);
    s = E.apply(s, a);
    checkInvariants(s, `bot${seed}`);
    steps++;
  }
  ok(E.isGameOver(s), `AI ${seed} 人局应终局（${steps} 步）`);
  console.log(`  AI 对局 seed=${seed} n=${n}: ${steps} 步，得分 ${E.score(s).map((r) => r.total).join('/')}`);
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
