import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';
import { requestPaidUndo } from '/core/pay-undo.js';
import { initialState, legalMoves, apply, inCheck, opp } from './engine.js';

// 国际象棋：白方在下（人），黑方在上（电脑 worker minimax）。完整规则含易位/过路兵/升变。
// 悔棋 5 元/次（自觉解锁）；计分=连胜（peak streak），用过悔棋的胜局不计入连胜。
const CELL = 60, B = 8;
const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const BEST_KEY = 'tbchessbest', STREAK_KEY = 'tbchessstreak';
const HUMAN = 'w', CPU = 'b';

export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span id="ch-status" class="muted"></span>
      <span>${t('ch.streak')}: <b id="ch-streak">0</b></span>
      <span>${t('game.best')}: <b id="ch-best">0</b></span>
      <button id="ch-undo">${t('ch.undo')}</button>
      <button id="ch-new">${t('ch.new')}</button>
    </div>
    <p class="rules">${t('ch.howto')}</p>
    <div class="chess-wrap"><canvas id="ch-canvas" width="480" height="480" tabindex="0"></canvas></div>
    <div id="ch-promo" class="chess-promo" style="display:none"></div>`;

  let state, sel, best, streak, usedUndo, reqId = 0, thinking = false;
  const history = [];
  const worker = new Worker('/tools/game-chess/ai.js', { type: 'module' });
  const $cv = el.querySelector('#ch-canvas');
  const $status = el.querySelector('#ch-status');
  const $streak = el.querySelector('#ch-streak');
  const $best = el.querySelector('#ch-best');
  const $promo = el.querySelector('#ch-promo');
  const ctx = $cv.getContext('2d');
  el.querySelector('#ch-new').onclick = newGame;
  el.querySelector('#ch-undo').onclick = undo;
  $cv.onclick = onCanvasClick;
  worker.onmessage = onWorker;
  newGame();
  mountGameCard(el, () => best, 'chess');

  function newGame() {
    reqId++; // 使任何在途的 worker 回执失效，避免旧 AI 走法落到新棋盘
    state = initialState(); sel = null; thinking = false; usedUndo = false; history.length = 0;
    best = Number(localStorage.getItem(BEST_KEY) || 0); $best.textContent = best;
    streak = Number(localStorage.getItem(STREAK_KEY) || 0); $streak.textContent = streak;
    $promo.style.display = 'none'; setStatus(t('ch.yourmove'), 'muted'); draw();
  }

  // undo 付费悔棋：先弹付费浮层，用户"已支付解锁"才回退；置 usedUndo 使本局胜局不计入连胜
  async function undo() {
    if (thinking) return;
    const ok = await requestPaidUndo({ feature: '国际象棋 悔棋(5元/次)', amount: 5 });
    if (!ok) return;
    usedUndo = true;
    while (history.length && state.turn !== HUMAN) { state = history.pop(); }
    if (history.length) state = history.pop();
    sel = null; setStatus(t('ch.yourmove'), 'muted'); draw();
  }

  function onCanvasClick(e) {
    if (thinking || state.turn !== HUMAN) return;
    const rect = $cv.getBoundingClientRect();
    const sc = $cv.width / rect.width;
    const c = Math.floor(((e.clientX - rect.left) * sc) / CELL);
    const r = Math.floor(((e.clientY - rect.top) * sc) / CELL);
    if (!inb(r, c)) return;
    if (sel) tryHumanMove(sel[0], sel[1], r, c); else trySelect(r, c);
  }

  function trySelect(r, c) {
    const p = state.board[r][c];
    if (p === '.' || (p === p.toUpperCase() ? HUMAN : CPU) !== HUMAN) return;
    sel = [r, c]; draw();
  }

  // tryHumanMove 若合法则落子（升变走弹窗），否则改选/清选
  function tryHumanMove(fr, fc, tr, tc) {
    const moves = legalMoves(state, HUMAN).filter((m) => m.fr === fr && m.fc === fc && m.tr === tr && m.tc === tc);
    if (!moves.length) { sel = state.board[tr][tc] !== '.' ? null : [tr, tc]; draw(); return; }
    if (moves[0].promo) { showPromo(moves); return; }
    commitHuman(moves[0]);
  }

  // commitHuman 落人走 → 检查终局 → 否则请电脑走
  function commitHuman(m) {
    history.push(state); state = apply(state, m); sel = null; draw();
    if (afterMove(HUMAN)) return;
    requestAI();
  }

  // showPromo 升变选择弹窗
  function showPromo(moves) {
    const opts = ['q', 'r', 'b', 'n'];
    $promo.innerHTML = `<span>${t('ch.promote')}</span>` + opts.map((o, i) =>
      `<button data-i="${i}" class="btn-soft">${GLYPH[HUMAN === 'w' ? o.toUpperCase() : o]} ${t('ch.' + ['queen','rook','bishop','knight'][i])}</button>`).join('');
    $promo.style.display = 'flex';
    $promo.querySelectorAll('button').forEach((b, i) => b.onclick = () => {
      const m = moves.find((mv) => mv.promo === opts[i]);
      $promo.style.display = 'none'; commitHuman(m);
    });
  }

  function requestAI() {
    thinking = true; setStatus(t('ch.thinking'), 'muted');
    reqId++; const id = reqId;
    worker.postMessage({ state, side: CPU, depth: 3 });
    pendingId = id;
  }
  let pendingId = 0;

  function onWorker(e) {
    if (e.data.move == null || pendingId !== reqId) return;
    thinking = false;
    history.push(state); state = apply(state, e.data.move); draw();
    afterMove(CPU);
  }

  // afterMove 走完后判定将军/将杀/逼和，返回是否终局。计分=连胜(peak streak)。
  function afterMove(mover) {
    const other = opp(mover);
    const checked = inCheck(state, other);
    const noMoves = legalMoves(state, other).length === 0;
    if (noMoves && checked) { // 将杀
      if (mover === HUMAN) onWin();
      else onLose();
      draw(); return true;
    }
    if (noMoves && !checked) { setStatus(t('ch.stalemate'), 'muted'); draw(); return true; } // 逼和（和棋，连胜不变）
    if (checked) setStatus((mover === HUMAN ? t('ch.check') : ''), 'err');
    else if (state.turn === HUMAN) setStatus(t('ch.yourmove'), 'muted');
    draw(); return false;
  }

  // onWin 人将死电脑：用过悔棋则不计入连胜，仅提示；否则连胜+1 并更新历史最高
  function onWin() {
    if (usedUndo) { setStatus(t('ch.checkmate') + ' ' + t('ch.usedUndo'), 'ok'); return; }
    streak++; localStorage.setItem(STREAK_KEY, streak); $streak.textContent = streak;
    if (streak > best) { best = streak; localStorage.setItem(BEST_KEY, best); $best.textContent = best; }
    setStatus(t('ch.checkmate'), 'ok');
  }

  // onLose 人被将死：连胜中断清零
  function onLose() {
    if (streak) { streak = 0; localStorage.setItem(STREAK_KEY, 0); $streak.textContent = 0; }
    setStatus(t('ch.lose'), 'err');
  }

  // draw 绘制棋盘 + 棋子 + 选中 + 合法点 + 将军高亮
  function draw() {
    for (let r = 0; r < B; r++) for (let c = 0; c < B; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
    const moves = sel ? legalMoves(state, HUMAN).filter((m) => m.fr === sel[0] && m.fc === sel[1]) : [];
    const destSet = new Set(moves.map((m) => m.tr + ',' + m.tc));
    for (const [r, c] of moves.map((m) => [m.tr, m.tc])) {
      ctx.fillStyle = 'rgba(20,30,40,0.28)';
      ctx.beginPath();
      if (state.board[r][c] !== '.') { ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL / 2 - 4, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,30,40,0.5)'; ctx.stroke(); }
      else { ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 8, 0, 7); ctx.fill(); }
    }
    void destSet;
    if (sel) { ctx.fillStyle = 'rgba(255,235,59,0.45)'; ctx.fillRect(sel[1] * CELL, sel[0] * CELL, CELL, CELL); }
    const [kr, kc] = kingOf(HUMAN === 'w' ? 'w' : 'b');
    if (inCheck(state, state.turn) && state.turn === HUMAN) { ctx.fillStyle = 'rgba(220,38,38,0.45)'; ctx.fillRect(kc * CELL, kr * CELL, CELL, CELL); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '44px serif';
    for (let r = 0; r < B; r++) for (let c = 0; c < B; c++) {
      const p = state.board[r][c]; if (p === '.') continue;
      ctx.fillStyle = p === p.toUpperCase() ? '#fff' : '#1f2937';
      ctx.strokeStyle = p === p.toUpperCase() ? '#1f2937' : '#fff'; ctx.lineWidth = 1;
      ctx.fillText(GLYPH[p], c * CELL + CELL / 2, r * CELL + CELL / 2 + 2);
      ctx.strokeText(GLYPH[p], c * CELL + CELL / 2, r * CELL + CELL / 2 + 2);
    }
    if (sel) { drawSelHighlight(); }
  }
  function drawSelHighlight() { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.strokeRect(sel[1] * CELL + 1.5, sel[0] * CELL + 1.5, CELL - 3, CELL - 3); }

  function kingOf(side) {
    const k = side === 'w' ? 'K' : 'k';
    for (let r = 0; r < B; r++) for (let c = 0; c < B; c++) if (state.board[r][c] === k) return [r, c];
    return [-1, -1];
  }

  function inb(r, c) { return r >= 0 && r < B && c >= 0 && c < B; }
  function setStatus(msg, cls) { $status.textContent = msg; $status.className = cls; }
}
