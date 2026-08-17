import { t } from '/core/i18n.js';
import { bindSwipe } from '/core/swipe.js';
import { mountGameCard } from '/core/game-card.js';

const N = 18, CELL = 18; // 网格大小与单格像素
const SPEED = 130; // 每步毫秒

// render 贪吃蛇（canvas + 方向键）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="s-score">0</b></span>
      <span>${t('game.best')}: <b id="s-best">0</b></span>
      <span id="s-status" class="muted">${t('snake.start')}</span>
      <button id="s-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('snake.howto')}</p>
    <canvas id="s-canvas" width="${N * CELL}" height="${N * CELL}" tabindex="0"></canvas>`;

  const $cv = el.querySelector('#s-canvas');
  const ctx = $cv.getContext('2d');
  const $score = el.querySelector('#s-score');
  const $best = el.querySelector('#s-best');
  const $status = el.querySelector('#s-status');
  let snake, dir, nextDir, food, score, best, timer, running;

  el.querySelector('#s-new').onclick = newGame;
  $cv.onkeydown = onKey;
  // 移动端滑动操作：U/D/L/R → 方向向量
  const swipeMap = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  bindSwipe($cv, (d) => { if (setDir(swipeMap[d])) start(); });
  newGame();
  // 通关纪念卡入口
  mountGameCard(el, () => score, 'snake');

  function newGame() {
    clearInterval(timer);
    snake = [{ x: 9, y: 9 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    running = false;
    best = Number(localStorage.getItem('tbsnakebest') || 0);
    $best.textContent = best;
    $score.textContent = 0;
    $status.textContent = t('snake.start');
    $status.className = 'muted';
    placeFood();
    draw();
    $cv.focus();
  }

  function placeFood() {
    do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; }
    while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  // start 若尚未运行则启动定时器
  function start() {
    if (running) return;
    running = true;
    $status.textContent = '';
    timer = setInterval(tick, SPEED);
  }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // 撞墙或自身 → 结束
    if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
        snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; $score.textContent = score; placeFood(); }
    else snake.pop();
    draw();
  }

  // gameOver 结束并保存最高分
  function gameOver() {
    clearInterval(timer);
    running = false;
    if (score > best) { best = score; localStorage.setItem('tbsnakebest', best); $best.textContent = best; }
    $status.textContent = t('snake.over') + score;
    $status.className = 'err';
  }

  function onKey(e) {
    const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!m) return;
    e.preventDefault();
    if (setDir(m)) start();
  }

  // setDir 设置下一方向，禁止 180 度反向；返回是否有效变更
  function setDir(m) {
    if (m[0] === -dir.x && m[1] === -dir.y) return false;
    nextDir = { x: m[0], y: m[1] };
    return true;
  }

  function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft');
    ctx.fillRect(0, 0, N * CELL, N * CELL);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(food.x * CELL + 1, food.y * CELL + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    snake.forEach((s) => ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2));
  }
}
