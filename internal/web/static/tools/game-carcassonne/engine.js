// 卡卡颂引擎：抽块 → 落块（边类型匹配）→ 派随从 → 完成即时结算。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 计分：完成城市 2/块+2/纹章、道路 1/块、修道院围满 9 分；
// 终局未完成城市/道路减半（城市 1/块+1/纹章）、修道院按已占格数、
// 农夫 3 分/相邻完成城市（C1 经典规则）。
// 连接模型见 data-tiles.js 头注（边三段槽位，相邻槽位镜像 0↔2 / 1↔1）。

import { TILES, START_TYPE, DECK_TYPES, FEAT_NAME } from './data-tiles.js';

const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N=0 E=1 S=2 W=3（y 向南为正）
const MEEPLES_PER_PLAYER = 7;

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

const kkey = (x, y) => x + ',' + y;
const cellAt = (s, x, y) => s.board[kkey(x, y)] || null;

// edgeType 世界边 e 的地形类型（含旋转：正则边 = (e-r) mod 4）
export function edgeType(t, r, e) { return TILES[t].e[(e - r + 4) % 4]; }

// tileName 日志用块名
export function tileName(t) {
  return { zh: `${TILES[t].l} 形块`, en: `tile ${TILES[t].l}` };
}

// canPlace 落块合法性：空格 + 至少一个邻块 + 各邻边地形类型匹配
export function canPlace(s, t, r, x, y) {
  if (cellAt(s, x, y)) return false;
  let any = false;
  for (let e = 0; e < 4; e++) {
    const nc = cellAt(s, x + DIR[e][0], y + DIR[e][1]);
    if (!nc) continue;
    any = true;
    if (edgeType(t, r, e) !== edgeType(nc.t, nc.r, (e + 2) % 4)) return false;
  }
  return any;
}

// candidateCells 与既有块相邻的空格（去重）
function candidateCells(s) {
  const seen = new Set();
  const out = [];
  for (const k of Object.keys(s.board)) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of DIR) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = kkey(nx, ny);
      if (s.board[nk] || seen.has(nk)) continue;
      seen.add(nk);
      out.push([nx, ny]);
    }
  }
  return out;
}

// hasPlacement 全盘是否存在合法落点
function hasPlacement(s, t) {
  for (const [x, y] of candidateCells(s)) {
    for (let r = 0; r < 4; r++) if (canPlace(s, t, r, x, y)) return true;
  }
  return false;
}

// —— 连通分量（按需洪泛，不入 state）——

// cityComp 城市分量：成员 [{x,y,f,cell,feat}] + open 是否有开放城市边
export function cityComp(s, x0, y0, f0) {
  const members = [];
  const seen = new Set();
  const stack = [[x0, y0, f0]];
  let open = false;
  while (stack.length) {
    const [x, y, f] = stack.pop();
    const kk = kkey(x, y) + ':' + f;
    if (seen.has(kk)) continue;
    seen.add(kk);
    const cell = s.board[kkey(x, y)];
    const feat = TILES[cell.t].feats[f];
    members.push({ x, y, f, cell, feat });
    for (const c of feat.e) {
      const e = (c + cell.r) % 4;
      const nc = cellAt(s, x + DIR[e][0], y + DIR[e][1]);
      if (!nc) { open = true; continue; }
      const nf = TILES[nc.t].edgeCity[((e + 2) - nc.r + 4) % 4];
      if (nf < 0) { open = true; continue; }
      if (!seen.has(kkey(x + DIR[e][0], y + DIR[e][1]) + ':' + nf)) {
        stack.push([x + DIR[e][0], y + DIR[e][1], nf]);
      }
    }
  }
  return { members, open };
}

// roadComp 道路分量（结构与 cityComp 同）
export function roadComp(s, x0, y0, f0) {
  const members = [];
  const seen = new Set();
  const stack = [[x0, y0, f0]];
  let open = false;
  while (stack.length) {
    const [x, y, f] = stack.pop();
    const kk = kkey(x, y) + ':' + f;
    if (seen.has(kk)) continue;
    seen.add(kk);
    const cell = s.board[kkey(x, y)];
    const feat = TILES[cell.t].feats[f];
    members.push({ x, y, f, cell, feat });
    for (const c of feat.e) {
      const e = (c + cell.r) % 4;
      const nc = cellAt(s, x + DIR[e][0], y + DIR[e][1]);
      if (!nc) { open = true; continue; }
      const nf = TILES[nc.t].edgeRoad[((e + 2) - nc.r + 4) % 4];
      if (nf < 0) { open = true; continue; }
      if (!seen.has(kkey(x + DIR[e][0], y + DIR[e][1]) + ':' + nf)) {
        stack.push([x + DIR[e][0], y + DIR[e][1], nf]);
      }
    }
  }
  return { members, open };
}

// farmComp 农田分量：槽位跨块连通（本块 slot s ↔ 邻块 slot 2-s）
export function farmComp(s, x0, y0, f0) {
  const members = [];
  const seen = new Set();
  const stack = [[x0, y0, f0]];
  while (stack.length) {
    const [x, y, f] = stack.pop();
    const kk = kkey(x, y) + ':' + f;
    if (seen.has(kk)) continue;
    seen.add(kk);
    const cell = s.board[kkey(x, y)];
    const feat = TILES[cell.t].feats[f];
    members.push({ x, y, f, cell, feat });
    for (const [c, slot] of feat.c) {
      const e = (c + cell.r) % 4;
      const nx = x + DIR[e][0];
      const ny = y + DIR[e][1];
      const nc = cellAt(s, nx, ny);
      if (!nc) continue;
      const nf = TILES[nc.t].slotFarm[((e + 2) - nc.r + 4) % 4][2 - slot];
      if (nf === undefined) continue;
      if (!seen.has(kkey(nx, ny) + ':' + nf)) stack.push([nx, ny, nf]);
    }
  }
  return { members };
}

// compSig 分量规范签名（终局去重用）
function compSig(comp) {
  return comp.members.map((m) => kkey(m.x, m.y) + ':' + m.f).sort().join('|');
}

// compMeeples 分量上随从归属统计
export function compMeeples(members) {
  const counts = {};
  for (const m of members) {
    if (m.cell.m === m.f && m.cell.mSeat >= 0) counts[m.cell.mSeat] = (counts[m.cell.mSeat] || 0) + 1;
  }
  return counts;
}

// winners 多数方（并列全得）
function winners(counts) {
  const vals = Object.values(counts);
  const max = vals.length ? Math.max(...vals) : 0;
  if (max <= 0) return [];
  return Object.keys(counts).filter((k) => counts[k] === max).map(Number);
}

// award 发分并累计明细（city/road/mon/farm）
function award(s, seat, pts, cat) {
  s.players[seat].score += pts;
  s.players[seat][cat] += pts;
}

// returnMeeples 分量上随从全部归还
function returnMeeples(s, members) {
  for (const m of members) {
    if (m.cell.m === m.f && m.cell.mSeat >= 0) {
      s.players[m.cell.mSeat].meeples++;
      m.cell.m = -1;
      m.cell.mSeat = -1;
    }
  }
}

// settleComp 完成城市/道路结算：多数方全额得分 + 随从归还；返回是否有人得分
function settleComp(s, comp, kind) {
  const ws = winners(compMeeples(comp.members));
  if (!ws.length) return false;
  const tiles = new Set(comp.members.map((m) => kkey(m.x, m.y))).size;
  const pennants = comp.members.reduce((a, m) => a + (m.feat.p || 0), 0);
  const pts = kind === 'C' ? tiles * 2 + pennants * 2 : tiles;
  const key = kind === 'C' ? 'ca.log.cityDone' : 'ca.log.roadDone';
  const cat = kind === 'C' ? 'city' : 'road';
  for (const w of ws) {
    award(s, w, pts, cat);
    log(s, w, key, { n: pts });
  }
  returnMeeples(s, comp.members);
  return true;
}

// —— 修道院 ——

// monSurrounded 修道院 3×3 是否被占满
export function monSurrounded(s, x, y) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      if (!cellAt(s, x + dx, y + dy)) return false;
    }
  }
  return true;
}

// monOccupied 修道院 3×3 已占格数（含自身；终局 1 分/格）
function monOccupied(s, x, y) {
  let n = 1;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      if (cellAt(s, x + dx, y + dy)) n++;
    }
  }
  return n;
}

// settleMonastery 修道院围满结算（9 分）并归还随从
function settleMonastery(s, x, y) {
  const cell = cellAt(s, x, y);
  if (!cell || cell.m < 0) return;
  const seat = cell.mSeat;
  award(s, seat, 9, 'mon');
  s.players[seat].meeples++;
  cell.m = -1;
  cell.mSeat = -1;
  log(s, seat, 'ca.log.monDone', { n: 9 });
}

// —— 随从合法性 ——

// featMeepleLegal 该特征分量上是否无随从（修道院独占单块，恒可放）
export function featMeepleLegal(s, x, y, f) {
  const cell = cellAt(s, x, y);
  const feat = TILES[cell.t].feats[f];
  if (feat.k === 'M') return true;
  const comp = feat.k === 'C' ? cityComp(s, x, y, f)
    : feat.k === 'R' ? roadComp(s, x, y, f) : farmComp(s, x, y, f);
  return !comp.members.some((m) => m.cell.m === m.f);
}

// meepleOptions 刚落块上可放随从的行动列表
export function meepleOptions(s, x, y) {
  const cell = cellAt(s, x, y);
  const out = [];
  TILES[cell.t].feats.forEach((f, i) => {
    if (featMeepleLegal(s, x, y, i)) out.push({ kind: 'meeple', x, y, f: i });
  });
  return out;
}

// —— 回合机 ——

// drawForTurn 为当前回合抽块；不可放的块按官方规则弃掉重抽；堆尽则终局
function drawForTurn(s) {
  s.current = -1;
  while (s.deck.length) {
    const t = s.deck.shift();
    if (hasPlacement(s, t)) {
      s.current = t;
      return;
    }
    s.discarded++;
    log(s, -1, 'ca.log.discard', { tile: tileName(t) });
  }
  finalize(s);
}

// endTurn 结束当前回合：换人抽块；最后一块放完即终局
function endTurn(s) {
  s.last = null;
  if (!s.deck.length) {
    finalize(s);
    return;
  }
  s.turn = (s.turn + 1) % s.players.length;
  s.phase = 'tile';
  drawForTurn(s);
}

// initialState 开局：起始块居中，洗 71 块牌堆，先手抽块
export function initialState(setup) {
  const seats = setup.seats;
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      score: 0, meeples: MEEPLES_PER_PLAYER,
      city: 0, road: 0, mon: 0, farm: 0,
    })),
    board: { '0,0': { t: START_TYPE, r: 0, m: -1, mSeat: -1 } },
    deck: [],
    turn: 0,
    phase: 'tile',
    current: -1,
    last: null, // 随从阶段刚落的块 'x,y'
    discarded: 0,
    gameOver: false,
    log: [],
  };
  s.deck = shuffled(s, DECK_TYPES);
  log(s, -1, 'ca.log.start', { n: seats.length });
  drawForTurn(s);
  return s;
}

// legalActions 唯一合法性来源
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.phase === 'tile') {
    const out = [];
    if (s.current < 0) return out;
    for (const [x, y] of candidateCells(s)) {
      for (let r = 0; r < 4; r++) {
        if (canPlace(s, s.current, r, x, y)) out.push({ kind: 'place', x, y, r });
      }
    }
    if (!out.length) return [{ kind: 'skip' }]; // 防御：引擎抽块已规避不可放块
    return out;
  }
  const out = [];
  if (s.last) {
    const [x, y] = s.last.split(',').map(Number);
    out.push(...meepleOptions(s, x, y));
  }
  out.push({ kind: 'skip' });
  return out;
}

// apply 纯函数入口：深拷贝 → 派发 → 返回新 state
export function apply(state, action) {
  const s = clone(state);
  if (action.kind === 'place') applyPlace(s, action);
  else if (action.kind === 'meeple') applyMeeple(s, action);
  else if (action.kind === 'skip') applySkip(s);
  return s;
}

// applyPlace 落块：入盘 → 进随从阶段（无随从可派则直接结算过回合）
function applyPlace(s, a) {
  if (s.phase !== 'tile' || s.current < 0 || !canPlace(s, s.current, a.r, a.x, a.y)) return;
  const t = s.current;
  const seat = s.turn;
  s.board[kkey(a.x, a.y)] = { t, r: a.r, m: -1, mSeat: -1 };
  s.current = -1; // 块已离手入盘
  log(s, seat, 'ca.log.place', { tile: tileName(t), x: a.x, y: a.y });
  s.last = kkey(a.x, a.y);
  if (s.players[seat].meeples > 0 && meepleOptions(s, a.x, a.y).length) {
    s.phase = 'meeple';
  } else {
    settleTurn(s, a.x, a.y);
    endTurn(s);
  }
}

// settleTurn 回合结算（官方顺序：随从去留决定后）：本块城市/道路分量完成、
// 本块与周边八块修道院围满。落块即完成的空分量此时可能已获随从 → 一并结算
function settleTurn(s, x, y) {
  const cell = s.board[kkey(x, y)];
  const done = new Set();
  TILES[cell.t].feats.forEach((f, i) => {
    if (f.k !== 'C' && f.k !== 'R') return;
    const comp = f.k === 'C' ? cityComp(s, x, y, i) : roadComp(s, x, y, i);
    const sig = compSig(comp);
    if (comp.open || done.has(sig)) return;
    done.add(sig);
    settleComp(s, comp, f.k);
  });
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const c = cellAt(s, x + dx, y + dy);
      if (c && c.m >= 0 && TILES[c.t].feats[c.m].k === 'M' && monSurrounded(s, x + dx, y + dy)) {
        settleMonastery(s, x + dx, y + dy);
      }
    }
  }
}

// applyMeeple 派随从 → 回合结算 → 过回合
function applyMeeple(s, a) {
  if (s.phase !== 'meeple' || !s.last || s.last !== kkey(a.x, a.y)) return;
  const cell = cellAt(s, a.x, a.y);
  const feat = TILES[cell.t].feats[a.f];
  const p = s.players[s.turn];
  if (!feat || p.meeples <= 0) return;
  if (!meepleOptions(s, a.x, a.y).some((o) => o.f === a.f)) return;
  cell.m = a.f;
  cell.mSeat = s.turn;
  p.meeples--;
  log(s, s.turn, 'ca.log.meeple', { feat: FEAT_NAME[feat.k] });
  settleTurn(s, a.x, a.y);
  endTurn(s);
}

// applySkip 跳过（随从阶段跳过 = 不放随从；tile 阶段为防御路径 = 弃块重抽）
function applySkip(s) {
  if (s.phase === 'tile') {
    if (s.current >= 0) {
      s.discarded++;
      log(s, -1, 'ca.log.discard', { tile: tileName(s.current) });
    }
    drawForTurn(s);
  } else {
    const [x, y] = s.last.split(',').map(Number);
    settleTurn(s, x, y);
    endTurn(s);
  }
}

// —— 终局结算 ——

// finalize 终局：未完成城市/道路减半 + 修道院按已占格 + 农夫计分
function finalize(s) {
  s.gameOver = true;
  s.phase = 'over';
  s.current = -1;
  s.last = null;
  const done = new Set();
  for (const k of Object.keys(s.board)) {
    const [x, y] = k.split(',').map(Number);
    const cell = s.board[k];
    if (cell.m < 0) continue;
    const feat = TILES[cell.t].feats[cell.m];
    if (feat.k === 'M') {
      const n = monOccupied(s, x, y);
      award(s, cell.mSeat, n, 'mon');
      s.players[cell.mSeat].meeples++;
      cell.m = -1;
      cell.mSeat = -1;
      continue;
    }
    if (feat.k === 'F') continue; // 农夫统一在 settleFarmers 处理
    const comp = feat.k === 'C' ? cityComp(s, x, y, cell.m) : roadComp(s, x, y, cell.m);
    const sig = compSig(comp);
    if (done.has(sig)) continue;
    done.add(sig);
    const ws = winners(compMeeples(comp.members));
    if (!ws.length) continue;
    const tiles = new Set(comp.members.map((m) => kkey(m.x, m.y))).size;
    const pennants = comp.members.reduce((a2, m) => a2 + (m.feat.p || 0), 0);
    const pts = feat.k === 'C' ? tiles + pennants : tiles;
    const key = feat.k === 'C' ? 'ca.log.cityEnd' : 'ca.log.roadEnd';
    const cat = feat.k === 'C' ? 'city' : 'road';
    for (const w of ws) {
      award(s, w, pts, cat);
      log(s, w, key, { n: pts });
    }
    returnMeeples(s, comp.members);
  }
  settleFarmers(s);
  log(s, -1, 'ca.log.final', {});
}

// settleFarmers 终局农夫：每块农田多数方 3 分 × 相邻完成城市数
function settleFarmers(s) {
  const done = new Set();
  for (const k of Object.keys(s.board)) {
    const [x, y] = k.split(',').map(Number);
    const cell = s.board[k];
    if (cell.m < 0) continue;
    const feat = TILES[cell.t].feats[cell.m];
    if (feat.k !== 'F') continue;
    const comp = farmComp(s, x, y, cell.m);
    const sig = compSig(comp);
    if (done.has(sig)) continue;
    done.add(sig);
    const ws = winners(compMeeples(comp.members));
    if (!ws.length) continue;
    const cities = new Set();
    for (const m of comp.members) {
      for (const ci of TILES[m.cell.t].feats[m.f].adj) {
        const cc = cityComp(s, m.x, m.y, ci);
        if (!cc.open) cities.add(compSig(cc));
      }
    }
    const pts = cities.size * 3;
    if (pts) {
      for (const w of ws) {
        award(s, w, pts, 'farm');
        log(s, w, 'ca.log.farmPts', { n: pts });
      }
    }
    returnMeeples(s, comp.members);
  }
}

// currentPlayer 当前待决策座位
export function currentPlayer(s) { return s.turn; }

// isGameOver 是否终局
export function isGameOver(s) { return !!s.gameOver; }

// score 结算（框架终局屏调用；total 为累计分，breakdown 为明细键值）
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.score,
    breakdown: [
      ['ca.bd.city', p.city],
      ['ca.bd.road', p.road],
      ['ca.bd.mon', p.mon],
      ['ca.bd.farm', p.farm],
    ],
  }));
}
