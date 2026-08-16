import { t } from '/core/i18n.js';
import { bindSwipe } from '/core/swipe.js';

// render 2048 小游戏（方向键移动合并）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="f-score">0</b></span>
      <span>${t('game.best')}: <b id="f-best">0</b></span>
      <button id="f-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('g2048.howto')}</p>
    <div id="f-board" class="board-2048" tabindex="0"></div>`;

  const SIZE = 4;
  let grid, score, best;
  const $board = el.querySelector('#f-board');
  const $score = el.querySelector('#f-score');
  const $best = el.querySelector('#f-best');

  el.querySelector('#f-new').onclick = newGame;
  $board.onkeydown = onKey;
  // 移动端滑动操作
  bindSwipe($board, (d) => { if (move(d)) { addTile(); draw(); saveBest(); } });
  newGame();

  function newGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    best = Number(localStorage.getItem('tb2048best') || 0);
    $best.textContent = best;
    addTile(); addTile();
    draw();
    $board.focus();
  }

  function addTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function draw() {
    $score.textContent = score;
    $board.innerHTML = '';
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const cell = document.createElement('div');
      cell.className = 'tile' + (v ? ' t' + v : '');
      cell.textContent = v || '';
      $board.appendChild(cell);
    }
  }

  function onKey(e) {
    const map = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' };
    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    if (!move(dir)) return;
    addTile();
    draw();
    saveBest();
  }

  // saveBest 更新并持久化最高分
  function saveBest() {
    if (score > best) {
      best = score;
      localStorage.setItem('tb2048best', best);
      $best.textContent = best;
    }
  }

  // move 执行一步移动，返回是否有变化
  function move(dir) {
    const rotate = (g) => g[0].map((_, i) => g.map((row) => row[i]).reverse());
    let g = grid.map((row) => [...row]);
    const turns = { L: 0, U: 1, R: 2, D: 3 }[dir];
    for (let i = 0; i < turns; i++) g = rotate(g);
    let moved = false;
    for (let r = 0; r < SIZE; r++) {
      let row = g[r].filter((x) => x);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) { row[i] *= 2; score += row[i]; row[i + 1] = 0; }
      }
      row = row.filter((x) => x);
      while (row.length < SIZE) row.push(0);
      if (row.some((v, i) => v !== g[r][i])) moved = true;
      g[r] = row;
    }
    for (let i = 0; i < (4 - turns) % 4; i++) g = rotate(g);
    if (moved) grid = g;
    return moved;
  }
}
