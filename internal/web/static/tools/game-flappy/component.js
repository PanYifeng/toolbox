// Flappy Bird 简化版：点按/空格使小鸟上跳，重力下坠，穿越管道缝隙得分。无物理引擎，纯 canvas。
// 计分 + 最佳分(localStorage) + 通关纪念卡 + 排行榜（经 mountGameCard 挂载，themeKey=game-flappy）。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const W = 320, H = 420; // 画布宽高
const GRAV = 0.4; // 重力加速度（每帧像素）
const JUMP = -6.5; // 点按给定的上升速度
const PIPE_W = 52, GAP = 110, PIPE_SPD = 2.2; // 管道宽、缝隙、左移速度
const PIPE_DIST = 160; // 相邻管道水平间距
const BIRD_X = 70, BIRD_R = 10; // 小鸟水平位置与半径

// render Flappy
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="f-score">0</b></span>
      <span>${t('game.best')}: <b id="f-best">0</b></span>
      <span id="f-status" class="muted">${t('flappy.start')}</span>
      <button id="f-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('flappy.howto')}</p>
    <canvas id="f-canvas" width="${W}" height="${H}" tabindex="0"></canvas>`;

  const $cv = el.querySelector('#f-canvas');
  const ctx = $cv.getContext('2d');
  const $score = el.querySelector('#f-score');
  const $best = el.querySelector('#f-best');
  const $status = el.querySelector('#f-status');
  let bird, pipes, score, best, raf, running, dead;

  best = Number(localStorage.getItem('tbflappybest') || 0);
  $best.textContent = best;
  el.querySelector('#f-new').onclick = newGame;
  $cv.addEventListener('keydown', onAct);
  $cv.addEventListener('pointerdown', onAct);
  newGame();
  mountGameCard(el, () => best, 'flappy');

  // newGame 复位并等待首次点按启动
  function newGame() {
    cancelAnimationFrame(raf);
    bird = { x: BIRD_X, y: H / 2, vy: 0 };
    pipes = [];
    score = 0; running = false; dead = false;
    $score.textContent = 0;
    $status.textContent = t('flappy.start');
    $status.className = 'muted';
    spawnPipe(W + 40);
    draw();
    $cv.focus();
    raf = requestAnimationFrame(tick); // 重启主循环
  }

  // onAct 点按/空格：未启动则启动，死亡则重开，飞行则上跳
  function onAct(e) {
    e.preventDefault();
    if (dead) { newGame(); return; }
    if (!running) { running = true; $status.textContent = ''; }
    bird.vy = JUMP;
  }

  // spawnPipe 在 x 处生成一对管道，缝隙中点随机
  function spawnPipe(x) {
    const gapY = 60 + Math.random() * (H - 120 - GAP);
    pipes.push({ x, gapY, passed: false });
  }

  // tick 每帧推进：重力、移管、计分、碰撞
  function tick() {
    if (!running) { raf = requestAnimationFrame(tick); return; }
    bird.vy += GRAV;
    bird.y += bird.vy;
    pipes.forEach((p) => { p.x -= PIPE_SPD; });
    // 出界管道清理，并补新管道保持间距
    while (pipes.length && pipes[0].x + PIPE_W < 0) pipes.shift();
    const last = pipes[pipes.length - 1];
    if (last && last.x < W - PIPE_DIST) spawnPipe(last.x + PIPE_DIST);
    // 计分：小鸟越过管道缝隙中心
    pipes.forEach((p) => { if (!p.passed && p.x + PIPE_W < bird.x) { p.passed = true; score++; $score.textContent = score; } });
    if (hitGroundOrPipe()) { gameOver(); return; }
    draw();
    raf = requestAnimationFrame(tick);
  }

  // hitGroundOrPipe 碰撞检测：触地/触顶过深/撞管
  function hitGroundOrPipe() {
    if (bird.y + BIRD_R > H || bird.y - BIRD_R < 0) return true;
    return pipes.some((p) => {
      const inX = bird.x + BIRD_R > p.x && bird.x - BIRD_R < p.x + PIPE_W;
      const inGap = bird.y - BIRD_R > p.gapY && bird.y + BIRD_R < p.gapY + GAP;
      return inX && !inGap;
    });
  }

  // gameOver 结束并保存最佳分
  function gameOver() {
    running = false; dead = true;
    if (score > best) { best = score; localStorage.setItem('tbflappybest', best); $best.textContent = best; }
    $status.textContent = t('flappy.over') + score;
    $status.className = 'err';
    raf = requestAnimationFrame(tick); // 维持空闲帧，便于点按重开
  }

  // draw 绘制背景、管道、小鸟
  function draw() {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16a34a'; // 管道绿
    pipes.forEach((p) => {
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
    });
    ctx.fillStyle = '#f59e0b'; // 小鸟黄
    ctx.beginPath(); ctx.arc(bird.x, bird.y, BIRD_R, 0, Math.PI * 2); ctx.fill();
  }
}
