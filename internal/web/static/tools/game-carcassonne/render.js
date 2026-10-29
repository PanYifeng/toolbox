// 卡卡颂渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// SVG 拼块棋盘（旋转块组内绘正则朝向图形 + 随从圆点）、可放格高亮、
// 工具栏（当前块预览 + 旋转 + 牌堆 + 跳过）、玩家面板（得分/剩余随从）。

import { t } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { TILES } from './data-tiles.js';
import { currentPlayer } from './engine.js';

const S = 52; // 单块像素（SVG 用户单位）
const EDGE_ENDS = [ // 正则边两端点（单位坐标，顺时针）
  [[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]],
];
const EDGE_MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
const CORNER = { '01': [1, 0], '12': [1, 1], '23': [0, 1], '03': [0, 0] };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const pt = (x, y) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`;

// pullPt 向中心收（道路桩/控制点）
function pullPt(x, y, k) {
  return [0.5 + (x - 0.5) * k, 0.5 + (y - 0.5) * k];
}

// 模块级 UI 状态（旋转角跨重绘保留）
let ui = { stamp: '', rot: 0 };
let ctx = null; // {el, s, legal, pick, human}

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.turn}:${s.phase}:${s.log.length}`;
  if (ui.stamp !== stamp) ui = { stamp, rot: ui.rot };
  const human = !s.players[currentPlayer(s)].isAI;
  ctx = { el, s, legal, pick, human };
  // 旋转角对齐当前块合法朝向（新块旧角不可放时自动纠正）
  const places = legal.filter((a) => a.kind === 'place');
  if (places.length && !places.some((a) => a.r === ui.rot)) ui.rot = places[0].r;
  draw();
}

// draw 内部重绘（旋转按钮触发）
function draw() {
  const { el, s, legal, human } = ctx;
  el.innerHTML = `
    <div class="ca-prompt" data-bg-focus>${promptHtml(s)}</div>
    <div class="ca-wrap">
      ${toolbarHtml(s, legal, human)}
      <div class="ca-boardwrap">${boardSvg(s, legal, human)}</div>
      <div class="ca-players">${s.players.map((p) => playerHtml(s, p)).join('')}</div>
    </div>`;
  wire();
}

// promptHtml 阶段提示行
function promptHtml(s) {
  const p = s.players[currentPlayer(s)];
  const key = s.gameOver ? 'ca.ui.prompt.over' : `ca.ui.prompt.${s.phase}`;
  return `${p.isAI ? '🤖 ' : ''}<b>${esc(p.name)}</b> — ${t(key)}`;
}

// toolbarHtml 工具栏：当前块预览 + 旋转 + 牌堆 + （随从阶段）跳过
function toolbarHtml(s, legal, human) {
  const meeples = legal.filter((a) => a.kind === 'meeple');
  const isTile = s.phase === 'tile';
  return `
    <div class="ca-toolbar">
      <div class="ca-preview" title="${t('ca.ui.curTile')}">
        ${isTile && s.current >= 0 ? tileSvg(s.current, ui.rot, 46) : `<div class="ca-preview-empty">—</div>`}
      </div>
      ${isTile ? `
        <button class="btn-soft" data-act="rotL" ${human ? '' : 'disabled'}>↺</button>
        <button class="btn-soft" data-act="rotR" ${human ? '' : 'disabled'}>↻</button>` : ''}
      <span class="ca-deck">${fmt(t('ca.ui.deck'), { n: s.deck.length })}</span>
      ${!isTile && human && meeples.length
        ? `<button class="btn-soft" data-act="skip">${t('ca.ui.skipMeeple')}</button>` : ''}
    </div>`;
}

// tileSvg 单块 SVG（正则朝向图形 + 旋转组）
function tileSvg(t, r, size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">
    <g transform="rotate(${r * 90} ${S / 2} ${S / 2})">${tileArt(t)}</g>
  </svg>`;
}

// tileArt 正则朝向块图（草地底 + 城市 + 道路 + 修道院 + 纹章）
function tileArt(t) {
  const td = TILES[t];
  let out = `<rect x="0.8" y="0.8" width="${S - 1.6}" height="${S - 1.6}" rx="2.5" class="ca-grass"/>`;
  for (const f of td.feats) {
    if (f.k === 'C') out += cityArt(f);
    else if (f.k === 'R') out += roadArt(f);
    else if (f.k === 'M') out += monasteryArt();
  }
  for (const f of td.feats) {
    if (f.k === 'C' && f.p) out += pennantArt(f.pos);
  }
  return out;
}

// cityArt 城市图形：每边梯形 + 中心辐条（多边城市贯通）
function cityArt(f) {
  const [cx, cy] = [f.pos.x, f.pos.y];
  let out = '';
  for (const e of f.e) {
    const [[ax, ay], [bx, by]] = EDGE_ENDS[e];
    const iax = ax + (cx - ax) * 0.5;
    const iay = ay + (cy - ay) * 0.5;
    const ibx = bx + (cx - bx) * 0.5;
    const iby = by + (cy - by) * 0.5;
    out += `<polygon class="ca-city" points="${pt(ax, ay)} ${pt(bx, by)} ${pt(ibx, iby)} ${pt(iax, iay)}"/>`;
    const [mx, my] = EDGE_MID[e];
    out += `<line class="ca-city" x1="${(cx * S).toFixed(1)}" y1="${(cy * S).toFixed(1)}"
      x2="${(mx * S).toFixed(1)}" y2="${(my * S).toFixed(1)}"/>`;
  }
  return out;
}

// roadArt 道路图形：单边直桩 / 双边贝塞尔拐弯
function roadArt(f) {
  const d = (() => {
    const [ax, ay] = EDGE_MID[f.e[0]];
    if (f.e.length === 1) {
      const [ex, ey] = pullPt(ax, ay, 0.62);
      return `M ${pt(ax, ay)} L ${pt(ex, ey)}`;
    }
    const [bx, by] = EDGE_MID[f.e[1]];
    const key = [f.e[0], f.e[1]].sort().join('');
    const cr = (f.e[0] + f.e[1]) % 2 === 0 ? [0.5, 0.5] : CORNER[key];
    const [qx, qy] = pullPt(cr[0], cr[1], 0.55);
    return `M ${pt(ax, ay)} Q ${pt(qx, qy)} ${pt(bx, by)}`;
  })();
  return `<path class="ca-road-case" d="${d}"/><path class="ca-road" d="${d}"/>`;
}

// monasteryArt 修道院小屋
function monasteryArt() {
  return `
    <rect class="ca-mon-wall" x="${0.4 * S}" y="${0.46 * S}" width="${0.2 * S}" height="${0.16 * S}"/>
    <polygon class="ca-mon-roof" points="${pt(0.35, 0.46)} ${pt(0.65, 0.46)} ${pt(0.5, 0.28)}"/>`;
}

// pennantArt 纹章盾（落在城市落点向中心偏 30% 处）
function pennantArt(pos) {
  const x = (pos.x + (0.5 - pos.x) * 0.3) * S;
  const y = (pos.y + (0.5 - pos.y) * 0.3) * S;
  return `<path class="ca-pennant" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"
    d="M -4.2 -5 h 8.4 v 5.5 q 0 3.6 -4.2 5.2 q -4.2 -1.6 -4.2 -5.2 z"/>`;
}

// boardSvg 棋盘：包围盒视窗 + 已放块（旋转组 + 随从）+ 高亮格 + 随从落点
function boardSvg(s, legal, human) {
  const cells = Object.keys(s.board).map((k) => k.split(',').map(Number));
  const hl = human && s.phase === 'tile'
    ? legal.filter((a) => a.kind === 'place' && a.r === ui.rot) : [];
  const xs = cells.map((c) => c[0]).concat(hl.map((a) => a.x));
  const ys = cells.map((c) => c[1]).concat(hl.map((a) => a.y));
  const minX = Math.min(...xs) - 1;
  const maxX = Math.max(...xs) + 2;
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 2;
  const vb = `${minX * S} ${minY * S} ${(maxX - minX) * S} ${(maxY - minY) * S}`;
  let out = `<svg class="ca-board" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">`;
  for (const [x, y] of cells) {
    const c = s.board[`${x},${y}`];
    out += `<g transform="translate(${x * S} ${y * S})">
      <g transform="rotate(${c.r * 90} ${S / 2} ${S / 2})">${tileArt(c.t)}
        ${c.m >= 0 ? meepleSvg(s.players[c.mSeat].color, TILES[c.t].feats[c.m].pos) : ''}
      </g></g>`;
  }
  for (const a of hl) {
    out += `<rect class="ca-legal" data-cell="1" data-x="${a.x}" data-y="${a.y}"
      x="${a.x * S + 1.5}" y="${a.y * S + 1.5}" width="${S - 3}" height="${S - 3}" rx="3"/>`;
  }
  if (human && s.phase === 'meeple' && s.last) {
    const [lx, ly] = s.last.split(',').map(Number);
    const c = s.board[s.last];
    const color = s.players[s.turn].color;
    let dots = '';
    for (const a of legal) {
      if (a.kind !== 'meeple') continue;
      const pos = TILES[c.t].feats[a.f].pos;
      dots += `<circle class="ca-dot" data-f="${a.f}" cx="${pos.x * S}" cy="${pos.y * S}" r="7.5"/>`;
    }
    out += `<g transform="translate(${lx * S} ${ly * S})">
      <g transform="rotate(${c.r * 90} ${S / 2} ${S / 2})">${dots}</g></g>`;
    out += `<rect class="ca-last" x="${lx * S + 1}" y="${ly * S + 1}" width="${S - 2}" height="${S - 2}" rx="3"/>`;
  }
  out += '</svg>';
  return out;
}

// meepleSvg 随从棋子（玩家色圆点）
function meepleSvg(color, pos) {
  return `<circle class="ca-meeple" cx="${pos.x * S}" cy="${pos.y * S}" r="5.5" fill="${color}"/>`;
}

// playerHtml 玩家面板：色点 + 名 + 得分 + 剩余随从
function playerHtml(s, p) {
  const active = currentPlayer(s) === p.seat && !s.gameOver;
  const meeples = `<span class="ca-meeple-mini" style="color:${p.color}"></span>`.repeat(p.meeples)
    || '<span class="muted">0</span>';
  return `
    <div class="ca-player${active ? ' ca-player-active' : ''}">
      <div class="ca-player-head">
        <span class="bg-dot" style="background:${p.color}"></span>
        <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}
        <span class="ca-score">${p.score}</span>
      </div>
      <div class="ca-player-meeples" title="${t('ca.ui.meeples')}">${meeples}</div>
    </div>`;
}

// wire 事件委托：高亮格落块 / 随从落点 / 旋转 / 跳过
function wire() {
  const { el } = ctx;
  el.onclick = (ev) => {
    const { s, legal, pick, human } = ctx;
    if (!s || s.gameOver) return;
    const cellEl = ev.target.closest('[data-cell]');
    if (cellEl && human && s.phase === 'tile') {
      pick({ kind: 'place', x: Number(cellEl.dataset.x), y: Number(cellEl.dataset.y), r: ui.rot });
      return;
    }
    const dotEl = ev.target.closest('[data-f]');
    if (dotEl && human && s.phase === 'meeple' && s.last) {
      const [x, y] = s.last.split(',').map(Number);
      const f = Number(dotEl.dataset.f);
      if (legal.some((a) => a.kind === 'meeple' && a.f === f)) pick({ kind: 'meeple', x, y, f });
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn || !human) return;
    if (btn.dataset.act === 'rotL') {
      ui.rot = (ui.rot + 3) % 4;
      draw();
    } else if (btn.dataset.act === 'rotR') {
      ui.rot = (ui.rot + 1) % 4;
      draw();
    } else if (btn.dataset.act === 'skip') {
      pick({ kind: 'skip' });
    }
  };
}
