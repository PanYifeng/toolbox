import { t } from '/core/i18n.js';
import { bindSwipe } from '/core/swipe.js';
import { mountGameCard } from '/core/game-card.js';

// 消消乐：8x8 交换三消，连成 3+ 同色消除、下落连锁、30 步冲分。
const N = 8;          // 棋盘边长
const COLORS = 6;      // 颜色种类 0..5
const MOVES = 30;      // 总步数
const TARGET = 800;    // 目标分
const BEST_KEY = 'tbmatch3best';

// render 消消乐
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="m3-score">0</b></span>
      <span>${t('m3.moves')}: <b id="m3-moves">${MOVES}</b></span>
      <span>${t('game.best')}: <b id="m3-best">0</b></span>
      <span id="m3-status" class="muted"></span>
      <button id="m3-new">${t('m3.new')}</button>
    </div>
    <p class="rules">${t('m3.howto')}</p>
    <div id="m3-board" class="board-m3"></div>`;

  let grid;            // grid[r][c] = 颜色 id (0..5)，-1=空（下落过程）
  let score, moves, best;
  let sel = null;      // 选中格 [r,c] 或 null
  let busy = false;    // 消除/下落动画进行中，屏蔽输入
  const $board = el.querySelector('#m3-board');
  const $score = el.querySelector('#m3-score');
  const $moves = el.querySelector('#m3-moves');
  const $best = el.querySelector('#m3-best');
  const $status = el.querySelector('#m3-status');
  el.querySelector('#m3-new').onclick = newGame;
  bindSwipe($board, (d) => onSwipe(d));
  newGame();
  mountGameCard(el, () => best, 'match3');

  // newGame 开局：随机填满且避免初始即有 3 连
  function newGame() {
    busy = false; sel = null;
    grid = Array.from({ length: N }, () => Array(N).fill(-1));
    do { fillRandom(); } while (findMatches().size > 0);
    score = 0; moves = MOVES;
    best = Number(localStorage.getItem(BEST_KEY) || 0);
    $best.textContent = best; $status.textContent = ''; $status.className = 'muted';
    draw();
  }

  // fillRandom 随机填满全盘
  function fillRandom() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = randColor();
  }

  function randColor() { return Math.floor(Math.random() * COLORS); }

  // draw 渲染棋盘到 DOM
  function draw() {
    $score.textContent = score; $moves.textContent = moves;
    $board.innerHTML = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      const cell = document.createElement('div');
      cell.className = 'm3-cell' + (v >= 0 ? ' c' + v : ' empty');
      if (sel && sel[0] === r && sel[1] === c) cell.classList.add('sel');
      cell.dataset.r = r; cell.dataset.c = c;
      cell.onclick = () => onTap(r, c);
      $board.appendChild(cell);
    }
  }

  // onTap 点击格：选中/交换
  function onTap(r, c) {
    if (busy || moves <= 0) return;
    if (!sel) { sel = [r, c]; draw(); return; }
    const [sr, sc] = sel;
    if (sr === r && sc === c) { sel = null; draw(); return; } // 再点取消
    if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
      sel = null; trySwap(sr, sc, r, c);   // 相邻：尝试交换
    } else { sel = [r, c]; draw(); }       // 不相邻：改选
  }

  // onSwipe 滑动：把选中格（若有）往滑向交换；否则按起点格向滑向交换
  function onSwipe(d) {
    if (busy || moves <= 0) return;
    if (!sel) return;
    const [sr, sc] = sel;
    const dir = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] }[d];
    const r = sr + dir[0], c = sc + dir[1];
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    sel = null; trySwap(sr, sc, r, c);
  }

  // trySwap 尝试交换：构成消除才扣步并结算，否则弹回
  function trySwap(r1, c1, r2, c2) {
    swap(r1, c1, r2, c2);
    if (findMatches().size === 0) { swap(r1, c1, r2, c2); draw(); return; } // 无匹配，弹回
    moves--; busy = true;
    resolve();
  }

  function swap(r1, c1, r2, c2) {
    const t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t;
  }

  // findMatches 返回待消除格集合 "r,c"
  function findMatches() {
    const marked = new Set();
    // 水平 run
    for (let r = 0; r < N; r++) {
      let c = 0;
      while (c < N) {
        const v = grid[r][c]; let run = 1;
        if (v >= 0) { while (c + run < N && grid[r][c + run] === v) run++; }
        if (run >= 3) for (let k = 0; k < run; k++) marked.add(r + ',' + (c + k));
        c += run;
      }
    }
    // 垂直 run
    for (let c = 0; c < N; c++) {
      let r = 0;
      while (r < N) {
        const v = grid[r][c]; let run = 1;
        if (v >= 0) { while (r + run < N && grid[r + run][c] === v) run++; }
        if (run >= 3) for (let k = 0; k < run; k++) marked.add((r + k) + ',' + c);
        r += run;
      }
    }
    return marked;
  }

  // resolve 级联消除循环：消除→下落补齐→再检测，连锁倍率加分
  function resolve() {
    let combo = 0;
    let m = findMatches();
    while (m.size > 0) {
      combo++;
      score += m.size * 10 * combo;   // 连锁倍率
      for (const key of m) { const [r, c] = key.split(',').map(Number); grid[r][c] = -1; }
      draw();                          // 显示消除后空格
      gravity();
      m = findMatches();
    }
    busy = false;
    saveBest();
    draw();
    if (score >= TARGET) endGame(true);
    else if (moves <= 0) endGame(false);
    else if (!hasAnyMove()) shuffleAlive(); // 无可换步：重排避免卡死
  }

  // gravity 下落 + 顶部补随机色（spawn 折进此处）
  function gravity() {
    for (let c = 0; c < N; c++) {
      const col = [];
      for (let r = N - 1; r >= 0; r--) if (grid[r][c] >= 0) col.push(grid[r][c]);
      while (col.length < N) col.push(randColor()); // 顶部补新色
      for (let r = 0; r < N; r++) grid[r][c] = col[N - 1 - r];
    }
  }

  // hasAnyMove 是否存在至少一个能构成消除的交换
  function hasAnyMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c + 1 < N) { swap(r, c, r, c + 1); const hit = findMatches().size > 0; swap(r, c, r, c + 1); if (hit) return true; }
      if (r + 1 < N) { swap(r, c, r + 1, c); const hit = findMatches().size > 0; swap(r, c, r + 1, c); if (hit) return true; }
    }
    return false;
  }

  // shuffleAlive 重排现有色块（避免卡死），保证有可换步
  function shuffleAlive() {
    const flat = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) flat.push(grid[r][c]);
    let guard = 0;
    do {
      for (let i = flat.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [flat[i], flat[j]] = [flat[j], flat[i]]; }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = flat[r * N + c];
      guard++;
    } while ((findMatches().size > 0 || !hasAnyMove()) && guard < 20);
    draw();
  }

  function saveBest() {
    if (score > best) { best = score; localStorage.setItem(BEST_KEY, best); $best.textContent = best; }
  }

  // endGame 结算
  function endGame(won) {
    busy = true;
    if (won) { $status.textContent = `${t('m3.win')} ${t('game.score')} ${score}`; $status.className = 'ok'; }
    else { $status.textContent = `${t('m3.over')}${score}`; $status.className = 'err'; }
  }
}
