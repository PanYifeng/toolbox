// 斗地主引擎自测：node 直接运行（node selftest.js）。
// 覆盖：牌库完整性、牌型解析定点测试（各牌型 + 连牌上限 + 飞机翅膀规则）、
// 压制关系、确定性/纯度、随机对局不变量（牌数守恒 54、手牌只减不增、
// legalActions 非空、apply 不改入参、state 可 JSON 序列化、AI 全局对局可终局）、
// 叫分与地主/底牌/倍数/春天结算定点测试。

import * as E from './engine.js';
import * as D from './data-cards.js';
import * as C from './combos.js';
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

// eq 等值断言
function eq(actual, expected, msg) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${msg}（实际 ${JSON.stringify(actual)}）`);
}

// section 分组标题
function section(name) { console.log(`—— ${name} ——`); }

// mkSeats 造座位
function mkSeats(n) {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, isAI: true, color: '#888' }));
}

// rankCards 造指定点数的牌（自动分配花色，按需绕过真实牌 id 限制）
// 仅用于牌型解析定点测试：直接给 id
function cardsOf(ranks) {
  // rank → id：同点数顺序取不同花色；王单独处理
  const used = new Map();
  return ranks.map((r) => {
    if (r === 16) return 52;
    if (r === 17) return 53;
    const k = used.get(r) || 0;
    used.set(r, k + 1);
    return (r - 3) + k * 13;
  });
}

// —— 牌库 ——

section('牌库');
ok(D.buildDeck().length === 54, '牌库 54 张');
eq(D.rankOf(0), 3, 'rankOf(0) = 3');
eq(D.rankOf(12), 15, 'rankOf(12) = 2');
eq(D.rankOf(52), 16, 'rankOf(52) = 小王');
eq(D.rankOf(53), 17, 'rankOf(53) = 大王');
eq(new Set(D.buildDeck()).size, 54, '牌 id 互异');

// —— 牌型解析 ——

section('牌型解析');
eq(C.parseCombo(cardsOf([5]))?.type, 'single', '单张');
eq(C.parseCombo(cardsOf([5, 5]))?.type, 'pair', '对子');
eq(C.parseCombo(cardsOf([5, 5, 5]))?.type, 'trio', '三张');
eq(C.parseCombo(cardsOf([5, 5, 5, 9]))?.type, 'trio1', '三带一');
eq(C.parseCombo(cardsOf([5, 5, 5, 9, 9]))?.type, 'trio2', '三带二');
eq(C.parseCombo(cardsOf([3, 4, 5, 6, 7]))?.type, 'straight', '顺子 3-7');
eq(C.parseCombo(cardsOf([3, 4, 5, 6]))?.type ?? null, null, '4 张不成顺子');
eq(C.parseCombo(cardsOf([11, 12, 13, 14, 15]))?.type ?? null, null, '顺子不能含 2（J-Q-K-A-2 非法）');
eq(C.parseCombo(cardsOf([10, 11, 12, 13, 14]))?.type, 'straight', '顺子 10-J-Q-K-A 合法');
eq(C.parseCombo(cardsOf([3, 3, 4, 4, 5, 5]))?.type, 'pairs', '连对 334455');
eq(C.parseCombo(cardsOf([3, 3, 4, 4]))?.type ?? null, null, '两对不成连对');
eq(C.parseCombo(cardsOf([3, 3, 3, 4, 4, 4]))?.type, 'plane', '飞机 333444');
eq(C.parseCombo(cardsOf([3, 3, 3, 4, 4, 4, 9, 10]))?.type, 'plane1', '飞机带两单');
eq(C.parseCombo(cardsOf([3, 3, 3, 4, 4, 4, 9, 9, 10, 10]))?.type, 'plane2', '飞机带两对');
eq(C.parseCombo(cardsOf([3, 3, 3, 4, 4, 4, 9, 9, 9, 9]))?.type ?? null, null, '飞机翅膀不能是四张同点');
eq(C.parseCombo(cardsOf([3, 3, 3, 4, 4, 4, 9, 9, 10]))?.type ?? null, null, '飞机带对翅膀必须成对');
eq(C.parseCombo(cardsOf([7, 7, 7, 7]))?.type, 'bomb', '炸弹');
eq(C.parseCombo(cardsOf([16, 17]))?.type, 'rocket', '王炸');
eq(C.parseCombo(cardsOf([7, 7, 7, 7, 9, 10]))?.type, 'four2', '四带二');
eq(C.parseCombo(cardsOf([7, 7, 7, 7, 9, 9, 10, 10]))?.type, 'four2p', '四带两对');
eq(C.parseCombo(cardsOf([7, 7, 7, 7, 9, 9, 9]))?.type ?? null, null, '四带二不能带三张同点');
eq(C.parseCombo([0, 0])?.type ?? null, null, '同一张牌重复非法');

// —— 压制关系 ——

section('压制关系');
const single5 = C.parseCombo(cardsOf([5]));
const single9 = C.parseCombo(cardsOf([9]));
ok(C.beats(single9, single5), '大单张压小单张');
ok(!C.beats(single5, single9), '小单张压不过大单张');
ok(!C.beats(single9, C.parseCombo(cardsOf([5, 5]))), '不同牌型不可互压');
ok(C.beats(C.parseCombo(cardsOf([3, 3, 3, 3])), single9), '炸弹压单张');
ok(C.beats(C.parseCombo(cardsOf([16, 17])), C.parseCombo(cardsOf([3, 3, 3, 3]))), '王炸压炸弹');
ok(!C.beats(C.parseCombo(cardsOf([3, 3, 3, 3])), C.parseCombo(cardsOf([5, 5, 5, 5]))), '小炸弹压不过大炸弹');
ok(C.beats(C.parseCombo(cardsOf([4, 5, 6, 7, 8])), C.parseCombo(cardsOf([3, 4, 5, 6, 7]))), '同长顺子比大小');
ok(!C.beats(C.parseCombo(cardsOf([3, 4, 5, 6, 7, 8])), C.parseCombo(cardsOf([3, 4, 5, 6, 7]))), '不同长顺子不可互压');

// —— 合法出牌枚举 ——

section('合法出牌枚举');
const hand17 = cardsOf([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 3, 5, 7, 9]);
const allLeads = C.legalPlays(hand17, null);
ok(allLeads.length > 0, '领出有合法牌型');
ok(allLeads.every((cs) => C.parseCombo(cs) !== null), '枚举出的每手都是合法牌型');
ok(allLeads.every((cs) => cs.every((id) => hand17.includes(id))), '枚举出的每手都在手牌内');
const followPlays = C.legalPlays(hand17, C.parseCombo(cardsOf([4])));
ok(followPlays.every((cs) => C.beats(C.parseCombo(cs), C.parseCombo(cardsOf([4])))), '跟牌枚举全部能压过');
const emptyFollow = C.legalPlays(cardsOf([3, 4]), C.parseCombo(cardsOf([17])));
ok(emptyFollow.length === 0, '压不过时无合法跟牌');

// —— 纯度与确定性 ——

section('纯度与确定性');
const s0 = E.initialState({ seats: mkSeats(3), seed: 42 });
const before = JSON.stringify(s0);
E.apply(s0, { kind: 'bidPass' });
eq(JSON.stringify(s0), before, 'apply 不改入参');
const s1 = E.initialState({ seats: mkSeats(3), seed: 42 });
eq(JSON.stringify(s1), JSON.stringify(E.initialState({ seats: mkSeats(3), seed: 42 })), '同种子确定性');
ok(JSON.stringify(s0).length > 0, 'state 可 JSON 序列化');

// —— 开局发牌 ——

section('开局发牌');
let handsOk = true;
let bottomOk = true;
for (let seed = 1; seed <= 50; seed++) {
  const s = E.initialState({ seats: mkSeats(3), seed });
  const all = [...s.players.flatMap((p) => p.hand), ...s.bottom];
  if (all.length !== 54 || new Set(all).size !== 54) handsOk = false;
  if (s.players.some((p) => p.hand.length !== 17)) handsOk = false;
  if (s.bottom.length !== 3) bottomOk = false;
}
ok(handsOk, '50 局发牌：54 张无重复、每人 17 张');
ok(bottomOk, '50 局发牌：底牌恒 3 张');

// —— 叫分与地主 ——

section('叫分与地主');
{
  const s = E.initialState({ seats: mkSeats(3), seed: 7 });
  const bids = E.legalActions(s);
  eq(bids.filter((a) => a.kind === 'bid').map((a) => a.points), [1, 2, 3], '首叫可叫 1/2/3');
  ok(bids.some((a) => a.kind === 'bidPass'), '首叫可不叫');
  const s2 = E.apply(s, { kind: 'bid', points: 3 });
  eq(s2.phase, 'play', '叫满 3 分立即定地主');
  ok(s2.players[s2.landlord].hand.length === 20, '地主手牌 20 张（17 + 底牌 3）');
  eq(s2.baseScore, 3, '底分 = 叫分');
  eq(E.currentPlayer(s2), s2.landlord, '地主先出');
}
{
  // 三家不叫则重发
  const s = E.initialState({ seats: mkSeats(3), seed: 11 });
  let cur = s;
  for (let i = 0; i < 3; i++) cur = E.apply(cur, { kind: 'bidPass' });
  ok(cur.phase === 'bid' && cur.bid.spoken === 0, '三家不叫重新发牌（回到叫分起点）');
}
{
  // 叫 1 → 不叫 → 不叫 → 1 分者当地主
  const s = E.initialState({ seats: mkSeats(3), seed: 13 });
  let cur = E.apply(s, { kind: 'bid', points: 1 });
  cur = E.apply(cur, { kind: 'bidPass' });
  cur = E.apply(cur, { kind: 'bidPass' });
  eq(cur.phase, 'play', '最高叫分者当地主');
  eq(cur.baseScore, 1, '底分取最高叫分');
}

// —— 倍数与春天 ——

section('倍数与结算');
{
  // 构造地主一手打完的极端局面验证春天与倍数
  const s = E.initialState({ seats: mkSeats(3), seed: 5 });
  const st = JSON.parse(JSON.stringify(s));
  st.phase = 'play';
  st.landlord = 0;
  st.baseScore = 2;
  st.multiplier = 1;
  st.cur = 0;
  st.lastPlay = null;
  st.playChain = 0;
  st.players[0].hand = D.sortHand(cardsOf([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
  st.players[1].hand = D.sortHand(cardsOf([3, 3, 3, 4, 4]));
  st.players[2].hand = D.sortHand(cardsOf([5, 5, 5, 6, 6]));
  st.players[0].isLandlord = true;
  const fin = E.apply(st, { kind: 'play', cards: st.players[0].hand.slice() });
  ok(fin.gameOver, '出完手牌终局');
  eq(fin.spring, 'spring', '农民未出牌 → 春天');
  eq(fin.result.points, 2 * 2, '底分 2 × 春天倍数 2 = 4');
  const sc = E.score(fin);
  eq(sc[0].total, 8, '地主 +2×分数');
  eq(sc[1].total, -4, '农民 −分数');
}
{
  // 炸弹翻倍
  const s = E.initialState({ seats: mkSeats(3), seed: 9 });
  const st = JSON.parse(JSON.stringify(s));
  st.phase = 'play';
  st.landlord = 0;
  st.baseScore = 1;
  st.multiplier = 1;
  st.cur = 0;
  st.lastPlay = null;
  st.playChain = 0;
  st.players[0].hand = D.sortHand(cardsOf([3, 3, 3, 3, 6]));
  st.players[1].hand = D.sortHand(cardsOf([4, 5]));
  st.players[2].hand = D.sortHand(cardsOf([7, 8]));
  const a1 = E.apply(st, { kind: 'play', cards: cardsOf([3, 3, 3, 3]) });
  eq(a1.multiplier, 2, '炸弹使倍数 ×2');
  // 炸弹出完轮到下家，两农民连续过牌后地主重新领出最后一张
  let a2 = E.apply(a1, { kind: 'pass' });
  a2 = E.apply(a2, { kind: 'pass' });
  eq(E.currentPlayer(a2), 0, '两家过牌后回到地主');
  const a3 = E.apply(a2, { kind: 'play', cards: [cardsOf([6])[0]] });
  ok(a3.gameOver, '出完最后一张终局');
  eq(a3.result.points, 1 * 4, '底分 1 × 炸弹倍数 2 × 春天 2 = 4');
}

// —— 过牌与重新领出 ——

section('过牌与重新领出');
{
  const s = E.initialState({ seats: mkSeats(3), seed: 21 });
  const st = JSON.parse(JSON.stringify(s));
  st.phase = 'play';
  st.landlord = 0;
  st.cur = 0;
  st.lastPlay = null;
  st.playChain = 0;
  st.players[0].hand = D.sortHand(cardsOf([5, 9]));
  st.players[1].hand = D.sortHand(cardsOf([4, 8]));
  st.players[2].hand = D.sortHand(cardsOf([6, 10]));
  const a1 = E.apply(st, { kind: 'play', cards: cardsOf([5]) });
  eq(a1.cur, 1, '出牌后轮到下家');
  const a2 = E.apply(a1, { kind: 'pass' });
  eq(a2.cur, 2, '过牌后轮到下家');
  const a3 = E.apply(a2, { kind: 'pass' });
  eq(a3.cur, 0, '两家连续过牌回到最后出牌者');
  ok(a3.lastPlay === null, '重新领出（压制状态清空）');
}
{
  // 领出时不能过牌
  const s = E.initialState({ seats: mkSeats(3), seed: 23 });
  const st = JSON.parse(JSON.stringify(s));
  st.phase = 'play';
  st.landlord = 0;
  st.cur = 0;
  st.lastPlay = null;
  ok(!E.legalActions(st).some((a) => a.kind === 'pass'), '领出时无过牌选项');
}

// —— 非法动作防御 ——

section('非法动作防御');
{
  const s = E.initialState({ seats: mkSeats(3), seed: 31 });
  const st = JSON.parse(JSON.stringify(s));
  st.phase = 'play';
  st.landlord = 0;
  st.cur = 0;
  st.lastPlay = null;
  st.players[0].hand = D.sortHand(cardsOf([5, 9]));
  const before = JSON.stringify(st);
  eq(JSON.stringify(E.apply(st, { kind: 'play', cards: [999] })), before, '出不在手牌里的牌被忽略');
  eq(JSON.stringify(E.apply(st, { kind: 'play', cards: cardsOf([3]) })), before, '出不在手牌里的点数被忽略');
  eq(JSON.stringify(E.apply(st, { kind: 'nope' })), before, '未知动作被忽略');
  eq(JSON.stringify(E.apply(st, { kind: 'play', cards: cardsOf([5, 9]) })), before, '不成牌型的组合被忽略');
}

// —— 随机对局不变量 ——

section('随机对局不变量');
function playRandom(seed, botSeats) {
  let s = E.initialState({ seats: mkSeats(3), seed });
  let steps = 0;
  const seenCards = new Set();
  while (!E.isGameOver(s) && steps < 4000) {
    const legal = E.legalActions(s);
    if (!legal.length) return { ok: false, why: 'no legal actions' };
    const seat = E.currentPlayer(s);
    const act = botSeats ? bot(s, legal) : legal[Math.floor(Math.random() * legal.length)];
    if (!act) return { ok: false, why: 'bot returned null' };
    if (s.phase === 'play' && act.kind === 'play') {
      for (const id of act.cards) if (seenCards.has(id)) return { ok: false, why: 'card played twice' };
      for (const id of act.cards) seenCards.add(id);
    }
    const totalBefore = s.phase === 'play' ? s.players[seat].hand.length : -1;
    s = E.apply(s, act);
    if (totalBefore >= 0 && s.phase === 'play' && !E.isGameOver(s)) {
      const hand = s.players[seat].hand.length;
      if (hand > totalBefore) return { ok: false, why: 'hand grew' };
    }
    if (JSON.stringify(s).length === 0) return { ok: false, why: 'unserializable' };
    steps++;
  }
  if (!E.isGameOver(s)) return { ok: false, why: 'did not terminate' };
  return { ok: true };
}

let randOk = 0;
let randErr = null;
for (let seed = 1; seed <= 60; seed++) {
  const r = playRandom(seed, false);
  if (r.ok) randOk++;
  else if (!randErr) randErr = `seed ${seed}: ${r.why}`;
}
eq(randOk, 60, `60 局随机对局全部正常终局${randErr ? `（首个异常：${randErr}）` : ''}`);

let botOk = 0;
let botErr = null;
for (let seed = 1; seed <= 30; seed++) {
  const r = playRandom(seed + 1000, true);
  if (r.ok) botOk++;
  else if (!botErr) botErr = `seed ${seed}: ${r.why}`;
}
eq(botOk, 30, `30 局 AI 对局全部正常终局${botErr ? `（首个异常：${botErr}）` : ''}`);

// 手牌只减不增：随机整局中途任意时刻总牌数守恒 54
{
  let conserved = true;
  for (let seed = 1; seed <= 20; seed++) {
    let s = E.initialState({ seats: mkSeats(3), seed });
    let steps = 0;
    while (!E.isGameOver(s) && steps < 3000) {
      const legal = E.legalActions(s);
      if (!legal.length) break;
      s = E.apply(s, legal[Math.floor(Math.random() * legal.length)]);
      if (s.phase === 'play') {
        const n = s.players.reduce((a, p) => a + p.hand.length, 0);
        if (n > 54) conserved = false;
      }
      steps++;
    }
  }
  ok(conserved, '对局中手牌总数从不超 54');
}

// —— 汇总 ——

section('汇总');
console.log(`\n===== 斗地主 selftest: ${pass} passed, ${fail} failed =====`);
if (fail) {
  console.log('失败项：');
  for (const f of failures) console.log('  ✗', f);
  process.exit(1);
}
