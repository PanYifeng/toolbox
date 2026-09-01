import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';
import { requestPaidUndo } from '/core/pay-undo.js';
import { initialState, legalMoves, apply, inCheck, opp } from './engine.js';

// 中国象棋：红方在下（人），黑方在上（电脑 worker minimax）。9×10 交叉点棋盘。
// 悔棋 5 元/次（自觉解锁）；计分=连胜（peak streak），用过悔棋的胜局不计入连胜。
const GAP = 54, MX = 54, MY = 54, ROWS = 10, COLS = 9;
const GLYPH = { K:'帥', A:'仕', E:'相', H:'傌', C:'砲', R:'俥', P:'兵', k:'將', a:'士', e:'象', h:'馬', c:'砲', r:'車', p:'卒' };
const BEST_KEY = 'tbxiangqibest', STREAK_KEY = 'tbxiangqistreak';
const HUMAN = 'r', CPU = 'b';

export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span id="xq-status" class="muted"></span>
      <span>${t('xq.streak')}: <b id="xq-streak">0</b></span>
      <span>${t('game.best')}: <b id="xq-best">0</b></span>
      <button id="xq-undo">${t('xq.undo')}</button>
      <button id="xq-new">${t('xq.new')}</button>
    </div>
    <p class="rules">${t('xq.howto')}</p>
    <div class="chess-wrap"><canvas id="xq-canvas" width="540" height="594" tabindex="0"></canvas></div>`;

  let state, sel, best, streak, usedUndo, reqId = 0, pendingId = 0, thinking = false;
  const history = [];
  const worker = new Worker('/tools/game-xiangqi/ai.js', { type: 'module' });
  const $cv = el.querySelector('#xq-canvas');
  const $status = el.querySelector('#xq-status');
  const $streak = el.querySelector('#xq-streak');
  const $best = el.querySelector('#xq-best');
  const ctx = $cv.getContext('2d');
  el.querySelector('#xq-new').onclick = newGame;
  el.querySelector('#xq-undo').onclick = undo;
  $cv.onclick = onCanvasClick;
  worker.onmessage = onWorker;
  newGame();
  mountGameCard(el, () => best, 'xiangqi');

  function newGame() {
    reqId++; // 使任何在途的 worker 回执失效，避免旧 AI 走法落到新棋盘
    state = initialState(); sel = null; thinking = false; usedUndo = false; history.length = 0;
    best = Number(localStorage.getItem(BEST_KEY) || 0); $best.textContent = best;
    streak = Number(localStorage.getItem(STREAK_KEY) || 0); $streak.textContent = streak;
    setStatus(t('xq.yourmove'), 'muted'); draw();
  }

  // undo 付费悔棋：先弹付费浮层，用户"已支付解锁"才回退；置 usedUndo 使本局胜局不计入连胜
  async function undo() {
    if (thinking) return;
    const ok = await requestPaidUndo({ feature: '中国象棋 悔棋(5元/次)', amount: 5 });
    if (!ok) return;
    usedUndo = true;
    while (history.length && state.turn !== HUMAN) { state = history.pop(); }
    if (history.length) state = history.pop();
    sel = null; setStatus(t('xq.yourmove'), 'muted'); draw();
  }

  function onCanvasClick(e) {
    if (thinking || state.turn !== HUMAN) return;
    const rect = $cv.getBoundingClientRect();
    const sc = $cv.width / rect.width;
    const x = (e.clientX - rect.left) * sc, y = (e.clientY - rect.top) * sc;
    const c = Math.round((x - MX) / GAP), r = Math.round((y - MY) / GAP);
    if (!inb(r, c)) return;
    if (sel) tryHumanMove(sel[0], sel[1], r, c); else trySelect(r, c);
  }

  function trySelect(r, c) {
    const p = state.board[r][c];
    if (p === '.' || (p === p.toUpperCase() ? HUMAN : CPU) !== HUMAN) return;
    sel = [r, c]; draw();
  }

  function tryHumanMove(fr, fc, tr, tc) {
    const moves = legalMoves(state, HUMAN).filter((m) => m.fr === fr && m.fc === fc && m.tr === tr && m.tc === tc);
    if (!moves.length) { sel = state.board[tr][tc] !== '.' ? null : [tr, tc]; draw(); return; }
    commitHuman(moves[0]);
  }

  function commitHuman(m) {
    history.push(state); state = apply(state, m); sel = null; draw();
    if (afterMove(HUMAN)) return;
    requestAI();
  }

  function requestAI() {
    thinking = true; setStatus(t('xq.thinking'), 'muted');
    reqId++; pendingId = reqId;
    worker.postMessage({ state, side: CPU, depth: 3 });
  }

  function onWorker(e) {
    if (e.data.move == null || pendingId !== reqId) return;
    thinking = false;
    history.push(state); state = apply(state, e.data.move); draw();
    afterMove(CPU);
  }

  // afterMove 走完后判定将死/困毙（中象困毙即负）/将军，返回是否终局。计分=连胜(peak streak)。
  function afterMove(mover) {
    const other = opp(mover);
    const noMoves = legalMoves(state, other).length === 0;
    if (noMoves) { // 将死或困毙均判 `other` 负
      if (mover === HUMAN) onWin();
      else onLose();
      draw(); return true;
    }
    if (inCheck(state, other)) setStatus(mover === HUMAN ? t('xq.check') : '', 'err');
    else if (state.turn === HUMAN) setStatus(t('xq.yourmove'), 'muted');
    draw(); return false;
  }

  // onWin 人将死/困毙电脑：用过悔棋则不计入连胜，仅提示；否则连胜+1 并更新历史最高
  function onWin() {
    if (usedUndo) { setStatus(t('xq.win') + ' ' + t('xq.usedUndo'), 'ok'); return; }
    streak++; localStorage.setItem(STREAK_KEY, streak); $streak.textContent = streak;
    if (streak > best) { best = streak; localStorage.setItem(BEST_KEY, best); $best.textContent = best; }
    setStatus(t('xq.win'), 'ok');
  }

  // onLose 人负（被将死或困毙）：连胜中断清零
  function onLose() {
    if (streak) { streak = 0; localStorage.setItem(STREAK_KEY, 0); $streak.textContent = 0; }
    setStatus(t('xq.lose'), 'err');
  }

  // draw 棋盘线 + 河界 + 九宫斜线 + 棋子 + 选中 + 合法点 + 将军高亮
  function draw() {
    drawBoard(); drawPieces();
    if (sel) {
      drawLegalDots();
      ctx.fillStyle = 'rgba(255,235,59,0.4)';
      circleAt(sel[0], sel[1], GAP / 2 - 2);
      ctx.fill();
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3;
      strokeCircle(sel[0], sel[1], GAP / 2);
    }
    const [kr, kc] = kingOf(state.turn);
    if (inCheck(state, state.turn) && state.turn === HUMAN) {
      ctx.fillStyle = 'rgba(220,38,38,0.45)'; circleAt(kr, kc, GAP / 2 - 2); ctx.fill();
    }
  }

  function drawBoard() {
    ctx.fillStyle = '#f1e3b0'; ctx.fillRect(0, 0, 540, 594);
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 1.5;
    for (let r = 0; r < ROWS; r++) line(MX, MY + r * GAP, MX + (COLS - 1) * GAP, MY + r * GAP);
    for (let c = 0; c < COLS; c++) {
      // 河界处中间断开：c 列在 row4-row5 之间不画（除最左最右）
      if (c === 0 || c === COLS - 1) line(MX + c * GAP, MY, MX + c * GAP, MY + (ROWS - 1) * GAP);
      else { line(MX + c * GAP, MY, MX + c * GAP, MY + 4 * GAP); line(MX + c * GAP, MY + 5 * GAP, MX + c * GAP, MY + 9 * GAP); }
    }
    // 九宫斜线
    line(MX + 3 * GAP, MY, MX + 5 * GAP, MY + 2 * GAP);
    line(MX + 5 * GAP, MY, MX + 3 * GAP, MY + 2 * GAP);
    line(MX + 3 * GAP, MY + 7 * GAP, MX + 5 * GAP, MY + 9 * GAP);
    line(MX + 5 * GAP, MY + 7 * GAP, MX + 3 * GAP, MY + 9 * GAP);
    // 河界文字
    ctx.fillStyle = '#3a2a12'; ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('楚 河', MX + 1.5 * GAP, MY + 4.5 * GAP);
    ctx.fillText('漢 界', MX + 6.5 * GAP, MY + 4.5 * GAP);
  }

  function drawLegalDots() {
    const moves = legalMoves(state, HUMAN).filter((m) => m.fr === sel[0] && m.fc === sel[1]);
    ctx.fillStyle = 'rgba(37,99,235,0.4)';
    for (const m of moves) {
      if (state.board[m.tr][m.tc] !== '.') {
        ctx.strokeStyle = 'rgba(220,38,38,0.7)'; ctx.lineWidth = 3; strokeCircle(m.tr, m.tc, GAP / 2 - 4);
      } else { ctx.beginPath(); ctx.arc(px(m.tc), py(m.tr), 7, 0, 7); ctx.fill(); }
    }
  }

  function drawPieces() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '26px serif';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const p = state.board[r][c]; if (p === '.') continue;
      const red = p === p.toUpperCase();
      ctx.fillStyle = red ? '#fee2e2' : '#e5e7eb';
      circleAt(r, c, GAP / 2 - 4); ctx.fill();
      ctx.strokeStyle = red ? '#b91c1c' : '#1f2937'; ctx.lineWidth = 2; strokeCircle(r, c, GAP / 2 - 4);
      ctx.fillStyle = red ? '#b91c1c' : '#1f2937';
      ctx.fillText(GLYPH[p], px(c), py(r) + 1);
    }
  }

  function kingOf(side) {
    const k = side === 'r' ? 'K' : 'k';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (state.board[r][c] === k) return [r, c];
    return [-1, -1];
  }
  function px(c) { return MX + c * GAP; }
  function py(r) { return MY + r * GAP; }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function circleAt(r, c, rad) { ctx.beginPath(); ctx.arc(px(c), py(r), rad, 0, 7); }
  function strokeCircle(r, c, rad) { ctx.beginPath(); ctx.arc(px(c), py(r), rad, 0, 7); ctx.stroke(); }
  function inb(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
  function setStatus(msg, cls) { $status.textContent = msg; $status.className = cls; }
}
