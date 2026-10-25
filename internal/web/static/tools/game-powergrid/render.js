// 电力公司渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// SVG 德国地图（42 城 + 费用边 + 产权位）+ 电厂市场 + 资源市场 + 拍卖/建城/结算交互。
import { t, tr } from '/core/i18n.js';
import { PLANT_BY_ID } from './plant-data.js';
import { CITY_NAMES, REGIONS } from './map-data.js';
import {
  turnOrderOf, marketSorted, buildTotalCost, cityBuildable, resStorageLeft, maxPowerSet,
} from './engine.js';
import { RES_ICON, incomeOf, resPrice, SETUP } from './tables.js';

const RES_KINDS = ['coal', 'oil', 'garbage', 'uranium'];
const PLANT_ICON = { coal: '⚫', oil: '🛢️', garbage: '🗑️', uranium: '☢️', hybrid: '🛤️', eco: '🍃' };
let ui = { stamp: '', powerSel: null };
let ctx = null; // {el, s, legal, pick}，供局部重绘

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.phase.kind}:${s.phase.cur}:${s.round}:${s.log.length}`;
  if (ui.stamp !== stamp) ui = { stamp, powerSel: null };
  ctx = { el, s, legal, pick };
  const human = !s.players[s.phase.cur].isAI;
  el.innerHTML = `
    <div class="pg-board">
      ${renderStatus(s)}
      <div class="pg-main">
        <div class="pg-mapwrap">${renderMap(s, legal, human)}</div>
        <div class="pg-side">
          ${renderPlayers(s)}
          ${renderPlantMarket(s, legal, human)}
          ${renderResMarket(s, legal, human)}
        </div>
      </div>
      ${renderAction(s, legal, human)}
    </div>`;
  bind(el, s, legal, pick, human);
}

// —— 顶部状态条 ——

function renderStatus(s) {
  const order = turnOrderOf(s);
  const cfg = SETUP[s.n];
  return `
    <div class="pg-status">
      <span class="pg-step">${t('pg.ui.step')} ${s.step}</span>
      <span>${t('pg.ui.round')} <b>${s.round}</b></span>
      <span>${t('pg.ui.endAt')} <b>${cfg.endCities}</b></span>
      <span class="pg-order">${order.map((seat, i) => {
        const p = s.players[seat];
        return `<i class="pg-seatchip ${i === 0 ? 'pg-first' : ''}" style="--pc:${p.color}">${esc(p.name)}</i>`;
      }).join('')}</span>
    </div>`;
}

// —— SVG 地图 ——

function renderMap(s, legal, human) {
  const inRegion = (id) => s.regions.includes(s.map[id].region);
  const dim = (id) => (inRegion(id) ? '' : ' opacity="0.22"');
  // 边（去重：仅 id 顺序小→大）
  const edges = [];
  for (const c of Object.values(s.map)) {
    for (const [nb, cost] of Object.entries(c.adj)) {
      if (c.id < nb) edges.push({ a: c, b: s.map[nb], cost });
    }
  }
  const edgeSvg = edges.map((e) => {
    const both = inRegion(e.a.id) && inRegion(e.b.id);
    return `
      <line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}"
        class="pg-edge" ${both ? '' : 'pg-dim'}></line>
      <text x="${(e.a.x + e.b.x) / 2}" y="${(e.a.y + e.b.y) / 2 - 3}"
        class="pg-ecost" ${both ? '' : 'pg-dim'}>${e.cost}</text>`;
  }).join('');
  // 区域名（各区域质心）
  const labels = Object.entries(REGIONS).map(([key, r]) => {
    const cs = Object.values(s.map).filter((c) => c.region === key);
    const x = cs.reduce((a, c) => a + c.x, 0) / cs.length;
    const y = cs.reduce((a, c) => a + c.y, 0) / cs.length;
    return `<text x="${x}" y="${y - 60}" class="pg-region ${s.regions.includes(key) ? '' : 'pg-dim'}"
      fill="${r.color}">${tr(r)}</text>`;
  }).join('');
  // 城市
  const cities = Object.values(s.map).map((c) => {
    const buildable = human && s.phase.kind === 'cities'
      && legal.some((a) => a.kind === 'build' && a.city === c.id);
    const cost = buildable ? buildTotalCost(s, s.players[s.phase.cur], c.id) : null;
    const owners = c.owners.map((seat, i) => {
      const ang = (-150 + i * 60) * Math.PI / 180;
      const px = c.x + 17 * Math.cos(ang);
      const py = c.y + 17 * Math.sin(ang);
      return `<circle cx="${px}" cy="${py}" r="4" fill="${s.players[seat].color}"
        stroke="var(--bg)" stroke-width="1"></circle>`;
    }).join('');
    const r = REGIONS[c.region];
    return `
      <g${dim(c.id)} ${buildable ? `class="pg-citybtn" data-city="${c.id}"` : ''}>
        ${buildable ? `<circle cx="${c.x}" cy="${c.y}" r="15" class="pg-buildring"></circle>` : ''}
        <circle cx="${c.x}" cy="${c.y}" r="10" fill="${r.color}" class="pg-city"
          ${c.owners.length ? 'stroke-width="2.5" stroke="var(--fg)"' : ''}></circle>
        ${owners}
        <text x="${c.x}" y="${c.y + 26}" class="pg-clabel">${tr(CITY_NAMES[c.id])}</text>
      </g>`;
  }).join('');
  return `
    <svg viewBox="0 0 1000 880" class="pg-svg" role="img">
      ${edgeSvg}${labels}${cities}
    </svg>`;
}

// —— 玩家面板 ——

function plantMini(p, pl) {
  const d = pl;
  return `<span class="pg-pplant" title="${tr({ zh: '容量', en: 'capacity' })} ${d.cap}">
    <b>#${pl.id}</b>${PLANT_ICON[d.type]}${d.fuel ? `${d.fuel}` : ''}<i>${d.cap}城</i></span>`;
}

function renderPlayers(s) {
  return `<div class="pg-players">${s.players.map((p) => {
    const isCur = p.seat === s.phase.cur;
    const res = RES_KINDS.filter((k) => p.res[k] > 0)
      .map((k) => `<span title="${k}">${RES_ICON[k]}${p.res[k]}</span>`).join('') || '<span class="muted">—</span>';
    return `
      <div class="pg-player ${isCur ? 'pg-cur' : ''}" style="--pc:${p.color}">
        <div class="pg-phead">
          <span class="bg-dot" style="background:${p.color}"></span>
          <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}
          <span class="pr-res">💰${p.electro} 🏙️${p.cities.length} ⚡${p.lastPowered}</span>
        </div>
        <div class="pg-pplants">${p.plants.map((pl) => plantMini(p, pl)).join('') || '<span class="muted">—</span>'}</div>
        <div class="pg-pres">${res}</div>
      </div>`;
  }).join('')}</div>`;
}

// —— 电厂市场 ——

function plantCard(id, opts) {
  const d = PLANT_BY_ID[id];
  const o = opts || {};
  return `<span class="pg-card ${o.cls || ''}" ${o.attr || ''}
    title="${d.type} · ${d.fuel ? `${t('pg.ui.fuel')} ${d.fuel}` : t('pg.ui.eco')}">
    <b>#${id}</b>${PLANT_ICON[d.type]}
    <span class="pg-card-fuel">${d.fuel || '—'}</span>
    <span class="pg-card-cap">⚡${d.cap}</span>
  </span>`;
}

function renderPlantMarket(s, legal, human) {
  const mk = s.plantMarket;
  const offering = human && s.phase.kind === 'auction' && s.phase.plant === null;
  const cur = offering ? mk.current.filter((id) => legal.some((a) => a.kind === 'offer' && a.plant === id)) : null;
  const current = s.step === 3 ? mk.current : marketSorted(s).slice(0, 4);
  const future = s.step === 3 ? [] : marketSorted(s).slice(4, 8);
  const card = (id) => {
    if (offering && cur.includes(id)) {
      return plantCard(id, { cls: 'pg-click pg-offerable', attr: `data-offer="${id}"` });
    }
    if (s.phase.kind === 'auction' && s.phase.plant === id) return plantCard(id, { cls: 'pg-bidding' });
    return plantCard(id);
  };
  return `
    <div class="pg-market">
      <div class="pg-mkrow"><span class="pg-label">${t('pg.ui.currentMarket')}</span>
        ${current.map(card).join('')}</div>
      ${future.length ? `<div class="pg-mkrow"><span class="pg-label">${t('pg.ui.futureMarket')}</span>
        ${future.map(card).join('')}</div>` : ''}
      <div class="pg-mkrow"><span class="pg-label">${t('pg.ui.deck')}</span><b>${s.deck.length}</b></div>
    </div>`;
}

// —— 资源市场 ——

function renderResMarket(s, legal, human) {
  const buying = human && s.phase.kind === 'resources';
  const p = s.players[s.phase.cur];
  const rows = RES_KINDS.map((k) => {
    const remain = s.resMarket[k];
    const price = remain > 0 ? resPrice(k, remain - 1) : '—';
    const maxCnt = buying ? legal.filter((a) => a.kind === 'buyRes' && a.res === k)
      .reduce((a, x) => Math.max(a, x.count), 0) : 0;
    const buy = buying && maxCnt > 0 ? `
      <select data-rcnt="${k}">${Array.from({ length: maxCnt }, (_, i) =>
        `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
      <button class="btn-soft" data-rbuy="${k}">${t('pg.ui.buy')}</button>` : '';
    return `
      <div class="pg-resrow">
        <span class="pg-resname">${RES_ICON[k]} ${t('pg.res.' + k)}</span>
        <span title="${t('pg.ui.marketTitle')}">🏪${remain}</span>
        <span title="${t('pg.ui.supplyTitle')}">📦${s.resSupply[k]}</span>
        <span class="pg-resprice" title="${t('pg.ui.nextPrice')}">${price ? `💰${price}` : '—'}</span>
        ${buying ? `<span class="muted">${t('pg.ui.mine')} ${p.res[k]} (+${resStorageLeft(p, k)})</span>` : ''}
        ${buy}
      </div>`;
  }).join('');
  return `<div class="pg-resmarket">${rows}</div>`;
}

// —— 阶段操作区 ——

function actBtn(action, label) {
  return `<button class="btn-soft" data-act='${JSON.stringify(action)}'>${label}</button>`;
}

function renderAction(s, legal, human) {
  const ph = s.phase;
  const p = s.players[ph.cur];
  const prompt = `<p class="pg-prompt">${t('pg.ui.prompt.' + ph.kind)}</p>`;
  if (!human) return `<div class="pg-action">${prompt}</div>`;
  switch (ph.kind) {
    case 'chooseRegion': return `<div class="pg-action">${prompt}${regionChips(s, legal)}</div>`;
    case 'auction': return `<div class="pg-action">${prompt}${ph.plant === null
      ? offerPanel(legal) : bidPanel(s, ph, p)}</div>`;
    case 'discardPlant': return `<div class="pg-action">${prompt}${discardPanel(p)}</div>`;
    case 'resources': return `<div class="pg-action">${prompt}
      <div class="pg-btns">${actBtn({ kind: 'passRes' }, t('pg.ui.done'))}</div></div>`;
    case 'cities': return `<div class="pg-action">${prompt}${cityPanel(s, legal, p)}</div>`;
    case 'bureaucracy': return `<div class="pg-action">${prompt}${powerPanel(s, p)}</div>`;
    default: return `<div class="pg-action">${prompt}</div>`;
  }
}

function regionChips(s, legal) {
  return `<div class="pg-btns">${legal.map((a) => {
    const r = REGIONS[a.region];
    return `<button class="btn-soft pg-regionbtn" data-act='${JSON.stringify(a)}'
      style="border-color:${r.color};color:${r.color}">${tr(r)}</button>`;
  }).join('')}</div>`;
}

function offerPanel(legal) {
  const pass = legal.find((a) => a.kind === 'passOffer');
  return `<div class="pg-btns">
    <span class="muted">${t('pg.ui.offerHint')}</span>
    ${pass ? actBtn(pass, t('pg.ui.passOffer')) : ''}</div>`;
}

function bidPanel(s, ph, p) {
  const opts = [];
  for (let amt = ph.bid + 1; amt <= p.electro; amt++) {
    opts.push(`<option value="${amt}">${amt}</option>`);
  }
  return `
    <div class="pg-bid">
      ${plantCard(ph.plant, { cls: 'pg-bidding' })}
      <span class="pg-bidnow">${t('pg.ui.bidNow')} <b>💰${ph.bid}</b></span>
      ${opts.length ? `<select data-bidamt>${opts.join('')}</select>
        <button class="btn-soft" data-bidgo>${t('pg.ui.bid')}</button>` : ''}
      ${actBtn({ kind: 'dropBid' }, t('pg.ui.dropBid'))}
    </div>`;
}

function discardPanel(p) {
  return `<div class="pg-btns">${p.plants.map((pl) =>
    plantCard(pl.id, { cls: 'pg-click', attr: `data-discard="${pl.id}"` })).join('')}
    <span class="muted">${t('pg.ui.discardHint')}</span></div>`;
}

function cityPanel(s, legal, p) {
  const builds = legal.filter((a) => a.kind === 'build')
    .map((a) => ({ ...a, cost: buildTotalCost(s, p, a.city) }))
    .sort((a, b) => a.cost - b.cost);
  const chips = builds.slice(0, 12).map((a) =>
    `<button class="btn-soft" data-act='${JSON.stringify({ kind: 'build', city: a.city })}'>
      ${tr(CITY_NAMES[a.city])} 💰${a.cost}</button>`).join('');
  return `<div class="pg-btns">
    ${builds.length ? chips : `<span class="muted">${t('pg.ui.noBuildable')}</span>`}
    ${actBtn({ kind: 'passBuild' }, t('pg.ui.done'))}</div>`;
}

// powerPanel 发电选择：点击自有电厂切换；实时预览供电数与收入
function powerPanel(s, p) {
  if (!ui.powerSel) ui.powerSel = maxPowerSet(p).map((x) => x.id);
  const sel = ui.powerSel;
  const cap = sel.reduce((a, id) => a + PLANT_BY_ID[id].cap, 0);
  const powered = Math.min(cap, p.cities.length);
  const feasible = canPowerSubset(p, sel);
  const cards = p.plants.map((pl) => plantCard(pl.id, {
    cls: `pg-click ${sel.includes(pl.id) ? 'pg-sel' : ''}`,
    attr: `data-toggle="${pl.id}"`,
  })).join('');
  return `
    <div class="pg-power">
      <div class="pg-btns">${cards || `<span class="muted">${t('pg.ui.noPlants')}</span>`}</div>
      <span class="pg-powerinfo">
        ${t('pg.ui.capacity')} <b>${cap}</b> · ${t('pg.ui.willPower')} <b>${powered}</b>
        · ${t('pg.ui.income')} <b>💰${incomeOf(powered)}</b>
        ${feasible ? '' : `⚠️ ${t('pg.ui.fuelShort')}`}
      </span>
      <div class="pg-btns">
        <button class="btn-soft" data-powergo ${feasible ? '' : 'disabled'}>${t('pg.ui.confirm')}</button>
        ${actBtn({ kind: 'power', plants: [] }, t('pg.ui.powerNone'))}
      </div>
    </div>`;
}

// canPowerSubset 与引擎 validatePower 同口径的本地预检（煤/油合并池）
function canPowerSubset(p, ids) {
  const pool = { ...p.res };
  for (const id of ids) {
    const d = PLANT_BY_ID[id];
    if (d.type === 'eco') continue;
    if (d.type === 'hybrid') {
      if (pool.coal + pool.oil < d.fuel) return false;
      let need = d.fuel;
      const takeCoal = Math.min(pool.coal, need);
      pool.coal -= takeCoal; need -= takeCoal; pool.oil -= need;
      continue;
    }
    if (pool[d.type] < d.fuel) return false;
    pool[d.type] -= d.fuel;
  }
  return true;
}

// —— 事件绑定 ——

function bind(el, s, legal, pick, human) {
  el.querySelectorAll('[data-act]').forEach(($b) => {
    $b.onclick = () => { if (human) pick(JSON.parse($b.dataset.act)); };
  });
  el.querySelectorAll('[data-offer]').forEach(($b) => {
    $b.onclick = () => { if (human) pick({ kind: 'offer', plant: Number($b.dataset.offer) }); };
  });
  el.querySelectorAll('[data-discard]').forEach(($b) => {
    $b.onclick = () => { if (human) pick({ kind: 'discardPlant', plant: Number($b.dataset.discard) }); };
  });
  el.querySelectorAll('[data-city]').forEach(($b) => {
    $b.onclick = () => {
      if (!human || s.phase.kind !== 'cities') return;
      pick({ kind: 'build', city: $b.dataset.city });
    };
  });
  el.querySelectorAll('[data-rbuy]').forEach(($b) => {
    $b.onclick = () => {
      if (!human) return;
      const k = $b.dataset.rbuy;
      const cnt = Number($b.closest('.pg-resrow').querySelector('[data-rcnt]').value);
      pick({ kind: 'buyRes', res: k, count: cnt });
    };
  });
  const $bidgo = el.querySelector('[data-bidgo]');
  if ($bidgo) {
    $bidgo.onclick = () => {
      if (!human) return;
      pick({ kind: 'bid', amount: Number(el.querySelector('[data-bidamt]').value) });
    };
  }
  el.querySelectorAll('[data-toggle]').forEach(($b) => {
    $b.onclick = () => {
      if (!human || s.phase.kind !== 'bureaucracy') return;
      const id = Number($b.dataset.toggle);
      const i = ui.powerSel.indexOf(id);
      if (i >= 0) ui.powerSel.splice(i, 1); else ui.powerSel.push(id);
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
  const $powergo = el.querySelector('[data-powergo]');
  if ($powergo) {
    $powergo.onclick = () => {
      if (!human) return;
      pick({ kind: 'power', plants: [...ui.powerSel] });
    };
  }
}
