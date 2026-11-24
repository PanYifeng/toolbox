// 大富翁引擎自测：node 直接运行（node selftest.js）。
// 覆盖：棋盘数据完整性、租金规则（成组加倍/铁路/公用事业/房屋）、均匀建造与 4 房屋规则、
// 抵押前置与赎回价、监狱三条出路、连续三次同点、竞拍成交与流拍、交易交割、
// 破产移交债权人、确定性/纯度、随机对局不变量。

import * as E from './engine.js';
import * as B from './data-board.js';
import * as R from './rules.js';
import { CHANCE, CHEST } from './data-cards.js';
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

// mkState 造可控状态：直接给定 state 片段覆盖默认开局
function mkState(n, seed, patch) {
  const s = E.initialState({ seats: mkSeats(n), seed: seed || 1 });
  const st = JSON.parse(JSON.stringify(s));
  Object.assign(st, patch || {});
  return st;
}

// —— 棋盘数据 ——

section('棋盘数据');
eq(B.SPACES.length, 40, '标准棋盘 40 格');
const ownable = B.SPACES.filter((x) => B.isOwnable(x.i));
eq(ownable.length, 28, '可购买格 28 个（22 地产 + 4 铁路 + 2 公用事业）');
eq(ownable.filter((x) => x.type === 'prop').length, 22, '地产 22 块');
eq(ownable.filter((x) => x.type === 'rail').length, 4, '铁路 4 条');
eq(ownable.filter((x) => x.type === 'util').length, 2, '公用事业 2 家');
eq(B.GROUP_ORDER.map((g) => B.groupSpaces(g).length), [2, 3, 3, 3, 3, 3, 3, 2], '8 色组地块数 2/3/3/3/3/3/3/2');
ok(B.SPACES.every((x) => typeof x.i === 'number'), '每格都有下标');
ok(B.SPACES.filter((x) => x.type === 'prop').every((x) => x.rent.length === 6), '地产租金 6 档（无房 + 1~4 房 + 旅馆）');
ok(B.SPACES.filter((x) => x.type === 'prop').every((x) => x.mortgage === x.price / 2), '地产抵押价 = 地价一半');
eq(B.SPACES[0].type, 'go', '起点在 0');
eq(B.SPACES[10].type, 'jail', '监狱在 10');
eq(B.SPACES[20].type, 'free', '免费停车在 20');
eq(B.SPACES[30].type, 'gotojail', '入狱在 30');
eq(B.SPACES.filter((x) => x.type === 'chance').map((x) => x.i), [7, 22, 36], '机会格 7/22/36');
eq(B.SPACES.filter((x) => x.type === 'cc').map((x) => x.i), [2, 17, 33], '命运格 2/17/33');
eq(B.SPACES.filter((x) => x.type === 'tax' || x.type === 'luxury').map((x) => x.i), [4, 38], '税务格 4/38');

section('卡牌数据');
eq(CHANCE.length, 16, '机会牌 16 张');
eq(CHEST.length, 16, '命运牌 16 张');
eq(CHANCE.filter((c) => c.t === 'jailfree').length, 1, '机会牌含 1 张出狱卡');
eq(CHEST.filter((c) => c.t === 'jailfree').length, 1, '命运牌含 1 张出狱卡');
ok([...CHANCE, ...CHEST].every((c) => c.text && c.text.zh && c.text.en), '每张牌都有中英文本');
ok([...CHANCE, ...CHEST].every((c) => { const k = c.t; return ['advance', 'nearestRail', 'nearestUtil', 'back3', 'money', 'jail', 'jailfree', 'repair', 'payEach', 'collectEach'].includes(k); }), '效果类型在已知集合内');
ok(CHANCE.filter((c) => c.t === 'advance').every((c) => c.to >= 0 && c.to < 40), '前进目标格合法');

// —— 租金 ——

section('租金规则');
{
  const s = mkState(2, 3);
  s.owner = { 1: 0 }; // 地中海大道归 P1
  eq(R.rentFor(s, 1, 7), 2, '单块地产基础租金');
  s.owner = { 1: 0, 3: 0 }; // 棕色组两块全占
  eq(R.rentFor(s, 1, 7), 4, '独占整组租金加倍');
  s.houses = { 1: 1 };
  eq(R.rentFor(s, 1, 7), 10, '1 栋房屋租金');
  s.houses = { 1: 5 };
  eq(R.rentFor(s, 1, 7), 250, '旅馆租金');
  s.mortgaged = { 1: true };
  eq(R.rentFor(s, 1, 7), 0, '抵押地产不收租');
}
{
  const s = mkState(2, 5);
  s.owner = { 5: 0 };
  eq(R.rentFor(s, 5, 7), 25, '持 1 条铁路租金 25');
  s.owner = { 5: 0, 15: 0, 25: 0 };
  eq(R.rentFor(s, 5, 7), 100, '持 3 条铁路租金 100');
  s.owner = { 5: 0, 15: 0, 25: 0, 35: 0 };
  eq(R.rentFor(s, 15, 7), 200, '持 4 条铁路租金 200');
}
{
  const s = mkState(2, 9);
  s.owner = { 12: 0 };
  eq(R.rentFor(s, 12, 7), 28, '持 1 家公用事业租金 = 骰点 ×4');
  s.owner = { 12: 0, 28: 0 };
  eq(R.rentFor(s, 12, 7), 70, '持 2 家公用事业租金 = 骰点 ×10');
}

// —— 建造规则 ——

section('建造规则');
{
  const s = mkState(2, 11);
  s.owner = { 1: 0 }; // 只占一块，不成组
  ok(!R.canBuild(s, 0, 1), '未独占整组不能建房');
  s.owner = { 1: 0, 3: 0 };
  ok(R.canBuild(s, 0, 1), '独占整组可以建房');
  s.houses = { 1: 1 };
  ok(R.canBuild(s, 0, 3), '均匀建造：另一块也可盖到 1');
  ok(!R.canBuild(s, 0, 1), '均匀建造：已完成的那块不能再盖');
  s.houses = { 1: 2, 3: 1 };
  ok(!R.canBuild(s, 0, 1) && R.canBuild(s, 0, 3), '均匀建造：只能补盖房屋较少的那块');
  s.houses = { 1: 2, 3: 2 };
  ok(R.canBuild(s, 0, 1) && R.canBuild(s, 0, 3), '均匀建造：两块持平时都可继续');
  s.houses = { 1: 4, 3: 4 };
  ok(R.canBuild(s, 0, 1), '4 房屋规则：第 5 次加盖为旅馆');
  const t = mkState(2, 11);
  t.owner = { 1: 0, 3: 0 };
  t.hotelsLeft = 0;
  t.houses = { 1: 4, 3: 4 };
  ok(!R.canBuild(t, 0, 1), '旅馆库存为 0 时不能再盖旅馆');
  const u = mkState(2, 11);
  u.owner = { 1: 0, 3: 0 };
  u.housesLeft = 0;
  ok(!R.canBuild(u, 0, 1), '房屋库存为 0 时不能再盖房屋');
}
{
  const s = mkState(2, 13);
  s.owner = { 1: 0, 3: 0 };
  s.houses = { 1: 2, 3: 1 };
  ok(!R.canSellHouse(s, 0, 3), '均匀拆除：房屋较少的一块不能先拆');
  ok(R.canSellHouse(s, 0, 1), '均匀拆除：房屋较多的可以先拆');
}

// —— 抵押 ——

section('抵押规则');
{
  const s = mkState(2, 15);
  s.owner = { 1: 0, 3: 0 };
  ok(R.canMortgage(s, 0, 1), '无房屋时可抵押');
  s.houses = { 3: 1 };
  ok(!R.canMortgage(s, 0, 1), '同组有房屋时不能抵押');
  const t = mkState(2, 15);
  t.owner = { 1: 0 };
  t.mortgaged = { 1: true };
  eq(R.unmortgageCost(1), 33, '赎回价 = 抵押价 30 × 1.1 向上取整');
  ok(!R.canUnmortgage(t, 0, 1, 32), '现金不足不能赎回');
  ok(R.canUnmortgage(t, 0, 1, 33), '现金足够可赎回');
  t.mortgaged = {};
  ok(!R.canUnmortgage(t, 0, 1, 999), '未抵押的地产不能赎回');
}

// —— 监狱 ——

section('监狱');
{
  const s = mkState(2, 17);
  const st = JSON.parse(JSON.stringify(s));
  st.players[0].inJail = true;
  st.players[0].pos = 10;
  const acts = E.legalActions(st);
  ok(acts.some((a) => a.kind === 'roll'), '狱中可以掷骰');
  ok(acts.some((a) => a.kind === 'payJailFine'), '现金足够可缴罚金出狱');
  st.players[0].jailCardIds = ['ch_jailfree'];
  ok(E.legalActions(st).some((a) => a.kind === 'useJailCard'), '持有出狱卡可用卡出狱');
  st.players[0].cash = 10;
  ok(!E.legalActions(st).some((a) => a.kind === 'payJailFine'), '现金不足不能缴罚金');
}
{
  // 缴罚金后可以正常掷骰移动
  const s = mkState(2, 19, { phase: 'roll' });
  s.players[0].inJail = true;
  s.players[0].pos = 10;
  const a = E.apply(s, { kind: 'payJailFine' });
  ok(!a.players[0].inJail, '缴罚金后脱离监狱');
  eq(a.players[0].cash, 1450, '缴罚金扣 50 元');
}
{
  // 连续三次同点直接入狱
  const s = mkState(2, 21, { phase: 'roll', doubles: 2 });
  const st = JSON.parse(JSON.stringify(s));
  st.dice = [3, 3];
  // 构造必然同点：把 rng 固定为会掷出同点的种子不可控，改用直接调用
  let jailed = false;
  for (let seed = 1; seed <= 400 && !jailed; seed++) {
    const t = mkState(2, seed, { phase: 'roll', doubles: 2 });
    const a = E.apply(t, { kind: 'roll' });
    if (a.players[0].inJail) jailed = true;
  }
  ok(jailed, '连续三次同点会直接入狱');
}

// —— 竞拍 ——

section('竞拍');
{
  const s = mkState(3, 23, { phase: 'action' });
  s.pending = { kind: 'buy', seat: 0, i: 1 };
  const declined = E.apply(s, { kind: 'declineBuy' });
  eq(declined.pending.kind, 'auction', '放弃购买进入竞拍');
  ok(E.legalActions(declined).some((a) => a.kind === 'bid'), '竞拍有出价动作');
  // 竞拍从下一位未破产玩家开始（座 1）
  eq(declined.pending.turnSeat, 1, '竞拍由下一位玩家开叫');
  const bid1 = E.apply(declined, { kind: 'bid', amount: 10 });
  eq(bid1.pending.high, 10, '出价被记录');
  // 其余两家弃权 → 成交
  let cur = bid1;
  cur = E.apply(cur, { kind: 'bidPass' });
  cur = E.apply(cur, { kind: 'bidPass' });
  eq(cur.owner[1], 1, '唯一出价者拍得地产');
  eq(cur.players[1].cash, 1490, '按出价扣款');
}
{
  // 全员弃权 → 流拍，地产保持无主
  const s = mkState(2, 29, { phase: 'action' });
  s.pending = { kind: 'buy', seat: 0, i: 3 };
  let cur = E.apply(s, { kind: 'declineBuy' });
  for (let k = 0; k < 4 && cur.pending && cur.pending.kind === 'auction'; k++) {
    cur = E.apply(cur, { kind: 'bidPass' });
  }
  ok(cur.owner[3] === undefined, '全员弃权则流拍');
  ok(!cur.pending, '流拍后竞拍结束');
}

// —— 交易 ——

section('交易');
{
  const s = mkState(2, 31);
  s.phase = 'action';
  s.owner = { 1: 0, 5: 1 };
  const offer = { kind: 'trade', to: 1, give: { props: [], cash: 100 }, get: { props: [5], cash: 0 } };
  ok(E.validateAction(s, offer), '合法交易通过深校验');
  ok(!E.validateAction(s, { kind: 'trade', to: 1, give: { props: [], cash: 0 }, get: { props: [], cash: 0 } }), '两边都为空的交易被拒');
  ok(!E.validateAction(s, { kind: 'trade', to: 1, give: { props: [5], cash: 0 }, get: { props: [], cash: 0 } }), '不能出让别人的地产');
  ok(!E.validateAction(s, { kind: 'trade', to: 1, give: { props: [], cash: 99999 }, get: { props: [5], cash: 0 } }), '现金不足的交易被拒');
  const pend = E.apply(s, offer);
  eq(pend.pending.kind, 'tradeRespond', '交易挂起等待对方裁决');
  eq(E.currentPlayer(pend), 1, '裁决权移交对方');
  const acc = E.apply(pend, { kind: 'tradeAccept' });
  eq(acc.owner[5], 0, '接受后地产易主');
  eq(acc.players[0].cash, 1400, '现金付出');
  eq(acc.players[1].cash, 1600, '现金收入');
}
{
  // 有房屋的地产不能参与交易
  const s = mkState(2, 33);
  s.phase = 'action';
  s.owner = { 1: 0, 3: 0 };
  s.houses = { 1: 1 };
  const off = { kind: 'trade', to: 1, give: { props: [3], cash: 0 }, get: { props: [], cash: 10 } };
  ok(!E.validateAction(s, off), '同组有房屋的地产不能交易');
}

// —— 破产 ——

section('破产');
{
  const s = mkState(2, 35, { phase: 'action' });
  s.owner = { 1: 0, 5: 0 };
  s.players[0].cash = 5;
  s.pending = { kind: 'debt', seat: 0, amount: 500, creditor: 1, key: 'mo.log.rent' };
  const acts = E.legalActions(s);
  ok(acts.some((a) => a.kind === 'mortgage'), '负债时可抵押变现');
  ok(acts.some((a) => a.kind === 'bankrupt'), '负债时可宣告破产');
  const mort = E.apply(s, { kind: 'mortgage', i: 1 });
  eq(mort.players[0].cash, 35, '抵押变现进入现金');
  const bank = E.apply(mort, { kind: 'bankrupt' });
  ok(bank.players[0].bankrupt, '宣告破产');
  eq(bank.owner[5], 1, '地产移交债权人');
  eq(bank.players[1].cash, 1535, '债权人收到剩余现金');
  ok(bank.gameOver, '只剩一家未破产 → 终局');
  eq(bank.result.winner, 1, '唯一存活者获胜');
}
{
  // 银行是债主：地产收归无主
  const s = mkState(2, 37, { phase: 'action' });
  s.owner = { 1: 0 };
  s.players[0].cash = 0;
  s.pending = { kind: 'debt', seat: 0, amount: 300, creditor: -1, key: 'mo.log.tax' };
  const bank = E.apply(s, { kind: 'bankrupt' });
  ok(bank.owner[1] === undefined, '银行收债时地产回到无主');
}

// —— 纯度与确定性 ——

section('纯度与确定性');
{
  const s = E.initialState({ seats: mkSeats(3), seed: 42 });
  const before = JSON.stringify(s);
  E.apply(s, { kind: 'roll' });
  eq(JSON.stringify(s), before, 'apply 不改入参');
  eq(JSON.stringify(E.initialState({ seats: mkSeats(3), seed: 42 })), JSON.stringify(s), '同种子确定性');
  ok(JSON.stringify(s).length > 0, 'state 可 JSON 序列化');
}
{
  const s = mkState(2, 41);
  const before = JSON.stringify(s);
  eq(JSON.stringify(E.apply(s, { kind: 'nope' })), before, '未知动作被忽略');
  eq(JSON.stringify(E.apply(s, { kind: 'build', i: 1 })), before, '没有地产时建房被忽略');
}

// —— 随机对局不变量 ——

section('随机对局不变量');
// playGame 完整对局：bot 驱动，返回健康度
function playGame(seed, n) {
  let s = E.initialState({ seats: mkSeats(n), seed, extras: { maxRounds: 40 } });
  let steps = 0;
  while (!E.isGameOver(s) && steps < 20000) {
    const legal = E.legalActions(s);
    if (!legal.length) return { ok: false, why: 'no legal actions' };
    const act = bot(s, legal);
    if (!act) return { ok: false, why: 'bot returned null' };
    const next = E.apply(s, act);
    if (JSON.stringify(next) === JSON.stringify(s)) {
      // 动作无效果：允许（例如现金不足的赎回），但不能无限循环
      if (++steps > 6000) return { ok: false, why: 'stalled' };
      return { ok: false, why: 'no-op action' };
    }
    // 现金不允许为负
    if (next.players.some((p) => p.cash < 0)) return { ok: false, why: 'negative cash' };
    // 房屋 + 旅馆库存守恒
    let houses = 0;
    let hotels = 0;
    for (const i in next.houses) {
      const h = next.houses[i];
      if (h === 5) hotels += 1; else houses += h;
    }
    if (houses !== 32 - next.housesLeft) return { ok: false, why: 'house stock mismatch' };
    if (hotels !== 12 - next.hotelsLeft) return { ok: false, why: 'hotel stock mismatch' };
    if (!next.players[next.currentPlayerIndex === undefined ? 0 : 0]) return { ok: false, why: 'bad players' };
    s = next;
    steps++;
  }
  if (!E.isGameOver(s)) return { ok: false, why: 'did not terminate' };
  return { ok: true, winner: s.result && s.result.winner };
}

let ok2 = 0;
let err = null;
for (let seed = 1; seed <= 40; seed++) {
  const r = playGame(seed, 2 + (seed % 3));
  if (r.ok) ok2++;
  else if (!err) err = `seed ${seed}: ${r.why}`;
}
eq(ok2, 40, `40 局 AI 对局全部正常终局${err ? `（首个异常：${err}）` : ''}`);

// —— 汇总 ——

section('汇总');
console.log(`\n===== 大富翁 selftest: ${pass} passed, ${fail} failed =====`);
if (fail) {
  console.log('失败项：');
  for (const f of failures) console.log('  ✗', f);
  process.exit(1);
}
