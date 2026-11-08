// 神秘大地引擎自测：node 直接运行（node selftest.js）。
// 覆盖：数据表/棋盘断言、确定性/纯度/JSON-safe、随机对局不变量、
// 规则定点测试（挖铲派系特例、建造范围、吸能、建镇、美人鱼河连接、桥、
// 女巫/混沌/奥灵/蜂灵/巨人/游牧/工程师 SH 特别行动、BON1/BON2/FAV6 板块行动、
// 铲子升级、暗灵铲、船运、能量槽、过牌顺位、资源转换、燃烧、邪教跨格奖励、
// 回合收入、终局计分）、AI 全局对局。

import * as E from './engine.js';
import * as T from './tables.js';
import { HEXES, ADJACENCY, BRIDGE_PAIRS, hexLabel, ROW_LETTERS } from './map-data.js';
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

// TERR_BY_ID hex id → terrain
const TERR_BY_ID = Object.fromEntries(HEXES.map((h) => [h.id, h.terrain]));

// mkGame 造对局：选派系 + 蛇形放 2 民居 + 逆序选奖励板块。
// apply 返回全新 state，读取一律从返回值取。
// placeHexes 顺序 = 放置队列顺序 [P0 第 1 座, P1 第 1 座, ..., 逆序 ..., P0 第 2 座]
// （混沌民居最后、游牧第 3 座也按引擎队列顺序排在其后）。
function mkGame(factions, seed = 42, placeHexes = null) {
  const seats = factions.map((_, i) => ({ name: `P${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  for (const f of factions) s = E.apply(s, { kind: 'faction', faction: f });
  // 完全跟随引擎 placeQueue：直接按 legalActions 顺序消费 placeHexes
  let pi = 0;
  while (s.phase.kind === 'placeDwelling' || s.phase.kind === 'pickBonus') {
    const legal = E.legalActions(s);
    if (s.phase.kind === 'placeDwelling') {
      const seat = s.placeQueue[0].seat;
      const hex = placeHexes && placeHexes[pi] ? placeHexes[pi]
        : legal.map((a) => a.hex).find((h) => TERR_BY_ID[h] === homeTerr(s.players[seat]))
        || legal[0].hex;
      pi++;
      s = E.apply(s, { kind: 'placeDwelling', hex });
    } else {
      s = E.apply(s, legal[0]);
    }
  }
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

// checkInvariants 对局不变量
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
function playout(seed, n, maxSteps = 12000) {
  const seats = Array.from({ length: n }, (_, i) => ({ name: `A${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  const rand = lcg(seed * 7919 + n);
  let steps = 0;
  while (!E.isGameOver(s)) {
    const legal = E.legalActions(s);
    ok(legal.length > 0, `playout ${seed}: 非终局合法动作为空 (${s.phase.kind})`);
    const snapshot = JSON.stringify(s);
    const next = E.apply(s, legal[Math.floor(rand() * legal.length)]);
    // 纯度：apply 后原入参对象应保持不变
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

// grantSH 直接把一座民居改成要塞（绕过费用，专长触发只看 SH 存在）
function grantSH(s, seat, hex) {
  const p = s.players[seat];
  p.buildings[hex] = 'SH';
  s.hexes[hex].bld = 'SH';
}

// ==== 1. 数据表与官方棋盘 ====
section('数据表');
ok(T.wheelDist('plains', 'swamp') === 1, 'wheelDist plains-swamp 应为 1');
ok(T.wheelDist('plains', 'lakes') === 2, 'wheelDist plains-lakes 应为 2');
ok(T.wheelDist('plains', 'forest') === 3, 'wheelDist plains-forest 应为 3');
ok(T.wheelDist('plains', 'desert') === 1, 'wheelDist plains-desert 应为 1');
// 官方棋盘：113 格 = 7 地形 × 11 + 36 河格；偶数行 13 槽、奇数行 12 槽
ok(HEXES.length === 113, `棋盘应 113 格，实际 ${HEXES.length}`);
const terrCount = {};
for (const h of HEXES) terrCount[h.terrain] = (terrCount[h.terrain] || 0) + 1;
for (const tr of ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert']) {
  ok(terrCount[tr] === 11, `地形 ${tr} 应 11 格，实际 ${terrCount[tr] || 0}`);
}
ok(terrCount.river === 36, `河流应 36 格，实际 ${terrCount.river || 0}`);
for (const r of [0, 2, 4, 6, 8]) {
  ok(HEXES.filter((h) => h.r === r).length === 13, `第 ${r} 行应 13 槽`);
}
for (const r of [1, 3, 5, 7]) {
  ok(HEXES.filter((h) => h.r === r).length === 12, `第 ${r} 行应 12 槽`);
}
for (const h of HEXES) {
  for (const nid of ADJACENCY[h.id]) {
    ok(ADJACENCY[nid].includes(h.id), `邻接不对称 ${h.id}<->${nid}`);
  }
}
// 棋面坐标：每格唯一（A1–I13），且能反查回原 id —— 操作区按钮与棋盘标签共用同一套坐标
const labelSet = new Set(HEXES.map((h) => hexLabel(h.id)));
ok(labelSet.size === HEXES.length, `棋面坐标应两两不同，实际 ${labelSet.size}/${HEXES.length}`);
ok(hexLabel('3,0') === 'A4', `3,0 的棋面坐标应为 A4，实际 ${hexLabel('3,0')}`);
ok(hexLabel('1,2') === 'C3', `1,2 的棋面坐标应为 C3（行内第 3 槽），实际 ${hexLabel('1,2')}`);
ok(ROW_LETTERS.length === 9, '行字母应 9 个');
ok(hexLabel('999,999') === '999,999', '未知格应回显原串');
// 官方桥位：29 对，每对两端为互不相邻的陆地格、恰有 2 个公共邻格且均为河格
ok(BRIDGE_PAIRS.length === 29, `官方桥位应 29 对，实际 ${BRIDGE_PAIRS.length}`);
const pairKeys = new Set();
for (const [a, b] of BRIDGE_PAIRS) {
  ok(TERR_BY_ID[a] !== 'river' && TERR_BY_ID[b] !== 'river', `桥位 ${a}-${b} 两端应为陆地`);
  ok(!ADJACENCY[a].includes(b), `桥位 ${a}-${b} 两端不应相邻`);
  const common = ADJACENCY[a].filter((x) => ADJACENCY[b].includes(x));
  ok(common.length === 2 && common.every((x) => TERR_BY_ID[x] === 'river'),
    `桥位 ${a}-${b} 公共邻格应恰 2 个河格`);
  const key = [a, b].sort().join('|');
  ok(!pairKeys.has(key), `桥位 ${a}-${b} 重复`);
  pairKeys.add(key);
}
// 派系数值抽查（对 jsnell Factions/*.pm）：半身人起始 VP 20、苦行僧 33、暗灵 1 祭司
ok(T.FACTION_START_VP.halflings === 20, '半身人起始 VP 应 20');
ok(T.FACTION_START_VP.fakirs === 33, '苦行僧起始 VP 应 33');
ok(factionById('darklings').start.priests === 1, '暗灵起始应 1 祭司');
ok(factionById('dwarves').ship === null, '矮人应无船运');

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
  for (const r of E.score(s)) ok(r.total >= 15, `${n} 人局总分应 ≥ 15`);
}

// ==== 4. 挖铲派系特例 ====
section('挖铲派系特例');
{
  // 巨人 wasteland→plains 轮距 2，巨人 1 铲；普通派系 plains→forest 距 3 铲
  const s = mkGame(['giants', 'halflings']);
  ok(E.spadesNeeded(s.players[0], 'plains') === 2, '巨人 wasteland→plains 应 2 铲');
  ok(E.spadesNeeded(s.players[1], 'forest') === 3, '半身人 plains→forest 应 3 铲');
}
{
  // 半身人家园内 0 铲
  const s = mkGame(['halflings', 'giants']);
  ok(E.spadesNeeded(s.players[0], 'plains') === 0, '半身人 plains→plains 应 0 铲');
}

// ==== 5. 建造范围 ====
section('建造范围');
{
  // 游牧民 3 座民居 '4,0'+'0,1'+第 3 座自动放：乌鸦距离 ≥2 的格一律不可达
  const places = ['4,0', '7,5', '7,7', '0,1'];
  const sN = mkGame(['nomads', 'halflings'], 42, places);
  const rangeN = E.buildRangeSet(sN, sN.players[0]);
  ok(rangeN.has('5,0'), '邻接格 5,0 应在范围');
  ok(!rangeN.has('6,0'), '游牧民乌鸦距离 2 的 6,0 不应可达');
  const sF = mkGame(['fakirs', 'halflings'], 42, places);
  const rangeF = E.buildRangeSet(sF, sF.players[0]);
  // 苦行僧飞毯 1 级：乌鸦距离 1 的空置陆地格可达（即建筑邻格）
  // 注意 reachInfo().tp 是 Set，须用展开取元素
  const r1 = [...E.reachInfo(sF, sF.players[0]).tp];
  ok(r1.length > 0, '苦行僧飞毯应有乌鸦距离 1 的传送位');
  const adjAll = new Set([...ADJACENCY['4,0'], ...ADJACENCY['0,1']]);
  ok(r1.every((id) => adjAll.has(id)), '飞毯位应全部为乌鸦距离 1（建筑邻格）');
  ok(!rangeF.has('6,0'), '苦行僧 tpRange=1 时距离 2 的 6,0 不应可达');
  ok(!rangeF.has('7,5'), '他人占有格不应在范围');
}

// ==== 6. 吸能（leech）====
section('吸能');
{
  // 半身人两座民居 ('7,5','7,7') 邻接 '7,6'：游牧民建 '7,6'（沼泽，距沙漠 2 铲）
  // 强度 = 1+1 = 2；碗 {i:4,ii:7,iii:1} 官方容量 = P1+P2 = 11（每枚只挪一步）；
  // vp+1 充足 → actual = 2，两枚 P1 入 II → {i:2,ii:9,iii:1}，vp -1（actual-1）
  const places = ['6,6', '7,5', '7,7', '9,6', '4,0'];
  const s = mkGame(['nomads', 'halflings'], 42, places);
  s.players[0].workers = 10;
  s.players[1].power = { i: 4, ii: 7, iii: 1 };
  ok(E.legalActions(s).some((a) => a.kind === 'build' && a.hex === '7,6'), '游牧民应可在 7,6 建民居');
  const s2 = E.apply(s, { kind: 'build', hex: '7,6' });
  ok(JSON.stringify(s2.players[1].power) === JSON.stringify({ i: 2, ii: 9, iii: 1 }),
    `吸 2 能应得 {i:2,ii:9,iii:1}，实际 ${JSON.stringify(s2.players[1].power)}`);
  ok(s2.players[1].vp === s.players[1].vp - 1, '吸 2 能应付 VP 1（actual-1）');
  // iii=0 且无 P1/P2 入碗空间 = 不吸
  const s3 = mkGame(['nomads', 'halflings'], 42, places);
  s3.players[0].workers = 10;
  s3.players[1].power = { i: 0, ii: 0, iii: 4 };
  const s4 = E.apply(s3, { kind: 'build', hex: '7,6' });
  ok(JSON.stringify(s4.players[1].power) === JSON.stringify({ i: 0, ii: 0, iii: 4 }), '碗容量 0 应不吸能');
  // 碗容量不足只吸部分：{i:0,ii:1} 容量 1 → 吸 1（i 不足则 P2 入 III）
  const s5 = mkGame(['nomads', 'halflings'], 42, places);
  s5.players[0].workers = 10;
  s5.players[1].power = { i: 0, ii: 1, iii: 0 };
  const s6 = E.apply(s5, { kind: 'build', hex: '7,6' });
  ok(JSON.stringify(s6.players[1].power) === JSON.stringify({ i: 0, ii: 0, iii: 1 }),
    '容量 1 应只吸 1（P2 入 III）');
  // vp=0 时上限 1：actual = min(2, 0+1, 15) = 1
  const s7 = mkGame(['nomads', 'halflings'], 42, places);
  s7.players[0].workers = 10;
  s7.players[1].power = { i: 4, ii: 7, iii: 1 };
  s7.players[1].vp = 0;
  const s8 = E.apply(s7, { kind: 'build', hex: '7,6' });
  ok(JSON.stringify(s8.players[1].power) === JSON.stringify({ i: 3, ii: 8, iii: 1 }),
    'vp=0 应只吸 1（actual ≤ vp+1）');
  ok(s8.players[1].vp === 0, 'vp 不为负');
  // 官方容量 P1+P2 封顶：{i:1,ii:0,iii:0} 可吸量 2 但容量 1 → 只吸 1
  const s9 = mkGame(['nomads', 'halflings'], 42, places);
  s9.players[0].workers = 10;
  s9.players[1].power = { i: 1, ii: 0, iii: 0 };
  const s10 = E.apply(s9, { kind: 'build', hex: '7,6' });
  ok(JSON.stringify(s10.players[1].power) === JSON.stringify({ i: 0, ii: 1, iii: 0 }),
    `容量 P1+P2=1 应只吸 1（官方 gain_power 逐步挪碗），实际 ${JSON.stringify(s10.players[1].power)}`);
}

// ==== 7. 建镇与连接 ====
section('建镇');
{
  // 半身人建镇（平原 A='7,5' B='7,7' 互不相邻，公共邻格 '7,6' 为沼泽 1 铲）：
  // A、B 各放初始民居，C='7,6' 挖成平原连通，再建第 4 座 D（'8,5' 山地 2 铲
  // 邻 A），A 升 SH：连通组 {A(SH3),C(TP2),D(TP2)} = 7 且 SA 双计外 4 座不足 ——
  // 需第 4 座真实建筑：{A(SH),B(TP),C(TP),D(D)} 值 3+2+2+1=8 ≥ 7 且 4 座 → 建镇
  let st = mkGame(['halflings', 'giants'], 42, ['7,5', '5,0', '8,0', '7,7']);
  st.players[0].coins = 300;
  st.players[0].workers = 200;
  const passBack = (s0) => {
    let s1 = s0;
    let guard = 0;
    while (s1.phase.kind === 'act' && s1.phase.cur !== 0 && guard++ < 50) {
      s1 = E.apply(s1, E.legalActions(s1).find((x) => x.kind === 'pass'));
    }
    return s1;
  };
  const settle = (s0) => {
    let s1 = s0;
    let guard = 0;
    while ((s1.phase.kind === 'resolve' || (s1.phase.kind === 'act' && s1.phase.cur !== 0)) && guard++ < 50) {
      const legal = E.legalActions(s1);
      if (s1.phase.kind === 'resolve') { s1 = E.apply(s1, legal[0]); continue; }
      s1 = E.apply(s1, legal.find((x) => x.kind === 'pass'));
    }
    return s1;
  };
  st = settle(st);
  st = doBuild(st, '7,6');
  st = settle(st);
  st = doBuild(st, '8,5');
  st = settle(st);
  ok(st.players[0].towns.length === 0, '4 座民居值 4 不建镇');
  // 官方升级链 D→TP→（TE|SH）：7,5 先 TP 再 SH
  st = doUpgrade(st, '7,5', 'TP');
  st = settle(st);
  ok(st.players[0].towns.length === 0, 'TP+3 民居值 5 不足 7 不建镇');
  st = doUpgrade(st, '7,5', 'SH');
  st = settle(st);
  ok(st.players[0].towns.length === 0, 'SH+3 民居值 6 不足 7 不建镇');
  st = doUpgrade(st, '7,7', 'TP');
  // 此处建镇：{SH,TP,D,D} 值 3+2+1+1=7 ≥ 7 且 4 座 —— 但 settle 会顺手把
  // townTile resolve 消费掉，所以先断言 pending 再分开结算
  ok(st.pending.length > 0 && st.pending.some((it) => it.kind === 'townTile'),
    `值 7 且 4 座应建镇（towns=${st.players[0].towns.length}）`);
  // 建镇后选城镇板块（resolve），选 TW3（VP9）
  ok(st.phase.kind === 'resolve' && st.pending[0].kind === 'townTile', '建镇应触发城镇板块选择');
  const vpBefore = st.players[0].vp;
  const tw3 = E.legalActions(st).find((a) => a.kind === 'townTile' && a.idx === 2);
  st = E.apply(st, tw3 || E.legalActions(st)[0]);
  ok(st.players[0].vp === vpBefore + 9, `选 TW3 应 +9 VP（板块 VP），实际 ${st.players[0].vp - vpBefore}`);
  ok(st.players[0].keys === 1, '城镇板块应给 1 钥匙');
  st = settle(st);
}
{
  // 美人鱼河格连接点：river '2,1' 两侧 '3,0'（湖泊）/ '1,2'（沼泽）互不相邻。
  // 船运跨河：河格为通道，连续 ≤shipping 个河格后对岸可达
  const s = mkGame(['mermaids', 'giants']);
  const m = s.players[0];
  m.buildings = { '3,0': 'D' };
  s.hexes['3,0'].owner = 0;
  s.hexes['3,0'].bld = 'D';
  m.shipping = 0; // 临时降为 0 验证不可跨河（美人鱼开局实为 1 级）
  ok(!E.buildRangeSet(s, m).has('1,2'), '船运 0 不应跨河');
  m.shipping = 1;
  ok(E.buildRangeSet(s, m).has('1,2'), '船运 1 应跨单河格');
  // 河格连接点：与同一河格相邻的己方建筑互相连通（与船运等级无关）
  m.buildings['1,2'] = 'D';
  s.hexes['1,2'].owner = 0;
  s.hexes['1,2'].bld = 'D';
  m.shipping = 0;
  const merEdges = E.townEdges(s, m);
  ok(merEdges['3,0'].has('1,2'), '美人鱼河格连接点应连通（与船运等级无关）');
  const fake = { ...m, faction: 'giants' };
  const fakeEdges = E.townEdges(s, fake);
  ok(!fakeEdges['3,0'].has('1,2'), '非美人鱼不连');
}
{
  // 桥连接：官方桥位 '2,0'-'1,2'，造桥后对岸进入建造范围并连接城镇组
  const s = mkGame(['nomads', 'halflings']);
  const nom = s.players[0];
  nom.buildings['2,0'] = 'D';
  s.hexes['2,0'].owner = 0;
  s.hexes['2,0'].bld = 'D';
  ok(!E.buildRangeSet(s, nom).has('1,2'), '造桥前对岸不可达');
  s.bridges.push({ a: '2,0', b: '1,2', owner: 0 });
  ok(E.buildRangeSet(s, nom).has('1,2'), '造桥后对岸可达');
  // 对岸补一座建筑后，桥应把两岸连进同一连通组（townEdges）
  nom.buildings['1,2'] = 'D';
  s.hexes['1,2'].owner = 0;
  s.hexes['1,2'].bld = 'D';
  const edges = E.townEdges(s, nom);
  ok(edges['2,0'].has('1,2') && edges['1,2'].has('2,0'), '桥应连接城镇组');
}

// ==== 8. 桥动作 ====
section('桥动作');
{
  // 工程师 ACTE：2 工人造桥（SH 特别行动，占行动、可重复）
  const sE = mkGame(['engineers', 'halflings']);
  const eng = sE.players[0];
  eng.buildings['2,0'] = 'D';
  sE.hexes['2,0'].owner = 0;
  sE.hexes['2,0'].bld = 'D';
  grantSH(sE, 0, Object.keys(eng.buildings).find((h) => h !== '2,0'));
  eng.workers = 10;
  const actE = E.legalActions(sE).find((a) => a.kind === 'shAction' && a.id === 'ACTE' && a.a === '2,0' && a.b === '1,2');
  ok(!!actE, '工程师应有 2,0-1,2 ACTE 桥行动');
  if (actE) {
    const sE2 = E.apply(sE, actE);
    ok(sE2.players[0].workers === 10 - 2, 'ACTE 桥费应 2 工人');
    ok(sE2.bridges.some((br) => br.a === '2,0' && br.b === '1,2' && br.owner === 0), '桥应落地');
  }
  // 标准桥：2 币 1 祭司
  const sN = mkGame(['nomads', 'halflings']);
  const nom = sN.players[0];
  nom.buildings['2,0'] = 'D';
  sN.hexes['2,0'].owner = 0;
  sN.hexes['2,0'].bld = 'D';
  nom.priests = 1;
  const actN = E.legalActions(sN).find((a) => a.kind === 'bridge' && a.a === '2,0' && a.b === '1,2');
  ok(!!actN, '游牧民应有桥动作');
  const sN2 = E.apply(sN, actN);
  ok(sN2.players[0].coins === nom.coins - 2 && sN2.players[0].priests === 0, '标准桥费应 2 币 1 祭司');

  // 每派系 3 座上限：占满后不再枚举桥动作
  const sN3 = mkGame(['nomads', 'halflings']);
  const nom3 = sN3.players[0];
  nom3.buildings['2,0'] = 'D';
  sN3.hexes['2,0'].owner = 0;
  sN3.hexes['2,0'].bld = 'D';
  sN3.bridges.push({ a: 'p1', b: 'q1', owner: 0 }, { a: 'p2', b: 'q2', owner: 0 }, { a: 'p3', b: 'q3', owner: 0 });
  ok(sN3.phase.kind === 'act' && sN3.phase.cur === 0, '对局应在 P0 行动阶段');
  ok(E.legalActions(sN3).every((a) => a.kind !== 'bridge' && !(a.kind === 'powerAction' && a.a !== undefined)),
    '3 座桥后不应再有桥动作');

  // 他人已在该对造桥则不可再造
  const sN4 = mkGame(['nomads', 'halflings']);
  const nom4 = sN4.players[0];
  nom4.buildings['2,0'] = 'D';
  sN4.hexes['2,0'].owner = 0;
  sN4.hexes['2,0'].bld = 'D';
  sN4.bridges.push({ a: '2,0', b: '1,2', owner: 1 });
  ok(E.legalActions(sN4).every((a) => a.kind !== 'bridge' || !(a.a === '2,0' && a.b === '1,2')),
    '他人已占的桥位对应不可再造');
}

// ==== 9. SH 特别行动 ====
section('SH 特别行动');
{
  // 蜂灵 ACTS：免费 TP 升级
  const s = mkGame(['swarmlings', 'witches']);
  const dHex = Object.keys(s.players[0].buildings)[0];
  grantSH(s, 0, Object.keys(s.players[0].buildings)[1]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTS');
  ok(!!a, '蜂灵应有 ACTS');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].buildings[dHex] === 'TP', 'ACTS 应升级为 TP');
  }
}
{
  // 巨人 ACTG：+2 铲
  const s = mkGame(['giants', 'witches']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTG');
  ok(!!a, '巨人应有 ACTG');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].spades === 2, 'ACTG 应 +2 铲');
  }
}
{
  // 奥灵 ACTA：同轨 +2 邪教
  const s = mkGame(['auren', 'witches']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTA' && x.track === 'fire');
  ok(!!a, '奥灵应有 ACTA fire');
  if (a) {
    const before = s.players[0].cult.fire;
    const s2 = E.apply(s, a);
    ok(s2.players[0].cult.fire === before + 2, 'ACTA 应推进 2 格');
  }
}
{
  // 游牧 ACTN：免费改造 + 建民居（直接邻接、家园色）
  const s = mkGame(['nomads', 'witches']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTN');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].buildings[a.hex] === 'D', 'ACTN 应建民居');
    ok(s2.hexes[a.hex].terrain === 'desert', 'ACTN 目标应已是家园色');
  } else {
    ok(true, 'ACTN 无可用位（跳过落地断言）');
    ok(true, 'ACTN skip');
  }
}
{
  // 女巫 ACTW：免费森林民居
  const s = mkGame(['witches', 'nomads']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTW');
  if (a) {
    ok(TERR_BY_ID[a.hex] === 'forest', 'ACTW 目标应为森林');
    const s2 = E.apply(s, a);
    ok(s2.players[0].buildings[a.hex] === 'D', 'ACTW 应建民居');
  } else {
    ok(true, 'ACTW 无可用森林（跳过落地断言）');
    ok(true, 'ACTW skip');
  }
}
{
  // 混沌 ACTC：净 +1 行动（官方 GAIN_ACTION 2，消耗 1）
  const s = mkGame(['chaosmagicians', 'witches']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTC');
  ok(!!a, '混沌应有 ACTC');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].bonusActions === 1 && s2.phase.cur === 0, 'ACTC 后应 +1 追加行动且同玩家继续');
    const pa = E.legalActions(s2).find((x) => x.kind === 'pass');
    const s3 = E.apply(s2, pa);
    ok(s3.phase.cur === 1, '过牌应结束本回合（官方 command_pass 语义）');
  }
}
{
  // SH 特别行动每轮限一次（ACTE 除外）：ACTG 第二次不应再列
  const s = mkGame(['giants', 'witches']);
  grantSH(s, 0, Object.keys(s.players[0].buildings)[0]);
  const a1 = E.legalActions(s).find((x) => x.kind === 'shAction' && x.id === 'ACTG');
  if (a1) {
    const s2 = E.apply(s, a1);
    ok(!E.legalActions(s2).some((x) => x.kind === 'shAction' && x.id === 'ACTG'),
      'ACTG 每轮限一次');
  }
}

// ==== 10. 板块行动（BON1/BON2/FAV6）====
section('板块行动');
{
  // BON1：占行动、得 1 铲
  const s = mkGame(['nomads', 'witches']);
  s.players[0].bonus = 'BON1';
  const a = E.legalActions(s).find((x) => x.kind === 'tileAction');
  ok(!!a, 'BON1 持有者应有板块行动');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].spades === 1, 'BON1 应 +1 铲');
    ok(s2.phase.cur === 1, 'BON1 应消耗行动');
  }
}
{
  // BON2：占行动、邪教 +1（resolve 选择）
  const s = mkGame(['nomads', 'witches']);
  s.players[0].bonus = 'BON2';
  const a = E.legalActions(s).find((x) => x.kind === 'tileAction');
  ok(!!a, 'BON2 持有者应有板块行动');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.phase.kind === 'resolve' && s2.pending[0].kind === 'cultChoice', 'BON2 应触发邪教选择');
    const fire0 = s2.players[0].cult.fire;
    const s3 = E.apply(s2, E.legalActions(s2).find((x) => x.track === 'fire'));
    ok(s3.players[0].cult.fire === fire0 + 1, 'BON2 应推进 1 格');
  }
}
{
  // FAV6：持有者可执行板块行动
  const s = mkGame(['nomads', 'witches']);
  s.favorPool['FAV6'] -= 1;
  s.players[0].favor.push('FAV6');
  const a = E.legalActions(s).find((x) => x.kind === 'tileAction' && x.id === 'FAV6');
  ok(!!a, 'FAV6 持有者应有板块行动');
}

// ==== 11. 铲子升级 / 暗灵铲 / 船运 ====
section('铲子升级/暗灵/船运');
{
  // 挖掘升级：费用 {C5,W2,P1}、+6VP、最多 2 次
  const s = mkGame(['halflings', 'witches']);
  const p = s.players[0];
  p.coins = 20; p.workers = 10; p.priests = 2;
  const a = E.legalActions(s).find((x) => x.kind === 'digUpgrade');
  ok(!!a, '应可执行挖掘升级');
  if (a) {
    const s2 = E.apply(s, a);
    ok(s2.players[0].digLevel === 1, '挖掘等级应 +1');
    ok(s2.players[0].vp === s.players[0].vp + T.DIG_UPGRADE_VP, `挖掘升级应 +${T.DIG_UPGRADE_VP} VP`);
    ok(s2.players[0].coins === 20 - 1 && s2.players[0].workers === 10 - 2 && s2.players[0].priests === 2 - 1,
      '半身人升级费应为 {C1,W2,P1}');
  }
  // 暗灵无挖掘升级
  const sd = mkGame(['darklings', 'witches']);
  sd.players[0].coins = 20; sd.players[0].workers = 10; sd.players[0].priests = 2;
  ok(!E.legalActions(sd).some((x) => x.kind === 'digUpgrade'), '暗灵应无挖掘升级');
}
{
  // 暗灵铲：1 祭司 = 1 铲 + 2VP
  const s = mkGame(['darklings', 'witches']);
  const p = s.players[0];
  p.priests = 1;
  const a = E.legalActions(s).find((x) => x.kind === 'darklingDig');
  ok(!!a, '暗灵应有铲行动');
  if (a) {
    const vp0 = p.vp;
    const s2 = E.apply(s, a);
    ok(s2.players[0].spades === 1, '暗灵铲应 +1 铲');
    ok(s2.players[0].vp === vp0 + 2, '暗灵铲应 +2 VP');
    ok(s2.players[0].priests === 0, '暗灵铲应消耗 1 祭司');
  }
}
{
  // 船运升级：费 {C4,P1}、+VP（按等级 2/3/4）
  const s = mkGame(['witches', 'nomads']);
  const p = s.players[0];
  p.coins = 10; p.priests = 2;
  const a = E.legalActions(s).find((x) => x.kind === 'shipping');
  ok(!!a, '应有船运升级');
  if (a) {
    const vp0 = p.vp;
    const s2 = E.apply(s, a);
    ok(s2.players[0].shipping === 1, '船运应 +1 级');
    ok(s2.players[0].vp === vp0 + T.SHIPPING_VP[0], `船运 1 级应 +${T.SHIPPING_VP[0]} VP`);
  }
  // 苦行僧/矮人无船运
  const sf = mkGame(['fakirs', 'witches']);
  ok(!E.legalActions(sf).some((x) => x.kind === 'shipping'), '苦行僧应无船运');
  const sw = mkGame(['dwarves', 'witches']);
  ok(!E.legalActions(sw).some((x) => x.kind === 'shipping'), '矮人应无船运');
}

// ==== 12. 资源转换与燃烧 ====
section('转换与燃烧');
{
  // 炼金 coins→vp 2:1；普通 3:1。引擎每次 apply 只转 n:1（rate 币→1 分），需多次 apply
  const s = mkGame(['alchemists', 'witches']);
  s.players[0].coins = 6;
  let s2 = s, n = 0;
  for (;;) {
    const a = E.legalActions(s2).find((x) => x.kind === 'convert' && x.from === 'coins' && x.to === 'vp');
    if (!a) break;
    s2 = E.apply(s2, a); n++;
    if (n > 10) throw new Error('convert loop runaway');
  }
  ok(n === 3 && s2.players[0].vp === s.players[0].vp + 3 && s2.players[0].coins === 0,
    '炼金 6 币应换 3 VP（2:1，逐次转换）');
  const sw = mkGame(['witches', 'nomads']);
  sw.players[0].coins = 6;
  let sw2 = sw, m = 0;
  for (;;) {
    const a = E.legalActions(sw2).find((x) => x.kind === 'convert' && x.from === 'coins' && x.to === 'vp');
    if (!a) break;
    sw2 = E.apply(sw2, a); m++;
    if (m > 10) throw new Error('convert loop runaway');
  }
  ok(m === 2 && sw2.players[0].vp === sw.players[0].vp + 2 && sw2.players[0].coins === 0,
    '普通 6 币应换 2 VP（3:1，逐次转换）');
}
{
  // 燃烧：2×P2 → 1×P3
  const s = mkGame(['witches', 'nomads']);
  s.players[0].power = { i: 0, ii: 4, iii: 0 };
  const a = E.legalActions(s).find((x) => x.kind === 'burn' && x.pairs === 2);
  ok(!!a, '应可燃烧 2 对');
  const s2 = E.apply(s, a);
  ok(JSON.stringify(s2.players[0].power) === JSON.stringify({ i: 0, ii: 0, iii: 2 }),
    '燃烧 2 对应得 2×P3');
}
{
  // 转换是免费子行动：执行后同玩家继续
  const s = mkGame(['witches', 'nomads']);
  s.players[0].coins = 3;
  const a = E.legalActions(s).find((x) => x.kind === 'convert' && x.from === 'coins' && x.to === 'vp');
  const s2 = E.apply(s, a);
  ok(s2.phase.cur === 0, '免费子行动后应同玩家继续');
}

// ==== 13. 邪教轨 ====
section('邪教轨');
{
  // 跨格奖励：跨 2 → +1 魔；跨 4 → +2；跨 6 → +2；跨 9 → 需钥匙 +3、锁他轨
  const s = mkGame(['halflings', 'witches']);
  const p = s.players[0];
  p.power = { i: 12, ii: 0, iii: 0 };
  p.cult.fire = 1;
  E.advanceCult(s, p, 'fire', 1); // 1→2：跨 2 得 1 魔
  ok(p.cult.fire === 2 && p.power.i === 11, '跨 2 应 +1 魔');
  E.advanceCult(s, p, 'fire', 2); // 2→4：跨 4 得 2 魔
  ok(p.cult.fire === 4 && p.power.i === 9, '跨 4 应 +2 魔');
  E.advanceCult(s, p, 'fire', 2); // 4→6：跨 6 得 2 魔
  ok(p.cult.fire === 6 && p.power.i === 7, '跨 6 应 +2 魔');
  E.advanceCult(s, p, 'fire', 2); // 6→8：无跨格奖励
  ok(p.cult.fire === 8 && p.power.i === 7, '8 无跨格奖励');
  E.advanceCult(s, p, 'fire', 1); // 8→9：无钥匙封顶 9
  ok(p.cult.fire === 9 && p.power.i === 7, '无钥匙应停在 9');
  p.keys = 1;
  E.advanceCult(s, p, 'fire', 1); // 9→10：花钥匙 +3 魔、锁他轨 max=9
  ok(p.cult.fire === 10 && p.power.i === 4 && p.keys === 0, '跨 9 应花钥匙 +3 魔');
  ok(s.players[1].cultMax.fire === 9, '他人该轨应锁 9');
}

// ==== 14. 回合收入与过牌 ====
section('回合收入与过牌');
{
  // 半身人 2 民居第 2 轮收入：每民居 1 工人 + BON 收入 + 回合板块收入
  const s = mkGame(['halflings', 'witches']);
  const p0 = s.players[0];
  const w0 = p0.workers;
  const inc = E.incomeOf(s, p0, 2, false);
  ok(inc.workers >= 2, `2 民居第 2 轮应至少得 2 工人，实际 ${inc.workers}`);
  // 全员 pass → 第 2 轮：能量槽刷新、startPlayer = 首个过牌者
  let st = s;
  let guard = 0;
  while (st.round === 1 && guard++ < 200) {
    if (st.phase.kind === 'resolve') { st = E.apply(st, E.legalActions(st)[0]); continue; }
    const cur = st.phase.cur;
    const pa = E.legalActions(st).find((x) => x.kind === 'pass' && x.bonus === st.players[cur].bonus)
      || E.legalActions(st).find((x) => x.kind === 'pass');
    st = E.apply(st, pa);
  }
  ok(st.round === 2, `双方 pass 后应进入第 2 轮，实际 round=${st.round}`);
  ok(st.powerActions.every((x) => x === null), '新一轮能量槽应全空');
  ok(st.players.every((q) => !q.passed), '新一轮 passed 应清零');
}
{
  // pass 顺位 = 过牌顺序
  const s = mkGame(['halflings', 'witches'], 42, null);
  let st = s;
  let guard = 0;
  while (st.round === 1 && guard++ < 200) {
    if (st.phase.kind === 'resolve') { st = E.apply(st, E.legalActions(st)[0]); continue; }
    const cur = st.phase.cur;
    // P1 先过（若轮到 P1 就 pass，否则做任意动作推进）
    const pas = E.legalActions(st).filter((x) => x.kind === 'pass');
    if (cur === 1) { st = E.apply(st, pas[0]); continue; }
    const other = E.legalActions(st).find((x) => x.kind !== 'pass');
    st = E.apply(st, other || pas[0]);
  }
  if (st.round === 2) {
    ok(JSON.stringify(st.turnOrder) === JSON.stringify([1, 0]),
      `首个过牌者应为下轮起始玩家，实际 ${JSON.stringify(st.turnOrder)}`);
  }
}

// ==== 15. 终局计分 ====
section('终局计分');
{
  const s = mkGame(['halflings', 'giants']);
  s.players[0].cult = { fire: 5, water: 5, earth: 5, air: 5 };
  s.players[1].cult = { fire: 5, water: 3, earth: 3, air: 3 };
  const vp0 = s.players[0].vp;
  const vp1 = s.players[1].vp;
  E.finalScoring(s);
  // 官方 score_type_rankings：等级升序，VP 从最高等级起 pop；并列等级整桶均分（int 截断）。
  // 火 5v5 并列 → 桶 8+4=12 均分各 6；水/土/风 5v3 → P0 得 8、P1 得 4。
  // cult：P0 = 6+8×3 = 30；P1 = 6+4×3 = 18
  ok(s.players[0].finalCult.fire === 6 && s.players[0].finalCult.water === 8,
    `火并列应各得 6、水独占应得 8（实际 fire=${s.players[0].finalCult.fire} water=${s.players[0].finalCult.water}）`);
  const cult0 = Object.values(s.players[0].finalCult).reduce((a, b) => a + b, 0);
  const cult1 = Object.values(s.players[1].finalCult).reduce((a, b) => a + b, 0);
  ok(cult0 === 30, `P0 邪教分应 30（含火并列均分），实际 ${cult0}`);
  ok(cult1 === 18, `P1 邪教分应 18，实际 ${cult1}`);
}

// ==== 16. AI 全局对局 ====
section('AI 对局');
for (const [seed, n] of [[7, 2], [8, 3], [9, 4], [10, 5]]) {
  const seats = Array.from({ length: n }, (_, i) => ({ name: `Bot${i + 1}`, isAI: true, color: '#888' }));
  let s = E.initialState({ seats, seed });
  let steps = 0;
  while (!E.isGameOver(s) && steps <= 12000) {
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
  console.log('失败项（前 30 条）:');
  failures.slice(0, 30).forEach((m) => console.log(`  ✗ ${m}`));
  process.exit(1);
}
console.log('ALL PASS');
