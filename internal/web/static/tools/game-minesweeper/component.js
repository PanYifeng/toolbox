// 扫雷：9x9 网格 / 10 雷。左键揭开，右键或手机长按插旗。
// 揭开 0 时洪水填充相邻空格；揭开雷即败，揭开全部非雷格即胜。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const ROWS = 9, COLS = 9, MINES = 10;
const NUM_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#6d3be6', '#b45309', '#0891b2', '#6b7280', '#9aa4b2'];

// render 扫雷
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('ms.mines')}: <b id="m-left">10</b></span>
      <span id="m-status" class="muted">${t('ms.start')}</span>
      <button id="m-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('ms.howto')}</p>
    <div id="m-grid" class="ms-grid"></div>`;
  const $grid = el.querySelector('#m-grid');
  const $status = el.querySelector('#m-status');
  const $left = el.querySelector('#m-left');
  let board, revealed, flagged, over, won, firstClick, timer, startedAt, wins;
  wins = Number(localStorage.getItem('tbmswins') || 0);
  el.querySelector('#m-new').onclick = newGame;
  newGame();
  mountGameCard(el, () => wins, 'minesweeper');

  function newGame() {
    clearInterval(timer);
    board = makeEmpty();
    revealed = makeEmpty(false);
    flagged = makeEmpty(false);
    over = false; won = false; firstClick = true;
    $status.textContent = t('ms.start');
    $status.className = 'muted';
    $left.textContent = MINES;
    render();
  }

  function makeEmpty(v = 0) {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(v));
  }

  // 首次点击后才布雷，保证起手不踩雷
  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = (Math.random() * ROWS) | 0, c = (Math.random() * COLS) | 0;
      if (board[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c] = -1; placed++;
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (board[r][c] === -1) continue;
      board[r][c] = countAdj(r, c);
    }
  }

  function countAdj(r, c) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === -1) n++;
    }
    return n;
  }

  function reveal(r, c) {
    if (over || revealed[r][c] || flagged[r][c]) return;
    if (firstClick) { placeMines(r, c); firstClick = false; startTimer(); }
    revealed[r][c] = true;
    if (board[r][c] === -1) { lose(r, c); return; }
    if (board[r][c] === 0) flood(r, c);
    checkWin();
    render();
  }

  // flood 揭开 0 周围的连通空格
  function flood(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = cr + dr, nc = cc + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (revealed[nr][nc] || flagged[nr][nc]) continue;
        revealed[nr][nc] = true;
        if (board[nr][nc] === 0) stack.push([nr, nc]);
      }
    }
  }

  function toggleFlag(r, c) {
    if (over || revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    $left.textContent = MINES - flagCount();
    render();
  }

  function flagCount() {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (flagged[r][c]) n++;
    return n;
  }

  function checkWin() {
    let hidden = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!revealed[r][c]) hidden++;
    if (hidden === MINES) {
      over = true; won = true; clearInterval(timer);
      wins++; localStorage.setItem('tbmswins', wins);
      $status.textContent = t('ms.win'); $status.className = 'ok';
    }
  }

  function lose(hitR, hitC) {
    over = true; clearInterval(timer);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] === -1) revealed[r][c] = true;
    $status.textContent = t('ms.lose'); $status.className = 'err';
    render(hitR, hitC);
  }

  function startTimer() {
    startedAt = Date.now();
    timer = setInterval(() => { if (!over) $status.textContent = `${t('ms.time')}: ${Math.floor((Date.now() - startedAt) / 1000)}s`; }, 500);
  }

  // render 绘制网格；hitR/hitC 标记踩中的雷
  function render(hitR = -1, hitC = -1) {
    $grid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('button');
      const isRev = revealed[r][c], isFlag = flagged[r][c];
      cell.className = 'ms-cell' + (isRev ? ' rev' : '') + (r === hitR && c === hitC ? ' hit' : '');
      if (isRev) {
        const v = board[r][c];
        if (v === -1) cell.textContent = '💣';
        else if (v > 0) { cell.textContent = v; cell.style.color = NUM_COLORS[v]; }
      } else if (isFlag) cell.textContent = '🚩';
      cell.onclick = () => reveal(r, c);
      cell.oncontextmenu = (e) => { e.preventDefault(); toggleFlag(r, c); };
      bindLongPress(cell, () => toggleFlag(r, c));
      $grid.appendChild(cell);
    }
  }
}

// bindLongPress 移动端长按插旗（~400ms）
function bindLongPress(el, fn) {
  let tp, t;
  el.addEventListener('touchstart', () => {
    tp = true;
    t = setTimeout(() => { if (tp) { tp = false; fn(); } }, 400);
  }, { passive: true });
  const cancel = () => { tp = false; clearTimeout(t); };
  el.addEventListener('touchend', cancel, { passive: true });
  el.addEventListener('touchmove', cancel, { passive: true });
}
