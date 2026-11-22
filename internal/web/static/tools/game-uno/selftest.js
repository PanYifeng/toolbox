// 巫诺（UNO）引擎自测：node 直接运行（node selftest.js）。
// 覆盖：牌库结构断言（108 张 / 各色 25 / 万能 8）、确定性/纯度、随机对局不变量
// （牌总量守恒 108、手牌守恒、牌堆+弃牌+手牌 = 108）、规则定点测试（同色/同数字/
// 同符号接牌、万能牌随时可出、+2 罚牌跳过、反转两人局等同跳过、+4 选色、
// 摸牌后可打、UNO 罚摸、连锁罚牌累加、局末计分、目标分终局）、AI 整场对局。

import * as E from './engine.js';
import {
  DECK, HAND_SIZE, DEFAULT_TARGET, RED, YELLOW, GREEN, BLUE, WILD,
  V_SKIP, V_REV, V_DRAW2, V_WILD, V_WILD4, cardValue, cardSym, cardName,
} from './data-cards.js';
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
function section(name) { console.log(`—— ${name} ——`); }

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

// start 开局（默认目标分 200 便于自测快速终局）
function start(n, seed, extras) {
  return E.initialState({ seats: mkSeats(n), seed, extras: extras || { target: 200 } });
}

// findAct 在合法动作里找
function findAct(s, pred) { return E.legalActions(s).find(pred); }

// == 1. 牌库结构 ==
section('牌库结构');
ok(DECK.length === 108, `应 108 张牌，实际 ${DECK.length}`);
{
  const per = [0, 0, 0, 0, 0];
  for (const c of DECK) per[c.c]++;
  ok(JSON.stringify(per) === '[25,25,25,25,8]', `各色应 25/25/25/25 + 万能 8，实际 ${per}`);
  const zeros = DECK.filter((c) => c.c !== WILD && c.v === 0).length;
  ok(zeros === 4, `数字 0 应每色 1 张共 4，实际 ${zeros}`);
  const ones = DECK.filter((c) => c.c !== WILD && c.v === 1).length;
  ok(ones === 8, `数字 1 应每色 2 张共 8，实际 ${ones}`);
  const skips = DECK.filter((c) => c.v === V_SKIP).length;
  ok(skips === 8, `跳过应 8 张，实际 ${skips}`);
  const wilds = DECK.filter((c) => c.v === V_WILD4).length;
  ok(wilds === 4, `+4 应 4 张，实际 ${wilds}`);
  ok(cardValue(DECK.findIndex((c) => c.c === RED && c.v === 7)) === 7, '数字 7 应计 7 分');
  ok(cardValue(DECK.findIndex((c) => c.c === RED && c.v === V_SKIP)) === 20, '功能牌应计 20 分');
  ok(cardValue(DECK.findIndex((c) => c.v === V_WILD4)) === 50, '+4 应计 50 分');
  ok(cardSym(DECK.findIndex((c) => c.c === RED && c.v === 3)) === '3', '数字牌符号应为数字');
  ok(cardName(DECK.findIndex((c) => c.c === RED && c.v === 5)).zh === '红5', '牌名应为「红5」');
}

// == 2. 确定性与纯度 ==
section('确定性与纯度');
{
  const a = start(3, 7);
  const b = start(3, 7);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子初始状态应完全一致');
  ok(a.players.every((p) => p.hand.length === HAND_SIZE), '开局每人应 7 张');
}

// checkInvariants 牌总量守恒 108 + 手牌一致性
function checkInvariants(s, tag) {
  const inHands = s.players.reduce((a, p) => a + p.hand.length, 0);
  const total = s.draw.length + s.discard.length + inHands;
  ok(total === 108, `${tag}: 牌总量应守恒 108，实际 ${total}`);
  const ids = new Set([...s.draw, ...s.discard, ...s.players.flatMap((p) => p.hand)]);
  ok(ids.size === total, `${tag}: 牌 id 应互不重复（${ids.size}/${total}）`);
}

// playout 随机对局（maxSteps 上限防死循环）。
// 纯随机会在「摸牌」上打转（手牌只增不减），故偏向出牌：有可出牌时 80% 出牌。
// 两人局每局只能靠出完手牌收分，随机策略下要磨很多局才到目标分，步数上限相应放宽。
function playout(seed, n, extras, maxSteps) {
  const cap = maxSteps || (n <= 2 ? 60000 : 8000);
  let s = start(n, seed, extras);
  const rand = lcg(seed * 31 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    checkInvariants(s, `playout${seed}`);
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空`);
    const snap = JSON.stringify(s);
    const plays = legal.filter((a) => a.kind !== 'draw');
    const pool = plays.length && rand() < 0.8 ? plays : legal;
    const next = E.apply(s, pool[Math.floor(rand() * pool.length)]);
    ok(snap === JSON.stringify(s), `playout ${seed}: apply 改了入参`);
    s = next;
    steps++;
    if (steps > cap) { ok(false, `playout ${seed}: 超步数未终局`); return s; }
  }
  return s;
}

// == 3. 随机对局 ==
section('随机对局');
{
  const a = playout(101, 2);
  const b = playout(101, 2);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子随机对局应完全一致');
}
for (const n of [2, 3, 4, 6]) {
  const s = playout(200 + n, n);
  ok(E.isGameOver(s), `${n} 人随机对局应终局`);
  ok(s.players.some((p) => p.score >= s.rules.target), `${n} 人局应有玩家达目标分`);
  ok(E.score(s).length === n, `${n} 人局 score 长度异常`);
  console.log(`  ${n} 人随机局：${s.round} 局，得分 ${E.score(s).map((r) => r.total).join('/')}`);
}

// craft 构造可控局面：清空 pending，指定弃牌堆顶与当前座位手牌
function craft(s, topId, hand, opts) {
  const o = opts || {};
  s.discard = [topId];
  s.activeColor = DECK[topId].c === WILD ? (o.activeColor ?? RED) : DECK[topId].c;
  s.pending = null;
  s.roundOver = false;
  s.drawStack = o.drawStack || 0;
  s.stackKind = o.stackKind || '';
  s.dir = o.dir || 1;
  s.cur = o.cur || 0;
  s.players[o.cur || 0].hand = hand.slice();
  return s;
}

// 取指定颜色与面值的牌 id
function cardId(color, v) { return DECK.findIndex((c) => c.c === color && c.v === v); }

// == 4. 接牌规则 ==
section('接牌规则');
{
  const red7 = cardId(RED, 7);
  const s = craft(start(2, 42), red7, [cardId(RED, 3), cardId(BLUE, 7), cardId(BLUE, 3), cardId(YELLOW, V_SKIP), cardId(WILD, V_WILD)]);
  const legal = E.legalActions(s);
  const playable = new Set(legal.filter((a) => a.kind === 'play').map((a) => a.card));
  ok(playable.has(cardId(RED, 3)), '同色牌应可出');
  ok(playable.has(cardId(BLUE, 7)), '同数字牌应可出');
  ok(!playable.has(cardId(BLUE, 3)), '既不同色也不同数字的牌不可出');
  ok(playable.has(cardId(WILD, V_WILD)), '万能牌随时可出');
  ok(legal.some((a) => a.kind === 'draw'), '无牌可出时应有摸牌动作');
}
{
  // 同符号跨色可接：弃牌堆是红跳过，手上有蓝跳过
  const redSkip = cardId(RED, V_SKIP);
  const s = craft(start(2, 42), redSkip, [cardId(BLUE, V_SKIP), cardId(BLUE, 3)]);
  const playable = new Set(E.legalActions(s).filter((a) => a.kind === 'play').map((a) => a.card));
  ok(playable.has(cardId(BLUE, V_SKIP)), '同符号（跳过）跨色应可接');
  ok(!playable.has(cardId(BLUE, 3)), '不同符号不同数字不可出');
}

// == 5. 功能牌效果 ==
section('功能牌效果');
// 手牌至少留 2 张：出完最后一张会直接结束本局（另有专测）
const filler = () => [cardId(BLUE, 3), cardId(GREEN, 4)];
{
  // +2 让下家摸 2 并跳过
  const s = craft(start(3, 42), cardId(RED, 7), [cardId(RED, V_DRAW2), ...filler()]);
  const before = s.players[1].hand.length;
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, V_DRAW2) });
  ok(s2.players[1].hand.length === before + 2, '+2 应让下家摸 2');
  ok(s2.cur === 2, `+2 后下家跳过后轮到第三家（实际 ${s2.cur}）`);
}
{
  // 反转：三人局方向逆转
  const s = craft(start(3, 42), cardId(RED, 7), [cardId(RED, V_REV), ...filler()], { cur: 0 });
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, V_REV) });
  ok(s2.dir === -1, '反转应改变方向');
  ok(s2.cur === 2, `三人局反转向后轮到座位 2（实际 ${s2.cur}）`);
}
{
  // 两人局反转等同跳过
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(RED, V_REV), ...filler()]);
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, V_REV) });
  ok(s2.dir === -1, '两人局反转仍应改方向');
  ok(s2.cur === 0, `两人局反转等同跳过（仍由自己行动，实际 ${s2.cur}）`);
}
{
  // +4：选色后下家摸 4
  const s = craft(start(3, 42), cardId(RED, 7), [cardId(WILD, V_WILD4), ...filler()]);
  const before = s.players[1].hand.length;
  const s2 = E.apply(s, { kind: 'play', card: cardId(WILD, V_WILD4) });
  ok(s2.pending && s2.pending.kind === 'chooseColor', '+4 出牌后应进入选色微阶段');
  const s3 = E.apply(s2, { kind: 'chooseColor', color: GREEN });
  ok(s3.activeColor === GREEN, '选色后生效颜色应为所选色');
  ok(s3.players[1].hand.length === before + 4, '+4 应让下家摸 4');
  ok(s3.cur === 2, `+4 后下家跳过（实际 ${s3.cur}）`);
}

// == 6. 摸牌 ==
section('摸牌');
{
  // 摸到的牌可出 → 进入 drawPlay 微阶段
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(BLUE, 3), ...filler()]);
  // 把牌堆顶换成红 9（可出）以稳定断言
  s.draw = [cardId(RED, 9)].concat(s.draw.filter((id) => id !== cardId(RED, 9)));
  const s2 = E.apply(s, { kind: 'draw' });
  ok(s2.pending && s2.pending.kind === 'drawPlay', '摸到可出的牌应进入打/留微阶段');
  const s3 = E.apply(s2, { kind: 'playDrawn' });
  ok(s3.discard[s3.discard.length - 1] === cardId(RED, 9), '选择打出后弃牌堆顶应为所摸牌');
}
{
  // 关闭 drawPlay 家庭规则：摸牌后直接过
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(BLUE, 3), ...filler()]);
  s.rules.drawPlay = false;
  s.draw = [cardId(RED, 9)].concat(s.draw.filter((id) => id !== cardId(RED, 9)));
  const s2 = E.apply(s, { kind: 'draw' });
  ok(!s2.pending, 'drawPlay 关闭时摸牌后不应进入微阶段');
  ok(s2.cur === 1, '摸牌后应轮到下家');
}

// == 7. UNO ==
section('UNO');
{
  // 出到只剩 1 张 → 进入 UNO 微阶段；喊则无事，不喊罚摸 2
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(RED, 5), cardId(RED, 6)]);
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, 5) });
  ok(s2.pending && s2.pending.kind === 'uno', '剩 1 张应进入喊 UNO 微阶段');
  const s3 = E.apply(s2, { kind: 'unoMiss' });
  ok(s3.players[0].hand.length === 3, '不喊 UNO 应罚摸 2（1+2=3）');
  const s4 = E.apply(s2, { kind: 'unoCall' });
  ok(s4.players[0].hand.length === 1, '喊 UNO 不罚牌');
}

// == 8. 连锁罚牌 ==
section('连锁罚牌');
{
  // 开启 stacking：+2 只接 +2，罚牌累加至接不住者
  const s = craft(start(3, 42), cardId(RED, 7), [cardId(RED, V_DRAW2), ...filler()], { stacking: true });
  s.rules.stacking = true;
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, V_DRAW2) });
  ok(s2.drawStack === 2 && s2.stackKind === 'd2', `+2 连锁应累计 2 张（实际 ${s2.drawStack}/${s2.stackKind}）`);
  ok(s2.cur === 1, `连锁罚牌期应轮至下家接牌（实际 ${s2.cur}）`);
  // 下家接一张 +2 → 累计 4
  s2.players[1].hand = [cardId(BLUE, V_DRAW2), ...filler()];
  const s3 = E.apply(s2, { kind: 'play', card: cardId(BLUE, V_DRAW2) });
  ok(s3.drawStack === 4, `再出一张 +2 应累计 4 张（实际 ${s3.drawStack}）`);
  // 第三家接不住 → 摸 4
  const before = s3.players[2].hand.length;
  const s4 = E.apply(s3, { kind: 'drawPenalty' });
  ok(s4.players[2].hand.length === before + 4, `接不住者应摸满累计张数（${before} → ${s4.players[2].hand.length}）`);
  ok(s4.drawStack === 0, '罚完应清零累计');
}
{
  // 连锁期下家手上有 +2 以外的牌：只允许出 +2 或认罚
  const s = craft(start(3, 42), cardId(RED, 7), [cardId(RED, V_DRAW2), ...filler()], { stacking: true });
  s.rules.stacking = true;
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, V_DRAW2) });
  s2.players[1].hand = [cardId(BLUE, 3), cardId(BLUE, V_DRAW2)];
  const legal = E.legalActions(s2);
  ok(legal.some((a) => a.kind === 'play' && a.card === cardId(BLUE, V_DRAW2)), '连锁期应允许出 +2');
  ok(!legal.some((a) => a.kind === 'play' && a.card === cardId(BLUE, 3)), '连锁期不应允许出普通牌');
  ok(legal.some((a) => a.kind === 'drawPenalty'), '连锁期应允许认罚');
}

// == 9. 局末计分与整场终局 ==
section('局末与终局');
{
  // 赢家按对手手牌计分
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(RED, 5)]);
  s.players[1].hand = [cardId(RED, 9), cardId(WILD, V_WILD4)]; // 9 + 50
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, 5) });
  ok(s2.roundOver, '出完手牌应结束本局');
  ok(s2.players[0].score === 59, `赢家应得对手手牌分 59，实际 ${s2.players[0].score}`);
  ok(s2.players[0].wins === 1, '赢家胜局数应 +1');
  ok(E.legalActions(s2).some((a) => a.kind === 'nextRound'), '局末应提供下一局动作');
  const s3 = E.apply(s2, { kind: 'nextRound' });
  ok(s3.round === 2 && !s3.roundOver, '下一局应重发牌');
  ok(s3.players.every((p) => p.hand.length === HAND_SIZE), '下一局每人应 7 张');
  checkInvariants(s3, 'nextRound');
}
{
  // 达到目标分 → 整场结束
  const s = craft(start(2, 42), cardId(RED, 7), [cardId(RED, 5)]);
  s.rules.target = 20;
  s.players[1].hand = [cardId(WILD, V_WILD4)]; // 50 分
  const s2 = E.apply(s, { kind: 'play', card: cardId(RED, 5) });
  ok(s2.roundOver && s2.gameOver, '达目标分应整场结束');
  ok(E.legalActions(s2).length === 0, '整场结束后应无合法动作');
}

// == 10. AI 整场对局 ==
section('AI 对局');
for (const [seed, n] of [[7, 2], [8, 3], [9, 4], [11, 6]]) {
  let s = start(n, seed, { target: 200 });
  let steps = 0;
  while (!E.isGameOver(s) && steps <= 20000) {
    const legal = E.legalActions(s);
    const a = bot(s, legal);
    ok(!!a, `AI ${seed}: 无返回动作`);
    s = E.apply(s, a);
    checkInvariants(s, `bot${seed}`);
    steps++;
  }
  ok(E.isGameOver(s), `AI ${seed} n=${n} 应终局（${steps} 步，${s.round} 局）`);
  console.log(`  AI 对局 seed=${seed} n=${n}: ${s.round} 局 ${steps} 步，得分 ${E.score(s).map((r) => r.total).join('/')}`);
}

// == 汇总 ==
section('汇总');
console.log(`PASS ${pass} / FAIL ${fail}`);
if (failures.length) {
  console.log('失败项（前 20 条）:');
  failures.slice(0, 20).forEach((m) => console.log(`  ✗ ${m}`));
  process.exit(1);
}
console.log('ALL PASS');
