// 合成水果（Suika）：圆形物理版——重力下落 + 圆-圆碰撞分离与反弹 + 同种接触合并升级。
// 纯 canvas 自实现简易刚体（位置修正 + 法向冲量），无第三方物理库；水果数有限，性能开销可忽略。
// 计分 + 最佳(localStorage) + 通关卡 + 排行榜。themeKey=game-suika。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const W = 360, H = 430; // 画布宽高（游戏场）
const GRAV = 0.5; // 重力（每固定步像素/步²）
const DAMP = 0.25; // 反弹系数（墙与水果间，低则堆叠稳）
const AIR = 0.999, GROUND = 0.9; // 空中/触地水平阻尼
const ITER = 6; // 每帧碰撞迭代次数（位置修正稳定性）
const FIXED = 1 / 60; // 固定物理步长
const DEATH_Y = 6; // 顶部警戒线：水果顶部静止越过即结束
const EMOJI = ['🍒', '🍓', '🍇', '🍊', '🍎', '🍉'];
const RADII = [13, 18, 24, 31, 39, 48]; // 各级半径
const POINTS = [2, 4, 8, 16, 32, 64]; // 合并到该级得分
const MAX = 5;
const WM_BONUS = 128; // 两西瓜合并额外分（双双消除）
const DROP_POOL = [0, 0, 1, 1, 2, 3]; // 下落水果层级池（仅小果）

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
  let fruits, score, best, nextTier, over, dropX, dropCool, acc, last, raf;

  best = Number(localStorage.getItem('tbsuikabest') || 0);
  $best.textContent = best;
  el.querySelector('#k-new').onclick = newGame;
  $cv.addEventListener('pointermove', onMove);
  $cv.addEventListener('pointerdown', onPick);
  $cv.addEventListener('pointerleave', () => { dropX = W / 2; });
  newGame();
  raf = requestAnimationFrame(loop);
  mountGameCard(el, () => best, 'suika');

  // newGame 复位
  function newGame() {
    fruits = [];
    score = 0; over = false; dropX = W / 2; dropCool = 0; acc = 0; last = performance.now();
    nextTier = pickTier();
    $score.textContent = 0;
    $status.textContent = '';
    $status.className = 'muted';
    $next.textContent = t('suika.next').replace('{e}', EMOJI[nextTier]);
  }

  // pickTier 从下落池随机取一层级
  function pickTier() { return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)]; }

  // onMove 跟踪下落位置（限制在可落区间）
  function onMove(e) {
    const rect = $cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    dropX = Math.max(RADII[nextTier], Math.min(W - RADII[nextTier], x));
  }

  // onPick 点按 → 落果（冷却 + 静止双重门控）
  function onPick(e) {
    e.preventDefault();
    onMove(e);
    if (over) { newGame(); return; }
    if (dropCool > 0 || !settled()) return;
    drop(dropX);
  }

  // settled 判定全局是否足够静止（允许下落）
  function settled() {
    for (const f of fruits) if (Math.abs(f.vx) + Math.abs(f.vy) > 1.2) return false;
    return true;
  }

  // drop 在顶部生成新水果
  function drop(x) {
    const r = RADII[nextTier];
    fruits.push({ x, y: -r, vx: 0, vy: 0, r, tier: nextTier, merged: false });
    nextTier = pickTier();
    dropCool = 0.35;
    $next.textContent = t('suika.next').replace('{e}', EMOJI[nextTier]);
  }

  // loop 固定步长累加器：每帧按 FIXED 推进物理，限步防螺旋
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (dropCool > 0) dropCool -= dt;
    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < 5) { step(); acc -= FIXED; steps++; }
    if (!over) checkOver();
    draw();
    raf = requestAnimationFrame(loop);
  }

  // step 单步物理：积分 → 墙壁 → 碰撞迭代 → 清理已合并
  function step() {
    for (const f of fruits) { if (f.merged) continue; f.vy += GRAV; f.x += f.vx; f.y += f.vy; f.vx *= AIR; }
    for (const f of fruits) {
      if (f.merged) continue;
      if (f.x - f.r < 0) { f.x = f.r; f.vx = Math.abs(f.vx) * DAMP; }
      if (f.x + f.r > W) { f.x = W - f.r; f.vx = -Math.abs(f.vx) * DAMP; }
      if (f.y + f.r > H) { f.y = H - f.r; f.vy = -Math.abs(f.vy) * DAMP; f.vx *= GROUND; }
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          if (fruits[i].merged || fruits[j].merged) continue;
          resolvePair(fruits[i], fruits[j]);
        }
      }
    }
    if (fruits.some((f) => f.merged)) { fruits = fruits.filter((f) => !f.merged); $score.textContent = score; }
  }

  // resolvePair 圆-圆接触：同级合并，否则位置修正 + 法向冲量分离
  function resolvePair(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = a.r + b.r;
    if (dist >= minDist) return;
    if (a.tier === b.tier) { merge(a, b); return; }
    const nx = dx / dist, ny = dy / dist;
    const push = (minDist - dist) / 2 + 0.01;
    a.x -= nx * push; a.y -= ny * push;
    b.x += nx * push; b.y += ny * push;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0) {
      const j = -(1 + DAMP) * vn / 2;
      a.vx -= j * nx; a.vy -= j * ny;
      b.vx += j * nx; b.vy += j * ny;
    }
  }

  // merge 同级合并：a 升级并移至中点，b 标记消除；西瓜对双双消除加分
  function merge(a, b) {
    if (a.tier === MAX) { a.merged = true; b.merged = true; score += WM_BONUS; return; }
    a.tier++; a.r = RADII[a.tier]; a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2; a.vx = 0; a.vy = 0;
    b.merged = true; score += POINTS[a.tier];
  }

  // checkOver 任一水果顶部静止越过警戒线即结束
  function checkOver() {
    if (over) return;
    for (const f of fruits) {
      if (f.y - f.r < DEATH_Y && Math.abs(f.vy) < 0.8) { finish(); return; }
    }
  }

  // finish 结束并保存最佳分
  function finish() {
    over = true;
    if (score > best) { best = score; localStorage.setItem('tbsuikabest', best); $best.textContent = best; }
    $status.textContent = t('suika.over') + score;
    $status.className = 'err';
  }

  // draw 场地 + 警戒线 + 落点预览 + 水果 emoji
  function draw() {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(220,38,38,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(0, DEATH_Y); ctx.lineTo(W, DEATH_Y); ctx.stroke(); ctx.setLineDash([]);
    // 落点预览（仅可落时）
    if (!over && dropCool <= 0 && settled()) {
      const r = RADII[nextTier];
      ctx.globalAlpha = 0.4; ctx.font = `${r * 1.6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(EMOJI[nextTier], dropX, r);
      ctx.globalAlpha = 1;
    }
    ctx.font = `${Math.max(16, RADII[0] * 1.6)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of fruits) {
      if (f.merged) continue;
      ctx.font = `${f.r * 1.6}px serif`;
      ctx.fillText(EMOJI[f.tier], f.x, f.y);
    }
  }
}
