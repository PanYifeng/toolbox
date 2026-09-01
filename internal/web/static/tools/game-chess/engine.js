// chess engine.js — 国际象棋规则引擎 + alphabeta 接口实现。
// state = { board: 8x8 字符阵（'PNBRQK' 白大写 / 'pnbrqk' 黑小写 / '.' 空）,
//   turn: 'w'|'b', cr: {wK,wQ,bK,bQ} 易位权, ep: [r,c]|null 过路兵目标格,
//   half, full 半步/全步计数 }。row0=黑底(r8)，row7=白底(r1)；白兵向 row0 前进。
// move = { fr,fc,tr,tc, promo?:'q'|'r'|'b'|'n', ep?:true, castle?:'K'|'Q' }。
// 暴露 clone/legalMoves/apply/evaluate/inCheck/opp/moveScore 供 alphabeta.js 调用。

const W = 'w', B = 'b';
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const OFF = { n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]], b: [[-1,-1],[-1,1],[1,-1],[1,1]], r: [[-1,0],[1,0],[0,-1],[0,1]], q: [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]] };

export function opp(s) { return s === W ? B : W; }
function isWhite(c) { return c !== '.' && c === c.toUpperCase(); }
function color(c) { return c === '.' ? null : (isWhite(c) ? W : B); }
function inb(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// initialState 标准开局
export function initialState() {
  const back = (s) => ['r','n','b','q','k','b','n','r'].map((p) => (s === B ? p : p.toUpperCase()));
  const board = [back(B), Array(8).fill('p'), ...Array.from({ length: 4 }, () => Array(8).fill('.')),
                 Array(8).fill('P'), back(W)];
  return { board, turn: W, cr: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, half: 0, full: 1 };
}

export function clone(s) {
  return { board: s.board.map((row) => [...row]), turn: s.turn, cr: { ...s.cr }, ep: s.ep ? [...s.ep] : null, half: s.half, full: s.full };
}

// findKing 定位 side 的王格
function findKing(board, side) {
  const k = side === W ? 'K' : 'k';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
  return [-1, -1];
}

// isAttacked (r,c) 是否被 side 攻击（直接模式检测，避免递归）
export function isAttacked(board, r, c, side) {
  // 兵：side 的兵从 (r±1, c±1) 攻击 (r,c)
  const pd = side === W ? 1 : -1; // 白兵在 (r+1,..) 攻上；黑兵在 (r-1,..) 攻下
  for (const dc of [-1, 1]) {
    const pr = r + pd, pc = c + dc;
    if (inb(pr, pc) && board[pr][pc] === (side === W ? 'P' : 'p')) return true;
  }
  // 马
  const n = side === W ? 'N' : 'n';
  for (const [dr, dc] of OFF.n) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && board[rr][cc] === n) return true; }
  // 王
  const kg = side === W ? 'K' : 'k';
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (inb(rr, cc) && board[rr][cc] === kg) return true;
  }
  // 滑行：象/后（斜）、车/后（直）
  const bishops = side === W ? ['B','Q'] : ['b','q'];
  const rooks = side === W ? ['R','Q'] : ['r','q'];
  for (const [dr, dc] of OFF.b) {
    let rr = r + dr, cc = c + dc;
    while (inb(rr, cc)) { const p = board[rr][cc]; if (p !== '.') { if (bishops.includes(p)) return true; break; } rr += dr; cc += dc; }
  }
  for (const [dr, dc] of OFF.r) {
    let rr = r + dr, cc = c + dc;
    while (inb(rr, cc)) { const p = board[rr][cc]; if (p !== '.') { if (rooks.includes(p)) return true; break; } rr += dr; cc += dc; }
  }
  return false;
}

export function inCheck(state, side) {
  const [kr, kc] = findKing(state.board, side);
  return isAttacked(state.board, kr, kc, opp(side));
}

// pseudoMoves 生成 side 的伪合法走法（含易位/过路兵/升变，易位含穿将校验）
function pseudoMoves(state, side) {
  const out = [];
  const b = state.board;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c];
    if (p === '.' || color(p) !== side) continue;
    const t = p.toLowerCase();
    if (t === 'p') genPawn(b, r, c, side, state.ep, out);
    else if (t === 'n') for (const [dr, dc] of OFF.n) pushSlide(b, r, c, r + dr, c + dc, side, out, false);
    else if (t === 'k') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; pushSlide(b, r, c, r + dr, c + dc, side, out, false); } genCastle(state, r, c, side, out); }
    else { const dirs = OFF[t]; for (const [dr, dc] of dirs) slideRay(b, r, c, dr, dc, side, out); }
  }
  return out;
}

// pushSlide 落子到 (tr,tc)（马/王单步）：空或吃敌
function pushSlide(b, fr, fc, tr, tc, side, out) {
  if (!inb(tr, tc)) return;
  const t = b[tr][tc];
  if (t === '.' || color(t) !== side) out.push({ fr, fc, tr, tc });
}

// slideRay 车/象/后射线滑动
function slideRay(b, fr, fc, dr, dc, side, out) {
  let r = fr + dr, c = fc + dc;
  while (inb(r, c)) {
    const t = b[r][c];
    if (t === '.') out.push({ fr, fc, tr: r, tc: c });
    else { if (color(t) !== side) out.push({ fr, fc, tr: r, tc: c }); break; }
    r += dr; c += dc;
  }
}

// genPawn 兵走法：进/起步双进/斜吃/过路兵/升变
function genPawn(b, r, c, side, ep, out) {
  const dir = side === W ? -1 : 1;
  const startRow = side === W ? 6 : 1;
  const promoRow = side === W ? 0 : 7;
  const push = (tr, tc, capt) => {
    if (tr === promoRow) for (const pr of ['q','r','b','n']) out.push({ fr: r, fc: c, tr, tc, promo: pr, ep: capt ? false : undefined });
    else out.push({ fr: r, fc: c, tr, tc, ep: capt ? false : undefined });
  };
  // 前进 1
  if (inb(r + dir, c) && b[r + dir][c] === '.') {
    push(r + dir, c, false);
    if (r === startRow && b[r + 2 * dir][c] === '.') out.push({ fr: r, fc: c, tr: r + 2 * dir, tc: c }); // 起步双进
  }
  // 斜吃 + 过路兵
  for (const dc of [-1, 1]) {
    const tr = r + dir, tc = c + dc;
    if (!inb(tr, tc)) continue;
    const t = b[tr][tc];
    if (t !== '.' && color(t) === opp(side)) push(tr, tc, true);
    else if (ep && ep[0] === tr && ep[1] === tc) out.push({ fr: r, fc: c, tr, tc, ep: true });
  }
}

// genCastle 王车易位：权在、路径空、王不在将且不穿将格
function genCastle(state, r, c, side, out) {
  const b = state.board;
  const enemy = opp(side);
  const row = side === W ? 7 : 0;
  if (r !== row || c !== 4) return; // 王须在 e 列本方底线
  if (isAttacked(b, r, c, enemy)) return; // 被将不能易位
  const sideK = side === W ? 'wK' : 'bK', sideQ = side === W ? 'wQ' : 'bQ';
  // 王翼：f,g 空，g 不被攻
  if (state.cr[sideK] && b[row][5] === '.' && b[row][6] === '.' && b[row][7] === (side === W ? 'R' : 'r')
      && !isAttacked(b, row, 5, enemy) && !isAttacked(b, row, 6, enemy)) out.push({ fr: r, fc: c, tr: row, tc: 6, castle: 'K' });
  // 后翼：b,c,d 空，d 不被攻
  if (state.cr[sideQ] && b[row][1] === '.' && b[row][2] === '.' && b[row][3] === '.' && b[row][0] === (side === W ? 'R' : 'r')
      && !isAttacked(b, row, 3, enemy) && !isAttacked(b, row, 2, enemy)) out.push({ fr: r, fc: c, tr: row, tc: 2, castle: 'Q' });
}

// legalMoves 过滤：走完己方王不能被将
export function legalMoves(state, side) {
  const out = [];
  for (const m of pseudoMoves(state, side)) {
    const s2 = apply(state, m);
    if (!inCheck(s2, side)) out.push(m);
  }
  return out;
}

// apply 应用走法返回新 state（不改入参）；处理升变/过路兵/易位/易位权/ep 目标
export function apply(state, move) {
  const s = clone(state);
  const b = s.board;
  const p = b[move.fr][move.fc];
  const t = p.toLowerCase();
  b[move.fr][move.fc] = '.';
  // 升变
  if (move.promo) b[move.tr][move.tc] = color(p) === W ? move.promo.toUpperCase() : move.promo;
  else b[move.tr][move.tc] = p;
  // 过路兵：吃子落在空格，被吃兵在 (fr, tc)
  if (t === 'p' && move.ep) b[move.fr][move.tc] = '.';
  // 易位：同步挪车
  if (move.castle === 'K') { b[move.tr][5] = b[move.tr][7]; b[move.tr][7] = '.'; }
  if (move.castle === 'Q') { b[move.tr][3] = b[move.tr][0]; b[move.tr][0] = '.'; }
  // 易位权更新
  if (t === 'k') { if (color(p) === W) { s.cr.wK = false; s.cr.wQ = false; } else { s.cr.bK = false; s.cr.bQ = false; } }
  if (t === 'r') {
    if (move.fr === 7 && move.fc === 0) s.cr.wQ = false; if (move.fr === 7 && move.fc === 7) s.cr.wK = false;
    if (move.fr === 0 && move.fc === 0) s.cr.bQ = false; if (move.fr === 0 && move.fc === 7) s.cr.bK = false;
  }
  // 被吃车也失权
  if (move.tr === 7 && move.tc === 0) s.cr.wQ = false; if (move.tr === 7 && move.tc === 7) s.cr.wK = false;
  if (move.tr === 0 && move.tc === 0) s.cr.bQ = false; if (move.tr === 0 && move.tc === 7) s.cr.bK = false;
  // ep 目标：双进时设
  s.ep = (t === 'p' && Math.abs(move.tr - move.fr) === 2) ? [(move.fr + move.tr) / 2, move.fc] : null;
  // 半步/全步
  s.half = (t === 'p' || state.board[move.tr][move.tc] !== '.') ? 0 : s.half + 1;
  s.full += (color(p) === B) ? 1 : 0;
  s.turn = opp(state.turn);
  return s;
}

// evaluate 估值：material + 简单 PST（兵前进/中线象马），返回 side 视角
export function evaluate(state, side) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = state.board[r][c]; if (p === '.') continue;
    const v = VAL[p.toLowerCase()];
    const pst = piecePst(p, r, c);
    s += isWhite(p) ? (v + pst) : -(v + pst);
  }
  return side === W ? s : -s;
}

// piecePst 极简位置表：兵越前越值、中心象马略加
function piecePst(p, r, c) {
  const t = p.toLowerCase();
  const fwd = isWhite(p) ? (6 - r) : (r - 1); // 兵推进度
  const cen = 4 - Math.abs(c - 3.5);          // 中心度
  if (t === 'p') return Math.max(0, fwd) * 5 + cen * 2;
  if (t === 'n' || t === 'b') return cen * 3;
  return 0;
}

// moveScore 走法排序分（吃子优先，MVV-LVA 简化），供 alphabeta 排序
export function moveScore(state, m) {
  const target = state.board[m.tr][m.tc];
  if (target === '.') return m.ep ? 100 : 0; // 过路兵按吃子
  return VAL[target.toLowerCase()];
}
