// 神秘大地引擎自测：node 直接运行（node selftest.js）。
// 覆盖：确定性/纯度/JSON-safe、随机对局不变量（能量总量非增、祭司上限、
// 建筑一致性）、规则定点测试（挖铲派系特例、吸能、建镇、船运/桥连接、
// 女巫/混沌专长、能量槽刷新、pass 顺位、终局并列名次）、AI 全局对局。

import * as E from './engine.js';
import * as T from './tables.js';
import { HEXES, ADJACENCY, bridgePairs } from './map-data.js';
import { factionById } from './data-factions.js';
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

// homeTerr 玩家家园地形
function homeTerr(p) { return factionById(p.faction).terrain; }

// mkGame 造对局：选派系 + 蛇形放 2 民居。placeHexes 顺序 =
// [P0 第 1 座, P1 第 1 座, ..., P0 第 2 座, P1 第 2 座, ...]（蛇形正序一轮逆序一轮）
function mkGame(factions, seed = 42, placeHexes = null) {
  const seats = factions.map((_, i) => ({ name: `P${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  for (const f of factions) s = E.apply(s, { kind: 'faction', faction: f });
  const order = [];
  for (let i = 0; i < s.n; i++) order.push(i);
  for (let i = s.n - 1; i >= 0; i--) order.push(i);
  order.forEach((seat, idx) => {
    const terr = homeTerr(s.players[seat]);
    const hex = placeHexes && placeHexes[idx] ? placeHexes[idx]
      : HEXES.find((x) => x.terrain === terr && s.hexes[x.id].owner === null).id;
    s = E.apply(s, { kind: 'placeDwelling', hex });
  });
  ok(s.phase.kind === 'act' && s.round === 1, 'mkGame 应进入第 1 轮主阶段');
  return s;
}

// lcg 自测用确定性随机（独立于引擎 rng）
function lcg(seed) {
  let st = seed >>> 0 || 1;
  return () => {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    return st / 4294967296;
  };
}

// CULT_LOCKED 锁定祭司总数
function CULT_LOCKED(p) {
  return T.CULT_TRACKS.reduce((a, tr) => a + p.priestsOnCult[tr], 0);
}

// checkInvariants 对局不变量（能量总量可因收入 powerGain 合法增加，只查 ≤12 上限）
function checkInvariants(s, tag) {
  for (const p of s.players) {
    const sum = p.power.i + p.power.ii + p.power.iii;
    ok(sum <= 12, `${tag}: ${p.name} 能量总量 ${sum} > 12`);
    ok(p.coins >= 0 && p.workers >= 0 && p.priests >= 0, `${tag}: ${p.name} 资源为负`);
    for (const tr of T.CULT_TRACKS) {
      ok(p.cult[tr] >= 0 && p.cult[tr] <= 10, `${tag}: ${p.name} 邪教越界 ${tr}=${p.cult[tr]}`);
    }
    ok(p.priests + CULT_LOCKED(p) <= T.PRIEST_CAP, `${tag}: ${p.name} 祭司超上限`);
    for (const [hex, bld] of Object.entries(p.buildings)) {
      ok(s.hexes[hex].owner === p.seat && s.hexes[hex].bld === bld, `${tag}: 建筑表不一致 ${hex}`);
    }
    ok(Object.values(p.buildings).filter((b) => b === 'SH').length <= 1, `${tag}: SH 超过 1`);
    ok(Object.values(p.buildings).filter((b) => b === 'SA').length <= 1, `${tag}: SA 超过 1`);
  }
}

// playout 随机对局
function playout(seed, n, maxSteps = 2600) {
  const seats = Array.from({ length: n }, (_, i) => ({ name: `A${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  const rand = lcg(seed * 7919 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空 (${s.phase.kind})`);
    const snapshot = JSON.stringify(s);
    const next = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    // 纯度：apply 后原入参对象应保持不变（对比的仍是旧引用 s）
    if (steps % 20 === 0) ok(snapshot === JSON.stringify(s), `playout ${seed}: apply 改了入参`);
    s = next;
    checkInvariants(s, `playout${seed}`);
    steps++;
    if (steps > maxSteps) { ok(false, `playout ${seed}: 超步数未终局`); return s; }
  }
  ok(E.score(s).length === n, `playout ${seed}: score 长度异常`);
  return s;
}

// doBuild / doUpgrade 定点执行合法动作
function doBuild(s, hex) {
  const a = E.legalActions(s).find((x) => x.kind === 'build' && x.hex === hex);
  if (!a) throw new Error(`build ${hex} 不合法`);
  return E.apply(s, a);
}
function doUpgrade(s, hex, to) {
  const a = E.legalActions(s).find((x) => x.kind === 'upgrade' && x.hex === hex && x.to === to);
  if (!a) throw new Error(`upgrade ${hex}->${to} 不合法`);
  return E.apply(s, a);
}

// ==== 1. 数据表与工具 ====
section('数据表');
ok(T.wheelDist('plains', 'swamp') === 1, 'wheelDist plains-swamp 应为 1');
ok(T.wheelDist('plains', 'lakes') === 2, 'wheelDist plains-lakes 应为 2');
ok(T.wheelDist('plains', 'forest') === 3, 'wheelDist plains-forest 应为 3');
ok(T.wheelDist('plains', 'desert') === 1, 'wheelDist plains-desert 应为 1');
ok(HEXES.length === 55, `棋盘应 55 格，实际 ${HEXES.length}`);
const terrCount = {};
for (const h of HEXES) terrCount[h.terrain] = (terrCount[h.terrain] || 0) + 1;
for (const tr of ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert']) {
  ok(terrCount[tr] === 7, `地形 ${tr} 应 7 格，实际 ${terrCount[tr] || 0}`);
}
ok(terrCount.river === 6, `河流应 6 格，实际 ${terrCount.river || 0}`);
for (const h of HEXES) {
  for (const nid of ADJACENCY[h.id]) {
    ok(ADJACENCY[nid].includes(h.id), `邻接不对称 ${h.id}<->${nid}`);
  }
}

// ==== 2. 确定性 ====
section('确定性');
{
  const a = playout(101, 2);
  const b = playout(101, 2);
  ok(JSON.stringify(a) === JSON.stringify(b), '同种子随机对局应完全一致');
}
{
  const s1 = E.initialState({ seats: [{ name: 'x', isAI: true, color: '#111' }], seed: 1 });
  const s2 = E.initialState({ seats: [{ name: 'x', isAI: true, color: '#111' }], seed: 2 });
  const ids1 = s1.roundTiles.map((t) => t.id).join(',');
  const ids2 = s2.roundTiles.map((t) => t.id).join(',');
  ok(ids1 !== ids2, '不同种子回合板块应有差异（大概率）');
}

// ==== 3. 随机对局 ====
section('随机对局');
for (const n of [2, 3, 4, 5]) {
  const s = playout(1000 + n, n);
  ok(E.isGameOver(s), `${n} 人随机对局应终局`);
  for (const r of E.score(s)) ok(r.total >= T.START.vp, `${n} 人局总分应 ≥ 起始 VP`);
}

// ==== 4. 派系挖铲特例 ====
section('挖铲派系特例');
{
  // 巨人 mountain→plains 轮距 3，巨人 2 铲；普通派系 3 铲
  const s = mkGame(['giants', 'halflings'], 42, ['0,-3', '4,1', '6,1', '1,-3']);
  ok(E.spadesNeeded(s.players[0], 'plains') === 2, '巨人 mountain→plains 应 2 铲');
  ok(E.spadesNeeded(s.players[1], 'forest') === 3, '半身人 plains→forest 应 3 铲');
}
{
  // 炼金：swamp→forest 距 2，金币代工 1 币/铲
  const s = mkGame(['alchemists', 'giants'], 42, ['5,0', '0,-3', '1,-3', '2,1']);
  const p = s.players[0];
  const c = E.buildCost(s, p, '0,0', true); // '0,0' 为 forest
  ok(c.coins === T.BUILDINGS.D.cost.coins + 2, `炼金币代工应付 2+2 金币，实际 ${c.coins}`);
  ok(c.workers === T.BUILDINGS.D.cost.workers, '炼金币代工不应付工人铲费');
  const c2 = E.buildCost(s, p, '0,0', false);
  ok(c2.workers === 1 + 2 * T.SPADE_WORKERS, `常规工人付铲应为 ${1 + 2 * T.SPADE_WORKERS}，实际 ${c2.workers}`);
}

// ==== 5. 建造范围 ====
section('建造范围');
{
  // 游牧民 vs 苦行僧：同在 '6,2'，'5,0' 距其 3 步
  const sN = mkGame(['nomads', 'halflings'], 42, ['6,2', '4,1', '5,1', '2,-3']);
  const nom = sN.players[0];
  const rangeN = E.buildRangeSet(sN, nom);
  ok(rangeN.has('6,1'), '邻接格 1,6 应在范围');
  ok(!rangeN.has('5,0'), '游牧民距离 3 的 0,5 不应可达');
  const sF = mkGame(['fakirs', 'halflings'], 42, ['6,2', '4,1', '5,1', '2,-3']);
  const rangeF = E.buildRangeSet(sF, sF.players[0]);
  ok(rangeF.has('5,0'), '苦行僧距离 3 的 0,5 应可达');
  ok(!rangeF.has('4,1'), '他人占有格不应在范围');
}

// ==== 6. 吸能（leech）====
section('吸能');
{
  // 半身人两座建筑 ('5,2','5,1') 邻接 '6,1'：游牧民（先手）建 '6,1' 时半身人只吸 1 次
  const s = mkGame(['nomads', 'halflings'], 42, ['6,2', '5,2', '5,1', '2,-3']);
  s.players[1].power = { i: 4, ii: 7, iii: 1 };
  const legal = E.legalActions(s).some((a) => a.kind === 'build' && a.hex === '6,1');
  ok(legal, '游牧民应可在 6,1 建民居');
  const s2 = E.apply(s, { kind: 'build', hex: '6,1' });
  ok(JSON.stringify(s2.players[1].power) === JSON.stringify({ i: 4, ii: 8, iii: 0 }),
    `吸 1 能应得 {4,8,0}，实际 ${JSON.stringify(s2.players[1].power)}`);
  // iii=0（付不起代价）不吸
  const s3 = mkGame(['nomads', 'halflings'], 42, ['6,2', '5,2', '5,1', '2,-3']);
  s3.players[1].power = { i: 4, ii: 8, iii: 0 };
  const s4 = E.apply(s3, { kind: 'build', hex: '6,1' });
  ok(JSON.stringify(s4.players[1].power) === JSON.stringify({ i: 4, ii: 8, iii: 0 }), 'iii=0 应不吸能');
}

// ==== 7. 建镇与连接 ====
section('建镇');
{
  // 半身人平原群：3 D + 2 TP + 1 TE = 2+2+3=7 → 建镇 +5 VP（资源垫足聚焦断言）
  let st = mkGame(['halflings'], 42, ['4,1', '6,1']);
  st.players[0].coins = 50;
  st.players[0].workers = 20;
  st = doBuild(st, '5,1');
  st = doUpgrade(st, '4,1', 'TP');
  st = doUpgrade(st, '6,1', 'TP');
  st = doUpgrade(st, '5,1', 'TP');
  const vpBefore = st.players[0].vp;
  const favors = E.legalActions(st).filter((a) => a.kind === 'upgrade' && a.hex === '5,1' && a.to === 'TE');
  ok(favors.length > 0, '5,1 应可升神殿');
  st = E.apply(st, favors[0]);
  ok(st.players[0].vp === vpBefore + T.TOWN_VP, `建镇应 +${T.TOWN_VP} VP，实际 ${st.players[0].vp - vpBefore}`);
  ok(st.players[0].towns.length === 1, '应记录 1 个城镇');
}
{
  // 美人鱼船运建镇连接：'0,1' 与 '1,2' 隔湖 '1,1'（两湖格互不相邻）
  const s = mkGame(['mermaids', 'giants'], 42, ['0,1', '0,-3', '1,-3', '1,2']);
  const m = s.players[0];
  m.buildings = { '0,1': 'D', '1,2': 'D' };
  m.shipping = 1;
  ok(E.townGroups(s, m).length === 1, '美人鱼 shipping 1 应跨湖连成一组');
  m.shipping = 0;
  ok(E.townGroups(s, m).length === 2, '无船运应为两组');
  m.shipping = 1;
  const fake = { ...m, faction: 'giants' };
  ok(E.townGroups(s, fake).length === 2, '非美人鱼有船运也不连');
}
{
  // 桥连接：造桥后对岸进入建造范围并连接城镇组
  const s = mkGame(['nomads', 'halflings'], 42, ['6,2', '4,1', '5,1', '2,-3']);
  const nom = s.players[0];
  // 找一条「两岸皆空且对岸当前不可达」的河格
  let found = null;
  for (const h of HEXES) {
    if (h.terrain !== 'river') continue;
    for (const [x, y] of bridgePairs(h.id)) {
      if (s.hexes[x].owner !== null || s.hexes[y].owner !== null) continue;
      nom.buildings[x] = 'D';
      s.hexes[x].owner = 0;
      s.hexes[x].bld = 'D';
      if (!E.buildRangeSet(s, nom).has(y)) { found = [h.id, x, y]; break; }
      delete nom.buildings[x];
      s.hexes[x].owner = null;
      s.hexes[x].bld = null;
    }
    if (found) break;
  }
  ok(!!found, '应能找到可测桥位');
  if (found) {
    const [river, x, y] = found;
    ok(!E.buildRangeSet(s, nom).has(y), '造桥前对岸不可达');
    s.bridges.push({ river, a: x, b: y, owner: 0 });
    ok(E.buildRangeSet(s, nom).has(y), '造桥后对岸可达');
    // 对岸补一座建筑后，桥应把两岸连进同一城镇组
    nom.buildings[y] = 'D';
    s.hexes[y].owner = 0;
    s.hexes[y].bld = 'D';
    ok(E.townGroups(s, nom).some((g) => g.includes(x) && g.includes(y)), '桥应连接城镇组');
  }
}

// ==== 8. 女巫专长 ====
section('女巫专长');
{
  const s = mkGame(['witches', 'giants'], 42, ['0,0', '0,-3', '1,-3', '-1,0']);
  s.players[0].buildings['-1,0'] = 'SH'; // 伪造成要塞（专长触发只看 SH 存在）
  s.hexes['-1,0'].bld = 'SH';
  const legal = E.legalActions(s).filter((a) => a.kind === 'upgrade' && a.hex === '0,0' && a.to === 'TP');
  ok(legal.length > 0, '0,0 应可升交易站');
  const s2 = E.apply(s, legal[0]);
  ok(s2.phase.kind === 'resolve' && s2.pending[0].kind === 'witchDwelling', '升级后应触发女巫免费民居');
  const coins = s2.players[0].coins;
  const workers = s2.players[0].workers;
  const place = E.legalActions(s2).find((a) => a.kind === 'witchDwelling' && a.hex === '-2,1');
  ok(!!place, '应有空森林格可放');
  const s3 = E.apply(s2, place);
  ok(s3.hexes['-2,1'].owner === 0 && s3.hexes['-2,1'].bld === 'D', '免费民居应落地');
  ok(s3.players[0].coins === coins && s3.players[0].workers === workers, '免费民居不应扣资源');
}

// ==== 9. 混沌法师专长 ====
section('混沌法师专长');
{
  const s = mkGame(['chaosmagicians', 'giants'], 42, ['4,-3', '0,-3', '1,-3', '5,-3']);
  const cm = s.players[0];
  cm.buildings['5,-3'] = 'SH';
  s.hexes['5,-3'].bld = 'SH';
  cm.priests = 2;
  const a1 = E.legalActions(s).find((a) => a.kind === 'chaosCult' && a.track === 'fire');
  ok(!!a1, '应可发动混沌邪教');
  const s2 = E.apply(s, a1);
  ok(s2.players[0].cult.fire === 2, `混沌应推进 2，实际 ${s2.players[0].cult.fire}`);
  ok(s2.players[0].priests === 1, '混沌应消耗 1 祭司');
  // 巨人 pass 后轮转回混沌法师，第二次发动应无效
  const passAct = E.legalActions(s2).find((x) => x.kind === 'pass' && x.bonus === s2.players[1].bonus);
  const s2b = E.apply(s2, passAct);
  ok(s2b.phase.cur === 0, 'pass 后应轮转回混沌法师');
  const s3 = E.apply(s2b, a1);
  ok(s3.players[0].cult.fire === 2, '每轮仅 1 次，第二次应无效');
  ok(s3.players[0].priests === 1, '无效动作不应消耗祭司');
  ok(JSON.stringify(s3.phase) === JSON.stringify(s2b.phase), '无效动作不应改变阶段');
}

// ==== 10. 能量槽与轮流转 ====
section('能量槽与轮流转');
{
  const s = mkGame(['halflings', 'giants'], 42, ['4,1', '0,-3', '1,-3', '6,1']);
  s.players[0].power = { i: 4, ii: 3, iii: 5 };
  const slotAct = E.legalActions(s).find((a) => a.kind === 'powerAction');
  ok(!!slotAct, '应有可用能量动作');
  const s2 = E.apply(s, slotAct);
  ok(s2.powerActions[slotAct.slot] === 0, '能量槽应被 P0 占据');
  // 双方陆续 pass（P1 先）→ 下一轮顺位 [1,0]、能量槽刷新
  let st = s2;
  let guard = 0;
  while (st.round === 1 && guard++ < 60) {
    if (st.phase.kind === 'resolve') { st = E.apply(st, E.legalActions(st)[0]); continue; }
    st = E.apply(st, E.legalActions(st).find((x) => x.kind === 'pass' && x.bonus === st.players[st.phase.cur].bonus));
  }
  ok(st.round === 2, `双方 pass 后应进入第 2 轮，实际 round=${st.round}`);
  ok(JSON.stringify(st.turnOrder) === JSON.stringify([1, 0]), `pass 顺位应为 [1,0]，实际 ${JSON.stringify(st.turnOrder)}`);
  ok(st.powerActions.every((x) => x === null), '新一轮能量槽应全空');
}

// ==== 11. 终局计分 ====
section('终局计分');
{
  const s = mkGame(['halflings', 'giants'], 42, ['4,1', '0,-3', '1,-3', '6,1']);
  s.players[0].cult = { fire: 5, water: 5, earth: 5, air: 5 };
  s.players[1].cult = { fire: 5, water: 3, earth: 3, air: 3 };
  const vp0 = s.players[0].vp;
  const vp1 = s.players[1].vp;
  E.finalScoring(s);
  ok(s.players[0].vp - vp0 === 8 * 4, `P0 邪教分应 32，实际 ${s.players[0].vp - vp0}`);
  ok(s.players[1].vp - vp1 === 8 + 4 * 3, `P1 邪教分应 20，实际 ${s.players[1].vp - vp1}`);
}

// ==== 12. AI 全局对局 ====
section('AI 对局');
for (const [seed, n] of [[7, 2], [8, 3]]) {
  const seats = Array.from({ length: n }, (_, i) => ({ name: `Bot${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  let steps = 0;
  while (!E.isGameOver(s) && steps <= 2200) {
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
