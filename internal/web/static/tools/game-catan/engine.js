// 卡坦岛引擎：变体开局（洗地形 + 螺旋摆数字）、蛇形初始放置、掷骰生产、
// 7 弃牌/强盗、建造（路/村/城/发展卡）、港口与银行交易、国内交易（明牌主屏）、
// 发展卡（骑士/修路/丰年/垄断/分卡）、最长路与最大军队、10 分回合内获胜。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 明牌裁决：所有玩家资源与发展卡公开（needsPrivacy=false），VP 计分全公开，
// 隐藏分卡要素按用户裁决放弃（manifest 数据声明中注明）。

import {
  RESOURCES, RES_NAMES, TERRAIN_RES, TERRAIN_BAG, NUMBER_TOKENS,
  DEV_TYPES, DEV_COUNTS, COST_ROAD, COST_SETTLEMENT, COST_CITY, COST_DEV,
  MAX_ROADS, MAX_SETTLEMENTS, MAX_CITIES, WIN_VP, DISCARD_AT,
  LONGEST_ROAD_MIN, LARGEST_ARMY_MIN, RES_PER_TYPE,
  HEXES, HEX_VERTS, VERTICES, EDGES, SPIRAL_HEXES, HARBOR_SPOTS,
} from './data-board.js';

export const DEV_NAMES = {
  knight: { zh: '骑士', en: 'Knight' },
  roadBuild: { zh: '修路', en: 'Road Building' },
  yearOfPlenty: { zh: '丰年', en: 'Year of Plenty' },
  monopoly: { zh: '垄断', en: 'Monopoly' },
  vp: { zh: '分卡', en: 'Victory Point' },
};
const TERRAIN_NAMES = [
  { zh: '森林', en: 'Forest' }, { zh: '山丘', en: 'Hills' },
  { zh: '牧场', en: 'Pasture' }, { zh: '农田', en: 'Fields' },
  { zh: '山脉', en: 'Mountains' }, { zh: '沙漠', en: 'Desert' },
];

// —— 基础工具 ——

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffled 洗牌副本（Fisher-Yates，用 state 随机源）
function shuffled(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
}

// resTotal 手上资源总数
export function resTotal(p) {
  return p.res.reduce((a, b) => a + b, 0);
}

// canPay 是否付得起
function canPay(p, cost) {
  return cost.every((c, i) => p.res[i] >= c);
}

// pay 支付资源回银行
function pay(p, bank, cost) {
  cost.forEach((c, i) => { p.res[i] -= c; bank[i] += c; });
}

// hexLabel 格子日志名：地形(数字)
export function hexLabel(s, hi) {
  const h = s.hexes[hi];
  const name = TERRAIN_NAMES[h.terrain];
  const num = h.number === null ? '' : `(${h.number})`;
  return { zh: `${name.zh}${num}`, en: `${name.en}${num}` };
}

// —— 棋盘与开局 ——

// buildBoard 变体开局：洗地形、洗港口标记、按官方螺旋摆数字（跳过沙漠）、强盗落沙漠
function buildBoard(s) {
  const terrains = shuffled(s, TERRAIN_BAG);
  const hexes = terrains.map((t) => ({ terrain: t, number: null, verts: [] }));
  const tokens = shuffled(s, NUMBER_TOKENS);
  let ti = 0;
  for (const hi of SPIRAL_HEXES) {
    if (hexes[hi].terrain === 5) continue; // 沙漠无数字
    hexes[hi].number = tokens[ti++];
  }
  hexes.forEach((h, hi) => { h.verts = HEX_VERTS[hi]; });
  const portTypes = shuffled(s, [0, 1, 2, 3, 4, -1, -1, -1, -1]);
  const harbors = HARBOR_SPOTS.map((e, i) => ({ edge: e, res: portTypes[i] }));
  return { hexes, harbors, robber: hexes.findIndex((h) => h.terrain === 5) };
}

// makeDevDeck 发展卡堆（25 张洗牌）
function makeDevDeck(s) {
  const deck = [];
  for (const t of DEV_TYPES) {
    for (let i = 0; i < DEV_COUNTS[t]; i++) deck.push(t);
  }
  return shuffled(s, deck);
}

// initialState 开局：棋盘 + 蛇形初始放置队列
export function initialState(setup) {
  const seats = setup.seats;
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: seats.length,
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      res: [0, 0, 0, 0, 0], dev: [], knights: 0, devPlayed: false,
      roads: [], settlements: [], cities: [],
    })),
    bank: [RES_PER_TYPE, RES_PER_TYPE, RES_PER_TYPE, RES_PER_TYPE, RES_PER_TYPE],
    buildings: {},               // vIdx -> {seat, city}
    roads: {},                   // eIdx -> seat
    longestRoad: { seat: null, len: 0 },
    largestArmy: { seat: null, size: 0 },
    phase: 'setup',
    setup: { order: [], idx: 0, round: 1, second: [] },
    cur: 0,
    turn: 0,
    pending: null,
    log: [],
    gameOver: false,
    winner: null,
  };
  Object.assign(s, buildBoard(s));
  s.devDeck = makeDevDeck(s);
  s.setup.order = seats.map((_, i) => i);
  s.pending = { kind: 'setupSettle', seat: 0, round: 1 };
  log(s, -1, 'ct.log.start', { n: seats.length });
  return s;
}

// —— 查询接口 ——

// currentPlayer 当前待决策座位（微阶段精确到人）
export function currentPlayer(s) {
  return s.pending ? s.pending.seat : s.cur;
}

// isGameOver 是否终局
export function isGameOver(s) {
  return s.gameOver;
}

// devVpOf 分卡数
function devVpOf(p) {
  return p.dev.filter((c) => c.t === 'vp').length;
}

// vpOf 公开总 VP（明牌：分卡也计入公开分）
export function vpOf(s, seat) {
  const p = s.players[seat];
  let v = p.settlements.length + 2 * p.cities.length + devVpOf(p);
  if (s.longestRoad.seat === seat) v += 2;
  if (s.largestArmy.seat === seat) v += 2;
  return v;
}

// score 终局计分：VP 总分 + 构成明细
export function score(s) {
  return s.players.map((p) => {
    const build = p.settlements.length + 2 * p.cities.length;
    const bonus = (s.longestRoad.seat === p.seat ? 2 : 0) + (s.largestArmy.seat === p.seat ? 2 : 0);
    return {
      seat: p.seat,
      total: build + devVpOf(p) + bonus,
      breakdown: [
        ['ct.score.buildings', build],
        ['ct.score.dev', devVpOf(p)],
        ['ct.score.road', s.longestRoad.seat === p.seat ? 2 : 0],
        ['ct.score.army', s.largestArmy.seat === p.seat ? 2 : 0],
      ],
    };
  });
}

// —— 放置合法性 ——

// canBuildSettleAt 村庄放置点：空顶点 + 距离规则（相邻顶点无村庄/城）+ 连接自有路
function canBuildSettleAt(s, seat, v) {
  if (s.buildings[v]) return false;
  for (const w of VERTICES[v].adj) {
    if (s.buildings[w]) return false;
  }
  return VERTICES[v].edges.some((e) => s.roads[e] === seat);
}

// canBuildRoadAt 道路放置点：空边 + 连接自有网络（己方路相邻或己方建筑压边）
export function canBuildRoadAt(s, seat, e) {
  if (s.roads[e] !== undefined) return false;
  const { a, b } = EDGES[e];
  const touchRoad = VERTICES[a].edges.concat(VERTICES[b].edges)
    .some((e2) => e2 !== e && s.roads[e2] === seat);
  const touchBld = [a, b].some((v) => s.buildings[v] && s.buildings[v].seat === seat);
  return touchRoad || touchBld;
}

// setupSettleSpots 初始放置村庄点（仅距离规则，无需连路）
function setupSettleSpots(s) {
  const spots = [];
  for (let v = 0; v < VERTICES.length; v++) {
    if (!s.buildings[v] && VERTICES[v].adj.every((w) => !s.buildings[w])) spots.push(v);
  }
  return spots;
}

// settlementSpots 主阶段可建村庄点
function settlementSpots(s, seat) {
  return s.players[seat].settlements.length >= MAX_SETTLEMENTS
    ? [] : VERTICES.reduce((acc, _, v) => (canBuildSettleAt(s, seat, v) ? [...acc, v] : acc), []);
}

// citySpots 可升级城市点（己方村庄）
function citySpots(s, seat) {
  const p = s.players[seat];
  return p.cities.length >= MAX_CITIES
    ? [] : p.settlements.filter((v) => true);
}

// roadSpots 可建路边（免费/付费共用）
export function roadSpots(s, seat) {
  const p = s.players[seat];
  if (p.roads.length >= MAX_ROADS) return [];
  const spots = [];
  for (let e = 0; e < EDGES.length; e++) {
    if (canBuildRoadAt(s, seat, e)) spots.push(e);
  }
  return spots;
}

// harborRatio 玩家对某资源的最佳银行交易比（4 起，通用港 3，专属港 2）
export function harborRatio(s, seat, res) {
  let ratio = 4;
  for (const h of s.harbors) {
    const { a, b } = EDGES[h.edge];
    const touch = [a, b].some((v) => s.buildings[v] && s.buildings[v].seat === seat);
    if (!touch) continue;
    if (h.res === res) return 2;
    if (h.res === -1) ratio = Math.min(ratio, 3);
  }
  return ratio;
}

// —— legalActions ——

// legalActions 唯一合法性来源：微阶段优先，其次 roll / main 主行动
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.pending) return pendingActions(s);
  if (s.phase === 'roll') return [{ kind: 'roll' }];
  return mainActions(s);
}

// pendingActions 微阶段动作枚举
function pendingActions(s) {
  const pd = s.pending;
  const map = {
    setupSettle: () => setupSettleSpots(s).map((v) => ({ kind: 'placeSettlement', v })),
    setupRoad: () => VERTICES[pd.at].edges.filter((e) => s.roads[e] === undefined)
      .map((e) => ({ kind: 'placeRoad', e })),
    discard: () => RESOURCES.filter((r) => s.players[pd.seat].res[r] > 0)
      .map((r) => ({ kind: 'discardRes', res: r })),
    robber: () => s.hexes.map((_, hi) => hi).filter((hi) => hi !== s.robber)
      .map((hi) => ({ kind: 'moveRobber', hex: hi })),
    steal: () => stealActions(s),
    freeRoad: () => roadSpots(s, pd.seat).map((e) => ({ kind: 'freeRoad', e })),
    yop: () => RESOURCES.filter((r) => s.bank[r] > 0).map((r) => ({ kind: 'yopTake', res: r })),
    mono: () => RESOURCES.map((r) => ({ kind: 'monoPick', res: r })),
    tradeOffer: () => [{ kind: 'tradeAccept' }, { kind: 'tradeDecline' }],
  };
  return map[pd.kind]();
}

// stealVictims 强盗格旁有资源他家的（座位 → 可抢资源列表）
function stealVictims(s) {
  const mover = s.pending.seat;
  const out = [];
  for (const v of s.hexes[s.robber].verts) {
    const b = s.buildings[v];
    if (!b || b.seat === mover) continue;
    const opts = RESOURCES.filter((r) => s.players[b.seat].res[r] > 0);
    if (opts.length && !out.some((x) => x.seat === b.seat)) out.push({ seat: b.seat, opts });
  }
  return out;
}

// stealActions 抢牌动作：(受害方, 资源) 组合
function stealActions(s) {
  const acts = [];
  for (const vic of stealVictims(s)) {
    for (const r of vic.opts) acts.push({ kind: 'steal', victim: vic.seat, res: r });
  }
  return acts;
}

// mainActions 主行动枚举：建造 / 发展卡 / 银行交易 / 过牌
function mainActions(s) {
  const p = s.players[s.cur];
  const acts = [];
  if (canPay(p, COST_ROAD)) {
    for (const e of roadSpots(s, s.cur)) acts.push({ kind: 'road', e });
  }
  if (canPay(p, COST_SETTLEMENT)) {
    for (const v of settlementSpots(s, s.cur)) acts.push({ kind: 'settlement', v });
  }
  if (canPay(p, COST_CITY)) {
    for (const v of citySpots(s, s.cur)) acts.push({ kind: 'city', v });
  }
  if (canPay(p, COST_DEV) && s.devDeck.length > 0) acts.push({ kind: 'buyDev' });
  pushPlayableDevs(s, acts);
  pushBankTrades(s, acts);
  acts.push({ kind: 'endTurn' });
  return acts;
}

// playableDevs 本回合可打的发展卡类型（非本回合购入、本回合未打过卡）
function playableDevs(s) {
  const p = s.players[s.cur];
  if (p.devPlayed) return [];
  const held = new Set(p.dev.filter((c) => c.turn < s.turn).map((c) => c.t));
  if (held.has('roadBuild') && roadSpots(s, s.cur).length === 0) held.delete('roadBuild');
  if (held.has('yearOfPlenty') && s.bank.every((x) => x === 0)) held.delete('yearOfPlenty');
  return [...held];
}

// pushPlayableDevs 可打发展卡动作
function pushPlayableDevs(s, acts) {
  for (const t of playableDevs(s)) {
    if (t === 'vp') continue; // 分卡直接计分，无需打出
    const key = { knight: 'playKnight', roadBuild: 'playRoadBuild',
      yearOfPlenty: 'playYop', monopoly: 'playMono' }[t];
    acts.push({ kind: key });
  }
}

// pushBankTrades 银行交易动作（最佳汇率 4/3/2 : 1）
function pushBankTrades(s, acts) {
  const p = s.players[s.cur];
  for (const give of RESOURCES) {
    const ratio = harborRatio(s, s.cur, give);
    if (p.res[give] < ratio) continue;
    for (const get of RESOURCES) {
      if (give !== get && s.bank[get] > 0) acts.push({ kind: 'bank', give, get });
    }
  }
}

// —— apply ——

// apply 执行行动：深拷贝入参后分发，返回新状态
export function apply(state, action) {
  const s = clone(state);
  const kind = action.kind;
  const handlers = {
    placeSettlement: applySetupSettle, placeRoad: applySetupRoad,
    roll: applyRoll, discardRes: applyDiscard, moveRobber: applyMoveRobber, steal: applySteal,
    road: applyRoad, settlement: applySettlement, city: applyCity, buyDev: applyBuyDev,
    playKnight: applyPlayKnight, playRoadBuild: applyPlayRoadBuild,
    playYop: applyPlayYop, playMono: applyPlayMono,
    freeRoad: applyFreeRoad, yopTake: applyYopTake, monoPick: applyMonoPick,
    bank: applyBankTrade, trade: applyTradeOffer,
    tradeAccept: applyTradeAccept, tradeDecline: applyTradeDecline,
    endTurn: applyEndTurn,
  };
  if (!handlers[kind]) throw new Error(`unknown action: ${kind}`);
  handlers[kind](s, action);
  return s;
}

// —— 初始放置（蛇形）——

// advanceSetup 放置完成后的队列推进：第二轮逆序，全部完成发第二轮收入
function advanceSetup(s) {
  const su = s.setup;
  su.idx++;
  if (su.idx >= s.n) {
    if (su.round === 1) { su.round = 2; su.idx = 0; su.order = su.order.slice().reverse(); }
    else { finishSetup(s); return; }
  }
  s.pending = { kind: 'setupSettle', seat: su.order[su.idx], round: su.round };
}

// finishSetup 开局结束：第二轮村庄逐格收 1 资源，进入掷骰阶段
function finishSetup(s) {
  for (const { seat, v } of s.setup.second) {
    grantSecondIncome(s, seat, v);
  }
  s.setup = null;
  s.pending = null;
  s.phase = 'roll';
  s.cur = 0;
  s.turn = 1;
  checkWin(s);
}

// grantSecondIncome 第二村庄相邻每格收 1 资源（银行空则无）
function grantSecondIncome(s, seat, v) {
  const p = s.players[seat];
  for (const hi of VERTICES[v].hexes) {
    const res = TERRAIN_RES[s.hexes[hi].terrain];
    if (res >= 0 && s.bank[res] > 0) {
      s.bank[res]--;
      p.res[res]++;
      log(s, seat, 'ct.log.setupIncome', { n: p.name, r: RES_NAMES[res] });
    }
  }
}

// applySetupSettle 初始放村（主阶段外不扣费）
function applySetupSettle(s, a) {
  const pd = s.pending;
  const p = s.players[pd.seat];
  p.settlements.push(a.v);
  s.buildings[a.v] = { seat: pd.seat, city: false };
  if (pd.round === 2) s.setup.second.push({ seat: pd.seat, v: a.v });
  log(s, pd.seat, 'ct.log.setupSettle', { n: p.name, v: `V${a.v}` });
  s.pending = { kind: 'setupRoad', seat: pd.seat, at: a.v, round: pd.round };
}

// applySetupRoad 初始放路（紧邻刚放的村）
function applySetupRoad(s, a) {
  const pd = s.pending;
  const p = s.players[pd.seat];
  p.roads.push(a.e);
  s.roads[a.e] = pd.seat;
  log(s, pd.seat, 'ct.log.setupRoad', { n: p.name, e: `E${a.e}` });
  advanceSetup(s);
}

// —— 掷骰与生产 ——

// applyRoll 掷两骰：7 走弃牌/强盗链，否则生产
function applyRoll(s) {
  const d1 = 1 + Math.floor(rnd(s) * 6);
  const d2 = 1 + Math.floor(rnd(s) * 6);
  const sum = d1 + d2;
  log(s, s.cur, 'ct.log.roll', { n: s.players[s.cur].name, d: sum });
  if (sum === 7) { log(s, -1, 'ct.log.seven', {}); startDiscard(s); return; }
  produce(s, sum);
  s.phase = 'main';
  checkWin(s);
}

// produce 掷骰生产：按座次（自当前玩家起）逐建筑发资源，强盗格无产出
function produce(s, sum) {
  const gains = s.players.map(() => [0, 0, 0, 0, 0]);
  for (let k = 0; k < s.n; k++) {
    const seat = (s.cur + k) % s.n;
    collectForSeat(s, seat, sum, gains[seat]);
  }
  s.players.forEach((p, seat) => {
    RESOURCES.forEach((r) => {
      if (gains[seat][r] > 0) {
        log(s, seat, 'ct.log.produce', { n: p.name, r: RES_NAMES[r], c: gains[seat][r] });
      }
    });
  });
}

// collectForSeat 单个玩家本轮全部建筑的生产（银行空则逐张止付）
function collectForSeat(s, seat, sum, out) {
  const p = s.players[seat];
  const blds = [...p.settlements.map((v) => ({ v, n: 1 })), ...p.cities.map((v) => ({ v, n: 2 }))];
  for (const { v, n } of blds) {
    for (const hi of VERTICES[v].hexes) {
      const h = s.hexes[hi];
      const res = TERRAIN_RES[h.terrain];
      if (h.number !== sum || hi === s.robber || res < 0) continue;
      for (let i = 0; i < n && s.bank[res] > 0; i++) {
        s.bank[res]--;
        p.res[res]++;
        out[res]++;
      }
    }
  }
}

// —— 弃牌与强盗（掷 7）——

// startDiscard 超过 7 张者按座次弃一半（下取整）；无人需弃直接进强盗
function startDiscard(s) {
  const queue = [];
  for (let k = 0; k < s.n; k++) {
    const seat = (s.cur + k) % s.n;
    if (resTotal(s.players[seat]) > DISCARD_AT) queue.push(seat);
  }
  if (queue.length === 0) { beginRobber(s); return; }
  const seat = queue.shift();
  s.pending = { kind: 'discard', seat, queue, remaining: Math.floor(resTotal(s.players[seat]) / 2) };
}

// applyDiscard 弃 1 张指定资源；弃够换下一位，全部弃完进强盗阶段
function applyDiscard(s, a) {
  const pd = s.pending;
  const p = s.players[pd.seat];
  p.res[a.res]--;
  s.bank[a.res]++;
  log(s, pd.seat, 'ct.log.discard', { n: p.name, r: RES_NAMES[a.res] });
  if (pd.remaining > 1) { pd.remaining--; return; }
  if (pd.queue.length > 0) {
    const seat = pd.queue.shift();
    s.pending = { kind: 'discard', seat, queue: pd.queue,
      remaining: Math.floor(resTotal(s.players[seat]) / 2) };
    return;
  }
  beginRobber(s);
}

// beginRobber 强盗移动阶段（7 点或骑士共用）
function beginRobber(s) {
  s.pending = { kind: 'robber', seat: s.cur };
}

// applyMoveRobber 移动强盗；无相邻可抢对象则直接回主阶段
function applyMoveRobber(s, a) {
  s.robber = a.hex;
  log(s, s.pending.seat, 'ct.log.robber', { n: s.players[s.pending.seat].name, h: hexLabel(s, a.hex) });
  const victims = stealVictims(s);
  if (victims.length === 0) { s.pending = null; s.phase = 'main'; return; }
  s.pending = { kind: 'steal', seat: s.pending.seat };
}

// applySteal 从受害方抢 1 张指定资源（明牌自选）
function applySteal(s, a) {
  const mover = s.players[s.pending.seat];
  const vic = s.players[a.victim];
  vic.res[a.res]--;
  mover.res[a.res]++;
  log(s, s.pending.seat, 'ct.log.steal',
    { n: mover.name, m: vic.name, r: RES_NAMES[a.res] });
  s.pending = null;
  s.phase = 'main';
}

// —— 建造 ——

// placeRoad 落子公共：登记路边并重算最长路
function placeRoad(s, seat, e) {
  s.players[seat].roads.push(e);
  s.roads[e] = seat;
  log(s, seat, 'ct.log.road', { n: s.players[seat].name, e: `E${e}` });
  updateLongestRoad(s);
}

// applyRoad 主阶段建路（付费）
function applyRoad(s, a) {
  const p = s.players[s.cur];
  pay(p, s.bank, COST_ROAD);
  placeRoad(s, s.cur, a.e);
  checkWin(s);
}

// applySettlement 主阶段建村（付费；可能截断他人最长路）
function applySettlement(s, a) {
  const p = s.players[s.cur];
  pay(p, s.bank, COST_SETTLEMENT);
  p.settlements.push(a.v);
  s.buildings[a.v] = { seat: s.cur, city: false };
  log(s, s.cur, 'ct.log.settle', { n: p.name, v: `V${a.v}` });
  updateLongestRoad(s);
  checkWin(s);
}

// applyCity 升级城市（付费；村庄棋子归还可再用）
function applyCity(s, a) {
  const p = s.players[s.cur];
  pay(p, s.bank, COST_CITY);
  p.settlements = p.settlements.filter((v) => v !== a.v);
  p.cities.push(a.v);
  s.buildings[a.v].city = true;
  log(s, s.cur, 'ct.log.city', { n: p.name, v: `V${a.v}` });
  checkWin(s);
}

// —— 发展卡 ——

// applyBuyDev 购发展卡（当回合不可打，turn 戳记购入回合）
function applyBuyDev(s) {
  const p = s.players[s.cur];
  pay(p, s.bank, COST_DEV);
  const t = s.devDeck.pop();
  p.dev.push({ t, turn: s.turn });
  log(s, s.cur, 'ct.log.devbuy', { n: p.name, t: DEV_NAMES[t] });
  checkWin(s); // 买到分卡即时计分
}

// takeDevCard 从手牌打出一张指定类型（须非本回合购入）
function takeDevCard(s, seat, t) {
  const p = s.players[seat];
  const idx = p.dev.findIndex((c) => c.t === t && c.turn < s.turn);
  if (idx < 0) throw new Error(`dev card not playable: ${t}`);
  p.dev.splice(idx, 1);
  p.devPlayed = true;
}

// applyPlayKnight 打骑士：移强盗 + 抢牌（走 robber 微阶段），更新最大军队
function applyPlayKnight(s) {
  takeDevCard(s, s.cur, 'knight');
  const p = s.players[s.cur];
  p.knights++;
  log(s, s.cur, 'ct.log.knight', { n: p.name, k: p.knights });
  updateLargestArmy(s, s.cur);
  beginRobber(s);
}

// applyPlayRoadBuild 修路：2 条免费路（无可放边则作废）
function applyPlayRoadBuild(s) {
  takeDevCard(s, s.cur, 'roadBuild');
  log(s, s.cur, 'ct.log.roadbuild', { n: s.players[s.cur].name });
  if (roadSpots(s, s.cur).length > 0) {
    s.pending = { kind: 'freeRoad', seat: s.cur, left: 2 };
  }
}

// applyFreeRoad 免费路落子；放完或无处可放即结束
function applyFreeRoad(s, a) {
  const pd = s.pending;
  placeRoad(s, pd.seat, a.e);
  pd.left--;
  if (pd.left <= 0 || roadSpots(s, pd.seat).length === 0) s.pending = null;
  checkWin(s);
}

// applyPlayYop 丰年：从银行任取 2 张（银行枯竭时不入微阶段）
function applyPlayYop(s) {
  takeDevCard(s, s.cur, 'yearOfPlenty');
  log(s, s.cur, 'ct.log.yopStart', { n: s.players[s.cur].name });
  if (s.bank.some((x) => x > 0)) {
    s.pending = { kind: 'yop', seat: s.cur, left: 2 };
  }
}

// applyYopTake 丰年取 1 张；银行空则提前结束
function applyYopTake(s, a) {
  const pd = s.pending;
  s.bank[a.res]--;
  s.players[pd.seat].res[a.res]++;
  log(s, pd.seat, 'ct.log.yop', { n: s.players[pd.seat].name, r: RES_NAMES[a.res], c: 1 });
  pd.left--;
  if (pd.left <= 0 || s.bank.every((x) => x === 0)) s.pending = null;
}

// applyPlayMono 垄断：指定资源，他家全部上缴
function applyPlayMono(s) {
  takeDevCard(s, s.cur, 'monopoly');
  log(s, s.cur, 'ct.log.monoStart', { n: s.players[s.cur].name });
  s.pending = { kind: 'mono', seat: s.cur };
}

// applyMonoPick 垄断结算
function applyMonoPick(s, a) {
  let got = 0;
  for (const p of s.players) {
    if (p.seat === s.pending.seat) continue;
    got += p.res[a.res];
    s.bank[a.res] += p.res[a.res];
    p.res[a.res] = 0;
  }
  s.bank[a.res] -= got;
  s.players[s.pending.seat].res[a.res] += got;
  log(s, s.pending.seat, 'ct.log.mono',
    { n: s.players[s.pending.seat].name, r: RES_NAMES[a.res], c: got });
  s.pending = null;
}

// —— 交易 ——

// applyBankTrade 银行/港口交易：按最佳汇率付 N 换 1
function applyBankTrade(s, a) {
  const p = s.players[s.cur];
  const ratio = harborRatio(s, s.cur, a.give);
  p.res[a.give] -= ratio;
  s.bank[a.give] += ratio;
  p.res[a.get]++;
  s.bank[a.get]--;
  log(s, s.cur, 'ct.log.bank', {
    n: p.name, k: ratio, g: RES_NAMES[a.give], t: RES_NAMES[a.get],
  });
}

// validTrade 国内交易提议校验：双方资源足额、对手方非空手
function validTrade(s, a) {
  if (a.to === s.cur) return false;
  const give = a.give.reduce((x, y) => x + y, 0);
  const get = a.get.reduce((x, y) => x + y, 0);
  if (give <= 0 || get <= 0) return false;
  return a.give.every((c, i) => s.players[s.cur].res[i] >= c)
    && a.get.every((c, i) => s.players[a.to].res[i] >= c);
}

// applyTradeOffer 国内交易提议：进入对手方 accept/decline 微阶段（明牌主屏裁决）
function applyTradeOffer(s, a) {
  if (!validTrade(s, a)) throw new Error('invalid trade offer');
  s.pending = { kind: 'tradeOffer', seat: a.to, from: s.cur, give: a.give, get: a.get };
  log(s, s.cur, 'ct.log.offer', {
    n: s.players[s.cur].name, m: s.players[a.to].name,
    g: resListName(a.give), t: resListName(a.get),
  });
}

// resListName 资源计数数组转双语名（如 2木1砖）
function resListName(counts) {
  const zh = [];
  const en = [];
  counts.forEach((c, i) => {
    if (c > 0) { zh.push(`${c}${RES_NAMES[i].zh}`); en.push(`${c} ${RES_NAMES[i].en}`); }
  });
  return { zh: zh.join(' '), en: en.join(', ') };
}

// settleTrade 成交：双向过户
function settleTrade(s, from, to, give, get) {
  give.forEach((c, i) => { s.players[from].res[i] -= c; s.players[to].res[i] += c; });
  get.forEach((c, i) => { s.players[to].res[i] -= c; s.players[from].res[i] += c; });
}

// applyTradeAccept 对手方接受
function applyTradeAccept(s) {
  const pd = s.pending;
  settleTrade(s, pd.from, pd.seat, pd.give, pd.get);
  log(s, pd.seat, 'ct.log.accept', {
    n: s.players[pd.seat].name, m: s.players[pd.from].name,
    g: resListName(pd.give), t: resListName(pd.get),
  });
  s.pending = null;
}

// applyTradeDecline 对手方拒绝
function applyTradeDecline(s) {
  const pd = s.pending;
  log(s, pd.seat, 'ct.log.decline',
    { n: s.players[pd.seat].name, m: s.players[pd.from].name });
  s.pending = null;
}

// —— 回合流转 ——

// applyEndTurn 结束回合：清本回合发展卡标记，轮转并做回合内 10 分复查
function applyEndTurn(s) {
  log(s, s.cur, 'ct.log.end', { n: s.players[s.cur].name });
  s.players[s.cur].devPlayed = false;
  s.cur = (s.cur + 1) % s.n;
  s.turn++;
  s.phase = 'roll';
  checkWin(s); // 轮到自己时已带 10 分（离回合获最长路）同样获胜
}

// checkWin 当前玩家 ≥10 分即胜（官方：回合内达成）
function checkWin(s) {
  if (s.gameOver) return;
  const v = vpOf(s, s.cur);
  if (v >= WIN_VP) {
    s.gameOver = true;
    s.winner = s.cur;
    log(s, s.cur, 'ct.log.win', { n: s.players[s.cur].name, v });
  }
}

// —— 最长路与最大军队 ——

// ownRoadAdj 玩家道路网络的邻接表 {v: [e...]}
function ownRoadAdj(s, seat) {
  const adj = {};
  for (const e of s.players[seat].roads) {
    const { a, b } = EDGES[e];
    (adj[a] = adj[a] || []).push(e);
    (adj[b] = adj[b] || []).push(e);
  }
  return adj;
}

// dfsRoad 从 v 出发的最长路径（边计数；对手建筑顶点可入不可穿）
function dfsRoad(s, seat, adj, v, used) {
  const edges = (adj[v] || []).filter((e) => !used[e]);
  let best = 0;
  for (const e of edges) {
    const { a, b } = EDGES[e];
    const w = a === v ? b : a;
    used[e] = true;
    let len = 1;
    const blocked = s.buildings[w] && s.buildings[w].seat !== seat;
    if (!blocked) len += dfsRoad(s, seat, adj, w, used);
    used[e] = false;
    if (len > best) best = len;
  }
  return best;
}

// longestRoadFor 玩家当前最长路段数（分支网络取最深）
export function longestRoadFor(s, seat) {
  const adj = ownRoadAdj(s, seat);
  const used = {};
  let best = 0;
  for (const v of Object.keys(adj)) {
    best = Math.max(best, dfsRoad(s, seat, adj, Number(v), used));
  }
  return best;
}

// updateLongestRoad 建路/放村后重判最长路归属（可被截断易主或无人持有）
function updateLongestRoad(s) {
  const lengths = s.players.map((p) => (p.roads.length ? longestRoadFor(s, p.seat) : 0));
  const cur = s.longestRoad;
  let holder = cur.seat;
  const maxLen = Math.max(...lengths);
  if (maxLen < LONGEST_ROAD_MIN) {
    if (holder !== null) log(s, -1, 'ct.log.roadNone', {});
    s.longestRoad = { seat: null, len: 0 };
    return;
  }
  const top = lengths.map((l, i) => ({ l, i })).filter((x) => x.l === maxLen);
  if (holder === null || lengths[holder] < maxLen) {
    const next = top.find((x) => x.i === s.cur) || top[0];
    if (holder !== null) {
      log(s, next.i, 'ct.log.roadSteal', {
        n: s.players[next.i].name, m: s.players[holder].name, l: maxLen,
      });
    } else {
      log(s, next.i, 'ct.log.roadAward', { n: s.players[next.i].name, l: maxLen });
    }
    holder = next.i;
  }
  s.longestRoad = { seat: holder, len: maxLen };
}

// updateLargestArmy 打骑士后判定最大军队（须严格超过现任）
function updateLargestArmy(s, seat) {
  const k = s.players[seat].knights;
  if (k < LARGEST_ARMY_MIN) return;
  const cur = s.largestArmy;
  if (cur.seat === seat) { cur.size = k; return; }
  if (cur.seat !== null && k <= cur.size) return;
  if (cur.seat !== null) {
    log(s, seat, 'ct.log.armySteal', {
      n: s.players[seat].name, m: s.players[cur.seat].name, k,
    });
  } else {
    log(s, seat, 'ct.log.army', { n: s.players[seat].name, k });
  }
  s.largestArmy = { seat, size: k };
}
