// 卡坦岛渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// SVG 六边形岛（地形底色 + 数字 token + 强盗 + 港口）+ 顶点村庄/城 + 边道路，
// 明牌玩家面板（资源/发展卡/棋子全公开）+ 主阶段操作区（建造提示/发展卡/
// 银行交易/国内交易）+ 微阶段面板（弃牌/强盗/抢牌/免费路/丰年/垄断/交易裁决）。

import { t } from '/core/i18n.js';
import {
  HEX_SIZE, VERTICES, EDGES, HEXES, HEX_VERTS, RES_NAMES,
} from './data-board.js';
import { DEV_NAMES, harborRatio, currentPlayer, vpOf } from './engine.js';

const TERR = [
  { c: '#3f7d4e', zh: '森林', en: 'Forest' },
  { c: '#b0623f', zh: '山丘', en: 'Hills' },
  { c: '#9cbf5f', zh: '牧场', en: 'Pasture' },
  { c: '#d4a83f', zh: '农田', en: 'Fields' },
  { c: '#8b8b95', zh: '山脉', en: 'Mountains' },
  { c: '#d9c98e', zh: '沙漠', en: 'Desert' },
];
const RES_ICON = ['🪵', '🧱', '🐑', '🌾', '⛰️'];
const DEV_ICON = { knight: '🗡️', roadBuild: '🛤️', yearOfPlenty: '🎁', monopoly: '💰', vp: '🏆' };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// —— 静态几何：视窗（只算一次）——
let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
for (const v of VERTICES) {
  minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
  minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
}
const PAD = 52; // 港口标签留白
const VB = `${minX - PAD} ${minY - PAD} ${maxX - minX + 2 * PAD} ${maxY - minY + 2 * PAD}`;

// hexPoints 尖顶六边形顶点串
function hexPoints(x, y, r) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = ((30 + 60 * k) * Math.PI) / 180;
    pts.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// resChip 资源芯片（明牌展示；discard 微阶段可点选弃哪张）
function resChip(i, count, clickable) {
  const cls = `ct-chip${count > 0 ? '' : ' ct-chip-zero'}`
    + `${clickable && count > 0 ? ' ct-chip-act" data-discard="' + i : '"'}`;
  return `<span class="${cls}">${RES_ICON[i]}<b>${count}</b></span>`;
}

// 模块级 UI 状态（跨重绘保留；stamp 变化即换人/换阶段时重置）
let ui = { stamp: '', bank: { give: 0, get: 1 }, dom: { to: 1, giveRes: 0, giveN: 1, getRes: 1, getN: 1 } };
let ctx = null; // {el, s, legal, pick}

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.turn}:${currentPlayer(s)}:${s.phase}:${s.pending ? s.pending.kind : ''}:${s.log.length}`;
  if (ui.stamp !== stamp) ui = { stamp, bank: { give: 0, get: 1 }, dom: { to: 1, giveRes: 0, giveN: 1, getRes: 1, getN: 1 } };
  ctx = { el, s, legal, pick };
  const human = !s.players[currentPlayer(s)].isAI;
  el.innerHTML = `
    <div class="ct-prompt">${promptHtml(s, human)}</div>
    <div class="ct-wrap">
      <div class="ct-left">
        ${boardSvg(s, legal, human)}
        ${actionHtml(s, legal, human)}
      </div>
      <div class="ct-players">${s.players.map((p) => playerHtml(s, p, human)).join('')}</div>
    </div>`;
  wire(el, pick, human);
}

// promptHtml 阶段提示行
function promptHtml(s, human) {
  const p = s.players[currentPlayer(s)];
  const key = s.pending ? `ct.ui.prompt.${s.pending.kind}` : `ct.ui.prompt.${s.phase}`;
  const rob = t('ct.ui.robberAt') + ' ' + esc(terrName(s, s.robber));
  return `${p.isAI ? '🤖 ' : ''}<b>${esc(p.name)}</b> — ${t(key)} <span class="ct-sub">${rob} · ${t('ct.ui.devDeck')} ${s.devDeck.length}</span>`;
}

// terrName 格子地形名（含数字）
function terrName(s, hi) {
  const h = s.hexes[hi];
  const nm = TERR[h.terrain];
  return `${nm.zh}(${h.number === null ? '—' : h.number})`;
}

// —— SVG 棋盘 ——

// boardSvg 棋盘主体：格子 + 数字 + 港口 + 道路 + 建筑 + 可点目标
function boardSvg(s, legal, human) {
  const clicks = clickMaps(s, legal, human);
  let out = '';
  for (let hi = 0; hi < HEXES.length; hi++) out += hexSvg(s, hi, clicks.hex);
  out += s.harbors.map((h) => harborSvg(s, h)).join('');
  for (const [e, seat] of Object.entries(s.roads)) out += roadSvg(Number(e), seat);
  for (const [v, b] of Object.entries(s.buildings)) out += buildingSvg(Number(v), b, s);
  out += vertexBtns(clicks.vertex);
  out += edgeBtns(clicks.edge, s);
  return `<svg viewBox="${VB}" class="ct-svg" role="img">${out}</svg>`;
}

// clickMaps 当前合法动作 → 可点目标映射（hex / vertex / edge）
function clickMaps(s, legal, human) {
  const m = { hex: new Map(), vertex: new Map(), edge: new Map() };
  if (!human) return m;
  for (const a of legal) {
    if (a.kind === 'moveRobber') m.hex.set(a.hex, a);
    else if (a.kind === 'placeSettlement' || a.kind === 'settlement') m.vertex.set(a.v, a);
    else if (a.kind === 'city') m.vertex.set(a.v, a);
    else if (a.kind === 'placeRoad' || a.kind === 'road' || a.kind === 'freeRoad') m.edge.set(a.e, a);
  }
  return m;
}

// hexSvg 单格：地形 + 数字 token + 强盗 + 可点环
function hexSvg(s, hi, hexClicks) {
  const h = s.hexes[hi];
  const c = hexCenter(hi);
  const terr = TERR[h.terrain];
  const btn = hexClicks.has(hi);
  let out = `<g${btn ? ` class="ct-hexbtn" data-hex="${hi}"` : ''}>
    <polygon points="${hexPoints(c.x, c.y, HEX_SIZE - 1)}" class="ct-hex" fill="${terr.c}"></polygon>`;
  if (h.number !== null) {
    const red = h.number === 6 || h.number === 8;
    out += `<circle cx="${c.x}" cy="${c.y}" r="11.5" class="ct-num${red ? ' ct-num-red' : ''}"></circle>
      <text x="${c.x}" y="${c.y + 4}" class="ct-numtxt${red ? ' ct-numtxt-red' : ''}" text-anchor="middle">${h.number}</text>`;
  }
  if (s.robber === hi) {
    out += `<circle cx="${c.x}" cy="${c.y + (h.number === null ? 0 : 17)}" r="7" class="ct-robber"></circle>
      <text x="${c.x}" y="${c.y + (h.number === null ? 3.5 : 20.5)}" class="ct-robber-txt" text-anchor="middle">R</text>`;
  }
  if (btn) out += `<polygon points="${hexPoints(c.x, c.y, HEX_SIZE - 1)}" class="ct-ring"></polygon>
    <title>${t('ct.ui.moveRobberTo')} ${terrName(s, hi)}</title>`;
  return `${out}</g>`;
}

// hexCenter 格子中心（与 data-board 生成式一致）
function hexCenter(hi) {
  const h = HEXES[hi];
  return { x: Math.sqrt(3) * HEX_SIZE * (h.q + h.r / 2), y: 1.5 * HEX_SIZE * h.r };
}

// harborSvg 港口标签：海岸边中点向外偏移
function harborSvg(s, hb) {
  const e = EDGES[hb.edge];
  const mx = (VERTICES[e.a].x + VERTICES[e.b].x) / 2;
  const my = (VERTICES[e.a].y + VERTICES[e.b].y) / 2;
  const d = Math.hypot(mx, my) || 1;
  const px = (mx / d) * (d + 30);
  const py = (my / d) * (d + 30);
  const label = hb.res === -1 ? '3:1' : `2:1 ${RES_ICON[hb.res]}`;
  return `<g class="ct-harbor"><text x="${px.toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="middle">${label}</text>
    <line x1="${(mx * 1.04).toFixed(1)}" y1="${(my * 1.04).toFixed(1)}" x2="${(px * 0.93).toFixed(1)}" y2="${(py * 0.93).toFixed(1)}" class="ct-harbor-line"></line></g>`;
}

// roadSvg 道路：边两端内缩 26% 的粗线
function roadSvg(e, seat) {
  const { a, b } = EDGES[e];
  const A = VERTICES[a]; const B = VERTICES[b];
  const dx = (B.x - A.x) * 0.26; const dy = (B.y - A.y) * 0.26;
  return `<line x1="${(A.x + dx).toFixed(1)}" y1="${(A.y + dy).toFixed(1)}"
    x2="${(B.x - dx).toFixed(1)}" y2="${(B.y - dy).toFixed(1)}"
    class="ct-road" style="stroke:${colorOf(seat)}"></line>`;
}

// colorOf 座位色（从 ctx 状态取）
function colorOf(seat) {
  return ctx.s.players[seat].color;
}

// buildingSvg 建筑：村 = 圆点，城 = 方块（带描边）
function buildingSvg(v, b, s) {
  const p = VERTICES[v];
  const color = s.players[b.seat].color;
  if (b.city) {
    return `<rect x="${(p.x - 7.5).toFixed(1)}" y="${(p.y - 7.5).toFixed(1)}" width="15" height="15" rx="2.5"
      class="ct-city" fill="${color}"><title>${esc(s.players[b.seat].name)} · ${t('ct.ui.city')}</title></rect>`;
  }
  return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7.5"
    class="ct-settle" fill="${color}"><title>${esc(s.players[b.seat].name)} · ${t('ct.ui.settlement')}</title></circle>`;
}

// vertexBtns 可点顶点：透明大圆 + 高亮环
function vertexBtns(vertexClicks) {
  let out = '';
  for (const [v, a] of vertexClicks) {
    const p = VERTICES[v];
    const isCity = a.kind === 'city';
    out += `<g class="ct-vertexbtn" data-vertex="${v}">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="11" class="ct-vertex-hit"></circle>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isCity ? 10 : 11}" class="ct-vertex-ring"
        stroke-dasharray="${isCity ? '3 2' : ''}"></circle>
      <title>${isCity ? t('ct.ui.upgradeCity') : t('ct.ui.buildSettlement')} · V${v}</title></g>`;
  }
  return out;
}

// edgeBtns 可点边：透明宽命中线 + 高亮线
function edgeBtns(edgeClicks, s) {
  let out = '';
  for (const [e] of edgeClicks) {
    const { a, b } = EDGES[e];
    const A = VERTICES[a]; const B = VERTICES[b];
    out += `<g class="ct-edgebtn" data-edge="${e}">
      <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" class="ct-edge-hit"></line>
      <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" class="ct-edge-ring"></line>
      <title>${t('ct.ui.buildRoad')} · E${e}</title></g>`;
  }
  return out;
}

// —— 玩家面板（明牌：资源 / 发展卡 / 棋子全公开）——

// playerHtml 单个玩家面板
function playerHtml(s, p, humanCur) {
  const isDiscarding = s.pending && s.pending.kind === 'discard'
    && s.pending.seat === p.seat && !p.isAI;
  const badges = [
    s.longestRoad.seat === p.seat ? `<span class="ct-badge" title="${t('ct.ui.longestRoad')}">🛣️+2</span>` : '',
    s.largestArmy.seat === p.seat ? `<span class="ct-badge" title="${t('ct.ui.largestArmy')}">⚔️+2</span>` : '',
  ].join('');
  const chips = RES_ICON.map((_, i) => resChip(i, p.res[i], isDiscarding)).join('');
  return `<div class="ct-player${currentPlayer(s) === p.seat ? ' ct-cur' : ''}">
    <div class="ct-phead"><span class="ct-dot" style="background:${p.color}"></span>
      <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}
      <span class="ct-vp">${t('ct.ui.vp')} ${vpOf(s, p.seat)}</span>${badges}</div>
    <div class="ct-res">${chips}</div>
    <div class="ct-pdev">${devHtml(s, p, humanCur)}</div>
    <div class="ct-ppieces">🛣️${p.roads.length} 🏘️${p.settlements.length} 🏙️${p.cities.length} · 🗡️${p.knights}</div>
  </div>`;
}

// devHtml 手牌发展卡（按类型聚合计数；当前人类可打的高亮）
function devHtml(s, p, humanCur) {
  const mine = humanCur && currentPlayer(s) === p.seat;
  const counts = new Map();
  for (const c of p.dev) counts.set(c.t, (counts.get(c.t) || 0) + 1);
  if (counts.size === 0) return `<span class="ct-sub">${t('ct.ui.noDev')}</span>`;
  const playKinds = { knight: 'playKnight', roadBuild: 'playRoadBuild',
    yearOfPlenty: 'playYop', monopoly: 'playMono' };
  let out = '';
  for (const [tp, n] of counts) {
    const playable = mine && playKinds[tp]
      && ctx.legal.some((a) => a.kind === playKinds[tp]);
    out += `<span class="ct-dev${playable ? ' ct-dev-play' : ''}" title="${t('ct.dev.' + tp)}">${DEV_ICON[tp]}×${n}</span>`;
  }
  return out;
}

// —— 操作区 ——

// actionHtml 主操作区：微阶段面板 / 掷骰 / 主阶段按钮与交易表单
function actionHtml(s, legal, human) {
  if (!human) return '';
  if (s.pending) return pendingHtml(s, legal);
  if (s.phase === 'roll') {
    return `<div class="ct-actions" data-bg-focus><button class="btn-soft" data-act="roll">🎲 ${t('ct.ui.roll')}</button></div>`;
  }
  return `<div class="ct-actions" data-bg-focus>
    ${mainButtonsHtml(legal)}
    ${bankFormHtml(s, legal)}
    ${domFormHtml(s)}
    <button class="btn-soft" data-act="endTurn">${t('ct.ui.endTurn')}</button>
  </div>`;
}

// pendingHtml 微阶段面板
function pendingHtml(s, legal) {
  const k = s.pending.kind;
  if (k === 'steal') return `<div class="ct-actions" data-bg-focus><div class="ct-sub">${t('ct.ui.prompt.steal')}</div>
    ${legal.map((a) => `<button class="btn-soft" data-act="steal" data-victim="${a.victim}" data-res="${a.res}">
      ${esc(s.players[a.victim].name)} ${RES_ICON[a.res]}</button>`).join('')}</div>`;
  if (k === 'yop' || k === 'mono') {
    return `<div class="ct-actions" data-bg-focus><div class="ct-sub">${t('ct.ui.prompt.' + k)}</div>
      ${legal.map((a) => `<button class="btn-soft" data-act="${k === 'yop' ? 'yopTake' : 'monoPick'}" data-res="${a.res}">
      ${RES_ICON[a.res]}</button>`).join('')}</div>`;
  }
  if (k === 'tradeOffer') return tradeOfferHtml(s);
  return `<div class="ct-actions" data-bg-focus><div class="ct-sub">${t('ct.ui.prompt.' + k)}</div></div>`;
}

// tradeOfferHtml 交易提议裁决面板（收到方视角）
function tradeOfferHtml(s) {
  const pd = s.pending;
  const from = s.players[pd.from];
  return `<div class="ct-actions ct-offer" data-bg-focus><b>${esc(from.name)}</b> ${t('ct.ui.offers')}
    <span class="ct-chip">→ ${resList(pd.give)}</span> / <span class="ct-chip">← ${resList(pd.get)}</span>
    <button class="btn-soft" data-act="tradeAccept">✅ ${t('ct.ui.tradeAccept')}</button>
    <button class="btn-soft" data-act="tradeDecline">❌ ${t('ct.ui.tradeDecline')}</button></div>`;
}

// resList 资源计数数组转图标串（如 🪵×2 🧱×1）
function resList(counts) {
  return counts.map((c, i) => (c > 0 ? `${RES_ICON[i]}×${c} ` : '')).join('').trim();
}

// mainButtonsHtml 主阶段按钮行：发展卡购买与打出
function mainButtonsHtml(legal) {
  const has = (k) => legal.some((a) => a.kind === k);
  const devBtns = [
    has('playKnight') ? `<button class="btn-soft" data-act="playKnight">🗡️ ${t('ct.ui.playKnight')}</button>` : '',
    has('playRoadBuild') ? `<button class="btn-soft" data-act="playRoadBuild">🛤️ ${t('ct.ui.playRoadBuild')}</button>` : '',
    has('playYop') ? `<button class="btn-soft" data-act="playYop">🎁 ${t('ct.ui.playYop')}</button>` : '',
    has('playMono') ? `<button class="btn-soft" data-act="playMono">💰 ${t('ct.ui.playMono')}</button>` : '',
  ].join('');
  return `${has('buyDev') ? `<button class="btn-soft" data-act="buyDev">🂠 ${t('ct.ui.buyDev')}</button>` : ''}${devBtns}`;
}

// resSelect 资源下拉框（选中项由 sel 决定）
function resSelect(id, sel, maxOpt) {
  const opts = RES_ICON.map((_, i) => {
    const label = `${RES_ICON[i]} ${t('ct.res.' + i)}`;
    return `<option value="${i}"${i === sel ? ' selected' : ''}>${label}</option>`;
  }).join('');
  return `<select id="${id}" class="ct-sel">${opts}</select>`;
}

// bankFormHtml 银行交易表单（比率随港口自动 4:1 / 3:1 / 2:1）
function bankFormHtml(s, legal) {
  const b = ui.bank;
  const ratio = harborRatio(s, currentPlayer(s), b.give);
  const ok = legal.some((a) => a.kind === 'bank' && a.give === b.give && a.get === b.get);
  return `<div class="ct-form"><span class="ct-ft">${t('ct.ui.bankTrade')}</span>
    ${t('ct.ui.give')} ${resSelect('ct-bank-give', b.give)}
    <b class="ct-ratio">${ratio}:1</b> ${t('ct.ui.get')} ${resSelect('ct-bank-get', b.get)}
    <button class="btn-soft" data-act="bankGo"${ok ? '' : ' disabled'}>${t('ct.ui.bankGo')}</button></div>`;
}

// domFormHtml 国内交易提议表单（任意比率，对手人机均可）
function domFormHtml(s) {
  const me = s.players[currentPlayer(s)];
  const others = s.players.filter((p) => p.seat !== me.seat);
  const d = ui.dom;
  const toSel = others.map((p) => `<option value="${p.seat}"${p.seat === d.to ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  return `<div class="ct-form"><span class="ct-ft">${t('ct.ui.domTrade')}</span>
    ${t('ct.ui.to')} <select id="ct-dom-to" class="ct-sel">${toSel}</select>
    ${t('ct.ui.give')} ${resSelect('ct-dom-gr', d.giveRes)}×<input id="ct-dom-gn" type="number" min="1" max="9" value="${d.giveN}" class="ct-numin">
    ${t('ct.ui.get')} ${resSelect('ct-dom-rr', d.getRes)}×<input id="ct-dom-rn" type="number" min="1" max="9" value="${d.getN}" class="ct-numin">
    <button class="btn-soft" data-act="domGo">${t('ct.ui.propose')}</button></div>`;
}

// —— 事件绑定 ——

// wire 事件委托：点击（棋盘目标 + 按钮）与表单变更
function wire(el, pick, human) {
  el.onclick = (ev) => onClick(ev, pick, human);
  el.onchange = (ev) => onChange(ev);
}

// findLegal 在合法动作表中找满足条件的第一个
function findLegal(legal, pred) {
  return legal.find(pred);
}

// onClick 全局点击分发
function onClick(ev, pick, human) {
  if (!human || !ctx) return;
  const tg = ev.target.closest('[data-vertex],[data-edge],[data-hex],[data-discard],[data-act]');
  if (!tg) return;
  const { s, legal } = ctx;
  const act = resolveAction(tg, s, legal);
  if (act) pick(act);
}

// resolveAction 把 DOM 目标解析回合法动作对象
function resolveAction(tg, s, legal) {
  if (tg.dataset.vertex !== undefined) {
    const v = Number(tg.dataset.vertex);
    return findLegal(legal, (a) => a.v === v);
  }
  if (tg.dataset.edge !== undefined) {
    const e = Number(tg.dataset.edge);
    return findLegal(legal, (a) => a.e === e);
  }
  if (tg.dataset.hex !== undefined) {
    const hi = Number(tg.dataset.hex);
    return findLegal(legal, (a) => a.hex === hi);
  }
  if (tg.dataset.discard !== undefined) {
    const r = Number(tg.dataset.discard);
    return findLegal(legal, (a) => a.res === r);
  }
  return buttonAction(tg, s, legal);
}

// buttonAction 操作按钮 → 动作对象（含表单拼装）
function buttonAction(tg, s, legal) {
  const act = tg.dataset.act;
  const simple = ['roll', 'buyDev', 'endTurn', 'playKnight', 'playRoadBuild',
    'playYop', 'playMono', 'tradeAccept', 'tradeDecline'];
  if (simple.includes(act)) return findLegal(legal, (a) => a.kind === act) || { kind: act };
  if (act === 'steal') {
    return findLegal(legal, (a) => a.kind === 'steal'
      && a.victim === Number(tg.dataset.victim) && a.res === Number(tg.dataset.res));
  }
  if (act === 'yopTake' || act === 'monoPick') {
    return findLegal(legal, (a) => a.kind === act && a.res === Number(tg.dataset.res));
  }
  if (act === 'bankGo') {
    return findLegal(legal, (a) => a.kind === 'bank' && a.give === ui.bank.give && a.get === ui.bank.get);
  }
  if (act === 'domGo') return buildDomTrade(s);
  return null;
}

// buildDomTrade 由表单状态拼国内交易动作
function buildDomTrade(s) {
  const d = ui.dom;
  const give = [0, 0, 0, 0, 0]; const get = [0, 0, 0, 0, 0];
  give[d.giveRes] = d.giveN; get[d.getRes] = d.getN;
  return { kind: 'trade', to: d.to, give, get };
}

// onChange 表单变更 → 回存 ui 状态（重绘后不丢）
function onChange(ev) {
  const id = ev.target.id;
  const v = Number(ev.target.value);
  if (id === 'ct-bank-give') ui.bank.give = v;
  else if (id === 'ct-bank-get') ui.bank.get = v;
  else if (id === 'ct-dom-to') ui.dom.to = v;
  else if (id === 'ct-dom-gr') ui.dom.giveRes = v;
  else if (id === 'ct-dom-rr') ui.dom.getRes = v;
  else if (id === 'ct-dom-gn') ui.dom.giveN = v;
  else if (id === 'ct-dom-rn') ui.dom.getN = v;
  else return;
  renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick); // 立即重绘以更新比率/按钮态
}
