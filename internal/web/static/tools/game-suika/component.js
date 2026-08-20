// 合成水果（Suika）简化版：无物理引擎，网格列下落 + 相邻同种合并升级。
// 点按列下落一个水果；相邻（上下左右）同种合并为下一级并加分；两个西瓜合并得高分并消除。
// 列满则该列不可下落；全部列满即结束。计分 + 最佳(localStorage) + 通关卡 + 排行榜。themeKey=game-suika。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const COLS = 6, ROWS = 10, CELL = 42, PAD = 6;
const W = COLS * CELL, H = ROWS * CELL;
const EMOJI = ['🍒', '🍓', '🍇', '🍊', '🍎', '🍉'];
const POINTS = [2, 4, 8, 16, 32, 64]; // 合并到该级所得分
const MAX = 5;
const WM_BONUS = 128; // 两个西瓜合并额外分
const DROP_POOL = [0, 0, 1, 1, 2, 2, 3]; // 下落水果层级池

// render Suika
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="k-score">0</b></span>
      <span>${t('game.best')}: <b id="k-best">0</b></span>
      <span id="k-status" class="muted"></span>
      <button id="k-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('suika.howto')}</p>
    <p class="muted" id="k-next"></p>
    <canvas id="k-canvas" width="${W}" height="${H}" tabindex="0"></canvas>`;

  const $cv = el.querySelector('#k-canvas');
  const ctx = $cv.getContext('2d');
  const $score = el.querySelector('#k-score');
  const $best = el.querySelector('#k-best');
  const $status = el.querySelector('#k-status');
  const $next = el.querySelector('#k-next');
  let grid, score, best, nextTier, over;

  best = Number(localStorage.getItem('tbsuikabest') || 0);
  $best.textContent = best;
  el.querySelector('#k-new').onclick = newGame;
  $cv.addEventListener('pointerdown', onPick);
  newGame();
  mountGameCard(el, () => best, 'suika');

  // newGame 复位网格与下一颗
  function newGame() {
    grid = Array.from({ length: COLS }, () => []);
    score = 0; over = false;
    nextTier = pickTier();
    $score.textContent = 0;
    $status.textContent = '';
    $status.className = 'muted';
    $next.textContent = t('suika.next').replace('{e}', EMOJI[nextTier]);
    draw();
  }

  // pickTier 从下落池随机取一层级
  function pickTier() { return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)]; }

  // onPick 画布点按 → 计算列 → 下落
  function onPick(e) {
    e.preventDefault();
    if (over) { newGame(); return; }
    const rect = $cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const col = Math.floor(x / CELL);
    if (col < 0 || col >= COLS) return;
    drop(col);
  }

  // drop 在 col 顶部压入下一颗；列满则提示，全满则结束
  function drop(col) {
    if (grid[col].length >= ROWS) {
      if (grid.every((c) => c.length >= ROWS)) { finish(); return; }
      $status.textContent = t('suika.colFull'); $status.className = 'err';
      return;
    }
    grid[col].push(nextTier);
    resolve();
    nextTier = pickTier();
    $score.textContent = score;
    $next.textContent = t('suika.next').replace('{e}', EMOJI[nextTier]);
    draw();
    if (grid.every((c) => c.length >= ROWS)) finish();
  }

  // resolve 合并循环：扫描同层相邻对 → 合并 → 重力压实 → 直到无合并
  function resolve() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let c = 0; c < COLS && !changed; c++) {
        for (let r = 0; r < grid[c].length && !changed; r++) {
          const T = grid[c][r];
          if (T === null || T === undefined) continue;
          const nb = sameNeighbor(c, r, T);
          if (nb) { mergePair(c, r, nb); changed = true; }
        }
      }
      if (changed) gravity();
    }
  }

  // sameNeighbor 找一个同层 4-邻居（上/下/左/右）；网格按列存底→顶，r 增=上
  function sameNeighbor(c, r, T) {
    const left = c > 0 ? grid[c - 1][r] : undefined;
    const right = c < COLS - 1 ? grid[c + 1][r] : undefined;
    const below = r > 0 ? grid[c][r - 1] : undefined;
    const above = r < grid[c].length - 1 ? grid[c][r + 1] : undefined;
    if (below === T) return { c, r: r - 1 };
    if (above === T) return { c, r: r + 1 };
    if (left === T) return { c: c - 1, r };
    if (right === T) return { c: c + 1, r };
    return null;
  }

  // mergePair (c,r) 为存活格，邻居清空；西瓜对双双消除加分
  function mergePair(c, r, nb) {
    const T = grid[c][r];
    if (T === MAX) { grid[c][r] = null; grid[nb.c][nb.r] = null; score += WM_BONUS; }
    else { grid[c][r] = T + 1; grid[nb.c][nb.r] = null; score += POINTS[T + 1]; }
  }

  // gravity 各列压实：滤除 null，水果下落
  function gravity() { for (let c = 0; c < COLS; c++) grid[c] = grid[c].filter((x) => x !== null && x !== undefined); }

  // finish 结束并保存最佳分
  function finish() {
    over = true;
    if (score > best) { best = score; localStorage.setItem('tbsuikabest', best); $best.textContent = best; }
    $status.textContent = t('suika.over') + score;
    $status.className = 'err';
  }

  // draw 绘制网格线与水果 emoji
  function draw() {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }
    ctx.font = `${CELL - PAD * 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        const T = grid[c][r];
        if (T === null || T === undefined) continue;
        // 行号转画布 y：r=0（底）→ 画布最下方
        const y = H - (r + 0.5) * CELL;
        ctx.fillText(EMOJI[T], c * CELL + CELL / 2, y);
      }
    }
  }

  $next.textContent = t('suika.next').replace('{e}', EMOJI[nextTier]);
}
