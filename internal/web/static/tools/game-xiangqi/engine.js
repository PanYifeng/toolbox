// xiangqi engine.js — 中国象棋规则引擎 + alphabeta 接口实现。
// state = { board: 10x9 字符阵（红 K R H E A C P 大写 / 黑 k r h e a c p 小写 / '.' 空）,
//   turn: 'r'|'b' }。row0=黑底，row9=红底；红向上(row 递减)、黑向下(row 递增)。
// move = { fr,fc,tr,tc }。暴露 clone/legalMoves/apply/evaluate/inCheck/opp/moveScore 供 alphabeta 调用。
// noMovesIsLoss=true：困毙（无合法步且未被将）按中国象棋规则判负，区别于国象的和棋。

const RED = 'r', BLK = 'b';
const ROWS = 10, COLS = 9;
// 子力估值（中象经验值），K 不可俘故为 0
const VAL = { k: 0, r: 900, h: 400, c: 450, e: 200, a: 200, p: 100 };

export function opp(s) { return s === RED ? BLK : RED; }
function isRed(c) { return c !== '.' && c === c.toUpperCase(); }
function color(c) { return c === '.' ? null : (isRed(c) ? RED : BLK); }
function inb(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
// 九宫：red rows7-9 cols3-5，blk rows0-2 cols3-5
function inPalace(r, c, side) {
  if (c < 3 || c > 5) return false;
  return side === RED ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
}
// 河界：red 占 rows5-9，blk 占 rows0-4；象不过河
function ownSide(r, side) { return side === RED ? r >= 5 : r <= 4; }

// initialState 标准开局：黑在上（row0），红在下（row9）
export function initialState() {
  const back = (s) => {
    const arr = ['r','h','e','a','k','a','e','h','r'];
    return s === RED ? arr.map((p) => p.toUpperCase()) : arr;
  };
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  board[0] = back(BLK);                       // 黑底
  board[2][1] = 'c'; board[2][7] = 'c';        // 黑炮
  [0,2,4,6,8].forEach((c) => { board[3][c] = 'p'; }); // 黑卒
  [0,2,4,6,8].forEach((c) => { board[6][c] = 'P'; }); // 红兵
  board[7][1] = 'C'; board[7][7] = 'C';        // 红炮
  board[9] = back(RED);                        // 红底
  return { board, turn: RED };
}

export function clone(s) {
  return { board: s.board.map((row) => [...row]), turn: s.turn };
}

function findGeneral(board, side) {
  const k = side === RED ? 'K' : 'k';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] === k) return [r, c];
  return [-1, -1];
}

// pseudoMoves 生成 side 的伪合法走法（不过滤己方将被将；含蹩马腿/塞象眼/炮翻山）
function pseudoMoves(state, side) {
  const out = [], b = state.board;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = b[r][c];
    if (p === '.' || color(p) !== side) continue;
    switch (p.toLowerCase()) {
      case 'r': slideRay(b, r, c, side, out, true); break;          // 车：射线吃子
      case 'h': genHorse(b, r, c, side, out); break;                 // 马：蹩马腿
      case 'e': genElephant(b, r, c, side, out); break;             // 相/象：塞象眼+不过河
      case 'a': genAdvisor(b, r, c, side, out); break;             // 仕/士：九宫斜走
      case 'k': genGeneral(b, r, c, side, out); break;             // 将/帅：九宫正交
      case 'c': genCannon(b, r, c, side, out); break;               // 炮：翻山吃子
      case 'p': genPawn(b, r, c, side, out); break;                // 兵/卒
    }
  }
  return out;
}

// slideRay 车：四向射线，遇敌吃、遇友止
function slideRay(b, r, c, side, out) {
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let rr = r + dr, cc = c + dc;
    while (inb(rr, cc)) {
      const t = b[rr][cc];
      if (t === '.') out.push({ fr: r, fc: c, tr: rr, tc: cc });
      else { if (color(t) !== side) out.push({ fr: r, fc: c, tr: rr, tc: cc }); break; }
      rr += dr; cc += dc;
    }
  }
}

// genHorse 马：8 个日字步，蹩马腿须空
function genHorse(b, r, c, side, out) {
  const steps = [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]];
  for (const [dr, dc] of steps) {
    const tr = r + dr, tc = c + dc;
    if (!inb(tr, tc)) continue;
    // 蹩马腿：长方向正交一格须空
    const lr = Math.abs(dr) === 2 ? r + Math.sign(dr) : r;
    const lc = Math.abs(dc) === 2 ? c + Math.sign(dc) : c;
    if (b[lr][lc] !== '.') continue;
    const t = b[tr][tc];
    if (t === '.' || color(t) !== side) out.push({ fr: r, fc: c, tr, tc });
  }
}

// genElephant 相/象：田字步，塞象眼须空且不过河
function genElephant(b, r, c, side, out) {
  for (const [dr, dc] of [[-2,-2],[-2,2],[2,-2],[2,2]]) {
    const tr = r + dr, tc = c + dc;
    if (!inb(tr, tc) || !ownSide(tr, side)) continue;       // 不过河
    if (b[r + dr/2][c + dc/2] !== '.') continue;           // 塞象眼
    const t = b[tr][tc];
    if (t === '.' || color(t) !== side) out.push({ fr: r, fc: c, tr, tc });
  }
}

// genAdvisor 仕/士：九宫内斜走一步
function genAdvisor(b, r, c, side, out) {
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    const tr = r + dr, tc = c + dc;
    if (!inb(tr, tc) || !inPalace(tr, tc, side)) continue;
    const t = b[tr][tc];
    if (t === '.' || color(t) !== side) out.push({ fr: r, fc: c, tr, tc });
  }
}

// genGeneral 将/帅：九宫内正交一步（飞将由 inCheck 统一拦截，此处不生成翻将吃）
function genGeneral(b, r, c, side, out) {
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const tr = r + dr, tc = c + dc;
    if (!inb(tr, tc) || !inPalace(tr, tc, side)) continue;
    const t = b[tr][tc];
    if (t === '.' || color(t) !== side) out.push({ fr: r, fc: c, tr, tc });
  }
}

// genCannon 炮：移动如车至空格（路须空）；吃子须跳恰 1 炮架落敌子
function genCannon(b, r, c, side, out) {
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let rr = r + dr, cc = c + dc;
    // 1) 移动至空格（路须清，炮架前可走）
    while (inb(rr, cc) && b[rr][cc] === '.') {
      out.push({ fr: r, fc: c, tr: rr, tc: cc });
      rr += dr; cc += dc;
    }
    // 2) 越过第一子（炮架），找第二子吃
    if (!inb(rr, cc)) continue;          // 炮架即第一子
    rr += dr; cc += dc;                  // 越过炮架继续
    while (inb(rr, cc)) {
      const t = b[rr][cc];
      if (t !== '.') { if (color(t) !== side) out.push({ fr: r, fc: c, tr: rr, tc: cc }); break; }
      rr += dr; cc += dc;
    }
  }
}

// genPawn 兵/卒：未过河仅前，过河加左右，永不退
function genPawn(b, r, c, side, out) {
  const fwd = side === RED ? -1 : 1;           // 红向上(row 减)，黑向下(row 增)
  const crossed = side === RED ? r <= 4 : r >= 5; // 是否已过河
  const push = (tr, tc) => {
    if (!inb(tr, tc)) return;
    const t = b[tr][tc];
    if (t === '.' || color(t) !== side) out.push({ fr: r, fc: c, tr, tc });
  };
  push(r + fwd, c);                            // 前
  if (crossed) { push(r, c - 1); push(r, c + 1); } // 过河后可左右
}

// isAttacked (r,c) 是否被 side 攻击（直接模式检测，避免递归）
// 检车射线、马日字+蹩腿、炮翻山、兵推进；仕/相/将不直接攻击对方将（飞将另判）
export function isAttacked(board, r, c, side) {
  const rook = side === RED ? 'R' : 'r';
  const horse = side === RED ? 'H' : 'h';
  const cannon = side === RED ? 'C' : 'c';
  const pawn = side === RED ? 'P' : 'p';
  const pawnFwd = side === RED ? 1 : -1;     // side 的兵"来自"方向：红兵在下方(row+1)向上攻
  const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
  // 1) 沿四向射线：第一子若为车则攻击；炮须先一炮架再见炮
  for (const [dr, dc] of DIRS) {
    let rr = r + dr, cc = c + dc, screen = false;
    while (inb(rr, cc)) {
      const p = board[rr][cc];
      if (p !== '.') {
        if (!screen) {                 // 第一子
          if (p === rook) return true; // 车直射（无炮架）
          screen = true;              // 任意子均可作炮架，继续找第二子
        } else {                       // 第二子（炮架后）
          if (p === cannon) return true; // 炮翻山
          break;                       // 第二子非炮，本方向无炮攻击
        }
      }
      rr += dr; cc += dc;
    }
  }
  // 2) 马：敌方马在 8 个日字位且其蹩腿格空则攻击 (r,c)
  for (const [dr, dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) {
    const hr = r + dr, hc = c + dc;
    if (!inb(hr, hc) || board[hr][hc] !== horse) continue;
    const lr = Math.abs(dr) === 2 ? hr - Math.sign(dr) : hr;   // 马腿（从马往目标方向）
    const lc = Math.abs(dc) === 2 ? hc - Math.sign(dc) : hc;
    if (board[lr][lc] === '.') return true;
  }
  // 3) 兵：side 的兵从 (r+pawnFwd, c) 直攻；过河兵可从 (r, c±1) 横攻
  const pr = r + pawnFwd;
  if (inb(pr, c) && board[pr][c] === pawn) return true;
  const crossed = side === RED ? pr <= 4 : pr >= 5;
  if (crossed) {
    for (const dc of [-1, 1]) if (inb(r, c + dc) && board[r][c + dc] === pawn) return true;
  }
  return false;
}

// inCheck：side 的将是否被攻击，或两将对面（飞将）
export function inCheck(state, side) {
  const [gr, gc] = findGeneral(state.board, side);
  if (isAttacked(state.board, gr, gc, opp(side))) return true;
  // 飞将：两将同列且中间无子 → 当面照将（违规局面）
  const [er, ec] = findGeneral(state.board, opp(side));
  if (gc === ec) {
    let clear = true;
    for (let r = Math.min(gr, er) + 1; r < Math.max(gr, er); r++) {
      if (state.board[r][gc] !== '.') { clear = false; break; }
    }
    if (clear) return true;
  }
  return false;
}

// legalMoves 过滤：走完己方将不能被将（含飞将）
export function legalMoves(state, side) {
  const out = [];
  for (const m of pseudoMoves(state, side)) {
    const s2 = apply(state, m);
    if (!inCheck(s2, side)) out.push(m);
  }
  return out;
}

// apply 应用走法返回新 state（不改入参）
export function apply(state, move) {
  const s = clone(state), b = s.board;
  b[move.tr][move.tc] = b[move.fr][move.fc];
  b[move.fr][move.fc] = '.';
  s.turn = opp(state.turn);
  return s;
}

// evaluate 子力 + 简单 PST（兵推进、车马占中线），返回 side 视角
export function evaluate(state, side) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = state.board[r][c]; if (p === '.') continue;
    const v = VAL[p.toLowerCase()] + pst(p, r, c);
    s += isRed(p) ? v : -v;
  }
  return side === RED ? s : -s;
}

// pst 位置分：兵推进、过河兵加分；车马居中略加
function pst(p, r, c) {
  const t = p.toLowerCase();
  if (t === 'p') { // 兵卒：过河且越前得分
    const crossed = isRed(p) ? r <= 4 : r >= 5;
    const adv = isRed(p) ? (6 - r) : (r - 3);
    return Math.max(0, adv) * 8 + (crossed ? 40 : 0);
  }
  if (t === 'r' || t === 'h' || t === 'c') return (4 - Math.abs(c - 4)) * 3;
  return 0;
}

// moveScore 走法排序分（吃子优先），供 alphabeta 排序
export function moveScore(state, m) {
  const t = state.board[m.tr][m.tc];
  return t === '.' ? 0 : VAL[t.toLowerCase()];
}
