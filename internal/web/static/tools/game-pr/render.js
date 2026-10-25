// 波多黎各渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 多步收集（市长安置、弃货保留、装货数量）用模块级 ui 暂存；同一决策点内重绘不清空。
import { t, tr } from '/core/i18n.js';
import {
  GOODS, GOOD_VALUE, GOOD_ICON, BUILDINGS, BUILDING_BY_ID, ROLE_NAMES, hasOccupied,
} from './data.js';
import { prodCapacity, buildCost, sellPrice, keepFeasible } from './engine.js';

const ROLE_ORDER = ['settler', 'builder', 'mayor', 'craftsman', 'trader', 'captain', 'prospector'];
let ui = { stamp: '', mayorAssigns: [], keep: null };
let ctx = null; // {el, s, legal, pick}，供局部重绘

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.phase.kind}:${s.phase.cur}:${s.round}:${s.log.length}`;
  if (ui.stamp !== stamp) ui = { stamp, mayorAssigns: [], keep: null };
  ctx = { el, s, legal, pick };
  const human = !s.players[s.phase.cur].isAI;
  el.innerHTML = `
    <div class="pr-board">
      ${renderSupply(s, legal, human)}
      <div class="pr-players">${s.players.map((p) => renderPlayer(s, p, human)).join('')}</div>
      ${renderAction(s, legal, human)}
    </div>`;
  bind(el, s, legal, pick, human);
}

// —— 公共区域 ——

function renderSupply(s, legal, human) {
  const canPick = human && s.phase.kind === 'pickRole';
  const roles = ROLE_ORDER
    .filter((id) => s.roles.some((r) => r.id === id))
    .map((id) => {
      const r = s.roles.find((x) => x.id === id);
      const taker = r.taken !== null ? s.players[r.taken] : null;
      const ok = canPick && legal.some((a) => a.role === id);
      return `<span class="pr-role ${ok ? 'pr-click' : ''} ${r.taken !== null ? 'pr-taken' : ''}"
        ${ok ? `data-act='${JSON.stringify({ kind: 'pickRole', role: id })}'` : ''}>
        ${tr(ROLE_NAMES[id])}${r.bonus ? `<b class="pr-bonus">💰${r.bonus}</b>` : ''}
        ${taker ? `<i class="pr-taker" style="color:${taker.color}">${esc(taker.name)}</i>` : ''}</span>`;
    }).join('');
  const offers = s.phase.kind === 'settler'
    ? s.offers.map((g, i) => {
      if (!g) return '<span class="pr-tile pr-gone"></span>';
      const ok = human && legal.some((a) => a.tile === i);
      return `<span class="pr-tile ${ok ? 'pr-click' : ''}" ${ok ? `data-act='${JSON.stringify({ kind: 'settler', tile: i })}'` : ''}
        title="${tr({ zh: '拿这块地', en: 'Take this tile' })}">${GOOD_ICON[g]}</span>`;
    }).join('') : '';
  const trade = s.tradingHouse.map((g) => `<span class="pr-trade-slot">${g ? GOOD_ICON[g] : '·'}</span>`).join('');
  const ships = s.ships.map((ship) =>
    `<span class="pr-ship">${ship.good ? GOOD_ICON[ship.good] : '🚢'} ${ship.load}/${ship.cap}</span>`).join('');
  return `
    <div class="pr-supply">
      <div class="pr-roles">${roles}</div>
      ${offers ? `<div class="pr-offers"><span class="pr-label">${t('pr.ui.offers')}</span>${offers}</div>` : ''}
      <div class="pr-row">
        <span class="pr-label">${t('pr.ui.trading')}</span><span class="pr-trade">${trade}</span>
        <span class="pr-label">${t('pr.ui.ships')}</span>${ships}
        <span class="pr-label">🚢</span><b>${s.colonistShip}</b>
        <span class="pr-label">${t('pr.ui.colonistsLeft')}</span><b>${s.colonistSupply}</b>
        <span class="pr-label">${t('pr.ui.vpLeft')}</span><b>${s.vpSupply}</b>
        <span class="pr-label">${t('pr.ui.round')}</span><b>${s.round}</b>
      </div>
    </div>`;
}

// —— 玩家面板 ——

function renderPlayer(s, p, human) {
  const isCur = p.seat === s.phase.cur;
  const isChooser = s.phase.chooser === p.seat && s.phase.kind !== 'pickRole';
  const mayorMode = human && isCur && s.phase.kind === 'mayor';
  const selCount = (where, i) => ui.mayorAssigns.filter((a) => a.where === where && a.i === i).length;
  const island = p.island.map((tile, i) => {
    const icon = tile.type === 'quarry' ? '⛏️' : GOOD_ICON[tile.type];
    const clickable = mayorMode && !tile.occ;
    const sel = mayorMode && selCount('island', i) > 0;
    return `<span class="pr-tile ${tile.occ || sel ? 'pr-occ' : ''} ${sel ? 'pr-sel' : ''} ${clickable ? 'pr-click' : ''}"
      ${clickable ? `data-mayor="island:${i}"` : ''}>${icon}</span>`;
  }).join('');
  const city = p.city.map((slot, i) => {
    if (!slot.id) return '<span class="pr-slot pr-empty"></span>';
    const b = BUILDING_BY_ID[slot.id];
    const sel = mayorMode ? selCount('city', i) : 0;
    const free = b.circles - slot.occ - sel;
    const clickable = mayorMode && free > 0;
    return `<span class="pr-slot ${slot.occ >= b.circles || sel ? 'pr-occ' : ''} ${sel ? 'pr-sel' : ''} ${clickable ? 'pr-click' : ''}"
      ${clickable ? `data-mayor="city:${i}"` : ''} title="${tr(b.name)} · ${slot.occ}/${b.circles}">
      ${tr(b.name)}<i>${slot.occ + sel}/${b.circles}</i></span>`;
  }).join('');
  const goods = GOODS.filter((g) => p.goods[g] > 0)
    .map((g) => `<span class="pr-good" title="${tr({ zh: '产能', en: 'capacity' })} ${prodCapacity(p, g)}">${GOOD_ICON[g]}×${p.goods[g]}</span>`)
    .join('') || '<span class="muted">—</span>';
  return `
    <div class="pr-player ${isCur ? 'pr-cur' : ''}" style="--pc:${p.color}">
      <div class="pr-phead">
        <span class="bg-dot" style="background:${p.color}"></span>
        <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}${isChooser ? ' ★' : ''}
        <span class="pr-res">💰${p.doubloons} 🏆${p.vp} 🧍${p.san}</span>
      </div>
      <div class="pr-pisland">${island}</div>
      <div class="pr-city">${city}</div>
      <div class="pr-pgoods">${goods}</div>
    </div>`;
}

// —— 阶段操作区 ——

function renderAction(s, legal, human) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  const prompt = `<p class="pr-prompt">${t('pr.ui.prompt.' + ph.kind)}</p>`;
  if (!human) return `<div class="pr-action">${prompt}</div>`;
  switch (ph.kind) {
    case 'pickRole': return `<div class="pr-action">${prompt}</div>`;
    case 'settler': return `<div class="pr-action">${prompt}${settlerBtns(s, legal)}</div>`;
    case 'builder': return `<div class="pr-action">${prompt}${builderPanel(s, legal, p, ph)}</div>`;
    case 'mayor': return `<div class="pr-action">${prompt}${mayorPanel(s, legal, p, ph)}</div>`;
    case 'craftsman': return `<div class="pr-action">${prompt}${craftsmanBtns(legal)}</div>`;
    case 'trader': return `<div class="pr-action">${prompt}${traderBtns(s, legal, p, ph)}</div>`;
    case 'captain': return `<div class="pr-action">${prompt}${captainPanel(s, legal)}</div>`;
    case 'discard': return `<div class="pr-action">${prompt}${discardPanel(s, p)}</div>`;
    default: return `<div class="pr-action">${prompt}</div>`;
  }
}

function actBtn(action, label, cls) {
  return `<button class="btn-soft ${cls || ''}" data-act='${JSON.stringify(action)}'>${label}</button>`;
}

function settlerBtns(s, legal) {
  let out = '';
  if (legal.some((a) => a.tile === 'quarry')) out += actBtn({ kind: 'settler', tile: 'quarry' }, `⛏️ ${t('pr.ui.quarry')}`);
  if (legal.some((a) => a.tile === 'random')) out += actBtn({ kind: 'settler', tile: 'random' }, `🎲 ${t('pr.ui.randomTile')}`);
  out += actBtn({ kind: 'settler', tile: 'pass' }, t('pr.ui.pass'));
  return `<div class="pr-btns">${out}</div>`;
}

// builderPanel 建筑市场：可建列表（按 生产/小型/大型 分组，含折扣价与库存）+ 弃权
function builderPanel(s, legal, p, ph) {
  const builds = legal.filter((a) => a.kind === 'build');
  const chooser = p.seat === ph.chooser;
  const typeLabel = { prod: t('pr.ui.grpProd'), violet: t('pr.ui.grpViolet'), large: t('pr.ui.grpLarge') };
  let out = '', lastType = '';
  for (const a of builds) {
    const b = BUILDING_BY_ID[a.building];
    if (b.type !== lastType) { out += `<div class="pr-grp">${typeLabel[b.type]}</div>`; lastType = b.type; }
    const cost = buildCost(p, a.building, chooser);
    out += `<button class="btn-soft pr-buildbtn" data-act='${JSON.stringify(a)}'>
      ${tr(b.name)} <i>💰${cost} · ${t('pr.ui.stock')}${s.buildingStock[a.building]}</i></button>`;
  }
  const pass = legal.find((a) => a.kind === 'buildPass');
  return `<div class="pr-buildmarket">${out || `<span class="muted">${t('pr.ui.noneAffordable')}</span>`}</div>
    <div class="pr-btns">${pass ? actBtn(pass, t('pr.ui.buildPass')) : ''}</div>`;
}

// mayorPanel 安置进度 + 确认/重置；圆圈点击在玩家面板（data-mayor）
function mayorPanel(s, legal, p, ph) {
  const need = legal[0].count;
  const got = ph.pending[p.seat] || 0;
  const done = ui.mayorAssigns.length;
  const ok = done === need;
  return `
    <p class="muted">${t('pr.ui.mayorInfo')}: ${t('pr.ui.toPlace')} <b>${got + p.san}</b> · ${t('pr.ui.placed')} <b>${done}/${need}</b></p>
    <div class="pr-btns">
      <button class="btn-soft" data-act='{"kind":"mayorPlace"}' ${ok ? '' : 'disabled'}>${t('pr.ui.confirm')}</button>
      <button class="btn-soft" data-role="mayor-reset">${t('pr.ui.reset')}</button>
    </div>`;
}

function craftsmanBtns(legal) {
  let out = legal.filter((a) => a.kind === 'craftsmanExtra')
    .map((a) => actBtn(a, `${GOOD_ICON[a.good]} ${t('pr.ui.takeOne')}`)).join('');
  const pass = legal.find((a) => a.kind === 'craftsmanPass');
  if (pass) out += actBtn(pass, t('pr.ui.craftsmanPass'));
  return `<div class="pr-btns">${out}</div>`;
}

function traderBtns(s, legal, p, ph) {
  const chooser = p.seat === ph.chooser;
  let out = legal.filter((a) => a.kind === 'sell').map((a) =>
    actBtn(a, `${GOOD_ICON[a.good]} +💰${sellPrice(p, a.good, chooser)}`)).join('');
  const pass = legal.find((a) => a.kind === 'sellPass');
  if (pass) out += actBtn(pass, t('pr.ui.sellPass'));
  return `<div class="pr-btns">${out}</div>`;
}

// captainPanel 装货目标（货船/码头 × 货物）每行一个数量下拉 + 按钮
function captainPanel(s, legal) {
  const pairs = new Map();
  for (const a of legal) {
    if (a.kind !== 'ship' && a.kind !== 'wharf') continue;
    const key = `${a.kind}:${a.kind === 'ship' ? a.ship : 'w'}:${a.good}`;
    const cur = pairs.get(key) || { kind: a.kind, ship: a.ship, good: a.good, max: 0 };
    cur.max = Math.max(cur.max, a.count);
    pairs.set(key, cur);
  }
  let out = '';
  for (const pr of pairs.values()) {
    const label = pr.kind === 'wharf' ? `⚓${t('pr.ui.wharf')}` : `🚢${(pr.ship + 1)}`;
    const opts = Array.from({ length: pr.max }, (_, i) =>
      `<option value="${i + 1}" ${i + 1 === pr.max ? 'selected' : ''}>${i + 1}</option>`).join('');
    out += `<div class="pr-cnt-row">
      <span>${label} ${GOOD_ICON[pr.good]}</span>
      <select data-cnt>${opts}</select>
      <button class="btn-soft" data-cntbtn='${JSON.stringify({ kind: pr.kind, ship: pr.ship, good: pr.good })}'>${t('pr.ui.load')}</button>
    </div>`;
  }
  const pass = legal.find((a) => a.kind === 'captainPass');
  if (pass) out += `<div class="pr-btns">${actBtn(pass, t('pr.ui.captainPass'))}</div>`;
  return `<div class="pr-cap">${out || `<span class="muted">${t('pr.ui.noShippable')}</span>`}</div>`;
}

// discardPanel 每种货一个保留数量输入；确认前本地校验可行性
function discardPanel(s, p) {
  if (!ui.keep) ui.keep = defaultKeep(p);
  const rows = GOODS.filter((g) => p.goods[g] > 0).map((g) => `
    <label class="pr-cnt-row">${GOOD_ICON[g]} ×${p.goods[g]}
      <input type="number" min="0" max="${p.goods[g]}" value="${ui.keep[g]}" data-keep="${g}"> ${t('pr.ui.keep')}
    </label>`).join('');
  const ok = keepFeasible(p, ui.keep);
  return `${rows}
    <p class="muted">${t('pr.ui.keepHint')} ${ok ? '' : `⚠️ ${t('pr.ui.badKeep')}`}</p>
    <div class="pr-btns"><button class="btn-soft" data-act='{"kind":"discard"}' ${ok ? '' : 'disabled'}>${t('pr.ui.confirm')}</button></div>`;
}

// defaultKeep 默认保留方案：各 1 件，仓库加成给余量最大的货
function defaultKeep(p) {
  const keep = {};
  for (const g of GOODS) keep[g] = Math.min(p.goods[g], 1);
  const extras = [];
  if (hasOccupied(p, 'small_warehouse')) extras.push(1);
  if (hasOccupied(p, 'large_warehouse')) extras.push(2);
  const rest = GOODS.filter((g) => p.goods[g] > keep[g])
    .sort((a, b) => p.goods[b] - p.goods[a] || GOOD_VALUE[b] - GOOD_VALUE[a]);
  for (const g of rest) {
    for (let i = 0; i < extras.length; i++) {
      if (extras[i]) { keep[g] = Math.min(p.goods[g], keep[g] + extras[i]); extras[i] = 0; break; }
    }
  }
  return keep;
}

// —— 事件绑定 ——

function bind(el, s, legal, pick, human) {
  el.querySelectorAll('[data-act]').forEach(($b) => {
    $b.onclick = () => {
      if (!human) return;
      const a = JSON.parse($b.dataset.act);
      if (a.kind === 'mayorPlace') pick({ kind: 'mayorPlace', assigns: ui.mayorAssigns });
      else if (a.kind === 'discard') pick({ kind: 'discard', keep: ui.keep });
      else pick(a);
    };
  });
  el.querySelectorAll('[data-mayor]').forEach(($b) => {
    $b.onclick = () => {
      if (!human || s.phase.kind !== 'mayor') return;
      toggleMayor($b.dataset.mayor, legal[0].count);
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
  el.querySelectorAll('[data-role="mayor-reset"]').forEach(($b) => {
    $b.onclick = () => { ui.mayorAssigns = []; renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick); };
  });
  el.querySelectorAll('[data-cntbtn]').forEach(($b) => {
    $b.onclick = () => {
      if (!human) return;
      const a = JSON.parse($b.dataset.cntbtn);
      a.count = Number($b.closest('.pr-cnt-row').querySelector('select').value);
      pick(a);
    };
  });
  el.querySelectorAll('[data-keep]').forEach(($inp) => {
    $inp.onchange = () => {
      const g = $inp.dataset.keep;
      ui.keep[g] = Math.max(0, Math.min(Number($inp.value), ctx.s.players[ctx.s.phase.cur].goods[g]));
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
}

// toggleMayor 切换一个安置目标（不超本轮须安置数）
function toggleMayor(key, need) {
  const [where, i] = key.split(':');
  const idx = ui.mayorAssigns.findIndex((a) => a.where === where && a.i === Number(i));
  if (idx >= 0) ui.mayorAssigns.splice(idx, 1);
  else if (ui.mayorAssigns.length < need) ui.mayorAssigns.push({ where, i: Number(i) });
}
