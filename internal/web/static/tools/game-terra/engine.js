// 神秘大地引擎：6 轮轮流行动、地形改造、三碗能量、邪教轨、建镇检测。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
//
// 规则来源：github.com/jsnell/terra-mystica（src/commands.pm / income.pm /
// scoring.pm / towns.pm / map.pm / resources.pm / acting.pm /
// Game/Constants.pm / Game/Factions.pm + 14 派系 .pm）逐文件核对，2026-10-31。
//
// 已对齐官方（与上一版的差异）：
// - 收入数组按「每座建筑自己的第几座」索引求和（income.pm faction_income）；
//   回合 r 收入用 r-1 轮计分板块（第 1 轮无计分收入），第 6 轮板块收入永不结算。
// - 起始祭司：标准派系 0、暗灵 1（Factions.pm P ||= 0）。
// - TP 升级：总付 {W2, C3}；无「他派系」邻接建筑时额外 +C（= 派系 TP 费的 C，
//   标准 3、蜂灵 4）；蜂灵 ACTS 免费升级（commands.pm command_upgrade）。
// - 升级链 D→TP、TP→TE/SH、TE→SA（wanted_oldtype 表）。
// - 名次分并列均摊 int(sum/count)、0 值不得分（scoring.pm score_type_rankings）。
// - 终局资源分只算手牌祭司（score_final_resources 用 $faction->{P}，不含 CULT_P）。
// - 转换只有官方比率：魔→币1/工3/祭5、工→币1、祭→币1/工1、币→VP3（炼金2）；
//   炼金额外 VP→币 1:1；暗灵 SH 后 W→P 1:1 共 3 次。无币→工、工→祭比率。
// - convert 与 burn 为免费子行动，不结束回合（acting.pm require_subaction）。
// - SH 特别行动每轮一次（ACTW/ACTG/ACTC/ACTN/ACTS/ACTA），ACTE 工程师可重复。
// - 苦行僧飞毯 / 矮人隧道：乌鸦距离（全图 BFS，含河格通道）≤ range，
//   每回合一次，费用 {P1|W2/W1} → +4VP；SH 后飞毯距离 1→2、隧道费 W2→W1。
// - 传送派系网络连通也按乌鸦距离计（map.pm find_building_cliques range{0}）。
// - 建镇逐格检测：先并入已有城镇（不重复给板块），FAV5 门槛 -1（towns.pm）。
// - 奖励板块：默认池 BON1-9（BON10 为选项扩展），随机移除至 玩家数+3 张，
//   开局按座位逆序轮流自选（acting.pm register_faction + Pass BON 逆序）。
// - 过牌：do_pass_vp 在换板块前结算；首个过牌者 = 下轮起始玩家；
//   第 6 轮不可拿板块；未领板块每轮 +1 币，领取时一并入账。
// - 祭司上轨可任选空槽（command_send 任意 free spot）。
// - 钥匙足够时自动释放被锁邪教轨（resources.pm adjust_resource KEY 分支）。
// - 游牧民第 3 座民居追加在蛇形放置末尾、混沌法师民居最后（register_faction）。
// - 巨人：非家园地形一律 2 铲、目标必为家园色（map.pm transform_cost/transform_colors）。
// - 暗灵：无铲升级，dig 行动 1 祭司 = 1 铲 + 2VP。
// - 桥：仅官方 29 对桥位、任一端有己方建筑、每派系 3 座；
//   ACT1（3 魔）与工程师 ACTE（2 工，占行动）造桥；工程师 SH 后过牌时
//   每座两端均为己方建筑的桥 +3VP（scoring.pm do_pass_vp hack）。
// - 矮人（第 14 基础派系）：隧道族，无船运，起始 C15/W3/5/7，20 VP。
//
// 简化（与官方规则书的偏差，均为可玩性保留项）：
// - 吸能自动接受（VP 代价 actual-1，可为 0）；拒绝仅在无碗空间时发生。
//   邪教徒被全拒 +1 魔采用 errata-cultist-power 选项语义（现版官方规则）。
// - 铲子入库存后任意后续建造使用（官方要求 dig/板块送铲后立即 transform）。

import {
  BUILDING_STRENGTH, BLD_CAP, POWER_ACTIONS, BONUS_TILES, FAVOR_TILES,
  ROUND_TILES, ROUNDS, CULT_TRACKS, CULT_TOP, PRIEST_CULT_SPOTS,
  CULT_CROSS_REWARD, CULT_RANK_VP, NETWORK_RANK_VP, TOWN_TILES, TOWN_THRESHOLD,
  TOWN_MIN_BUILDINGS, CONVERT_RATES, SPADE_COST, DIG_UPGRADE_COST, DIG_UPGRADE_VP,
  SHIPPING_COST, BRIDGE_COST, BRIDGE_MAX, PRIEST_CAP, START, FACTION_START_VP,
  BONUS_TOWN_KEEP, wheelDist,
} from './tables.js';
import { HEXES, ADJACENCY, BRIDGE_PAIRS } from './map-data.js';
import { FACTIONS as FACTIONS_ALL, factionById } from './data-factions.js';

// 阶段种类常量（避免魔术字符串散落）
const PH_FACTION = 'chooseFaction';
const PH_PLACE = 'placeDwelling';
const PH_BONUS = 'pickBonus';
const PH_ACT = 'act';
const PH_RESOLVE = 'resolve';
const PH_OVER = 'gameOver';

// —— 基础工具 ——

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffle 原地洗牌（Fisher-Yates，用 state 随机源）
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args: args || {} });
}

// factionOf / homeTerrain / hasSH / lockedPriests 派系与状态便捷查询
function factionOf(p) { return factionById(p.faction); }
function homeTerrain(p) { return factionOf(p).terrain; }
function hasSH(p) { return Object.values(p.buildings).includes('SH'); }
function lockedPriests(p) {
  return CULT_TRACKS.reduce((a, tr) => a + p.priestsOnCult[tr], 0);
}
function builtCount(p, key) {
  return Object.values(p.buildings).filter((b) => b === key).length;
}

// chainOf 官方升级链（commands.pm %wanted_oldtype：TP←D、TE←TP、SH←TP、SA←TE）
function chainOf(bldKey) {
  const CHAIN = { D: ['TP'], TP: ['TE', 'SH'], TE: ['SA'], SH: [], SA: [] };
  return CHAIN[bldKey] || [];
}

// —— 资源与能量 ——

// grant 发放资源（祭司受在场+锁定总上限约束；powerGain 走三碗流转；
// 邪教四字段走 advanceCult；keys 走钥匙释放）
function grant(s, p, gain) {
  if (gain.coins) p.coins += gain.coins;
  if (gain.workers) p.workers += gain.workers;
  if (gain.vp) p.vp += gain.vp;
  if (gain.spades) addSpades(s, p, gain.spades);
  if (gain.priests) {
    const room = PRIEST_CAP - lockedPriests(p) - p.priests;
    p.priests += Math.max(0, Math.min(gain.priests, room));
  }
  if (gain.powerGain) gainPower(p, gain.powerGain);
  if (gain.keys) addKeys(s, p, gain.keys);
  for (const tr of CULT_TRACKS) {
    if (gain[tr]) advanceCult(s, p, tr, gain[tr]);
  }
}

// addSpades 获得铲子：SCORE1 计分 + 半身人每铲 +1VP；炼金（SH 后）每铲 +2魔
// （resources.pm adjust_resource gain 路径逐单位触发）
function addSpades(s, p, n) {
  for (let k = 0; k < n; k++) {
    p.spades += 1;
    scoreTileGain(s, p, 'spade', 1);
    const sp = factionOf(p).special;
    if (sp === 'halflingSpadeVp') p.vp += 1;
    if (sp === 'alchemistSpadePw' && hasSH(p)) gainPower(p, 2);
  }
}

// gainPower 得能量：碗 I→II，I 空则 II→III，两碗皆空则溢出丢弃（官方流转）
function gainPower(p, n) {
  for (let k = 0; k < n; k++) {
    if (p.power.i > 0) { p.power.i--; p.power.ii++; }
    else if (p.power.ii > 0) { p.power.ii--; p.power.iii++; }
    else break;
  }
}

// payPower 支付能量：碗 III → 碗 I
function payPower(p, n) {
  p.power.iii -= n;
  p.power.i += n;
}

// afford 费用支付能力检查（priests 为可用祭司，支付即弃置）
function afford(p, cost) {
  return p.coins >= (cost.coins || 0) && p.workers >= (cost.workers || 0) &&
    p.priests >= (cost.priests || 0);
}

// pay 扣费（调用前须 afford 校验）
function pay(p, cost) {
  p.coins -= cost.coins || 0;
  p.workers -= cost.workers || 0;
  p.priests -= cost.priests || 0;
}

// addKeys 得钥匙：足够时自动释放被锁邪教轨（resources.pm KEY 分支——
// KEY ≥ 被锁轨数 → 每轨 +1 步（经 advanceCult 走 9→10 钥匙消耗）并清锁）
function addKeys(s, p, n) {
  p.keys += n;
  const blocked = CULT_TRACKS.filter((tr) => p.cultBlocked[tr]);
  if (blocked.length > 0 && p.keys >= blocked.length) {
    for (const tr of blocked) advanceCult(s, p, tr, 1);
    for (const tr of blocked) delete p.cultBlocked[tr];
  }
}

// —— 邪教轨 ——

// advanceCult 推进（resources.pm maybe_gain_power_from_cult）：
// 跨 2 → +1魔；跨 4 → +2魔；跨 6 → +2魔；跨 9（进 10）需 KEY +3魔并锁他人
// 该轨上限 9；无 KEY 则停在 9 并标记 blocked
function advanceCult(s, p, track, steps) {
  for (let k = 0; k < steps; k++) {
    const max = p.cultMax[track] || CULT_TOP;
    const old = p.cult[track];
    if (old >= max) break;
    if (old === 9) {
      if (p.keys < 1) { p.cultBlocked[track] = true; break; }
      p.keys -= 1;
      p.cult[track] = 10;
      gainPower(p, CULT_CROSS_REWARD[9]);
      for (const q of s.players) {
        if (q.seat !== p.seat) q.cultMax = { ...q.cultMax, [track]: 9 };
      }
      continue;
    }
    p.cult[track] = old + 1;
    // 官方 maybe_gain_power_from_cult：跨 2/4/6 给奖励；到达 9 格本身无奖励
    //（+3 魔只在花钥匙 9→10 的分支里发）
    const reward = p.cult[track] < 9 ? CULT_CROSS_REWARD[p.cult[track]] : 0;
    if (reward) gainPower(p, reward);
  }
}

// advanceCultAny 邪教徒 +1 邪教：优先未满且未被锁的最低轨迹
function advanceCultAny(s, p) {
  const best = CULT_TRACKS
    .filter((tr) => p.cult[tr] < (p.cultMax[tr] || CULT_TOP))
    .sort((a, b) => p.cult[a] - p.cult[b])[0];
  if (best) advanceCult(s, p, best, 1);
}

// —— 吸能（leech，官方）——

// leechFrom 他人从新建建筑吸能（map.pm compute_leech + commands.pm command_leech）：
// 邻接「他派系」建筑强度和为可吸量；实际 = min(可吸, VP+1, 可接收容量)——
// 官方 gain_power 碗容量 = P1 + P2（每接收 1 枚挪一步：I→II，I 空则 II→III）；
// 接受付 VP = 实际 − 1（可为 0，见 command_leech $vp = $actual_pw - 1）。
// 邪教徒特例：接受 → 建造者 +1 邪教；全拒 → +1魔。
// 同步简化：能吸则自动接受；无碗空间 = 无法接受。开局放置阶段（round 0）无吸能。
function leechFrom(s, hexId, bldKey, builderSeat) {
  if (s.round === 0) return;
  const builder = s.players[builderSeat];
  const bySeat = {};
  for (const nid of ADJACENCY[hexId]) {
    const h = s.hexes[nid];
    if (h.owner === null || h.owner === builderSeat || !h.bld) continue;
    bySeat[h.owner] = (bySeat[h.owner] || 0) + BUILDING_STRENGTH[h.bld];
  }
  let leechers = 0;
  let allDeclined = true;
  for (const [seatStr, strength] of Object.entries(bySeat)) {
    const q = s.players[Number(seatStr)];
    leechers += 1;
    // 官方容量 = P1 + P2（每枚能量各挪一步 I→II / II→III，非 2×P1+P2）
    const space = q.power.i + q.power.ii;
    if (space <= 0) continue;
    const actual = Math.min(strength, q.vp + 1, space);
    gainPower(q, actual);
    q.vp -= actual - 1;
    allDeclined = false;
    // 邪教徒：对手吸你建筑能量且接受 → 你 +1 邪教（leech_effect taken）
    if (factionOf(builder).special === 'cultistLeech') {
      advanceCultAny(s, builder);
    }
  }
  // 邪教徒：所有对手拒绝 → +1魔（errata-cultist-power，现版官方规则）
  if (factionOf(builder).special === 'cultistLeech' && allDeclined && leechers > 0) {
    gainPower(builder, 1);
  }
}

// —— 建造范围（map.pm check_reachable）——

// shipRangeOf 有效船运距离：面板级 + BON4（持有且未过牌，仅限有船派系）
function shipRangeOf(p) {
  const f = factionOf(p);
  if (!f.ship) return 0;
  let r = p.shipping;
  if (p.bonus === 'BON4' && !p.passed) r += 1;
  return r;
}

// tpRangeOf 传送距离：苦行僧飞毯 1（SH 后 2）；矮人隧道 1；其余无
function tpRangeOf(p) {
  const f = factionOf(p);
  if (f.special === 'fakirCarpet') return hasSH(p) ? 2 : 1;
  if (f.special === 'dwarfTunnel') return 1;
  return 0;
}

// teleportCostOf 传送费用/收益（按当前传送级；矮人 SH 后 W2→W1）
function teleportCostOf(p) {
  const f = factionOf(p);
  if (f.special === 'fakirCarpet') return { cost: { priests: 1 }, vp: 4 };
  if (f.special === 'dwarfTunnel') {
    return { cost: { workers: hasSH(p) ? 1 : 2 }, vp: 4 };
  }
  return null;
}

// adjPlusBridges 邻格 + 自有桥对岸（桥计入 adjacency，官方 command_bridge）
function adjPlusBridges(s, p, id) {
  const out = [...ADJACENCY[id]];
  for (const br of s.bridges) {
    if (br.owner !== p.seat) continue;
    if (br.a === id) out.push(br.b);
    if (br.b === id) out.push(br.a);
  }
  return out;
}

// reachInfo 可达集合（check_reachable 三通道）：
//   directShip：邻接 + 桥 + 船运（连续河格 ≤ 船距，河格只作通道）
//   tp：乌鸦距离 ≤ 传送距（全图 BFS，河格可穿行，苦行僧/矮人）
//   reach = 两者并集；仅在 directShip 之外建房才需付传送费（每回合一次）
function reachInfo(s, p) {
  const own = Object.keys(p.buildings);
  const ship = shipRangeOf(p);
  const tpRange = tpRangeOf(p);
  const directShip = new Set();
  const seen = new Set();
  const queue = [];
  for (const id of own) {
    for (const nid of adjPlusBridges(s, p, id)) {
      seen.add(`${nid}|0`);
      queue.push({ id: nid, chain: 0 });
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    const h = s.hexes[cur.id];
    if (h.terrain !== 'river') {
      directShip.add(cur.id);
      continue;
    }
    if (cur.chain < ship) {
      for (const nid of adjPlusBridges(s, p, cur.id)) {
        const key = `${nid}|${cur.chain + 1}`;
        if (!seen.has(key)) { seen.add(key); queue.push({ id: nid, chain: cur.chain + 1 }); }
      }
    }
  }
  const tp = new Set();
  if (tpRange > 0 && !p.teleportUsed) {
    // 乌鸦距离：全图 BFS（range{0} 含河格通道，jsnell 上限 4 步足够覆盖）
    const dist = {};
    const q2 = [];
    for (const id of own) { dist[id] = 0; q2.push(id); }
    while (q2.length) {
      const cur = q2.shift();
      if (dist[cur] >= 4) continue;
      for (const nid of ADJACENCY[cur]) {
        if (dist[nid] === undefined) { dist[nid] = dist[cur] + 1; q2.push(nid); }
      }
    }
    for (const id of Object.keys(dist)) {
      if (dist[id] > 0 && dist[id] <= tpRange && s.hexes[id].terrain !== 'river') tp.add(id);
    }
  }
  const reach = new Set(directShip);
  for (const id of tp) reach.add(id);
  return { directShip, tp, reach, ship, tpRange };
}

// buildRangeSet 兼容导出：可建（空置陆地）格集合
function buildRangeSet(s, p) {
  const { reach } = reachInfo(s, p);
  const out = new Set();
  for (const id of reach) {
    if (s.hexes[id].owner === null) out.add(id);
  }
  return out;
}

// —— 城镇连接与检测（towns.pm）——

// townEdges 城镇连接边：直接邻接 + 自有桥 +（美人鱼）共享河格连接
function townEdges(s, p) {
  const own = Object.keys(p.buildings);
  const edges = {};
  for (const id of own) edges[id] = new Set();
  for (const id of own) {
    for (const nid of ADJACENCY[id]) {
      if (p.buildings[nid]) edges[id].add(nid);
    }
    for (const br of s.bridges) {
      if (br.owner !== p.seat) continue;
      if (br.a === id && p.buildings[br.b]) edges[id].add(br.b);
      if (br.b === id && p.buildings[br.a]) edges[id].add(br.a);
    }
  }
  if (factionOf(p).special === 'shipTown') {
    for (const h of HEXES) {
      if (h.terrain !== 'river') continue;
      const adjOwn = ADJACENCY[h.id].filter((id) => p.buildings[id]);
      for (const a of adjOwn) {
        for (const b of adjOwn) {
          if (a !== b) edges[a].add(b);
        }
      }
    }
  }
  return edges;
}

// townComponent 从某格出发的己方建筑连通组
function townComponent(s, p, from, edges) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const nid of edges[cur]) {
      if (!seen.has(nid)) { seen.add(nid); queue.push(nid); }
    }
  }
  return [...seen];
}

// townThresholdFor 建镇城镇值门槛（FAV5 持有者 -1）
function townThresholdFor(p) {
  return TOWN_THRESHOLD - (p.favor.includes('FAV5') ? 1 : 0);
}

// townTileAvail 城镇板块池仍有余量
function townTileAvail(s) {
  return s.townPool.some((n) => n > 0);
}

// detectTownsFrom 逐格建镇检测（towns.pm detect_towns_from）：
// 已在城镇内 → 不触发；邻接已有城镇 → 并入（无新板块）；否则
// 连通组城镇值 ≥ 门槛 且 ≥4 座建筑（SA 双计）且板块池有余 → 新城 + 板块
function detectTownsFrom(s, seat, hex) {
  const p = s.players[seat];
  if (!p.buildings[hex]) return;
  if (p.towns.some((g) => g.includes(hex))) return;
  const edges = townEdges(s, p);
  const comp = townComponent(s, p, hex, edges);
  // 并入已有城镇：合并所有相交组
  const hit = p.towns.filter((g) => comp.some((id) => g.includes(id)));
  if (hit.length > 0) {
    const merged = [...new Set(hit.flat().concat(comp))];
    p.towns = p.towns.filter((g) => !hit.includes(g));
    p.towns.push(merged);
    return;
  }
  const value = comp.reduce((a, id) => a + BUILDING_STRENGTH[p.buildings[id]], 0);
  const count = comp.reduce((a, id) => a + (p.buildings[id] === 'SA' ? 2 : 1), 0);
  if (value >= townThresholdFor(p) && count >= TOWN_MIN_BUILDINGS && townTileAvail(s)) {
    p.towns.push(comp);
    pushPending(s, { seat, kind: 'townTile' });
    log(s, seat, 'tm.log.town', { n: p.name, hexes: comp.length });
  }
}

// checkTowns 全量建镇检测（FAV5 到手时的官方 hack：重扫所有格）
function checkTowns(s, seat) {
  const p = s.players[seat];
  for (const hex of Object.keys(p.buildings)) detectTownsFrom(s, seat, hex);
}

// —— 费用计算 ——

// spadesNeeded 挖到家园地形所需铲数（巨人：非家园一律 2 铲、只朝家园色）
function spadesNeeded(p, terrain) {
  if (terrain === homeTerrain(p)) return 0;
  if (factionOf(p).special === 'giantDigDouble') return 2;
  return wheelDist(terrain, homeTerrain(p));
}

// spadeWorkerCost 当前挖掘等级每铲工人费（暗灵不走此通道）
function spadeWorkerCost(p) {
  return SPADE_COST[p.digLevel || 0];
}

// buildCost 建民居总费用：铲（存货优先）+ 民居造价 +（需传送时）传送费
function buildCost(s, p, hex) {
  const f = factionOf(p);
  const bD = f.buildings.D;
  const spades = spadesNeeded(p, s.hexes[hex].terrain);
  const fromStore = Math.min(p.spades, spades);
  const rem = spades - fromStore;
  const cost = { coins: bD.cost.coins, workers: bD.cost.workers, spades };
  if (rem > 0) cost.workers += rem * spadeWorkerCost(p);
  const tp = teleportCostOf(p);
  const { directShip } = reachInfo(s, p);
  if (tp && !directShip.has(hex)) {
    cost.coins += tp.cost.coins || 0;
    cost.workers += tp.cost.workers || 0;
    cost.priests += tp.cost.priests || 0;
    cost.teleport = true;
  }
  return cost;
}

// canAffordBuild 建民居支付能力
function canAffordBuild(s, p, hex) {
  const c = buildCost(s, p, hex);
  return p.coins >= c.coins && p.workers >= c.workers && p.priests >= (c.priests || 0);
}

// enemyAdjacentAt 是否有「他派系」建筑直接邻接（TP 本地/远程判定 + 吸能同源）
function enemyAdjacentAt(s, p, hexId) {
  return ADJACENCY[hexId].some((nid) => {
    const h = s.hexes[nid];
    return h.owner !== null && h.owner !== p.seat && h.bld;
  });
}

// upgradeCostOf 升级费用：TP 无他派系邻接时额外 +C（= 派系 TP 费的 C）
function upgradeCostOf(s, p, to, hex) {
  const f = factionOf(p);
  const cost = { ...f.buildings[to].cost };
  if (to === 'TP' && !enemyAdjacentAt(s, p, hex)) {
    cost.coins += f.buildings.TP.cost.coins;
  }
  return cost;
}

// freeFavorTiles 恩惠板块可选列表：池余量 > 0 且本人未持同名（FAV1-4 各 1 张、FAV5-12 各 3 张）
function freeFavorTiles(s, p) {
  return FAVOR_TILES.filter((t) => (s.favorPool[t.id] || 0) > 0 && !p.favor.includes(t.id));
}

// takeFavor 拿恩惠板块：扣池、即时邪教推进、FAV5 门槛下调并重扫建镇
function takeFavor(s, p, id) {
  const tile = FAVOR_TILES.find((t) => t.id === id);
  if (!tile || (s.favorPool[id] || 0) <= 0 || p.favor.includes(id)) return false;
  s.favorPool[id] -= 1;
  p.favor.push(id);
  for (const [tr, n] of Object.entries(tile.advance || {})) advanceCult(s, p, tr, n);
  if (id === 'FAV5') checkTowns(s, p.seat);
  log(s, p.seat, 'tm.log.favorTake', { n: p.name, tile: id });
  return true;
}

// —— 回合计分板块（scoring.pm maybe_score_current_score_tile）——

// currentScoreTile 本轮计分板块（round 0 无）
function currentScoreTile(s) {
  return s.round >= 1 ? s.roundTiles[s.round - 1] : null;
}

// scoreTileBuild 建造/升级得 VP（vp_mode=build）
function scoreTileBuild(s, p, bldKey) {
  const tile = currentScoreTile(s);
  if (!tile || tile.vpMode !== 'build') return;
  const gain = tile.vp[bldKey];
  if (gain) p.vp += gain;
}

// scoreTileGain 获得资源得 VP（vp_mode=gain：SCORE1 铲 / SCORE2 城镇）
function scoreTileGain(s, p, type, n) {
  const tile = currentScoreTile(s);
  if (!tile || tile.vpMode !== 'gain') return;
  const gain = tile.vp[type];
  if (gain) p.vp += gain * n;
}

// favorTileVp 恩惠板块建造 VP（FAV10 每 TP 3VP / FAV11 每民居 2VP）
function favorTileVp(s, p, bldKey) {
  for (const fid of p.favor) {
    const tile = FAVOR_TILES.find((f) => f.id === fid);
    if (tile && tile.vp && tile.vp[bldKey]) p.vp += tile.vp[bldKey];
  }
}

// —— 收入（income.pm faction_income）——

// scoringTileFor 收入用计分板块：回合 r 的收入结算于回合 r-1 结束时，
// 用 round r-1 的板块 = roundTiles[r-2]；第 1 轮收入无计分板块收入
function scoringTileFor(s, forRound) {
  return forRound >= 2 && forRound <= ROUNDS ? s.roundTiles[forRound - 2] : null;
}

// incomeOf 某玩家回合收入（jsnell 顺序：计分板块 × int(cult/req) →
// 奖励板块（过牌后）→ 建筑收入（按每座建筑自身序号求和）→ 恩惠收入）。
// forRound = 即将开始的回合号；assumePassed = 规划提示用（默认过牌状态）
function incomeOf(s, p, forRound, assumePassed) {
  const g = { coins: 0, workers: 0, priests: 0, powerGain: 0, spades: 0 };
  const tile = scoringTileFor(s, forRound);
  if (tile) {
    const mul = Math.floor(p.cult[tile.cult] / tile.req);
    addIncome(g, tile.income, mul);
  }
  if (p.bonus !== null && (p.passed || assumePassed)) {
    addIncome(g, BONUS_TILES.find((b) => b.id === p.bonus).income, 1);
  }
  // 建筑收入：每座建筑各取 income[自身第几座−1]（Perl 数组 0 基，
  // income.pm for level 1..n → income[level-1]；两座民居 = inc[0]+inc[1]）
  for (const type of ['D', 'TP', 'TE', 'SH', 'SA']) {
    const def = factionOf(p).buildings[type];
    const n = builtCount(p, type);
    for (let i = 0; i < n; i++) {
      if (def.incW) g.workers += def.incW[i] || 0;
      if (def.incC) g.coins += def.incC[i] || 0;
      if (def.incP) g.priests += def.incP[i] || 0;
      if (def.incPW) g.powerGain += def.incPW[i] || 0;
    }
  }
  for (const fid of p.favor) {
    addIncome(g, FAVOR_TILES.find((f) => f.id === fid).income, 1);
  }
  return g;
}

// addIncome 收入累加（mul 倍数：计分板块收入 × int(cult/req)；inc 可缺省）
function addIncome(g, inc, mul) {
  if (!inc || !mul) return; // mul=0（cult 未达 req）不发收入
  g.coins += (inc.coins || 0) * mul;
  g.workers += (inc.workers || 0) * mul;
  g.priests += (inc.priests || 0) * mul;
  g.powerGain += (inc.powerGain || 0) * mul;
  g.spades += (inc.spades || 0) * mul;
}

// —— 回合流转 ——

// startRound 开轮（commands.pm command_start）：全员收入（用上轮板块）、
// 重置轮内状态、能量行动槽刷新、按起始玩家定顺位、未领奖励板块每轮 +1 币。
// 第 1 轮收入（income.pm faction_income 于 setup 时即发）：奖励板块收入照发
// —— 此刻 passed 全为 false，须 assumePassed=true 才含板块收入（官方第 1 轮照发）
function startRound(s, r) {
  s.round = r;
  s.passOrder = [];
  for (const p of s.players) {
    grant(s, p, incomeOf(s, p, r, r === 1));
    p.passed = false;
    p.teleportUsed = false;
    p.bonusActions = 0;
    p.shUsed = {};
    p.tileUsed = {};
    p.spades = 0; // 官方：轮末未用铲子不保留（收入 SPADE 亦当轮使用）
  }
  s.powerActions = POWER_ACTIONS.map(() => null);
  // 顺位：起始玩家（首个过牌者）优先，其余保持座次（factions_in_turn_order）
  const start = s.startPlayerNext !== null ? s.startPlayerNext : s.players[0].seat;
  const seats = s.players.map((p) => p.seat);
  s.turnOrder = seats.slice(seats.indexOf(start)).concat(seats.slice(0, seats.indexOf(start)));
  s.startPlayerNext = null;
  for (const id of Object.keys(s.bonusAvail)) {
    if (s.bonusAvail[id]) s.bonusCoins[id] += 1;
  }
  s.phase = { kind: PH_ACT, cur: s.turnOrder[0] };
  log(s, -1, 'tm.log.round', { r });
}

// advanceTurn 轮到下一个未 pass 的玩家；全部 pass 则进入回合末
function advanceTurn(s) {
  const order = s.turnOrder;
  const curIdx = order.indexOf(s.phase.cur);
  for (let i = 1; i <= order.length; i++) {
    const seat = order[(curIdx + i) % order.length];
    if (!s.players[seat].passed) {
      s.players[seat].teleportUsed = false; // 新回合重置传送（start_full_move）
      s.phase = { kind: PH_ACT, cur: seat };
      return;
    }
  }
  endRound(s);
}

// pushPending 压入待决微阶段并切换到 resolve
function pushPending(s, item) {
  s.pending.push(item);
  s.phase = { kind: PH_RESOLVE, cur: item.seat };
}

// afterAction 行动后：混沌法师 ACTC 额外行动优先 → pending → 推进回合。
// bonusActions 表示「本次行动结束后仍可再行动的次数」：ACTC 结算后剩 1，
// 官方语义 = SH 特别行动占 1 次行动、GAIN_ACTION 2 给回 2 次，净 +1。
function afterAction(s, p) {
  if (p.bonusActions > 0) {
    p.bonusActions -= 1;
    if (s.pending.length > 0) s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
    return;
  }
  if (s.pending.length > 0) {
    s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
  } else {
    advanceTurn(s);
  }
}

// endRound / finishRound 回合收尾：第 6 轮终局计分，否则开下一轮
function endRound(s) {
  s.pending = [];
  if (s.round >= ROUNDS) {
    finalScoring(s);
    s.gameOver = true;
    s.phase = { kind: PH_OVER };
    log(s, -1, 'tm.log.gameEnd', {});
  } else {
    startRound(s, s.round + 1);
  }
}

// —— 网络（map.pm find_building_cliques + compute_network_size）——

// crowFliesDist 全图 BFS 距离（含河格，上限 4——jsnell range{0}）
function crowFliesDist(s, from) {
  const dist = { [from]: 0 };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (dist[cur] >= 4) continue;
    for (const nid of ADJACENCY[cur]) {
      if (dist[nid] === undefined) { dist[nid] = dist[cur] + 1; queue.push(nid); }
    }
  }
  return dist;
}

// riverChainDist 从建筑出发连续河格通道的最短长度（BFS，河格可续）
function riverChainDist(s, from) {
  const dist = {};
  const queue = [];
  for (const nid of ADJACENCY[from]) {
    if (s.hexes[nid].terrain === 'river') { dist[nid] = 1; queue.push(nid); }
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const nid of ADJACENCY[cur]) {
      if (s.hexes[nid].terrain === 'river' && dist[nid] === undefined) {
        dist[nid] = dist[cur] + 1;
        queue.push(nid);
      }
    }
  }
  return dist;
}

// largestNetwork 最大网络：直接邻接（含桥）+ 美人鱼河格连接 +
// 船运通道（连续河格 ≤ 船距）或传送乌鸦距离 ≤ 传送距（find_building_cliques）
function largestNetwork(s, p) {
  const own = Object.keys(p.buildings);
  if (own.length === 0) return 0;
  const edges = townEdges(s, p);
  const parent = own.map((_, i) => i);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (i, j) => {
    const a = find(i), b = find(j);
    if (a !== b) parent[a] = b;
  };
  for (let i = 0; i < own.length; i++) {
    for (let j = i + 1; j < own.length; j++) {
      if (edges[own[i]].has(own[j])) union(i, j);
    }
  }
  const ship = shipRangeOf(p);
  const tpRange = tpRangeOf(p);
  if (ship > 0 || tpRange > 0) {
    const limit = tpRange > 0 ? tpRange : ship;
    const dists = own.map((id) => (
      tpRange > 0 ? crowFliesDist(s, id) : riverChainDist(s, id)
    ));
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        const d = dists[i][own[j]];
        if (d !== undefined && d <= limit) union(i, j);
      }
    }
  }
  const size = {};
  for (let i = 0; i < own.length; i++) {
    const r = find(i);
    size[r] = (size[r] || 0) + 1;
  }
  return Math.max(...Object.values(size));
}

// —— 终局计分（scoring.pm score_final + score_type_rankings）——

// rankScoring 官方名次分：等级升序，分数从高档逐级 pop 分配到等级桶；
// 同级并列均摊 int(sum/count)；0 级不得分（next if !$level）
function rankScoring(s, valFn, vps, field, tr) {
  const levels = s.players.map((p) => valFn(p)).sort((a, b) => a - b);
  const bucket = {};
  const count = {};
  for (const lv of levels) count[lv] = (count[lv] || 0) + 1;
  const remaining = vps.slice();
  while (remaining.length > 0 && levels.length > 0) {
    const lv = levels.pop();
    bucket[lv] = (bucket[lv] || 0) + remaining.shift();
  }
  for (const p of s.players) {
    const lv = valFn(p);
    if (!lv || bucket[lv] === undefined) continue;
    const vp = Math.floor(bucket[lv] / count[lv]);
    if (vp > 0) {
      p.vp += vp;
      if (field) p[field] = (p[field] || 0) + vp;
      if (tr) p.finalCult[tr] = (p.finalCult[tr] || 0) + vp;
    }
  }
}

// coinsToVpRate 币→VP 比率（炼金 2:1，其余 3:1）
function coinsToVpRate(p) {
  return factionOf(p).special === 'alchemistVpRate'
    ? CONVERT_RATES.alchemistCoinsToVp : CONVERT_RATES.coinsToVp;
}

// finalScoring 终局：最大网络名次分 18/12/6 + 四邪教轨名次分 8/4/2
// + 资源分（碗 II 对燃烧、碗 III/手牌祭司/工人转金币、币→VP）
function finalScoring(s) {
  for (const p of s.players) {
    p.finalCult = {};
    p.finalNetwork = 0;
    p.finalResVp = 0;
  }
  rankScoring(s, (p) => largestNetwork(s, p), NETWORK_RANK_VP, 'finalNetwork', null);
  for (const tr of CULT_TRACKS) {
    rankScoring(s, (p) => p.cult[tr], CULT_RANK_VP, null, tr);
  }
  for (const p of s.players) {
    // 只算手牌祭司（score_final_resources 用 $faction->{P}，不含锁定轨上祭司）
    const burned = Math.floor(p.power.ii / 2);
    const coins = p.coins + p.power.iii + burned + p.priests + p.workers;
    p.finalResVp = Math.floor(coins / coinsToVpRate(p));
    p.vp += p.finalResVp;
  }
}

// —— 过牌 VP（scoring.pm do_pass_vp）——

// passVpOf 按持有板块阶梯结算过牌 VP（建筑 level = 已建数量；
// 工程师 SH 后每座两端均己方建筑的桥 +3VP）
function passVpOf(s, p) {
  let vp = 0;
  const tiles = [];
  if (p.bonus !== null) tiles.push(BONUS_TILES.find((b) => b.id === p.bonus));
  for (const fid of p.favor) tiles.push(FAVOR_TILES.find((f) => f.id === fid));
  for (const tile of tiles) {
    if (!tile || !tile.passVP) continue;
    for (const [type, ladder] of Object.entries(tile.passVP)) {
      if (type === 'ship') {
        vp += ladder[Math.min(p.shipping, ladder.length - 1)] || 0;
      } else {
        const n = builtCount(p, type);
        vp += ladder[Math.min(n, ladder.length - 1)] || 0;
      }
    }
  }
  if (factionOf(p).special === 'engineerBridge' && hasSH(p)) {
    for (const br of s.bridges) {
      if (br.owner === p.seat && p.buildings[br.a] && p.buildings[br.b]) vp += 3;
    }
  }
  return vp;
}

// projectedVp 规划提示（scoring.pm faction_vps 投影）：
// 当前 VP + 过牌 VP（未过牌时）+ 终局名次分投影（按当前排名并列均摊）
// + 资源折算分
export function projectedVp(s, seat) {
  const p = s.players[seat];
  let total = p.vp;
  const detail = { pass: 0, cult: 0, network: 0, resources: 0 };
  if (!p.passed) detail.pass = passVpOf(s, p);
  const projectRank = (valFn, vps) => {
    const levels = s.players.map((q) => valFn(q)).sort((a, b) => a - b);
    const bucket = {};
    const count = {};
    for (const lv of levels) count[lv] = (count[lv] || 0) + 1;
    const remaining = vps.slice();
    while (remaining.length > 0 && levels.length > 0) {
      const lv = levels.pop();
      bucket[lv] = (bucket[lv] || 0) + remaining.shift();
    }
    const lv = valFn(p);
    if (!lv || bucket[lv] === undefined) return 0;
    return Math.floor(bucket[lv] / count[lv]);
  };
  for (const tr of CULT_TRACKS) detail.cult += projectRank((q) => q.cult[tr], CULT_RANK_VP);
  detail.network = projectRank((q) => largestNetwork(s, q), NETWORK_RANK_VP);
  const coins = p.coins + p.power.iii + Math.floor(p.power.ii / 2) + p.priests + p.workers;
  detail.resources = Math.floor(coins / coinsToVpRate(p));
  total += detail.pass + detail.cult + detail.network + detail.resources;
  return { total, detail };
}

// —— 开局 ——

// newPlayer 从座位信息建玩家初态（标准起始：祭司 0、VP 由派系表覆写）
function newPlayer(seat, info) {
  return {
    seat, name: info.name, isAI: !!info.isAI, color: info.color,
    faction: null, coins: START.coins, workers: START.workers, priests: 0,
    vp: 20, power: { i: 0, ii: 0, iii: 0 }, spades: 0, shipping: 0, digLevel: 0,
    buildings: {}, cult: { fire: 0, water: 0, earth: 0, air: 0 },
    cultMax: { fire: CULT_TOP, water: CULT_TOP, earth: CULT_TOP, air: CULT_TOP },
    cultBlocked: {}, keys: 0,
    priestsOnCult: { fire: 0, water: 0, earth: 0, air: 0 },
    favor: [], bonus: null, passed: false, towns: [],
    teleportUsed: false, bonusActions: 0, shUsed: {}, tileUsed: {}, wToPriest: 0,
  };
}

// initialState 开局：座位 → 选派系 → 蛇形放民居 → 逆序选奖励板块 → 第 1 轮
export function initialState(setup) {
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: setup.seats.length,
    round: 0,
    gameOver: false,
    phase: { kind: PH_FACTION, cur: 0 },
    players: setup.seats.map((info, i) => newPlayer(i, info)),
    hexes: {},
    bridges: [],
    takenFactions: [],
    bonusAvail: {},
    bonusCoins: {},
    favorPool: {},
    townPool: TOWN_TILES.map((t) => t.count || 2),
    powerActions: POWER_ACTIONS.map(() => null),
    roundTiles: [],
    turnOrder: [], startPlayerNext: null, passOrder: [],
    pending: [], placeQueue: [],
    log: [],
  };
  for (const h of HEXES) s.hexes[h.id] = { terrain: h.terrain, owner: null, bld: null };
  // 回合计分板块：8 选 6 洗牌（SCORE9 为选项扩展不入池）
  s.roundTiles = shuffle(s, ROUND_TILES.map((t) => t)).slice(0, ROUNDS);
  // 奖励板块池：BON1-9（BON10 为 shipping-bonus 选项，默认不入池），
  // 随机移除至 玩家数+3 张（官方规则）
  const poolIds = BONUS_TILES.filter((b) => b.id !== 'BON10').map((b) => b.id);
  shuffle(s, poolIds);
  const keep = BONUS_TOWN_KEEP(s.n);
  while (poolIds.length > keep) {
    const removed = poolIds.pop();
    s.bonusAvail[removed] = false;
  }
  for (const id of poolIds) {
    s.bonusAvail[id] = true;
    s.bonusCoins[id] = 0;
  }
  // 恩惠池：FAV1-4 各 1 张、FAV5-12 各 3 张（Constants.pm count||3）
  for (const t of FAVOR_TILES) s.favorPool[t.id] = t.count || 3;
  log(s, -1, 'tm.log.start', { n: s.n });
  return s;
}

// buildPlaceQueue 放置队列（acting.pm register_faction）：
// 非混沌按座次正序 → 逆序；游牧民追加第 3 座；混沌民居最后
function buildPlaceQueue(s) {
  const order = s.players.map((p) => p.seat);
  const q = [];
  for (const seat of order) {
    if (s.players[seat].faction !== 'chaosmagicians') q.push({ seat, kind: 'dwelling' });
  }
  for (const seat of order.slice().reverse()) {
    if (s.players[seat].faction !== 'chaosmagicians') q.push({ seat, kind: 'dwelling' });
  }
  const nomad = s.players.find((p) => p.faction === 'nomads');
  if (nomad) q.push({ seat: nomad.seat, kind: 'dwelling' });
  const cm = s.players.find((p) => p.faction === 'chaosmagicians');
  if (cm) q.push({ seat: cm.seat, kind: 'dwelling' });
  // 奖励板块：座次逆序轮流选（官方 +BON 逆序）
  for (const seat of order.slice().reverse()) q.push({ seat, kind: 'bonus' });
  return q;
}

// —— legalActions ——

export function legalActions(state) {
  const s = state;
  switch (s.phase.kind) {
    case PH_FACTION: return legalFaction(s);
    case PH_PLACE: return legalPlace(s);
    case PH_BONUS: return legalBonus(s);
    case PH_ACT: return legalAct(s);
    case PH_RESOLVE: return legalResolve(s);
    default: return [];
  }
}

// legalFaction 未被选走的派系
function legalFaction(s) {
  return FACTIONS_ALL.filter((f) => !s.takenFactions.includes(f.id))
    .map((f) => ({ kind: 'faction', faction: f.id }));
}

// legalPlace 本家园地形的空格
function legalPlace(s) {
  const p = s.players[s.placeQueue[0].seat];
  return HEXES
    .filter((h) => h.terrain === homeTerrain(p) && s.hexes[h.id].owner === null)
    .map((h) => ({ kind: 'placeDwelling', hex: h.id }));
}

// legalBonus 奖励板块自选（池内可用板块）
function legalBonus(s) {
  const p = s.players[s.placeQueue[0].seat];
  return BONUS_TILES
    .filter((b) => s.bonusAvail[b.id] && b.id !== 'BON10')
    .map((b) => ({ kind: 'pickBonus', bonus: b.id, seat: p.seat }));
}

// legalAct 主行动枚举（官方行动清单 + 免费子行动 convert/burn）
function legalAct(s) {
  const p = s.players[s.phase.cur];
  const acts = [];
  // 建民居（铲存货优先；传送费计入支付能力）
  for (const hex of buildRangeSet(s, p)) {
    if (builtCount(p, 'D') < BLD_CAP.D && canAffordBuild(s, p, hex)) acts.push({ kind: 'build', hex });
  }
  pushUpgradeActions(s, p, acts);
  pushCultSpots(s, p, acts);
  POWER_ACTIONS.forEach((pa, i) => {
    if (s.powerActions[i] === null && p.power.iii >= pa.power) {
      pushPowerActionDetail(s, p, pa, i, acts);
    }
  });
  pushShActions(s, p, acts);
  pushTileActions(s, p, acts);
  pushDarklingDig(s, p, acts);
  // 免费子行动：转换 + 燃烧（acting.pm：任意自己回合可做，不占行动）
  pushConvertActions(s, p, acts);
  for (let k = 1; k * 2 <= p.power.ii; k++) acts.push({ kind: 'burn', pairs: k });
  // 船运 +1（无船运派系不可用）
  const f = factionOf(p);
  if (f.ship && p.shipping < f.ship.max && afford(p, SHIPPING_COST)) acts.push({ kind: 'shipping' });
  // 铲子升级（暗灵无）
  pushDigUpgrade(s, p, acts);
  // 造桥（标准费 C2+P1；工程师 ACTE 走特别行动）
  if (factionOf(p).special !== 'engineerBridge') pushBridgeActions(s, p, acts, bridgeCostFor(p));
  // 过牌（第 6 轮不可拿板块）
  if (s.round === ROUNDS) {
    acts.push({ kind: 'pass', bonus: null });
  } else {
    for (const b of passableBonus(s, p)) acts.push({ kind: 'pass', bonus: b });
  }
  return acts;
}

// pushPowerActionDetail 能量行动枚举（ACT1 须同时选桥位；其余即时增益）
function pushPowerActionDetail(s, p, pa, slot, acts) {
  if (pa.id === 'ACT1') {
    // 3 魔 → 1 桥（须当场放置：合法桥位 × 桥上限）
    if (s.bridges.filter((br) => br.owner === p.seat).length < BRIDGE_MAX) {
      for (const [a, b] of freeBridgePairs(s, p)) {
        acts.push({ kind: 'powerAction', slot, a, b });
      }
    }
  } else {
    acts.push({ kind: 'powerAction', slot });
  }
}

// pushCultSpots 发祭司上轨：每轨 4 槽任选空位（command_send 任意 free spot）
function pushCultSpots(s, p, acts) {
  if (p.priests < 1) return;
  for (const tr of CULT_TRACKS) {
    const max = p.cultMax[tr] || CULT_TOP;
    if (p.cult[tr] >= max) continue;
    for (let i = 0; i < PRIEST_CULT_SPOTS.length; i++) {
      if (s.cultSpots[tr][i] === null) {
        acts.push({ kind: 'priestSend', track: tr, spot: i });
      }
    }
  }
}

// pushConvertActions 官方转换比率（Factions.pm base_exchange_rates）：
// 魔→币 1:1、魔→工 3:1、魔→祭 5:1、工→币 1:1、祭→币 1:1、祭→工 1:1、
// 币→VP 3:1（炼金 2:1）；炼金 VP→币 1:1；暗灵 SH 后 工→祭 1:1（3 次）
function pushConvertActions(s, p, acts) {
  if (p.power.iii >= 1) acts.push({ kind: 'convert', from: 'power', to: 'coins', n: 1 });
  if (p.power.iii >= 3) acts.push({ kind: 'convert', from: 'power', to: 'workers', n: 1 });
  if (p.power.iii >= 5) acts.push({ kind: 'convert', from: 'power', to: 'priests', n: 1 });
  if (p.workers >= 1) acts.push({ kind: 'convert', from: 'workers', to: 'coins', n: 1 });
  if (p.priests >= 1) acts.push({ kind: 'convert', from: 'priests', to: 'coins', n: 1 });
  if (p.priests >= 1) acts.push({ kind: 'convert', from: 'priests', to: 'workers', n: 1 });
  const rate = coinsToVpRate(p);
  if (p.coins >= rate) acts.push({ kind: 'convert', from: 'coins', to: 'vp', n: 1 });
  if (factionOf(p).special === 'alchemistVpRate' && p.vp >= 1) {
    acts.push({ kind: 'convert', from: 'vp', to: 'coins', n: 1 });
  }
  if (p.wToPriest > 0 && p.workers >= 1) {
    acts.push({ kind: 'convert', from: 'workers', to: 'priestsW', n: 1 });
  }
}

// pushDigUpgrade 铲子升级（dig advance_cost {W2,C5,P1} → +6VP；半身人 C1）
function pushDigUpgrade(s, p, acts) {
  const f = factionOf(p);
  if (f.noDigUpgrade) return; // 暗灵无铲升级（jsnell dig max_level 0）
  const maxUp = f.digLevels !== undefined ? f.digLevels : 2;
  if ((p.digLevel || 0) >= maxUp) return;
  const cost = f.digUpgradeCost || DIG_UPGRADE_COST;
  if (!afford(p, cost)) return;
  acts.push({ kind: 'digUpgrade' });
}

// pushUpgradeActions 升级枚举（官方上限 D8/TP4/TE3/SH1/SA1；
// TE/SA 选恩惠板块——混沌法师各选 2 张）
function pushUpgradeActions(s, p, acts) {
  const f = factionOf(p);
  const favors = freeFavorTiles(s, p);
  for (const [hex, cur] of Object.entries(p.buildings)) {
    for (const to of chainOf(cur)) {
      if (builtCount(p, to) >= BLD_CAP[to]) continue;
      if (!afford(p, upgradeCostOf(s, p, to, hex))) continue;
      if (to === 'TE' || to === 'SA') {
        const need = to === 'TE' ? (f.buildings.TE.teFavor || 1) : (f.buildings.SA.saFavor || 1);
        for (const combo of favorCombos(favors, need)) {
          acts.push({ kind: 'upgrade', hex, to, favor: combo });
        }
      } else {
        acts.push({ kind: 'upgrade', hex, to });
      }
    }
  }
}

// favorCombos 从候选恩惠板块中取 need 张的组合（去重、顺序确定）
function favorCombos(favors, need) {
  const out = [];
  if (need <= 1) {
    for (const f of favors) out.push([f.id]);
    return out;
  }
  for (let i = 0; i < favors.length; i++) {
    for (let j = i + 1; j < favors.length; j++) {
      out.push([favors[i].id, favors[j].id]);
    }
  }
  return out;
}

// freeBridgePairs 合法桥位：官方 29 对、任一端有己方建筑、该对未建桥
function freeBridgePairs(s, p) {
  const out = [];
  for (const [a, b] of BRIDGE_PAIRS) {
    if (s.bridges.some((br) => (br.a === a && br.b === b) || (br.a === b && br.b === a))) continue;
    if (p.buildings[a] || p.buildings[b]) out.push([a, b]);
  }
  return out;
}

// pushBridgeActions 造桥枚举（标准费；上限 3 座）
function pushBridgeActions(s, p, acts, cost) {
  if (!afford(p, cost)) return;
  if (s.bridges.filter((br) => br.owner === p.seat).length >= BRIDGE_MAX) return;
  for (const [a, b] of freeBridgePairs(s, p)) acts.push({ kind: 'bridge', a, b });
}

// bridgeCostFor 桥费（工程师 2 工走 ACTE，不走此通道）
function bridgeCostFor(p) {
  return BRIDGE_COST;
}

// pushShActions SH 特别行动（ACT 系，每轮一次；ACTE 工程师可重复）：
// ACTW 女巫免费森林民居（须在建造范围、无改造）
// ACTG 巨人 +2 铲；ACTC 混沌 +2 行动；ACTN 游牧免费改造+建民居（须直接邻接）
// ACTS 蜂灵免费 TP 升级；ACTA 奥灵同轨 +2 邪教；ACTE 工程师 2 工造桥
function pushShActions(s, p, acts) {
  const f = factionOf(p);
  if (!hasSH(p)) return;
  // shAction 定义在派系 buildings.SH 上（data-factions.js），非派系顶层
  const id = f.buildings.SH.shAction;
  if (!id) return;
  const once = id !== 'ACTE' ? !(p.shUsed[id]) : true;
  if (!once) return;
  if (id === 'ACTW') {
    for (const hex of buildRangeSet(s, p)) {
      if (s.hexes[hex].terrain === 'forest') acts.push({ kind: 'shAction', id, hex });
    }
  } else if (id === 'ACTN') {
    // 免费改造+建民居：直接邻接己方建筑（TF_NEED_HEX_ADJACENCY）
    for (const hex of directAdjacentSpots(s, p)) {
      acts.push({ kind: 'shAction', id, hex });
    }
  } else if (id === 'ACTS') {
    for (const [hex, cur] of Object.entries(p.buildings)) {
      if (cur === 'D' && builtCount(p, 'TP') < BLD_CAP.TP) {
        acts.push({ kind: 'shAction', id, hex });
      }
    }
  } else if (id === 'ACTA') {
    for (const tr of CULT_TRACKS) {
      if (p.cult[tr] < (p.cultMax[tr] || CULT_TOP)) acts.push({ kind: 'shAction', id, track: tr });
    }
  } else if (id === 'ACTE') {
    if (p.workers >= 2 && s.bridges.filter((br) => br.owner === p.seat).length < BRIDGE_MAX) {
      for (const [a, b] of freeBridgePairs(s, p)) acts.push({ kind: 'shAction', id, a, b });
    }
  } else if (id === 'ACTG' || id === 'ACTC') {
    acts.push({ kind: 'shAction', id });
  }
}

// directAdjacentSpots 直接邻接己方建筑的空置陆地格
function directAdjacentSpots(s, p) {
  const out = new Set();
  for (const id of Object.keys(p.buildings)) {
    for (const nid of ADJACENCY[id]) {
      if (s.hexes[nid].owner === null && s.hexes[nid].terrain !== 'river') out.add(nid);
    }
  }
  return out;
}

// pushTileActions 板块免费行动（每轮每板块一次，须持有且未用）：
// BON1 +1 铲；BON2 +1 邪教步；FAV6 +1 邪教步（Constants.pm %actions）
function pushTileActions(s, p, acts) {
  for (const id of [p.bonus, ...p.favor]) {
    if (id === null || p.tileUsed[id]) continue;
    if (id === 'BON1') acts.push({ kind: 'tileAction', id });
    if (id === 'BON2' || id === 'FAV6') acts.push({ kind: 'tileAction', id });
  }
}

// pushDarklingDig 暗灵 dig 行动：1 祭司 = 1 铲 + 2VP（占一个主行动）
function pushDarklingDig(s, p, acts) {
  if (factionOf(p).special !== 'darklingDig') return;
  if (p.priests >= 1) acts.push({ kind: 'darklingDig', n: 1 });
}

// passableBonus pass 可选奖励板块：可用池 + 自己当前持有的（保持=不换）
function passableBonus(s, p) {
  const out = BONUS_TILES.filter((b) => s.bonusAvail[b.id]).map((b) => b.id);
  if (p.bonus !== null && !out.includes(p.bonus)) out.push(p.bonus);
  return out;
}

// legalResolve 微阶段：城镇板块 / 邪教步选择 / 恩惠选择
function legalResolve(s) {
  const item = s.pending[0];
  const p = s.players[item.seat];
  if (item.kind === 'townTile') {
    return TOWN_TILES.map((tw, i) => ({ kind: 'townTile', idx: i }))
      .filter((a) => s.townPool[a.idx] > 0);
  }
  if (item.kind === 'cultChoice') {
    return CULT_TRACKS
      .filter((tr) => p.cult[tr] < (p.cultMax[tr] || CULT_TOP))
      .map((tr) => ({ kind: 'cultChoice', track: tr }));
  }
  if (item.kind === 'favorChoice') {
    return freeFavorTiles(s, p).map((f) => ({ kind: 'favorChoice', favor: f.id }));
  }
  return [];
}

// —— apply ——

export function apply(state, action) {
  const s = clone(state);
  switch (s.phase.kind) {
    case PH_FACTION: applyFaction(s, action); break;
    case PH_PLACE: applyPlace(s, action); break;
    case PH_BONUS: applyPickBonus(s, action); break;
    case PH_ACT: applyAct(s, action); break;
    case PH_RESOLVE: applyResolve(s, action); break;
    default: break;
  }
  return s;
}

// applyFaction 选派系：按派系表初始化资源/能量/邪教/VP/船运（Factions.pm）
function applyFaction(s, a) {
  if (!FACTIONS_ALL.some((f) => f.id === a.faction) || s.takenFactions.includes(a.faction)) return;
  const p = s.players[s.phase.cur];
  const f = factionById(a.faction);
  p.faction = a.faction;
  p.color = f.color;
  p.coins = f.start.coins;
  p.workers = f.start.workers;
  p.priests = f.start.priests !== undefined ? f.start.priests : 0;
  p.power = { i: f.start.p1, ii: f.start.p2, iii: 0 };
  for (const [tr, v] of Object.entries(f.start.cults || {})) p.cult[tr] = v;
  p.vp = FACTION_START_VP[f.id] !== undefined ? FACTION_START_VP[f.id] : 20;
  p.shipping = f.ship ? f.ship.start : 0;
  s.takenFactions.push(a.faction);
  log(s, p.seat, 'tm.log.faction', { n: p.name, f: f.name });
  if (s.takenFactions.length >= s.n) {
    s.cultSpots = {};
    for (const tr of CULT_TRACKS) s.cultSpots[tr] = PRIEST_CULT_SPOTS.map(() => null);
    s.placeQueue = buildPlaceQueue(s);
    s.phase = { kind: PH_PLACE };
  } else {
    s.phase = { kind: PH_FACTION, cur: s.phase.cur + 1 };
  }
}

// applyPlace 蛇形放初始民居（免挖免费）
function applyPlace(s, a) {
  const step = s.placeQueue[0];
  const p = s.players[step.seat];
  const h = s.hexes[a.hex];
  if (!h || h.owner !== null || h.terrain !== homeTerrain(p)) return;
  h.owner = step.seat;
  h.bld = 'D';
  p.buildings[a.hex] = 'D';
  log(s, step.seat, 'tm.log.place', { n: p.name, hex: a.hex });
  s.placeQueue.shift();
  if (s.placeQueue.length === 0) {
    startRound(s, 1);
  } else {
    s.phase = s.placeQueue[0].kind === 'bonus' ? { kind: PH_BONUS } : { kind: PH_PLACE };
  }
}

// applyPickBonus 奖励板块自选（领累计金币）
function applyPickBonus(s, a) {
  const step = s.placeQueue[0];
  const p = s.players[step.seat];
  if (!s.bonusAvail[a.bonus]) return;
  s.bonusAvail[a.bonus] = false;
  p.bonus = a.bonus;
  p.coins += s.bonusCoins[a.bonus];
  s.bonusCoins[a.bonus] = 0;
  log(s, p.seat, 'tm.log.bonusTake', { n: p.name, tile: a.bonus });
  s.placeQueue.shift();
  if (s.placeQueue.length === 0) {
    startRound(s, 1);
  } else {
    s.phase = s.placeQueue[0].kind === 'bonus' ? { kind: PH_BONUS } : { kind: PH_PLACE };
  }
}

// applyAct 主行动分发
function applyAct(s, a) {
  const p = s.players[s.phase.cur];
  switch (a.kind) {
    case 'build': applyBuild(s, p, a); break;
    case 'upgrade': applyUpgrade(s, p, a); break;
    case 'priestSend': applyPriestSend(s, p, a); break;
    case 'powerAction': applyPowerAction(s, p, a); break;
    case 'convert': applyConvert(s, p, a); break; // 免费子行动
    case 'burn': applyBurn(s, p, a); break;       // 免费子行动
    case 'digUpgrade': applyDigUpgrade(s, p, a); break;
    case 'darklingDig': applyDarklingDig(s, p, a); break;
    case 'shipping': applyShipping(s, p, a); break;
    case 'bridge': applyBridge(s, p, a, bridgeCostFor(p), false); break;
    case 'shAction': applyShAction(s, p, a); break;
    case 'tileAction': applyTileAction(s, p, a); break;
    case 'pass': applyPass(s, p, a); break;
    default: return;
  }
}

// applyBuild 改造并建民居（铲存货优先；新挖铲走 addSpades 计分；
// 传送费在 directShip 之外时支付，每回合一次）
function applyBuild(s, p, a) {
  const { directShip, reach } = reachInfo(s, p);
  if (!reach.has(a.hex) || s.hexes[a.hex].owner !== null || s.hexes[a.hex].terrain === 'river') return;
  const c = buildCost(s, p, a.hex);
  if (!canAffordBuild(s, p, a.hex)) return;
  if (c.teleport) {
    if (p.teleportUsed) return;
    p.teleportUsed = true;
  }
  pay(p, { coins: c.coins, workers: c.workers, priests: c.priests || 0 });
  const need = spadesNeeded(p, s.hexes[a.hex].terrain);
  const fromStore = Math.min(p.spades, need);
  p.spades -= fromStore;
  const dug = need - fromStore;
  if (dug > 0) {
    // 新挖铲逐个触发计分（SCORE1/半身人/炼金），再当场消费 —— 官方
    // transform+build 为一次行动，新挖铲不回存货（resources.pm transform_and_build）
    for (let k = 0; k < dug; k++) {
      p.spades += 1;
      scoreTileGain(s, p, 'spade', 1);
      const sp = factionOf(p).special;
      if (sp === 'halflingSpadeVp') p.vp += 1;
      if (sp === 'alchemistSpadePw' && hasSH(p)) gainPower(p, 2);
    }
    p.spades -= dug;
  }
  s.hexes[a.hex].terrain = homeTerrain(p);
  s.hexes[a.hex].owner = p.seat;
  s.hexes[a.hex].bld = 'D';
  p.buildings[a.hex] = 'D';
  if (c.teleport) p.vp += teleportCostOf(p).vp;
  scoreTileBuild(s, p, 'D');
  favorTileVp(s, p, 'D');
  log(s, p.seat, 'tm.log.build', { n: p.name, hex: a.hex });
  leechFrom(s, a.hex, 'D', p.seat);
  detectTownsFrom(s, p.seat, a.hex);
  afterAction(s, p);
}

// applyUpgrade 升级（D→TP、TP→TE/SH、TE→SA；TP 无邻接他派系建筑加收 C；
// TE/SA 选恩惠；SH 建成派系特长生效）
function applyUpgrade(s, p, a) {
  const cur = p.buildings[a.hex];
  if (!cur || !chainOf(cur).includes(a.to)) return;
  const cost = upgradeCostOf(s, p, a.to, a.hex);
  const f = factionOf(p);
  const favors = a.to === 'TE' || a.to === 'SA' ? (Array.isArray(a.favor) ? a.favor : [a.favor]) : [];
  const need = a.to === 'TE' ? (f.buildings.TE.teFavor || 1) : (a.to === 'SA' ? (f.buildings.SA.saFavor || 1) : 0);
  if (favors.length !== need) return;
  const freeFavors = freeFavorTiles(s, p);
  for (const fid of favors) {
    if (!freeFavors.some((t) => t.id === fid)) return;
  }
  if (!afford(p, cost)) return;
  pay(p, cost);
  s.hexes[a.hex].bld = a.to;
  p.buildings[a.hex] = a.to;
  for (const fid of favors) takeFavor(s, p, fid);
  if (a.to === 'SH') applyShGain(s, p);
  scoreTileBuild(s, p, a.to);
  favorTileVp(s, p, a.to);
  log(s, p.seat, 'tm.log.upgrade', { n: p.name, hex: a.hex, b: BLD_NAME[a.to] });
  leechFrom(s, a.hex, a.to, p.seat);
  detectTownsFrom(s, p.seat, a.hex);
  afterAction(s, p);
}

// applyShGain SH 建成收益（Factions.pm advance_gain 逐派系核对）
function applyShGain(s, p) {
  const g = factionOf(p).buildings.SH;
  if (g.shGain) {
    if (g.shGain.spades) addSpades(s, p, g.shGain.spades);       // 半身人 3 铲
    if (g.shGain.vp) p.vp += g.shGain.vp;                        // 邪教徒 7VP
    if (g.shGain.powerGain) gainPower(p, g.shGain.powerGain);    // 炼金 12魔
    if (g.shGain.ship) advanceShipping(s, p);                   // 美人鱼 +1 船
    if (g.shGain.wToPriest) p.wToPriest = g.shGain.wToPriest;    // 暗灵 3 次 W→P
  }
  // 奥灵 SH：ACTA 解锁之外一次性选 1 张恩惠（advance_gain GAIN_FAVOR 1）
  if (factionOf(p).shGainFavor) pushPending(s, { seat: p.seat, kind: 'favorChoice' });
}

// advanceShipping 升船运并得 VP（advance_gain 阶梯按「新等级」索引）
function advanceShipping(s, p) {
  const f = factionOf(p);
  if (!f.ship) return;
  if (p.shipping >= f.ship.max) return;
  p.shipping += 1;
  p.vp += (f.ship.vp && f.ship.vp[p.shipping]) || 0;
}

// applyPriestSend 发祭司上轨（4 槽全局占位 +3/+2/+2/+2，任选空位，祭司锁定）
function applyPriestSend(s, p, a) {
  if (p.priests < 1) return;
  if (s.cultSpots[a.track][a.spot] !== null) return;
  const max = p.cultMax[a.track] || CULT_TOP;
  if (p.cult[a.track] >= max) return;
  s.cultSpots[a.track][a.spot] = p.seat;
  p.priests -= 1;
  p.priestsOnCult[a.track] += 1;
  advanceCult(s, p, a.track, PRIEST_CULT_SPOTS[a.spot]);
  log(s, p.seat, 'tm.log.priestSend', { n: p.name, track: CULT_NAME[a.track], steps: PRIEST_CULT_SPOTS[a.spot] });
  afterAction(s, p);
}

// applyPowerAction 能量行动（ACT1-6 全局每轮一槽；ACT1 附带放桥）
function applyPowerAction(s, p, a) {
  const pa = POWER_ACTIONS[a.slot];
  if (!pa || s.powerActions[a.slot] !== null || p.power.iii < pa.power) return;
  if (pa.id === 'ACT1') {
    const valid = freeBridgePairs(s, p).some(([x, y]) =>
      (x === a.a && y === a.b) || (x === a.b && y === a.a));
    if (!valid) return;
  }
  s.powerActions[a.slot] = p.seat;
  payPower(p, pa.power);
  if (pa.id === 'ACT1') {
    s.bridges.push({ a: a.a, b: a.b, owner: p.seat });
    log(s, p.seat, 'tm.log.bridge', { n: p.name, a: a.a, b: a.b });
    detectTownsFrom(s, p.seat, a.a);
    detectTownsFrom(s, p.seat, a.b);
  } else {
    grant(s, p, pa.gain);
  }
  log(s, p.seat, 'tm.log.powerAction', { n: p.name, power: pa.power });
  afterAction(s, p);
}

// applyConvert 资源转换（官方比率；免费子行动，不结束回合）
function applyConvert(s, p, a) {
  const n = a.n || 1;
  switch (`${a.from}>${a.to}`) {
    case 'power>coins':
      if (p.power.iii < 1 * n) return;
      payPower(p, n); p.coins += n;
      break;
    case 'power>workers':
      if (p.power.iii < 3 * n) return;
      payPower(p, 3 * n); p.workers += n;
      break;
    case 'power>priests':
      if (p.power.iii < 5 * n) return;
      payPower(p, 5 * n); grant(s, p, { priests: n });
      break;
    case 'workers>coins':
      if (p.workers < n) return;
      p.workers -= n; p.coins += n;
      break;
    case 'priests>coins':
      if (p.priests < n) return;
      p.priests -= n; p.coins += n;
      break;
    case 'priests>workers':
      if (p.priests < n) return;
      p.priests -= n; p.workers += n;
      break;
    case 'coins>vp': {
      const rate = coinsToVpRate(p);
      if (p.coins < rate * n) return;
      p.coins -= rate * n; p.vp += n;
      break;
    }
    case 'vp>coins':
      if (factionOf(p).special !== 'alchemistVpRate' || p.vp < n) return;
      p.vp -= n; p.coins += n;
      break;
    case 'workers>priestsW': // 暗灵 SH 后 W→P 1:1（每回合限 3 次）
      if (p.wToPriest < 1 || p.workers < n) return;
      p.wToPriest -= n; p.workers -= n; grant(s, p, { priests: n });
      break;
    default: return;
  }
  log(s, p.seat, 'tm.log.convert', { n: p.name, f: RES_NAME[a.from], t: RES_NAME[a.to === 'priestsW' ? 'priests' : a.to], k: n });
}

// applyBurn 燃烧能量：碗 II 每 2 枚换碗 III 1 枚（免费子行动）
function applyBurn(s, p, a) {
  if (a.pairs < 1 || p.power.ii < a.pairs * 2) return;
  p.power.ii -= a.pairs * 2;
  p.power.iii += a.pairs;
  log(s, p.seat, 'tm.log.burn', { n: p.name, pairs: a.pairs });
}

// applyDigUpgrade 铲子升级：{W2,C5,P1} → 下一级 +6VP（半身人 C1；苦行僧上限 1 级）
function applyDigUpgrade(s, p, a) {
  const f = factionOf(p);
  if (f.noDigUpgrade) return; // 暗灵无铲升级（jsnell dig max_level 0）
  const maxUp = f.digLevels !== undefined ? f.digLevels : 2;
  if ((p.digLevel || 0) >= maxUp) return;
  const cost = f.digUpgradeCost || DIG_UPGRADE_COST;
  if (!afford(p, cost)) return;
  pay(p, cost);
  p.digLevel = (p.digLevel || 0) + 1;
  p.vp += DIG_UPGRADE_VP;
  log(s, p.seat, 'tm.log.digUpgrade', { n: p.name, level: p.digLevel });
  afterAction(s, p);
}

// applyDarklingDig 暗灵 dig：1 祭司 = 1 铲 + 2VP（gain 逐单位触发计分）
function applyDarklingDig(s, p, a) {
  if (factionOf(p).special !== 'darklingDig' || p.priests < 1) return;
  p.priests -= 1;
  p.vp += 2;
  addSpades(s, p, 1);
  log(s, p.seat, 'tm.log.darklingDig', { n: p.name });
  afterAction(s, p);
}

// applyShipping 升船运（{C4,P1}，VP 阶梯按派系）
function applyShipping(s, p, a) {
  const f = factionOf(p);
  if (!f.ship || p.shipping >= f.ship.max || !afford(p, SHIPPING_COST)) return;
  pay(p, SHIPPING_COST);
  advanceShipping(s, p);
  log(s, p.seat, 'tm.log.shipping', { n: p.name, v: p.shipping });
  afterAction(s, p);
}

// applyBridge 造桥（标准费 C2+P1）
function applyBridge(s, p, a, cost, free) {
  const taken = s.bridges.some((br) => (br.a === a.a && br.b === a.b) || (br.a === a.b && br.b === a.a));
  const valid = BRIDGE_PAIRS.some(([x, y]) => (x === a.a && y === a.b) || (x === a.b && y === a.a))
    && !taken
    && (p.buildings[a.a] || p.buildings[a.b])
    && s.bridges.filter((br) => br.owner === p.seat).length < BRIDGE_MAX;
  if (!valid || !afford(p, cost)) return;
  pay(p, cost);
  s.bridges.push({ a: a.a, b: a.b, owner: p.seat });
  log(s, p.seat, 'tm.log.bridge', { n: p.name, a: a.a, b: a.b });
  detectTownsFrom(s, p.seat, a.a);
  detectTownsFrom(s, p.seat, a.b);
  if (!free) afterAction(s, p);
}

// applyShAction SH 特别行动（每轮一次，ACTE 除外）
function applyShAction(s, p, a) {
  const f = factionOf(p);
  const shId = f.buildings.SH.shAction;
  if (!shId || shId !== a.id || !hasSH(p)) return;
  if (a.id !== 'ACTE' && p.shUsed[a.id]) return;
  switch (a.id) {
    case 'ACTW': { // 女巫：免费森林民居（建造范围内、免改造、免吸能外的费用）
      const { reach } = reachInfo(s, p);
      const h = s.hexes[a.hex];
      if (!reach.has(a.hex) || h.owner !== null || h.terrain !== 'forest') return;
      h.owner = p.seat;
      h.bld = 'D';
      p.buildings[a.hex] = 'D';
      log(s, p.seat, 'tm.log.witch', { n: p.name, hex: a.hex });
      leechFrom(s, a.hex, 'D', p.seat);
      detectTownsFrom(s, p.seat, a.hex);
      break;
    }
    case 'ACTN': { // 游牧：免费改造+建民居（直接邻接）
      if (!directAdjacentSpots(s, p).has(a.hex)) return;
      const h = s.hexes[a.hex];
      if (h.owner !== null) return;
      h.terrain = homeTerrain(p);
      h.owner = p.seat;
      h.bld = 'D';
      p.buildings[a.hex] = 'D';
      log(s, p.seat, 'tm.log.nomad', { n: p.name, hex: a.hex });
      leechFrom(s, a.hex, 'D', p.seat);
      detectTownsFrom(s, p.seat, a.hex);
      break;
    }
    case 'ACTS': { // 蜂灵：免费 TP 升级（免邻接加收）
      if (p.buildings[a.hex] !== 'D' || builtCount(p, 'TP') >= BLD_CAP.TP) return;
      s.hexes[a.hex].bld = 'TP';
      p.buildings[a.hex] = 'TP';
      scoreTileBuild(s, p, 'TP');
      favorTileVp(s, p, 'TP');
      log(s, p.seat, 'tm.log.upgrade', { n: p.name, hex: a.hex, b: BLD_NAME.TP });
      leechFrom(s, a.hex, 'TP', p.seat);
      detectTownsFrom(s, p.seat, a.hex);
      break;
    }
    case 'ACTA': // 奥灵：同轨 +2 邪教
      if (p.cult[a.track] >= (p.cultMax[a.track] || CULT_TOP)) return;
      advanceCult(s, p, a.track, 2);
      log(s, p.seat, 'tm.log.cult', { n: p.name, track: CULT_NAME[a.track], steps: 2 });
      break;
    case 'ACTG': // 巨人 +2 铲
      addSpades(s, p, 2);
      log(s, p.seat, 'tm.log.spades', { n: p.name, k: 2 });
      break;
    case 'ACTC': // 混沌 +2 行动（官方 ACTC gain GAIN_ACTION 2：本轮自己再行动 2 次；
      //           ACTC 本身占 1 个行动，净增 1 个后续行动位）
      p.bonusActions += 2;
      log(s, p.seat, 'tm.log.chaosAction', { n: p.name });
      break;
    case 'ACTE': // 工程师 2 工造桥（占行动、可重复）
      if (p.workers < 2) return;
      applyBridge(s, p, a, { workers: 2 }, false);
      return; // applyBridge 已调用 afterAction
    default: return;
  }
  if (a.id !== 'ACTE') p.shUsed[a.id] = true;
  afterAction(s, p);
}

// applyTileAction 板块免费行动：BON1 +1 铲；BON2/FAV6 +1 邪教步（每轮一次）
function applyTileAction(s, p, a) {
  const held = a.id === p.bonus || p.favor.includes(a.id);
  if (!held || p.tileUsed[a.id]) return;
  p.tileUsed[a.id] = true;
  if (a.id === 'BON1') {
    addSpades(s, p, 1);
    log(s, p.seat, 'tm.log.spades', { n: p.name, k: 1 });
    afterAction(s, p);
  } else {
    pushPending(s, { seat: p.seat, kind: 'cultChoice', amount: 1 });
  }
}

// applyPass 过牌（commands.pm command_pass）：首个过牌者 = 下轮起始玩家 →
// do_pass_vp 结算 → 换/持板块（第 6 轮不可拿，含累计金币）→ 全员过完收尾
function applyPass(s, p, a) {
  if (s.round === ROUNDS) {
    if (a.bonus !== null) return;
  } else if (!passableBonus(s, p).includes(a.bonus)) {
    return;
  }
  if (s.passOrder.length === 0) s.startPlayerNext = p.seat;
  s.passOrder.push(p.seat);
  const passVp = passVpOf(s, p);
  p.vp += passVp;
  if (s.round !== ROUNDS) {
    if (p.bonus !== null && p.bonus !== a.bonus) {
      s.bonusAvail[p.bonus] = true; // 旧板块回池（不带累计金币，金币随人走）
    }
    if (p.bonus === null || p.bonus !== a.bonus) {
      s.bonusAvail[a.bonus] = false;
      p.coins += s.bonusCoins[a.bonus];
      s.bonusCoins[a.bonus] = 0;
    }
    p.bonus = a.bonus;
  }
  p.passed = true;
  p.bonusActions = 0; // 官方 command_pass 将 allowed_actions 压到 1：过牌必结束本回合
  log(s, p.seat, 'tm.log.pass', { n: p.name, vp: passVp });
  if (s.players.every((q) => q.passed)) endRound(s);
  else advanceTurn(s);
}

// applyResolve 微阶段处理：城镇板块 / 邪教步 / 恩惠选择
function applyResolve(s, a) {
  const item = s.pending[0];
  const p = s.players[item.seat];
  if (item.kind === 'townTile' && a.kind === 'townTile') {
    const tw = TOWN_TILES[a.idx];
    if (!tw || s.townPool[a.idx] <= 0) return;
    s.townPool[a.idx] -= 1;
    // 城镇板块收益：钥匙 + VP + 资源/邪教增益（TW5 四轨 +1 即时结算）
    p.vp += tw.vp;
    const gain = { ...tw.gain };
    delete gain.vp;
    grant(s, p, gain);
    // 女巫 +5VP / 蜂灵 +3 工人（special gain TWn）
    const sp = factionOf(p).special;
    if (sp === 'witchesTownVp') p.vp += 5;
    if (sp === 'swarmlingTownW') p.workers += 3;
    // SCORE2：本轮建镇每个 +5VP
    scoreTileGain(s, p, 'town', 1);
    log(s, item.seat, 'tm.log.townTile', { n: p.name, tile: tw.id, vp: tw.vp });
  } else if (item.kind === 'cultChoice' && a.kind === 'cultChoice') {
    const amount = item.amount || 1;
    if (p.cult[a.track] < (p.cultMax[a.track] || CULT_TOP)) {
      advanceCult(s, p, a.track, amount);
      log(s, item.seat, 'tm.log.cult', { n: p.name, track: CULT_NAME[a.track], steps: amount });
    }
  } else if (item.kind === 'favorChoice' && a.kind === 'favorChoice') {
    takeFavor(s, p, a.favor);
  } else {
    return; // 非法动作：state 不变
  }
  s.pending.shift();
  if (s.pending.length > 0) {
    s.phase = { kind: PH_RESOLVE, cur: s.pending[0].seat };
  } else {
    afterAction(s, p);
  }
}

// —— 框架契约 ——

export function currentPlayer(s) {
  switch (s.phase.kind) {
    case PH_FACTION: return s.phase.cur;
    case PH_PLACE:
    case PH_BONUS: return s.placeQueue[0] ? s.placeQueue[0].seat : 0;
    case PH_ACT: return s.phase.cur;
    case PH_RESOLVE: return s.pending[0] ? s.pending[0].seat : 0;
    default: return 0;
  }
}

export function isGameOver(s) { return !!s.gameOver; }

// score 终局计分（含明细 breakdown，键为 i18n key）
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.vp,
    breakdown: [
      ['tm.score.base', FACTION_START_VP[p.faction] !== undefined ? FACTION_START_VP[p.faction] : 20],
      ['tm.score.cult', Object.values(p.finalCult || {}).reduce((a, b) => a + b, 0)],
      ['tm.score.network', p.finalNetwork || 0],
      ['tm.score.resources', p.finalResVp || 0],
    ],
  }));
}

// —— 供渲染/自测导出的内部工具 ——
export {
  buildRangeSet, reachInfo, townEdges, spadesNeeded, buildCost, upgradeCostOf,
  incomeOf, finalScoring, largestNetwork, passVpOf,
  detectTownsFrom, checkTowns, advanceCult, freeFavorTiles, rankScoring,
};
const BLD_NAME = {
  D: { zh: '民居', en: 'Dwelling' }, TP: { zh: '交易站', en: 'Trading Post' },
  TE: { zh: '神殿', en: 'Temple' }, SH: { zh: '要塞', en: 'Stronghold' },
  SA: { zh: '圣所', en: 'Sanctuary' },
};
const CULT_NAME = {
  fire: { zh: '火', en: 'Fire' }, water: { zh: '水', en: 'Water' },
  earth: { zh: '土', en: 'Earth' }, air: { zh: '风', en: 'Air' },
};
const RES_NAME = {
  coins: { zh: '金币', en: 'coins' }, workers: { zh: '工人', en: 'workers' },
  priests: { zh: '祭司', en: 'priests' }, power: { zh: '能量', en: 'power' },
  vp: { zh: '分', en: 'VP' },
};
export { BLD_NAME, CULT_NAME, RES_NAME };
