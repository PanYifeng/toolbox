// 方舟动物园自测：node 直跑（node selftest.js）。
// A. 随机对局 200 局不变量：无异常 / legalActions 非空 / apply 纯度 / JSON 可序列化 /
//    同种子确定性 / 金钱非负 / 卡牌守恒（192 主牌 + 5 X + 22 项目 + 10 终局卡）
// B. 定向规则测试：牌堆构成 / 行动卡档位循环 / break 与借用付费 / 围栏空间 / 同种限制 /
//    声望入场费 / 动物预算 / 市场位置费与补位 / 打烊结算与手牌上限 / 项目达成 /
//    终局触发与收束 / 终局分公式

import { initialState, legalActions, apply, currentPlayer, isGameOver, score,
  animalOf, sponsorOf, projectOf, canPlaceAnimal, encUsed, effTerrain,
  egBonusCP, finalAppeal, zooAnimals, effEffects } from './engine.js';
import { ANIMALS, SPONSORS, PROJECTS, ENDGAMES, RULES, VARIANTS } from './data-cards.js';
import { bot } from './bot.js';

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); }
}
function section(name) { console.log(`\n== ${name} ==`); }

function mkSeats(n) {
  const cols = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
  return Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, isAI: true, color: cols[i] }));
}
function mkGame(n, seed) { return initialState({ seats: mkSeats(n), seed }); }

// —— A. 随机对局 ——
function countAllCards(s) {
  const m = {};
  const add = (id) => { m[id] = (m[id] || 0) + 1; };
  for (const c of s.deck) add(c);
  for (const c of s.discard) add(c);
  for (const c of s.market) if (c) add(c);
  for (const p of s.players) {
    for (const c of p.hand) add(c);
    for (const c of p.sponsors) add(c);
    for (const e of Object.keys(p.enc)) for (const a of p.enc[e].animals) add(a);
  }
  return m;
}

function runGame(n, seed, cap) {
  let s = mkGame(n, seed);
  let steps = 0;
  while (!isGameOver(s) && steps < cap) {
    const legal = legalActions(s);
    ok(legal.length > 0, `seed${seed} step${steps} legalActions empty`);
    const before = JSON.stringify(s);
    const a = bot(s, legal);
    ok(a !== null, `seed${seed} step${steps} bot null`);
    s = apply(s, a);
    steps++;
    for (const p of s.players) {
      ok(p.money >= 0, `seed${seed} money<0 seat${p.seat}`);
      ok(p.rep >= 0 && p.rep <= 5, `seed${seed} rep out of range`);
      ok(p.cards.length === 5, `seed${seed} cards!=5`);
      // 手牌上限 8：主行动/终局选卡决策点必须不超（行动子阶段内允许瞬时超出）
      if (s.phase === 'action' || s.phase === 'endgame') {
        ok(p.hand.length <= RULES.handMax, `seed${seed} step${steps} hand>${RULES.handMax} at ${s.phase}`);
      }
      ok(p.hand.length <= 20, `seed${seed} hand runaway`);
    }
    ok(s.breakX + s.deck.filter((c) => c === 'X').length === 5, `seed${seed} X count broken`);
    if (steps % 200 === 0) JSON.stringify(s); // 可序列化抽查
  }
  JSON.stringify(s);
  ok(isGameOver(s), `seed${seed} game did not finish in ${cap} steps (phase=${s.phase})`);
  return { s, steps };
}

section('A1. 随机对局不变量（200 局，2-4 人）');
{
  const seeds = [];
  for (let i = 0; i < 200; i++) seeds.push(1000 + i * 7);
  let totalSteps = 0;
  seeds.forEach((seed, i) => {
    const n = 2 + (i % 3);
    const r = runGame(n, seed, 4000);
    totalSteps += r.steps;
    // 卡牌守恒
    const m = countAllCards(r.s);
    const expect = {};
    for (const a of ANIMALS) expect[a.i] = (expect[a.i] || 0) + 1;
    for (const x of SPONSORS) expect[x.i] = (expect[x.i] || 0) + 1;
    for (const k of Object.keys(expect)) {
      if ((m[k] || 0) !== expect[k]) { ok(false, `seed${seed} card ${k} lost: ${m[k]||0}!=${expect[k]}`); return; }
    }
    // 项目守恒
    const pc = r.s.projectDeck.length + r.s.projects.filter((x) => x).length
      + r.s.players.reduce((a, p) => a + p.projects.length, 0);
    ok(pc === PROJECTS.length, `seed${seed} projects ${pc}!=${PROJECTS.length}`);
    // 终局卡守恒
    const ec = r.s.endgameDeck.length + r.s.endgameOffer.length
      + r.s.players.reduce((a, p) => a + (p.endgame ? 1 : 0), 0);
    ok(ec === ENDGAMES.length, `seed${seed} endgames ${ec}!=${ENDGAMES.length}`);
    // 终局分可算
    const sc = score(r.s);
    ok(sc.length === n, 'score rows');
  });
  console.log(`  ${seeds.length} games finished, total steps ${totalSteps}, avg ${(totalSteps / seeds.length).toFixed(0)}`);
}

section('A2. 同种子确定性');
{
  const a = runGame(3, 424242, 4000).s;
  const b = runGame(3, 424242, 4000).s;
  ok(JSON.stringify(a) === JSON.stringify(b), 'same-seed games diverge');
}

section('A3. apply 纯度（入参不被修改）');
{
  const s = mkGame(2, 77);
  let cur = s;
  for (let i = 0; i < 50; i++) {
    const snap = JSON.stringify(cur);
    const legal = legalActions(cur);
    const a = bot(cur, legal);
    const next = apply(cur, a);
    ok(JSON.stringify(cur) === snap, `step${i} input mutated`);
    cur = next;
  }
}

// —— B. 定向规则测试 ——
section('B1. 牌堆构成：128 动物 + 64 协会 = 192 + 5 X');
{
  ok(ANIMALS.length === 128, `animals ${ANIMALS.length}`);
  ok(SPONSORS.length === 64, `sponsors ${SPONSORS.length}`);
  ok(PROJECTS.length === 22 && ENDGAMES.length === 10, `projects ${PROJECTS.length} endgames ${ENDGAMES.length}`);
  const s = mkGame(2, 1);
  const held = s.players.reduce((a, p) => a + p.hand.length, 0) + s.market.filter((x) => x).length;
  // 开局发牌/开市场途中摸到的 X 入 break 计数区（不计入 held），守恒含 breakX
  ok(s.deck.length + held + s.breakX === 192 + 5,
    `deck${s.deck.length}+held${held}+breakX${s.breakX} != 197`);
  ok(s.endgameDeck.length + s.endgameOffer.length === ENDGAMES.length,
    `endgame cards ${s.endgameDeck.length}+${s.endgameOffer.length} != ${ENDGAMES.length}`);
  const x = s.deck.filter((c) => c === 'X').length + s.breakX;
  ok(x === 5, `X ${x}`);
  // 每人 5 张行动卡 + 恰 1 张一档变体
  for (const p of s.players) {
    ok(p.cards.length === 5, 'cards 5');
    ok(p.cards.filter((c) => c.variant).length === 1, 'variant count');
    ok(p.cards.every((c, i) => c.str === i + 1), 'initial strengths 1-5');
  }
}

section('B2. 行动卡档位循环：用卡降 1 档，其余 +1');
{
  const s = mkGame(2, 9);
  s.phase = 'action';
  s.turn = 0;
  // 直接使用动物卡（idx0），无动物可放则自动收束
  const before = s.players[0].cards.map((c) => c.str);
  const next = apply(s, { kind: 'act', card: 0 });
  const after = next.players[0].cards.map((c) => c.str);
  ok(after[0] === 1, `used card str ${after[0]} != 1`);
  for (let i = 1; i < 5; i++) ok(after[i] === Math.min(before[i] + 1, 5), `card${i} str ${after[i]}`);
}

section('B3. 超过 5 档进 break 区 + 借用付费归还');
{
  const s = mkGame(2, 10);
  s.phase = 'action';
  s.turn = 0;
  // P0 的建造卡抬到 5 档，用动物卡触发它 break
  s.players[0].cards[2].str = 5;
  s.players[0].cards.forEach((c, i) => { if (i !== 2) c.str = 1; });
  const next = apply(s, { kind: 'act', card: 0 });
  ok(next.players[0].cards[2].broken === true, 'card at 5+1 should break');
  // P1 借用：付 2 币给 P0，按 1 档执行，卡归还 P0
  const n2 = (() => {
    const t = JSON.parse(JSON.stringify(next));
    t.phase = 'action';
    t.turn = 1;
    t.players[1].money = 10;
    return t;
  })();
  const m0 = n2.players[0].money;
  const m1 = n2.players[1].money;
  const after2 = apply(n2, { kind: 'useBreak', owner: 0, card: 2 });
  ok(after2.players[1].money === m1 - 2, `borrower money ${after2.players[1].money} != ${m1 - 2}`);
  ok(after2.players[0].money === m0 + 2, `owner money ${after2.players[0].money} != ${m0 + 2}`);
  ok(after2.players[0].cards[2].broken === false && after2.players[0].cards[2].str === 1, 'borrowed card not returned at str 1');
}

section('B4. 围栏空间 / 同种限制 / 地形');
{
  const s = mkGame(2, 11);
  const p = s.players[0];
  p.enc.std2.on = true;
  p.enc.std2.animals = ['486', '487']; // 普通壁虎 + 水游蛇（各体型 1）
  ok(encUsed('std2', p.enc.std2) === 2, 'std2 used=2');
  const a3 = animalOf('488'); // 蛇蜥 体型1
  const r = canPlaceAnimal(p, '488', 'std2', 0, 999);
  ok(!r.ok && r.reason === 'noSpace', `full enclosure reason=${r.reason}`);
  // 同种限制：再放入已入栏的壁虎
  const r2 = canPlaceAnimal(p, '486', 'std5', 0, 999);
  p.enc.std5.on = true;
  const r2b = canPlaceAnimal(p, '486', 'std5', 0, 999);
  ok(!r2b.ok && r2b.reason === 'dupSpecies', `dup species reason=${r2b.reason}`);
  // 地形：std3 基础岩1，放需岩2 的动物被拒
  p.enc.std3.on = true;
  ok(effTerrain('std3', p.enc.std3).rk === 1, 'std3 base rock 1');
  const needRock2 = ANIMALS.find((x) => x.rk === 2 && !x.pz && !x.se);
  if (needRock2) {
    const r3 = canPlaceAnimal(p, needRock2.i, 'std3', 0, 999);
    ok(!r3.ok && r3.reason === 'needRock', `rock req reason=${r3.reason}`);
  }
  // 宠物只能进宠物角
  const pet = ANIMALS.find((x) => x.pz);
  const r4 = canPlaceAnimal(p, pet.i, 'std5', 0, 999);
  ok(!r4.ok && r4.reason === 'petOnly', `pet in std reason=${r4.reason}`);
  p.enc.pz.on = true;
  ok(canPlaceAnimal(p, pet.i, 'pz', 0, 999).ok, 'pet into petting zoo');
}

section('B5. 声望入场费');
{
  const s = mkGame(2, 12);
  s.phase = 'action';
  s.turn = 0;
  s.players[0].cards[1].str = 3;
  const m0 = s.players[0].money;
  const next = apply(s, { kind: 'act', card: 1 });
  const n2 = apply(next, { kind: 'assoc', opt: 'rep' });
  ok(n2.players[0].rep === 2, `rep ${n2.players[0].rep} != 2`);
  ok(n2.players[0].money === m0 - RULES.repCost[2], `money ${n2.players[0].money} != ${m0 - RULES.repCost[2]}`);
  // 付不起则声望不动
  const t = JSON.parse(JSON.stringify(n2));
  t.phase = 'action';
  t.turn = 1;
  t.players[1].money = 0;
  t.players[1].rep = 1;
  const t2 = apply(t, { kind: 'act', card: 1 });
  const t3 = apply(t2, { kind: 'assoc', opt: 'rep' });
  ok(t3.players[1].rep === 1 && t3.players[1].money === 0, 'rep should not move without fee money');
}

section('B6. 动物预算 = 8 × 档位');
{
  const s = mkGame(2, 13);
  const p = s.players[0];
  s.phase = 'action';
  s.turn = 0;
  p.cards[0].str = 2; // 预算 16
  p.enc.std5.on = true;
  p.enc.std3.on = true;
  // 清空需求干扰：选无需求、地形宽松的动物
  const cheap = ANIMALS.filter((x) => !x.req.length && !x.pz && !x.se && x.s <= 2 && x.rk <= 1 && x.wt <= 1);
  ok(cheap.length >= 2, 'need 2 cheap animals');
  p.hand = [cheap[0].i, cheap[1].i];
  const next = apply(s, { kind: 'act', card: 0 });
  ok(next.phase === 'place', `phase ${next.phase}`);
  ok(next.sub.budget === 16, `budget ${next.sub.budget}`);
  // 放价格和 > 16 的组合应被预算挡住
  const total = cheap[0].p + cheap[1].p;
  const n2 = apply(next, { kind: 'place', card: cheap[0].i, enc: 'std5' });
  if (total > 16) {
    const n3 = apply(n2, { kind: 'place', card: cheap[1].i, enc: 'std5' });
    const placed = n3.players[0].enc.std5.animals.length + n3.players[0].enc.std3.animals.length;
    const placed2 = n2.players[0].enc.std5.animals.length;
    ok(placed === placed2, `budget not enforced (${placed} vs ${placed2})`);
  } else {
    ok(true, 'combo within budget, skip');
  }
}

section('B7. 市场位置费与补位');
{
  const s = mkGame(2, 14);
  s.phase = 'take';
  s.turn = 0;
  s.sub = { kind: 'take', left: 2 };
  s.players[0].money = 4;
  const m0 = s.market.slice(0, 5);
  const next = apply(s, { kind: 'take', pos: 3 });
  ok(next.players[0].money === 1, `money ${next.players[0].money} != 1`);
  ok(next.players[0].hand.includes(m0[3]), 'card not taken');
  ok(next.market[0] === m0[0] && next.market[1] === m0[1] && next.market[2] === m0[2], 'shift wrong');
  ok(next.market[3] !== undefined, 'market refill');
  // 拿最左（位置 0）免费
  const n2 = apply(next, { kind: 'take', pos: 0 });
  ok(n2.players[0].money === 1, 'pos-0 take should be free');
}

section('B8. 打烊：收入 / break 卡归还 / 手牌上限 8 / X 洗回');
{
  const s = mkGame(2, 15);
  s.players[0].kiosk = 2;
  s.players[0].rest = 1;
  s.players[0].cards[2].broken = true;
  s.players[1].hand = ['401', '402', '403', '404', '405', '406', '407', '408', '409'];
  const m0 = s.players[0].money;
  const m1 = s.players[1].money;
  s.breakX = 4;
  s.deck = s.deck.filter((c) => c !== 'X');
  s.deck = ['X', ...s.deck]; // 下一张必是 X → 第 5 张触发打烊
  // 通过抽牌动作触发
  s.phase = 'action';
  s.turn = 0;
  s.players[0].hand = [];
  s.players[0].cards[3].str = 1;
  const next = apply(s, { kind: 'act', card: 3 }); // 卡牌行动抽 2 张（首张 X 触发打烊）
  const p0 = next.players[0];
  ok(p0.money === m0 + 3 + 2 * 2 + 1 * 4, `income ${p0.money} != ${m0 + 11}`);
  ok(next.players[1].money === m1 + 3, `p1 income ${next.players[1].money}`);
  ok(p0.cards[2].broken === false, 'break cards should return at X break');
  // P1 手牌 9 张 → 弃牌队列
  ok(next.discardQueue.includes(1) || next.phase === 'discard', 'discard queue for p1');
  ok(next.breakX === 0, 'breakX reset');
  ok(next.deck.filter((c) => c === 'X').length === 5, 'X reshuffled into deck');
}

section('B9. 项目达成与保护点');
{
  const s = mkGame(2, 16);
  const p = s.players[0];
  p.enc.std5.on = true;
  const five = ANIMALS.filter((x) => !x.req.length && !x.pz && !x.se && x.s === 1).slice(0, 5);
  p.enc.std5.animals = five.map((x) => x.i);
  ok(zooAnimals(p).length === 5, 'zoo has 5');
  const proj = PROJECTS.find((x) => x.i === '101');
  s.projects = ['101', '102', '103', '104'];
  s.phase = 'assoc';
  s.turn = 0;
  s.using = null;
  // 直接调 apply 前需 bypass using；改走完整链：手动设置 using
  const t = JSON.parse(JSON.stringify(s));
  t.phase = 'assoc';
  t.using = { seat: 0, ci: 1 };
  const next = apply(t, { kind: 'assoc', opt: 'project', proj: 0 });
  const got = next.players[0].projects.includes('101');
  ok(got, 'project not taken');
  const bestN = 5;
  const bestCp = proj.slots.filter((sl) => sl.n <= bestN).sort((a, b) => b.n - a.n)[0].cp;
  ok(next.players[0].cp === bestCp, `cp ${next.players[0].cp} != ${bestCp}`);
}

section('B10. 终局触发：声望 5 + 保护点门槛 → 本轮收束');
{
  const s = mkGame(2, 17);
  s.players[0].rep = 5;
  s.players[0].cp = RULES.cpGoal[2];
  s.phase = 'action';
  s.turn = 0;
  // 任意行动（含子阶段）走完后 checkEndgame 应在本行动收束时置 finalRound
  let cur = apply(s, { kind: 'act', card: 3 });
  let guard = 0;
  while (!cur.finalRound && !isGameOver(cur) && guard < 40) {
    cur = apply(cur, bot(cur, legalActions(cur)));
    guard++;
  }
  ok(cur.finalRound, 'finalRound not set');
  // 2 人局：P0 行动后轮 P1，P1 行动后结束
  while (!isGameOver(cur) && guard < 60) {
    cur = apply(cur, bot(cur, legalActions(cur)));
    guard++;
  }
  ok(isGameOver(cur), 'game should end after final round');
}

section('B11. 终局分公式：魅力×2 − 保护点');
{
  const s = mkGame(2, 18);
  const p = s.players[0];
  p.appeal = 30;
  p.cp = 12;
  p.workers = 2;
  const sc = score(s)[0];
  const ap = finalAppeal(p);
  ok(ap === 32, `finalAppeal ${ap} != 32`);
  ok(sc.total === 32 * 2 - 12, `total ${sc.total} != ${52}`);
  // 终局卡 CP 只计门槛不进分
  p.endgame = ENDGAMES[0].i; // size4
  p.enc.std5.on = true;
  p.enc.std5.animals = ANIMALS.filter((x) => x.s >= 4).slice(0, 2).map((x) => x.i);
  ok(egBonusCP(p) > 0, 'eg cp should be >0');
  const sc2 = score(s)[0];
  ok(sc2.total === 32 * 2 - 12, `total should not include eg cp (${sc2.total})`);
}

section('B12. 一档变体效果生效');
{
  const s = mkGame(2, 19);
  const p = s.players[0];
  for (const cat of Object.keys(VARIANTS)) ok(VARIANTS[cat].length >= 1, `variants for ${cat}`);
  // 玩家的变体卡在 effEffects 中生效（构造 anDisc2）
  p.cards[0].variant = 'a_dsc';
  const eff = effEffects(p);
  ok(eff.anDisc >= 2, `anDisc ${eff.anDisc} < 2`);
}

// —— 汇总 ——
console.log(`\n===== 方舟动物园 selftest: ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
