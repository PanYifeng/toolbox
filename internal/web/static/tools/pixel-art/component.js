// 像素画板：N×N 网格涂色，pointer 事件统一鼠标/触屏；选色盘/自定义色/橡皮/填充桶/撤销/导出。
// 网格模型 grid[y][x]=颜色串或 '' ；每次笔触（按下到抬起）入栈一条历史供撤销。
import { t } from '/core/i18n.js';

const CELL = 22; // 单格像素（含 1px 分隔），canvas = N*CELL
const SIZES = [16, 24, 32]; // 可选网格规格
const BG = '#ffffff'; // 空格底色（橡皮擦即填回此色）
// PALETTE 复古色盘：覆盖中性色/自然色/鲜艳色，方便快速起稿
const PALETTE = [
  '#000000', '#ffffff', '#9ca3af', '#6b7280',
  '#dc2626', '#f97316', '#f59e0b', '#facc15',
  '#16a34a', '#22c55e', '#0ea5e9', '#3b82f6',
  '#7c3aed', '#ec4899', '#92400e', '#7f5539',
];

// blank 生成全空网格（橡皮擦底色）
function blank(n) {
  return Array.from({ length: n }, () => Array(n).fill(''));
}

// gridCopy 深拷贝网格（入栈历史用）
function gridCopy(g) {
  return g.map((row) => row.slice());
}

// cellAt 由指针坐标换算网格坐标，越界返回 {-1,-1}
function cellAt(e, $cv, n) {
  const r = $cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * n);
  const y = Math.floor((e.clientY - r.top) / r.height * n);
  if (x < 0 || y < 0 || x >= n || y >= n) return { x: -1, y: -1 };
  return { x, y };
}

export default function (el) {
  let N = 16; // 当前网格边长
  let grid = blank(N); // grid[y][x] = 颜色或 ''
  let color = '#000000'; // 当前画笔色
  let tool = 'paint'; // paint | eraser | fill
  const undo = []; // 笔触历史快照
  let drawing = false; // 是否处于一笔拖动中
  let strokeDirty = false; // 本笔是否改过格子

  el.innerHTML = `
    <div class="px-bar">
      <label>${t('px.size')}
        <select id="px-size">${SIZES.map((s) => `<option value="${s}">${s}×${s}</option>`).join('')}</select>
      </label>
      <div id="px-palette" class="px-palette"></div>
      <label class="px-custom">${t('px.color')} <input id="px-custom" type="color" value="#000000"></label>
      <button id="px-eraser" class="btn-soft" data-tool="eraser">${t('px.eraser')}</button>
      <button id="px-fill" class="btn-soft" data-tool="fill">${t('px.fill')}</button>
      <button id="px-undo" class="btn-soft">${t('px.undo')}</button>
      <button id="px-clear" class="btn-soft">${t('px.clear')}</button>
      <button id="px-export" class="btn">${t('px.export')}</button>
    </div>
    <canvas id="px-canvas" width="${N * CELL}" height="${N * CELL}" tabindex="0"></canvas>
    <p class="muted px-tip">${t('px.tip')}</p>`;

  const $cv = el.querySelector('#px-canvas');
  const ctx = $cv.getContext('2d');
  buildPalette();
  $cv.width = N * CELL; $cv.height = N * CELL;
  draw();
  wire();
  $cv.focus();

  // buildPalette 渲染色盘色块并绑定取色
  function buildPalette() {
    const $p = el.querySelector('#px-palette');
    $p.innerHTML = PALETTE.map((c) => `<button class="px-swatch" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    $p.querySelectorAll('.px-swatch').forEach((b) => { b.onclick = () => setColor(b.dataset.c, 'paint'); });
  }

  // setColor 切换画笔色并回到画笔工具
  function setColor(c, tl) { color = c; el.querySelector('#px-custom').value = c; setTool(tl); }

  // setTool 切换工具并同步按钮高亮
  function setTool(tl) {
    tool = tl;
    el.querySelectorAll('[data-tool]').forEach((b) => {
      b.classList.toggle('btn', b.dataset.tool === tl);
      b.classList.toggle('btn-soft', b.dataset.tool !== tl);
    });
  }

  // wire 绑定工具栏与 canvas 指针事件
  function wire() {
    el.querySelector('#px-size').onchange = (e) => { N = Number(e.target.value); grid = blank(N); $cv.width = N * CELL; $cv.height = N * CELL; undo.length = 0; draw(); };
    el.querySelector('#px-custom').oninput = (e) => { color = e.target.value; setTool('paint'); };
    el.querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => setTool(b.dataset.tool); });
    el.querySelector('#px-undo').onclick = doUndo;
    el.querySelector('#px-clear').onclick = () => { undo.push(gridCopy(grid)); grid = blank(N); draw(); };
    el.querySelector('#px-export').onclick = exportPng;
    $cv.addEventListener('pointerdown', onDown);
    $cv.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // onDown 落笔前入栈历史；fill 直接填充，paint/eraser 进入拖动
  function onDown(e) {
    e.preventDefault();
    $cv.setPointerCapture(e.pointerId);
    const { x, y } = cellAt(e, $cv, N);
    if (x < 0) return;
    undo.push(gridCopy(grid));
    if (tool === 'fill') { floodFill(x, y); draw(); return; }
    drawing = true; strokeDirty = false;
    paintCell(x, y); draw();
  }

  // onMove 拖动中逐格涂色
  function onMove(e) {
    if (!drawing) return;
    const { x, y } = cellAt(e, $cv, N);
    if (x < 0) return;
    paintCell(x, y); draw();
  }

  // onUp 收笔：未改任何格则丢弃空历史
  function onUp() {
    if (!drawing) return;
    if (!strokeDirty) undo.pop();
    drawing = false; strokeDirty = false;
  }

  // paintCell 单格落色；改色才置 dirty（橡皮填回空）
  function paintCell(x, y) {
    const c = tool === 'eraser' ? '' : color;
    if (grid[y][x] === c) return;
    grid[y][x] = c; strokeDirty = true;
  }

  // floodFill 填充桶：连通同色区域一次性换色（BFS）
  function floodFill(x, y) {
    const old = grid[y][x];
    const nc = tool === 'eraser' ? '' : color;
    if (old === nc) return;
    const q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.pop();
      if (cx < 0 || cy < 0 || cx >= N || cy >= N || grid[cy][cx] !== old) continue;
      grid[cy][cx] = nc;
      q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    strokeDirty = true;
  }

  // doUndo 弹出最近一笔历史并恢复
  function doUndo() {
    const prev = undo.pop();
    if (!prev) return;
    grid = prev; draw();
  }

  // draw 重绘整张网格：空格画底色 + 网格线 + 有色格
  function draw() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = grid[y][x] || BG;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, N * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(N * CELL, i * CELL + 0.5); ctx.stroke();
    }
  }

  // exportPng 按实际像素导出无网格线 PNG（每格放大 16px 便于分享）
  function exportPng() {
    const scale = 16;
    const c = document.createElement('canvas');
    c.width = N * scale; c.height = N * scale;
    const cx = c.getContext('2d');
    cx.fillStyle = BG; cx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!grid[y][x]) continue;
      cx.fillStyle = grid[y][x]; cx.fillRect(x * scale, y * scale, scale, scale);
    }
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png'); a.download = 'pixel-art.png';
    document.body.appendChild(a); a.click(); a.remove();
  }
}
