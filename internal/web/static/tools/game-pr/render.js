// 波多黎各渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 多步收集（市长安置、弃货保留、装货数量）用模块级 ui 暂存；同一决策点内重绘不清空。
import { t, tr } from '/core/i18n.js';
import { lackOf, noHint, okHint, renderActionHints, fmtArgs } from '/core/action-hints.js';
import { isViewerSeat } from '/core/seat-view.js';
import {
  GOODS, GOOD_VALUE, GOOD_ICON, ROLE_ICON, BUILDING_ICON, BUILDINGS, BUILDING_BY_ID, ROLE_NAMES, hasOccupied,
} from './data.js';
import { prodCapacity, buildCost, sellPrice, keepFeasible, score } from './engine.js';

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
  const human = isViewerSeat(s.phase.cur);
  // 实时总分（筹码 + 建筑 + 大建筑加成）：终局计分口径在任何时刻都可算，直接复用 engine.score
  const totals = new Map(score(s).map((x) => [x.seat, x]));
  el.innerHTML = `
    <div class="pr-board">
      ${renderSupply(s, legal, human)}
      <div class="pr-players">${s.players.map((p) => renderPlayer(s, p, human, totals.get(p.seat))).join('')}</div>
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
        ${ROLE_ICON[id]} ${tr(ROLE_NAMES[id])}${r.bonus ? `<b class="pr-bonus">💰${r.bonus}</b>` : ''}
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
        <span class="pr-label">${t('pr.ui.round')}</span><b>${s.round}</b>${s.endTriggered ? ` <span class="pr-final">${t('pr.ui.finalRound')}</span>` : ''}
      </div>
    </div>`;
}

// —— 玩家面板 ——

// vpBreakText 总分构成明细（筹码 + 建筑 + 大建筑加成），零项省略
function vpBreakText(total) {
  return total.breakdown.filter(([, v]) => v).map(([k, v]) => `${t(k)} ${v}`).join(' + ') || '0';
}

function renderPlayer(s, p, human, total) {
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
    // 大建筑第 2 格只是占位（圆圈只在首格）：不可点击、不重复显示圆圈计数
    const shadow = p.city.findIndex((c) => c.id === slot.id) !== i;
    if (shadow) {
      return `<span class="pr-slot pr-occ pr-shadow" title="${tr(b.name)}">
        <span class="pr-slotin"><i class="pr-bico">${BUILDING_ICON[slot.id] || '🏛️'}</i>${tr(b.name)}</span><i>—</i></span>`;
    }
    const sel = mayorMode ? selCount('city', i) : 0;
    const free = b.circles - slot.occ - sel;
    const clickable = mayorMode && free > 0;
    return `<span class="pr-slot ${slot.occ >= b.circles || sel ? 'pr-occ' : ''} ${sel ? 'pr-sel' : ''} ${clickable ? 'pr-click' : ''}"
      ${clickable ? `data-mayor="city:${i}"` : ''} title="${tr(b.name)} · ${slot.occ}/${b.circles}">
      <span class="pr-slotin"><i class="pr-bico">${BUILDING_ICON[slot.id] || '🏛️'}</i>${tr(b.name)}</span><i>${slot.occ + sel}/${b.circles}</i></span>`;
  }).join('');
  const goods = GOODS.filter((g) => p.goods[g] > 0)
    .map((g) => `<span class="pr-good" title="${tr({ zh: '产能', en: 'capacity' })} ${prodCapacity(p, g)}">${GOOD_ICON[g]}×${p.goods[g]}</span>`)
    .join('') || '<span class="muted">—</span>';
  return `
    <div class="pr-player ${isCur ? 'pr-cur' : ''}" style="--pc:${p.color}">
      <div class="pr-phead">
        <span class="bg-dot" style="background:${p.color}"></span>
        <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}${isChooser ? ' ★' : ''}
        <span class="pr-res">💰${p.doubloons} <span class="pr-total" title="${vpBreakText(total)}">🏆${total.total}</span> 🧍${p.san}</span>
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
  if (!human) return `<div class="pr-action" data-bg-focus>${prompt}</div>`;
  const hints = renderActionHints(phaseHints(s, legal, p, ph));
  const head = `${prompt}${hints}`;
  switch (ph.kind) {
    case 'pickRole': return `<div class="pr-action" data-bg-focus>${head}${roleBtns(s, legal)}</div>`;
    case 'settler': return `<div class="pr-action" data-bg-focus>${head}${settlerBtns(s, legal)}</div>`;
    case 'builder': return `<div class="pr-action" data-bg-focus>${head}${builderPanel(s, legal, p, ph)}</div>`;
    case 'mayor': return `<div class="pr-action" data-bg-focus>${head}${mayorPanel(s, legal, p, ph)}</div>`;
    case 'craftsman': return `<div class="pr-action" data-bg-focus>${head}${craftsmanBtns(legal)}</div>`;
    case 'trader': return `<div class="pr-action" data-bg-focus>${head}${traderBtns(s, legal, p, ph)}</div>`;
    case 'captain': return `<div class="pr-action" data-bg-focus>${head}${captainPanel(s, legal)}</div>`;
    case 'discard': return `<div class="pr-action" data-bg-focus>${head}${discardPanel(s, p)}</div>`;
    default: return `<div class="pr-action" data-bg-focus>${head}</div>`;
  }
}

// phaseHints 各阶段「能做什么 / 为什么做不了」：数量、缺口金币、库存/空位限制
function phaseHints(s, legal, p, ph) {
  switch (ph.kind) {
    case 'pickRole': return [okHint('🎭', t('pr.ui.hintRole'), legal.length)];
    case 'settler': return settlerHints(s, legal, p, ph);
    case 'builder': return builderHints(s, legal, p, ph);
    case 'mayor': return mayorHints(s, legal, p, ph);
    case 'craftsman': return craftsmanHints(legal, p, ph);
    case 'trader': return traderHints(s, legal, p);
    case 'captain': return captainHints(legal, p);
    case 'discard': return discardHints(p);
    default: return [];
  }
}

// mayorHints 市长：待安置数；无空圆圈时说明只能确认（移民滞留圣胡安）
function mayorHints(s, legal, p, ph) {
  const want = legal[0] ? legal[0].count : 0;
  if (want > 0) return [okHint('🧍', t('pr.ui.toPlace'), want)];
  const waiting = (ph.pending[p.seat] || 0) + p.san;
  if (waiting > 0) return [noHint('🧍', t('pr.ui.toPlace'), t('pr.ui.hintNoCircle'))];
  return [noHint('🧍', t('pr.ui.toPlace'), t('pr.ui.hintNoColonist'))];
}

// craftsmanHints 工匠：特权可取数；非选择者或本回合无产出时说明原因
function craftsmanHints(legal, p, ph) {
  const extras = legal.filter((a) => a.kind === 'craftsmanExtra').length;
  if (extras > 0) return [okHint('🔨', t('pr.ui.takeOne'), extras)];
  if (p.seat !== ph.chooser) return [noHint('🔨', t('pr.ui.takeOne'), t('pr.ui.hintNotChooser'))];
  return [noHint('🔨', t('pr.ui.takeOne'), t('pr.ui.hintNoProduce'))];
}

// traderHints 商人：可卖数；不可卖时区分「无货 / 交易所满 / 同种货在所内」
function traderHints(s, legal, p) {
  const sells = legal.filter((a) => a.kind === 'sell').length;
  if (sells > 0) return [okHint('💱', t('pr.ui.sellOne'), sells)];
  if (!GOODS.some((g) => p.goods[g] > 0)) return [noHint('💱', t('pr.ui.sellOne'), t('pr.ui.hintNoGoods'))];
  if (!s.tradingHouse.includes(null)) return [noHint('💱', t('pr.ui.sellOne'), t('pr.ui.hintHouseFull'))];
  return [noHint('💱', t('pr.ui.sellOne'), t('pr.ui.hintHouseDup'))];
}

// captainHints 船长：可装货方式数；无货可装时说明原因（船已满/同种已上船/无货）
function captainHints(legal, p) {
  const loads = legal.filter((a) => a.kind === 'ship' || a.kind === 'wharf').length;
  if (loads > 0) return [okHint('🚢', t('pr.ui.hintLoad'), loads)];
  if (!GOODS.some((g) => p.goods[g] > 0)) return [noHint('🚢', t('pr.ui.hintLoad'), t('pr.ui.hintNoGoods'))];
  return [noHint('🚢', t('pr.ui.hintLoad'), t('pr.ui.hintShipsBusy'))];
}

// settlerHints 开拓者：可拿地块数 / 岛满只能弃权
function settlerHints(s, legal, p) {
  const take = legal.filter((a) => a.kind === 'settler' && a.tile !== 'pass').length;
  if (p.island.length >= 12) return [noHint('🌱', t('pr.ui.hintTakeTile'), t('pr.ui.hintIslandFull'))];
  return [okHint('🌱', t('pr.ui.hintTakeTile'), take)];
}

// builderHints 建筑：可建数量 + （无可建时）最便宜建筑的缺口
function builderHints(s, legal, p, ph) {
  const chooser = p.seat === ph.chooser;
  const builds = legal.filter((a) => a.kind === 'build');
  if (builds.length) return [okHint('🏛️', t('pr.ui.hintBuild'), builds.length)];
  const out = [];
  const stockLeft = BUILDINGS.filter((b) => s.buildingStock[b.id] > 0
    && !p.city.some((slot) => slot.id === b.id)
    && (b.size || 1) === 1 && p.city.some((c) => !c.id));
  if (!stockLeft.length) return [noHint('🏛️', t('pr.ui.hintBuild'), t('pr.ui.hintNoSlot'))];
  const cheapest = Math.min(...stockLeft.map((b) => buildCost(p, b.id, chooser)));
  out.push(noHint('🏛️', t('pr.ui.hintBuild'), reasonMoney(p.doubloons, cheapest)));
  return out;
}

// discardHints 弃货保留：需保留几桶
function discardHints(p) {
  const kinds = GOODS.filter((g) => p.goods[g] > 0).length;
  return [okHint('📦', t('pr.ui.hintKeep'), kinds)];
}

// reasonMoney 金币缺口文案
function reasonMoney(have, need) {
  const lack = lackOf([['💰', need, have]]);
  return lack ? fmtArgs(t('bg.hint.lack'), { d: lack }) : t('bg.hint.none');
}

function actBtn(action, label, cls) {
  return `<button class="btn-soft ${cls || ''}" data-act='${JSON.stringify(action)}'>${label}</button>`;
}

// roleBtns 角色选择：每张可选角色一个按钮（中央角色牌行也能点，但操作区必须有按钮，
// 否则人工操作区的动作按钮为空，只能靠点远处的角色牌，容易被当成「不能操作」）
function roleBtns(s, legal) {
  const out = legal.filter((a) => a.kind === 'pickRole').map((a) => {
    const r = s.roles.find((x) => x.id === a.role);
    const bonus = r && r.bonus ? ` 💰${r.bonus}` : '';
    return actBtn(a, `${ROLE_ICON[a.role]} ${tr(ROLE_NAMES[a.role])}${bonus}`);
  }).join('');
  return `<div class="pr-btns">${out}</div>`;
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
    // 建筑印刷 VP 是终局分主体，购买决策必须看得见（原先按钮只有价格和库存）
    out += `<button class="btn-soft pr-buildbtn" data-act='${JSON.stringify(a)}'>
      ${BUILDING_ICON[a.building] || '🏛️'} ${tr(b.name)} <i>💰${cost} · 🏆${b.vp} · ${t('pr.ui.stock')}${s.buildingStock[a.building]}</i></button>`;
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

// captainPanel 装货目标（✅ 对照 engine：每对（船×货）只有一个合法数量=全量，无需下拉）
function captainPanel(s, legal) {
  const rows = legal.filter((a) => a.kind === 'ship' || a.kind === 'wharf');
  let out = '';
  for (const a of rows) {
    const label = a.kind === 'wharf' ? `⚓${t('pr.ui.wharf')}` : `🚢${(a.ship + 1)}`;
    out += `<div class="pr-cnt-row">
      <span>${label} ${GOOD_ICON[a.good]}</span>
      <b>×${a.count}</b>
      <button class="btn-soft" data-act='${JSON.stringify(a)}'>${t('pr.ui.load')}</button>
    </div>`;
  }
  const pass = legal.find((a) => a.kind === 'captainPass');
  if (pass) out += `<div class="pr-btns">${actBtn(pass, t('pr.ui.captainPass'))}</div>`;
  return `<div class="pr-cap">${out || `<span class="muted">${t('pr.ui.noShippable')}</span>`}</div>`;
}

// discardPanel 每种货一个保留数量输入；确认前本地校验合法性（仓库全保留/风 ros 1 桶语义）
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

// defaultKeep 默认保留方案（✅ 对照 engine keepFeasible）：可全保留则全保留；
// 否则按「余量×价值」选仓库锁定种类（小仓 1 种/大仓 2 种）全保留，另 1 种留 1 桶上风 ros。
function defaultKeep(p) {
  let slots = 0;
  if (hasOccupied(p, 'small_warehouse')) slots += 1;
  if (hasOccupied(p, 'large_warehouse')) slots += 2;
  const kinds = GOODS.filter((g) => p.goods[g] > 0);
  const keep = {};
  const allFit = kinds.length <= slots
    || (kinds.length === slots + 1 && kinds.some((g) => p.goods[g] === 1));
  if (allFit) {
    for (const g of kinds) keep[g] = p.goods[g];
    return keep;
  }
  const byValue = [...kinds].sort((a, b) => GOOD_VALUE[b] * p.goods[b] - GOOD_VALUE[a] * p.goods[a]);
  const locked = byValue.slice(0, slots);
  for (const g of kinds) keep[g] = locked.includes(g) ? p.goods[g] : 0;
  const rest = kinds.filter((g) => !locked.includes(g));
  if (rest.length) {
    const windrose = [...rest].sort((a, b) => GOOD_VALUE[b] - GOOD_VALUE[a])[0];
    keep[windrose] = 1;
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
