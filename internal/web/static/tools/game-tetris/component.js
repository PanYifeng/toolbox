import { t } from '/core/i18n.js';
import { bindSwipe } from '/core/swipe.js';
import { mountDpad } from '/core/dpad.js';
import { mountGameCard } from '/core/game-card.js';

const W = 10, H = 20, CELL = 20; // 棋盘列数 / 行数 / 单格像素
// 7 种四格方块：下落形态（矩阵）+ 配色（取友好亮色）
const PIECES = {
  I: { color: '#22d3ee', shape: ['0000', '1111', '0000', '0000'] },
  O: { color: '#eab308', shape: ['11', '11'] },
  T: { color: '#a855f7', shape: ['010', '111', '000'] },
  S: { color: '#22c55e', shape: ['011', '110', '000'] },
  Z: { color: '#ef4444', shape: ['110', '011', '000'] },
  J: { color: '#3b82f6', shape: ['100', '111', '000'] },
  L: { color: '#f59e0b', shape: ['001', '111', '000'] },
};
const KEYS = Object.keys(PIECES);

// shape 字符串矩阵 → 二维 0/1 数组
const toMat = (shape) => shape.map((r) => r.split('').map(Number));

// render 俄罗斯方块（canvas + 键盘 / 滑动 / 方向键）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="t-score">0</b></span>
      <span>${t('tetris.level')}: <b id="t-level">1</b></span>
      <span>${t('tetris.lines')}: <b id="t-lines">0</b></span>
      <span>${t('game.best')}: <b id="t-best">0</b></span>
      <span id="t-status" class="muted">${t('tetris.start')}</span>
      <button id="t-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('tetris.howto')}</p>
    <canvas id="t-canvas" width="${W * CELL}" height="${H * CELL}" tabindex="0"></canvas>
    <button id="t-drop" class="game-drop" type="button" aria-label="${t('tetris.drop')}">⤓ ${t('tetris.drop')}</button>`;

  const $cv = el.querySelector('#t-canvas');
  const ctx = $cv.getContext('2d');
  const $score = el.querySelector('#t-score');
  const $level = el.querySelector('#t-level');
  const $lines = el.querySelector('#t-lines');
  const $best = el.querySelector('#t-best');
  const $status = el.querySelector('#t-status');
  let board, cur, score, lines, level, best, timer, running, paused, over;

  el.querySelector('#t-new').onclick = newGame;
  el.querySelector('#t-drop').onclick = () => { if (!over && !paused) hardDrop(); };
  $cv.onkeydown = onKey;
  $cv.onclick = () => $cv.focus();
  // 移动端滑动：L/R 移动、U 旋转、D 软降
  const handleDir = (d) => {
    if (over || paused) return;
    if (d === 'L') move(-1);
    else if (d === 'R') move(1);
    else if (d === 'U') rotate();
    else if (d === 'D') softDrop();
  };
  bindSwipe($cv, handleDir);
  mountDpad(el, handleDir);
  newGame();
  // 通关纪念卡入口（传入当前分数）
  mountGameCard(el, () => score, 'tetris');

  // newGame 重置棋盘 / 生成首块 / 启动重力
  function newGame() {
    clearInterval(timer);
    board = Array.from({ length: H }, () => Array(W).fill(null));
    score = 0; lines = 0; level = 1; running = false; paused = false; over = false;
    best = Number(localStorage.getItem('tbtetrisbest') || 0);
    $best.textContent = best; $score.textContent = 0; $level.textContent = 1; $lines.textContent = 0;
    $status.textContent = t('tetris.start'); $status.className = 'muted';
    cur = spawn();
    draw();
    $cv.focus();
  }

  // spawn 生成随机方块于顶部居中；出生即碰撞 → 结束
  function spawn() {
    const k = KEYS[(Math.random() * KEYS.length) | 0];
    const p = { type: k, color: PIECES[k].color, mat: toMat(PIECES[k].shape) };
    p.x = ((W - p.mat[0].length) / 2) | 0; p.y = 0;
    return p;
  }

  // start 启动重力定时器（按等级提速）
  function start() {
    if (running) return;
    running = true;
    $status.textContent = ''; $status.className = 'muted';
    timer = setInterval(tick, speed());
  }

  // speed 每级提速：1 级 600ms，每级 -60ms，下限 80ms
  function speed() { return Math.max(80, 600 - (level - 1) * 60); }

  // tick 重力步进：下移一格，锁定则消行 + 生成下一块
  function tick() {
    if (paused || over) return;
    if (!collide(cur.x, cur.y + 1, cur.mat)) { cur.y++; draw(); return; }
    lock();
    clearLines();
    cur = spawn();
    if (collide(cur.x, cur.y, cur.mat)) { gameOver(); return; }
    draw();
  }

  // collide 判定给定位置 / 矩阵是否越界或撞已落块（y<0 视为可出生区）
  function collide(x, y, mat) {
    for (let i = 0; i < mat.length; i++) {
      for (let j = 0; j < mat[i].length; j++) {
        if (!mat[i][j]) continue;
        const nx = x + j, ny = y + i;
        if (nx < 0 || nx >= W || ny >= H) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  // lock 把当前方块写回棋盘
  function lock() {
    cur.mat.forEach((row, i) => row.forEach((v, j) => {
      if (v && cur.y + i >= 0) board[cur.y + i][cur.x + j] = cur.color;
    }));
  }

  // clearLines 清满行：下移上方，按消除数计分升级
  function clearLines() {
    let cleared = 0;
    for (let r = H - 1; r >= 0; r--) {
      if (board[r].every((c) => c)) { board.splice(r, 1); board.unshift(Array(W).fill(null)); cleared++; r++; }
    }
    if (!cleared) return;
    const table = { 1: 100, 2: 300, 3: 500, 4: 800 };
    score += (table[cleared] || 0) * level;
    lines += cleared;
    level = ((lines / 10) | 0) + 1;
    $score.textContent = score; $lines.textContent = lines; $level.textContent = level;
    // 升级后提速：重置定时器
    clearInterval(timer); timer = setInterval(tick, speed());
  }

  // move 左右移动一格（撞墙则忽略）
  function move(dx) { if (!collide(cur.x + dx, cur.y, cur.mat)) { cur.x += dx; draw(); } start(); }

  // softDrop 软降一格 +1 分
  function softDrop() {
    if (!collide(cur.x, cur.y + 1, cur.mat)) { cur.y++; score++; $score.textContent = score; draw(); }
    start();
  }

  // hardDrop 直落到底 +2/格，触发锁定，并确保重力运行（首次输入启动）
  function hardDrop() {
    let d = 0; while (!collide(cur.x, cur.y + 1, cur.mat)) { cur.y++; d++; }
    score += d * 2; $score.textContent = score;
    tick();
    if (!over) start();
  }

  // rotate 顺时针旋转 + 简易墙踢（偏移 0/-1/+1/-2/+2）
  function rotate() {
    const m = cur.mat;
    const r = Array.from({ length: m[0].length }, () => Array(m.length).fill(0));
    for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) r[j][m.length - 1 - i] = m[i][j];
    for (const off of [0, -1, 1, -2, 2]) {
      if (!collide(cur.x + off, cur.y, r)) { cur.mat = r; cur.x += off; draw(); start(); return; }
    }
  }

  // ghostY 计算当前方块直落到底的预览行
  function ghostY() { let y = cur.y; while (!collide(cur.x, y + 1, cur.mat)) y++; return y; }

  // draw 绘制棋盘已落块 + 网格 + 幽灵预览 + 当前方块
  function draw() {
    ctx.clearRect(0, 0, $cv.width, $cv.height);
    // 网格线
    ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = 1;
    for (let i = 1; i < W; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H * CELL); ctx.stroke(); }
    for (let i = 1; i < H; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W * CELL, i * CELL); ctx.stroke(); }
    // 已锁定落块
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (board[y][x]) { ctx.fillStyle = board[y][x]; ctx.globalAlpha = 1; fillCell(x, y); }
    }
    const gy = ghostY();
    drawPiece(cur.x, gy, cur.mat, cur.color, 0.25);
    drawPiece(cur.x, cur.y, cur.mat, cur.color, 1);
  }

  // drawPiece 在 (x,y) 绘制矩阵，alpha 控制幽灵透明度
  function drawPiece(x, y, mat, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    mat.forEach((row, i) => row.forEach((v, j) => {
      const ny = y + i, nx = x + j;
      if (v && ny >= 0) fillCell(nx, ny);
    }));
    ctx.restore();
  }

  // fillCell 绘制单格（带内描边，立体感）
  function fillCell(x, y) {
    const px = x * CELL, py = y * CELL;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
  }

  // gameOver 结束：停定时器、记最高分
  function gameOver() {
    clearInterval(timer); over = true; running = false;
    if (score > best) { best = score; localStorage.setItem('tbtetrisbest', best); $best.textContent = best; }
    $status.textContent = t('tetris.over') + score; $status.className = 'muted';
  }

  // onKey 键盘控制：P 暂停始终可用；结束后空格重开；移动键在暂停/结束时禁用
  function onKey(e) {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (over) { if (e.key === ' ') { e.preventDefault(); newGame(); } return; }
    if (paused) return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); move(-1); break;
      case 'ArrowRight': e.preventDefault(); move(1); break;
      case 'ArrowDown': e.preventDefault(); softDrop(); break;
      case 'ArrowUp': e.preventDefault(); rotate(); break;
      case ' ': e.preventDefault(); hardDrop(); break;
    }
  }

  // togglePause 暂停 / 恢复
  function togglePause() {
    if (over || !running) return;
    paused = !paused;
    $status.textContent = paused ? t('tetris.paused') : '';
  }
}
