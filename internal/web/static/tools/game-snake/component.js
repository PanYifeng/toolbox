import { t } from '/core/i18n.js';

const N = 18, CELL = 18; // 网格大小与单格像素

// render 贪吃蛇（canvas + 方向键）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="s-score">0</b></span>
      <span>${t('game.best')}: <b id="s-best">0</b></span>
      <button id="s-new">${t('game.newgame')}</button>
    </div>
    <p class="muted">${t('snake.howto')}</p>
    <canvas id="s-canvas" width="${N * CELL}" height="${N * CELL}" tabindex="0"></canvas>`;

  const $cv = el.querySelector('#s-canvas');
  const ctx = $cv.getContext('2d');
  const $score = el.querySelector('#s-score');
  const $best = el.querySelector('#s-best');
  let snake, dir, food, score, best, timer;

  el.querySelector('#s-new').onclick = newGame;
  $cv.onkeydown = onKey;
  newGame();

  function newGame() {
    clearInterval(timer);
    snake = [{ x: 9, y: 9 }];
    dir = { x: 1, y: 0 };
    score = 0;
    best = Number(localStorage.getItem('tbsnakebest') || 0);
    $best.textContent = best;
    $score.textContent = 0;
    placeFood();
    draw();
    timer = setInterval(tick, 120);
    $cv.focus();
  }

  function placeFood() {
    do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; }
    while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function tick() {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // 撞墙或自身 → 结束
    if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
        snake.some((s) => s.x === head.x && s.y === head.y)) {
      clearInterval(timer);
      if (score > best) { best = score; localStorage.setItem('tbsnakebest', best); $best.textContent = best; }
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; $score.textContent = score; placeFood(); }
    else snake.pop();
    draw();
  }

  function onKey(e) {
    const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!m) return;
    e.preventDefault();
    if (m[0] === -dir.x && m[1] === -dir.y) return; // 禁止反向
    dir = { x: m[0], y: m[1] };
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
