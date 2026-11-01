// 农场主引擎自测：node 直接运行（node selftest.js）。
// 覆盖：确定性/纯度/JSON-safe、随机对局不变量（资源非负、牧场容量、
// 占用空间数=放工数）、规则定点测试（累积格、建房费、翻新链、播种收获、
// 乞讨卡、围栏成本、栏位容量、溢出烹煮、职业费、烤炉、大设施唯一、
// 计分表、家庭成长门槛）、AI 全局对局。

import * as E from './engine.js';
import * as I from './cards-interp.js';
import { SPACES, visibleSpaces, SCORE_FIELDS, SCORE_GRAIN, COST } from './actionboard-data.js';
import { MAJORS, MAJOR_BY_ID } from './majors.js';
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

// mkState 造 2-5 人局
function mkState(seed = 42, n = 2) {
  const seats = Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, isAI: true, color: '#888' }));
  return E.initialState({ seats, seed });
}

// act 执行指定合法动作（找不到即断言失败）
function act(s, pred, msg) {
  const a = E.legalActions(s).find(pred);
  if (!a) { ok(false, `${msg}: 找不到合法动作`); return s; }
  return E.apply(s, a);
}

// place 占用指定空间
function place(s, id, msg) {
  return act(s, (a) => a.kind === 'place' && a.space === id, msg || `place ${id}`);
}

// SAFE_DRAIN 排干轮次时的安全空间（不碰谷/田/家庭，保证断言稳定）
const SAFE_DRAIN = ['fishing', 'laborer', 'wood', 'clay', 'reed', 'start', 'stone', 'stone2', 'boar', 'cattle'];

// drain 推进到条件满足（chooser 缺省在安全空间里挑，子阶段优先 done）
function drain(s, cond, chooser) {
  let guard = 0;
  while (!cond(s) && !s.gameOver && guard++ < 600) {
    let legal = E.legalActions(s);
    if (s.phase.kind === 'place') legal = legal.filter((a) => SAFE_DRAIN.includes(a.space));
    else legal = legal.filter((a) => a.kind !== 'subCancel');
    const pick = chooser ? chooser(s, legal) : defaultDrain(legal);
    if (!pick) break;
    s = E.apply(s, pick);
  }
  return s;
}

// defaultDrain 默认排干选择：子阶段优先 done，放工取第一个安全空间
function defaultDrain(legal) {
  if (!legal.length) return null;
  return legal.find((a) => a.kind === 'subDone') || legal.find((a) => a.kind !== 'subCancel') || null;
}

// checkInvariants 对局不变量
function checkInvariants(s, tag) {
  for (const p of s.players) {
    for (const k of ['food', 'grain', 'veg', 'wood', 'clay', 'reed', 'stone']) {
      ok(p[k] >= 0, `${tag}: ${p.name} 资源 ${k}=${p[k]} 为负`);
    }
    ok(p.family >= 2, `${tag}: ${p.name} 家庭 < 2`);
    ok(p.beggars >= 0, `${tag}: ${p.name} 乞讨卡为负`);
    ok(p.placedWorkers <= p.workers, `${tag}: ${p.name} 放工数超本轮工人数`);
    ok(p.farm.filter((f) => f.t === 'room').length >= 2, `${tag}: ${p.name} 房间 < 2`);
    for (const [gid, ga] of Object.entries(p.groupAnimals)) {
      ok(ga.n > 0 && ga.n <= E.groupCapacity(p, gid), `${tag}: ${p.name} 牧场 ${gid} 超容量 (${ga.n}/${E.groupCapacity(p, gid)})`);
    }
    if (p.cardAnimal) {
      ok(p.cardAnimal.n >= 1 && p.cardAnimal.n <= I.cardCapacity(p), `${tag}: ${p.name} 卡上栏位超容量`);
    }
  }
  if (s.phase.kind === 'place' || s.phase.kind === 'sub') {
    const taken = Object.values(s.spaces).filter((x) => x.taken !== null).length;
    const placed = s.players.reduce((a, p) => a + p.placedWorkers, 0);
    ok(taken === placed, `${tag}: 占用空间 ${taken} ≠ 放工总数 ${placed}`);
  }
}

// playout 随机对局（跳过 subCancel 防死循环）
function playout(seed, n, maxSteps = 3000) {
  let s = mkState(seed, n);
  const rand = lcg(seed * 7919 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    let legal = E.legalActions(s).filter((a) => a.kind !== 'subCancel');
    if (!legal.length) legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空 (${s.phase.kind}/${s.round})`);
    const snapshot = JSON.stringify(s);
    const next = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    if (steps % 25 === 0) ok(snapshot === JSON.stringify(s), `playout ${seed}: apply 改了入参`);
    s = next;
    checkInvariants(s, `playout${seed}`);
    steps++;
    if (steps > maxSteps) { ok(false, `playout ${seed}: 超步数未终局`); return s; }
  }
  ok(E.score(s).length === n, `playout ${seed}: score 长度异常`);
  return s;
}

// ==== 1. 数据表 ====
section('数据表');
ok(SPACES.length === 25, `行动板应 25 格（23 基础 + 2 多人追加），实际 ${SPACES.length}`);
ok(visibleSpaces(1, 4).length === 14 && visibleSpaces(1, 5).length === 15,
  `4/5 人轮 1 应 14/15 格（+雇工二/伐木二），实际 ${visibleSpaces(1, 4).length}/${visibleSpaces(1, 5).length}`);
ok(visibleSpaces(1).length === 13, `轮 1 可见应 13 格（常驻 11 + 阶段 1 两格），实际 ${visibleSpaces(1).length}`);
ok(visibleSpaces(5).length === 16, `轮 5 可见应 16 格（+阶段 2 三格），实际 ${visibleSpaces(5).length}`);
ok(visibleSpaces(8).length === 19 && visibleSpaces(10).length === 21 && visibleSpaces(12).length === 22,
  `轮 8/10/12 可见应 19/21/22 格，实际 ${visibleSpaces(8).length}/${visibleSpaces(10).length}/${visibleSpaces(12).length}`);
ok(visibleSpaces(14).length === 23, `轮 14 可见应 23 格，实际 ${visibleSpaces(14).length}`);
ok(!visibleSpaces(13).some((x) => x.id === 'growth2'), '轮 13 不应有无需空房成长格');
ok(visibleSpaces(14).some((x) => x.id === 'growth2'), '轮 14 应有无需空房成长格');

// ==== 2. 开局 ====
section('开局');
{
  const s = mkState(42, 3);
  ok(s.round === 1 && s.phase.kind === 'place', '开局应进入第 1 轮放工');
  ok(s.order[0] === 0 && s.order[1] === 1 && s.order[2] === 2, '开局顺位应为座位序');
  // ✅ 官方 p4：先手 2 食，其余玩家 3 食
  ok(s.players[0].food === 2, `先手开局应 2 食，实际 ${s.players[0].food}`);
  for (let i = 1; i < s.players.length; i++) {
    ok(s.players[i].food === 3, `${s.players[i].name} 非先手开局应 3 食，实际 ${s.players[i].food}`);
  }
  for (const p of s.players) {
    ok(p.family === 2, `${p.name} 开局应 2 人`);
    ok(p.handOcc.length === 7 && p.handMinor.length === 7, `${p.name} 开局应 7+7 手牌`);
    ok(p.farm[5].t === 'room' && p.farm[6].t === 'room' && p.farm[5].mat === 'wood', '初始木房应在 5,6 格');
  }
  const allOcc = s.players.flatMap((p) => p.handOcc);
  ok(new Set(allOcc).size === allOcc.length, '职业牌不应重复发放');
}

// ==== 3. 累积格 ====
section('累积格');
{
  // 轮 1 不拿 clay/fishing → 轮 2 累积为 2
  let s = mkState(42, 2);
  s = drain(s, (x) => x.round === 2);
  ok(s.round === 2, '排干轮 1 后应进入轮 2');
  ok(s.spaces.clay.acc.clay === 2, `未拿黏土格应累积 2，实际 ${s.spaces.clay.acc.clay}`);
  ok(s.spaces.fishing.acc.food === 1, `被拿过的钓鱼格应重置 1，实际 ${s.spaces.fishing.acc.food}`);
  ok(s.spaces.laborer.taken === null, '新一轮空间占用应重置');
  // 轮 2 P0 拿 clay（2 黏土）→ 轮 3 重置回 1
  s = place(s, 'clay');
  ok(s.players[0].clay === 2, `拿累积黏土应得 2，实际 ${s.players[0].clay}`);
  s = drain(s, (x) => x.round === 3);
  ok(s.spaces.clay.acc.clay === 1, `被拿后新一轮应重置 1，实际 ${s.spaces.clay.acc.clay}`);
}

// ==== 4. 建房与减免 ====
section('建房');
{
  let s = mkState(7, 2);
  s.players[0].wood = 5;
  s.players[0].reed = 2;
  s = place(s, 'build');
  s = act(s, (a) => a.kind === 'subRoom' && a.idx === 7, 'subRoom 7');
  s = E.apply(s, { kind: 'subDone' });
  const p0 = s.players[0];
  ok(p0.wood === 0 && p0.reed === 0, `建房应付 5 木 2 芦苇，实际余 ${p0.wood}/${p0.reed}`);
  ok(p0.farm[7].t === 'room' && p0.farm[7].mat === 'wood', '7 格应为木房');
  // 木匠减免：材料费 -1
  p0.occPlayed = ['carpenter'];
  ok(E.roomCostOf(p0).wood === 4 && E.roomCostOf(p0).reed === 2, '木匠应让房费变 4 木 2 芦苇');
  // ✅ 官方 p8：马厩 2 木/个
  ok(COST.stable.wood === 2, `马厩费应 2 木，实际 ${COST.stable.wood}`);
  // 非邻接不可建：直接对 P1 农场做手术放一间房（build 空间一轮一人，
  // P0 已占用，P1 无法经 legalActions 进入子阶段，故直查 validRoomSpots）
  const p1 = s.players[1];
  p1.farm[7].t = 'room';
  p1.farm[7].mat = 'wood';
  const spots = E.validRoomSpots(p1);
  const expectSpots = [0, 1, 2, 8, 10, 11, 12];
  ok(spots.length === expectSpots.length && spots.every((i) => expectSpots.includes(i)),
    `建房只应邻接既有房（含新房 7），实际 ${spots}`);
}

// ==== 5. 翻新链 ====
section('翻新');
{
  let s = mkState(7, 2);
  s.round = 5; // renov 空间轮 5 起开放
  s.players[0].clay = 2;
  s.players[0].reed = 1;
  s = place(s, 'renov');
  s = act(s, (a) => a.kind === 'subRenovate', 'subRenovate');
  s = E.apply(s, { kind: 'subDone' });
  const p0 = s.players[0];
  ok(p0.clay === 0 && p0.reed === 0, `翻新 2 木应付 1 芦苇 2 黏土，实际余 ${p0.reed}/${p0.clay}`);
  ok(p0.farm[5].mat === 'clay' && p0.farm[6].mat === 'clay', '翻新后应为黏土房');
  const info = E.renovInfo(p0);
  ok(info.target === 'stone' && info.cost.stone === 2 && info.cost.reed === 1, '黏土→石翻新费应为 1 芦苇 2 石');
  p0.farm.forEach((f) => { if (f.t === 'room') f.mat = 'stone'; });
  ok(E.renovInfo(p0) === null, '石房不可再翻新');
}

// ==== 6. 播种与收获 ====
section('播种与收获');
{
  let s = mkState(42, 2);
  s = place(s, 'plow');
  s = act(s, (a) => a.kind === 'subPlow' && a.idx === 7, 'subPlow 7');
  s = E.apply(s, { kind: 'subDone' });
  ok(s.players[0].farm[7].t === 'field', '犁田后 7 格应为田');
  s = place(s, 'laborer', 'P1 laborer');
  s.players[0].grain = 1;
  s = place(s, 'sow');
  s = act(s, (a) => a.kind === 'subSow' && a.idx === 7 && a.crop === 'grain', 'subSow grain');
  s = E.apply(s, { kind: 'subDone' });
  // ✅ 官方 p9：播 1 谷 → 田 3 谷
  ok(s.players[0].farm[7].g === 3 && s.players[0].grain === 0, `播种后田应有 3 谷、供应 0 谷，实际 ${s.players[0].farm[7].g}/${s.players[0].grain}`);
  // 排干到轮 4 收获喂食
  s = drain(s, (x) => x.phase.kind === 'feed');
  ok(s.round === 4, `轮 4 结束应触发收获，实际轮 ${s.round}`);
  // ✅ 官方 p9：每次收获每田取 1 株（不清空）
  ok(s.players[0].farm[7].g === 2, `收获后田应剩 2 谷，实际 ${s.players[0].farm[7].g}`);
  ok(s.players[0].grain === 1, `收获应得 1 谷，实际 ${s.players[0].grain}`);
  // 喂食：两家确认
  s = E.apply(s, { kind: 'feedConfirm' });
  s = E.apply(s, { kind: 'feedConfirm' });
  ok(s.phase.kind === 'place' && s.round === 5, '喂食完成后应进入轮 5');
}

// ==== 7. 乞讨卡与新生儿口粮 ====
section('喂食');
{
  let s = mkState(42, 2);
  s = drain(s, (x) => x.phase.kind === 'feed');
  s.players[0].food = 0;
  const beg = s.players[0].beggars;
  s = E.apply(s, { kind: 'feedConfirm' });
  ok(s.players[0].beggars - beg === 4, `缺 4 食应得 4 乞讨卡，实际 ${s.players[0].beggars - beg}`);
  ok(E.feedNeedOf({ family: 3, newborn: 1 }) === 5, '新生儿应只吃 1（3 人家庭需 5）');
  ok(E.feedNeedOf({ family: 2, newborn: 0 }) === 4, '2 人家庭需 4 食');
}

// ==== 8. 围栏 ====
section('围栏');
{
  let s = mkState(7, 2);
  s.round = 10; // fence 空间轮 10 起开放
  const p0 = s.players[0];
  ok(E.fenceCostOf(p0, [0]) === 4, `单格角落牧场应 4 木，实际 ${E.fenceCostOf(p0, [0])}`);
  ok(E.fenceCostOf(p0, [0, 1]) === 6, `两格相邻牧场应 6 木，实际 ${E.fenceCostOf(p0, [0, 1])}`);
  p0.wood = 4;
  s = place(s, 'fence');
  s = act(s, (a) => a.kind === 'subFenceSel' && a.idx === 0, 'sel 0');
  s = E.apply(s, { kind: 'subDone' });
  const q0 = s.players[0];
  ok(q0.wood === 0, '围单格应付 4 木');
  ok(q0.groups[1] && q0.groups[1].length === 1, '应形成 1 组牧场');
  ok(E.fenceCostOf(q0, [1]) === 3, `贴既有牧场扩 1 格应 3 木，实际 ${E.fenceCostOf(q0, [1])}`);
  // ✅ 官方 p8：牧场容量 = 2×格数，组内每个马厩容量翻倍（乘性）
  ok(E.groupCapacity(q0, 1) === 2, `1 格牧场容量应 2，实际 ${E.groupCapacity(q0, 1)}`);
  q0.farm[0].stable = true;
  ok(E.groupCapacity(q0, 1) === 4, `1 格+1 马厩容量应 4（2×1×2），实际 ${E.groupCapacity(q0, 1)}`);
  q0.farm[0].stable = false;
  const q1 = s.players[1];
  q1.groups = { 1: [0, 1] };
  q1.farm[0].t = 'pasture'; q1.farm[0].gid = 1;
  q1.farm[1].t = 'pasture'; q1.farm[1].gid = 1;
  q1.farm[0].stable = true; q1.farm[1].stable = true;
  ok(E.groupCapacity(q1, 1) === 16, `2 格+2 马厩容量应 16（2×2×2²），实际 ${E.groupCapacity(q1, 1)}`);
}

// ==== 9. 牲畜栏位与溢出 ====
section('牲畜');
{
  const s = mkState(7, 2);
  const p0 = s.players[0];
  p0.groups = { 1: [0, 1] };
  p0.farm[0].t = 'pasture'; p0.farm[0].gid = 1;
  p0.farm[1].t = 'pasture'; p0.farm[1].gid = 1;
  p0.groupAnimals = { 1: { type: 'sheep', n: 3 } };
  ok(E.totalAnimals(p0, 'sheep') === 3, '羊总数应为 3');
  // ✅ 官方 p8：2 格牧场容量 = 2×2 = 4
  ok(E.spareFor(p0, 'sheep') === 1, `2 格牧场容量 4 余 1，实际 ${E.spareFor(p0, 'sheep')}`);
  // 溢出烹煮：✅ 壁炉汇率 羊2/猪2/牛3/菜2
  p0.majors = ['fireplace1'];
  E.addAnimals(s, p0, 'sheep', 2);
  ok(p0.groupAnimals[1].n === 4, '先补满牧场容量 4');
  ok(p0.food === 4, `溢出 1 只按壁炉烹 2 食，实际 ${p0.food}`);
  // 灶台烹猪 3 食
  p0.majors = ['hearth1'];
  E.addAnimals(s, p0, 'boar', 1);
  ok(p0.food === 7, `灶台溢出 1 猪应烹 3 食（4+3），实际 ${p0.food}`);
  p0.majors = ['fireplace1'];
  E.addAnimals(s, p0, 'boar', 1);
  ok(p0.food === 9, `壁炉溢出 1 猪应烹 2 食（7+2），实际 ${p0.food}`);
  // 无设备则丢失
  p0.majors = [];
  E.addAnimals(s, p0, 'boar', 2);
  ok(E.totalAnimals(p0, 'boar') === 0, '无设备无栏位应全部丢失');
  // 卡上栏位
  p0.minorsPlayed = ['trough']; // capacity 2
  E.addAnimals(s, p0, 'boar', 2);
  ok(p0.cardAnimal && p0.cardAnimal.n === 2, '溢出应先上卡上栏位');
}

// ==== 10. 职业与烤炉 ====
section('职业与烤炉');
{
  let s = mkState(7, 2);
  const p0 = s.players[0];
  // ✅ 官方 p10：主 Lessons 首张职业免费，此后每张 1 食（教师可减至 0）
  ok(E.occCostOf(p0) === 0, '首张职业应免费');
  p0.occPlayed = ['lumberjack', 'miner'];
  ok(E.occCostOf(p0) === 1, '第 3 张职业应付 1 食');
  p0.occPlayed.push('teacher');
  ok(E.occCostOf(p0) === 0, '教师应减 1 食（1−1=0）');
  // 烤炉选项与汇率
  p0.majors = ['clayOven'];
  ok(I.bakeOptions(p0).length === 1 && I.bakeOptions(p0)[0].rate === 5, '黏土烤炉应 1 谷→5 食');
  p0.majors.push('fireplace1');
  ok(I.cookRates(p0).grain === 5, '烤面包汇率应取最大 5');
  ok(I.bakeOptions(p0).length === 2, '壁炉+烤炉应有两个烤面包选项');
  // 职业打出全流程
  s = place(s, 'occ');
  const plays = E.legalActions(s).filter((a) => a.kind === 'subOcc');
  const cardId = (plays.find((a) => a.id === 'farmhand') || plays[0] || {}).id;
  if (cardId) {
    s = act(s, (a) => a.kind === 'subOcc' && a.id === cardId, 'subOcc');
    ok(!s.players[0].handOcc.includes(cardId) && s.players[0].occPlayed.includes(cardId), '职业应从手牌移入已打');
    if (cardId === 'farmhand') ok(s.players[0].grain === 1, '雇农打出应立即得 1 谷');
  }
}

// ==== 11. 大设施 ====
section('大设施');
{
  let s = mkState(7, 2);
  s.round = 5;
  s.players[0].clay = 5;
  s.players[0].reed = 1;
  s = place(s, 'renov');
  // ✅ 官方附录：House Redevelopment 须先翻新才可购大设施
  ok(!E.legalActions(s).some((a) => a.kind === 'subMajor'), '未翻新前不可购大设施');
  s = act(s, (a) => a.kind === 'subRenovate', 'subRenovate');
  s = act(s, (a) => a.kind === 'subMajor' && a.id === 'fireplace2', 'buy fireplace2');
  s = E.apply(s, { kind: 'subDone' });
  const p0 = s.players[0];
  ok(p0.majors.includes('fireplace2'), '翻新后应可购入 3 黏土壁炉');
  ok(p0.clay === 0 && p0.reed === 0, `翻新+壁炉应付 2 黏土 1 芦苇 + 3 黏土，实际余 ${p0.clay}/${p0.reed}`);
  ok(p0.farm[5].mat === 'clay', '翻新后应为黏土房');
  // ✅ 官方：壁炉全局 2 份（fireplace1 副本），P1 仍可购 fireplace1
  s.players[1].clay = 2;
  ok(E.majorCopiesLeft(s, 'fireplace1') === 2, '壁炉应有 2 份在池');
  ok(E.affordMajors(s, s.players[1]).some((m) => m.id === 'fireplace1'), 'P1 应仍可购壁炉');
  // 唯一性：灶台/hearth 全局唯一
  s.players[0].majors = ['hearth1', 'clayOven'];
  ok(!E.affordMajors(s, s.players[1]).some((m) => m.id === 'hearth1'), '灶台全局唯一，P1 不可再购');
  ok(!E.affordMajors(s, s.players[1]).some((m) => m.id === 'clayOven'), '黏土烤炉全局唯一');
  // 灶台退壁炉换购（官方附录 p2：退壁炉抵原价、付差额；退回的壁炉可再被建）
  const p1b = s.players[1];
  s.players[0].majors = ['fireplace1'];
  p1b.majors = ['fireplace2']; // 3 黏土壁炉
  p1b.clay = 2;
  ok(E.affordMajors(s, p1b).some((m) => m.id === 'hearth1'), '持壁炉付差价 1 黏土可购 4 黏土灶台');
  ok(E.affordMajors(s, p1b).some((m) => m.id === 'hearth2'), '持壁炉付差价 2 黏土可购 5 黏土灶台');
  p1b.clay = 1;
  ok(E.affordMajors(s, p1b).some((m) => m.id === 'hearth1'), '差价 1 ≤ 1 黏土可购 4 黏土灶台');
  ok(!E.affordMajors(s, p1b).some((m) => m.id === 'hearth2'), '差价 2 > 1 黏土不可购 5 黏土灶台');
  // 无壁炉不可差价购灶台
  p1b.majors = [];
  p1b.clay = 2;
  ok(!E.affordMajors(s, p1b).some((m) => m.id === 'hearth1'), '无壁炉不可购灶台');
  // 水井：建成起 5 轮每轮 +1 食
  let w = mkState(7, 2);
  w.round = 5;
  w.players[0].clay = 5; w.players[0].reed = 1;
  w.players[0].stone = 3; w.players[0].wood = 1;
  w = place(w, 'renov');
  w = act(w, (a) => a.kind === 'subRenovate', 'well subRenovate');
  w = act(w, (a) => a.kind === 'subMajor' && a.id === 'well', 'buy well');
  w = E.apply(w, { kind: 'subDone' });
  ok(w.players[0].wellRounds === 5, `轮 5 建水井应登记 5 轮收入，实际 ${w.players[0].wellRounds}`);
  ok(w.players[0].stone === 0 && w.players[0].wood === 0, `水井应付 3 石 1 木，实际余 ${w.players[0].stone}/${w.players[0].wood}`);
}

// ==== 12. 计分表 ====
section('计分');
{
  const s = mkState(7, 2);
  const p0 = s.players[0];
  p0.farm[7].t = 'field';
  p0.farm[8].t = 'field';
  p0.grain = 3;
  p0.groups = { 1: [0] };
  p0.farm[0].t = 'pasture'; p0.farm[0].gid = 1;
  p0.groupAnimals = { 1: { type: 'sheep', n: 1 } };
  p0.farm[0].stable = true;
  const rows = Object.fromEntries(E.score(s)[0].breakdown);
  ok(rows['ag.score.fields'] === SCORE_FIELDS[2], `2 田应得 ${SCORE_FIELDS[2]}，实际 ${rows['ag.score.fields']}`);
  ok(rows['ag.score.grain'] === SCORE_GRAIN[3], `3 谷应得 ${SCORE_GRAIN[3]}，实际 ${rows['ag.score.grain']}`);
  ok(rows['ag.score.veg'] === -1, '0 菜应 -1');
  ok(rows['ag.score.sheep'] === 1, '1 羊应得 1');
  ok(rows['ag.score.boar'] === -1, '0 猪应 -1');
  ok(rows['ag.score.cattle'] === -1, '0 牛应 -1');
  ok(rows['ag.score.pastures'] === 1, '1 牧场应得 1');
  // ✅ 附录：牧场内马厩 1 分/个封顶 4；空地马厩不计分但视为已用
  ok(rows['ag.score.stables'] === 1, `牧场内 1 马厩应得 1，实际 ${rows['ag.score.stables']}`);
  p0.farm[0].stable = false;
  p0.farm[7].stable = true; // 空地上马厩（田已计分占位，故改在空地另置）
  p0.farm[7].t = 'empty';
  const rows2 = Object.fromEntries(E.score(s)[0].breakdown);
  ok(rows2['ag.score.stables'] === 0, `空地马厩不计分，实际 ${rows2['ag.score.stables']}`);
  p0.farm[7].stable = false;
  p0.farm[7].t = 'field';
  // ✅ 附录：马厩所在空地视为已用，不再计入未用扣分
  const unusedBefore = Object.fromEntries(E.score(s)[0].breakdown)['ag.score.unused'];
  p0.farm[10].stable = true;
  const rows3 = Object.fromEntries(E.score(s)[0].breakdown);
  ok(rows3['ag.score.unused'] === unusedBefore + 1, `马厩空地应视为已用少扣 1，实际 ${rows3['ag.score.unused']} vs ${unusedBefore}`);
  p0.farm[10].stable = false;
  ok(rows['ag.score.unused'] === -10, `10 空地应 -10，实际 ${rows['ag.score.unused']}`);
  // 谷物分档：1/4/6/8 → 1/2/3/4
  p0.grain = 0;
  p0.farm[7].g = 1;
  ok(Object.fromEntries(E.score(s)[0].breakdown)['ag.score.grain'] === 1, '1 谷应得 1');
  p0.farm[7].g = 4;
  ok(Object.fromEntries(E.score(s)[0].breakdown)['ag.score.grain'] === 2, '4 谷应得 2');
  p0.farm[7].g = 6;
  ok(Object.fromEntries(E.score(s)[0].breakdown)['ag.score.grain'] === 3, '6 谷应得 3');
  p0.farm[7].g = 8;
  ok(Object.fromEntries(E.score(s)[0].breakdown)['ag.score.grain'] === 4, '8 谷应得 4');
}

// ==== 13. 家庭成长 ====
section('家庭成长');
{
  let s = mkState(7, 2);
  s.round = 5;
  ok(E.freeRooms(s.players[0]) === 0, '开局 2 房 2 人无空房');
  ok(!E.legalActions(s).some((a) => a.kind === 'place' && a.space === 'growth'), '无空房时成长格不可用');
  s.players[0].farm[7].t = 'room'; s.players[0].farm[7].mat = 'wood';
  s = place(s, 'growth');
  ok(s.players[0].family === 3 && s.players[0].newborn === 1, '成长后家庭 3 且新生儿标记');
}

// ==== 14. 随机对局 ====
section('随机对局');
for (const n of [2, 3, 4, 5]) {
  const s = playout(1000 + n, n);
  ok(E.isGameOver(s), `${n} 人随机对局应终局`);
  ok(s.round === 14, `${n} 人局应打满 14 轮，实际 ${s.round}`);
  for (const r of E.score(s)) ok(r.total >= -60 && r.total <= 200, `${n} 人局总分 ${r.total} 超合理区间`);
}
{
  const a = playout(101, 2);
  const b = playout(101, 2);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子随机对局应完全一致');
}

// ==== 15. AI 对局 ====
section('AI 对局');
for (const [seed, n] of [[7, 2], [8, 3], [9, 4], [10, 5]]) {
  let s = mkState(seed, n);
  let steps = 0;
  while (!E.isGameOver(s) && steps <= 3000) {
    const legal = E.legalActions(s);
    s = E.apply(s, bot(s, legal));
    checkInvariants(s, `bot${seed}`);
    steps++;
  }
  ok(E.isGameOver(s), `AI ${seed} 人局应终局（${steps} 步，轮 ${s.round}）`);
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
