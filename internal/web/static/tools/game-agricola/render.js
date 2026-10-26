// 农场主渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 顶部行动板（累积计数 + 占用标记）→ 子阶段操作面板 → 各玩家面板（资源条 + 5×3 农场）。
// 农场格点击直接映射子阶段动作（建房/犁田/播种/围栏 toggle），无需本地选择态。
import { t, tr } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import {
  RES_INFO, RES_KEYS, ANIMAL_KEYS, MAT_NAMES, visibleSpaces,
  FARM_COLS, FARM_SPACES, HARVEST_ROUNDS, TOTAL_ROUNDS, SPACE_ICON,
} from './actionboard-data.js';
import { OCC_BY_ID, MINOR_BY_ID } from './cards-data.js';
import { MAJORS, MAJOR_BY_ID, MAJOR_ICON } from './majors.js';
import * as E from './engine.js';
import * as I from './cards-interp.js';

let ctx = null; // {el, s, legal, pick}，供局部重绘（当前无本地态，仅保留约定）

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// actBtn 通用动作按钮（data-act 序列化动作）
function actBtn(action, label, cls) {
  return `<button class="btn-soft ${cls || ''}" data-act='${esc(JSON.stringify(action))}'>${label}</button>`;
}

// resBar 资源条：物资 7 项取玩家字段，牲畜 3 项合计（牧场 + 卡上），0 也显示便于对照计分
function resBar(p) {
  const parts = RES_KEYS.map((k) =>
    `<span class="ag-res">${RES_INFO[k].emoji}${
      ANIMAL_KEYS.includes(k) ? E.totalAnimals(p, k) : p[k]
    }</span>`);
  return parts.join('');
}

// colon 中英文冒号
function colon() { return '<span class="muted">：</span>'; }

// ==== 顶部状态条 ====

function renderStatus(s) {
  const isHarvest = HARVEST_ROUNDS.includes(s.round);
  return `
    <div class="ag-status">
      <span class="ag-round">${fmt(t('ag.ui.round'), { r: Math.max(s.round, 1), m: TOTAL_ROUNDS })}</span>
      ${isHarvest ? `<span class="ag-harvest">🌾 ${t('ag.ui.harvest')}</span>` : ''}
      <span class="ag-order">${s.order.map((seat) => {
        const p = s.players[seat];
        return `<i class="ag-seatchip" style="--pc:${p.color}">${esc(p.name)}</i>`;
      }).join('')}</span>
    </div>`;
}

// ==== 行动板 ====

function renderBoardSpaces(s, legal, human) {
  const placeBy = new Map();
  for (const a of legal) if (a.kind === 'place') placeBy.set(a.space, a);
  const cells = visibleSpaces(s.round, s.players.length).map((sp) => {
    const st = s.spaces[sp.id];
    const grant = sp.kind === 'takeResource' || sp.kind === 'start' ? E.grantOf(s, sp) : null;
    const taker = st.taken !== null ? s.players[st.taken] : null;
    const act = placeBy.get(sp.id);
    const cls = [
      'ag-space',
      taker ? 'ag-space-taken' : '',
      act && human ? 'ag-space-act' : '',
    ].filter(Boolean).join(' ');
    return `
      <button class="${cls}" ${act && human ? `data-act='${esc(JSON.stringify(act))}'` : 'disabled'}
        style="${taker ? `--tk:${taker.color}` : ''}">
        <span class="ag-space-name">${SPACE_ICON[sp.id] || ''} ${tr(sp.name)}</span>
        ${grant ? `<span class="ag-space-grant">${E.gainList(grant)}</span>` : ''}
        ${taker ? `<span class="ag-space-mark">${esc(taker.name)}</span>` : ''}
      </button>`;
  }).join('');
  return `<div class="ag-board"><span class="ag-label">${t('ag.ui.board')}</span><div class="ag-boardgrid">${cells}</div></div>`;
}

// ==== 子阶段操作面板 ====

// buildCostStr 建房子阶段当前合计费用串
function buildCostStr(p, pd) {
  const rc = E.roomCostOf(p), sc = E.stableCostOf(p);
  const total = {};
  for (const [k, v] of Object.entries(rc)) total[k] = v * pd.rooms.length;
  for (const [k, v] of Object.entries(sc)) total[k] = (total[k] || 0) + v * pd.stables.length;
  return E.gainList(total) || '—';
}

function subPanel(s, p, pd, legal, human) {
  const done = legal.find((a) => a.kind === 'subDone');
  const cancel = legal.find((a) => a.kind === 'subCancel');
  const tail = `
    <div class="ag-btns">
      ${done ? actBtn(done, `✅ ${t('ag.ui.done')}`, 'ag-primary') : ''}
      ${cancel ? actBtn(cancel, t('ag.ui.cancel')) : ''}
    </div>`;
  let body = '';
  switch (pd.type) {
    case 'build':
      body = `
        <p class="muted">${t('ag.ui.buildHint')}</p>
        <p>${fmt(t('ag.ui.pendingBuild'), { r: pd.rooms.length, s: pd.stables.length, c: buildCostStr(p, pd) })}</p>`;
      break;
    case 'plow': case 'plowsow':
      body = `<p class="muted">${t('ag.ui.plowHint')}</p>`;
      break;
    case 'sow':
      body = `<p class="muted">${t('ag.ui.sowHint')}</p>`;
      break;
    case 'fence': {
      const cost = pd.sel.length ? E.fenceCostOf(p, pd.sel) : 0;
      body = `
        <p class="muted">${t('ag.ui.fenceHint')}</p>
        <p>${fmt(t('ag.ui.pendingFence'), { n: pd.sel.length, w: cost })}</p>`;
      break;
    }
    case 'renov': {
      const info = E.renovInfo(p);
      const renov = legal.find((a) => a.kind === 'subRenovate');
      const majors = legal.filter((a) => a.kind === 'subMajor');
      body = `
        <p class="muted">${t('ag.ui.renovHint')}</p>
        <div class="ag-btns">
          ${renov ? actBtn(renov, `${t('ag.ui.renovate')} ${tr(MAT_NAMES[info.target])}（${E.gainList(info.cost)}）`) : ''}
        </div>
        ${majors.length ? `<div class="ag-mrow">${majors.map((a) => majorCardBtn(s, a)).join('')}</div>` : ''}`;
      break;
    }
    case 'occ': case 'minor':
      body = `<p class="muted">${t('ag.ui.cardHint')}</p>`;
      break;
    default:
      body = '';
  }
  // 播种/犁播共用：播种按钮 + 烤面包按钮
  if (['sow', 'plowsow'].includes(pd.type)) {
    const sows = legal.filter((a) => a.kind === 'subSow');
    const bakes = legal.filter((a) => a.kind === 'subBake');
    const bakeBtns = bakes.map((a) =>
      actBtn(a, `🌾${a.n}→🍞${a.rate * a.n + I.bakeBonus(p)}`)).join('');
    body += `
      ${sows.length ? `<div class="ag-btns">${sows.map((a) =>
        actBtn(a, `${RES_INFO[a.crop].emoji} #${a.idx + 1}`)).join('')}</div>` : ''}
      ${bakes.length ? `<div class="ag-btns"><span class="ag-label">${t('ag.ui.bake')}</span>${bakeBtns}</div>` : ''}`;
  }
  return `<div class="ag-action">${body}${tail}</div>`;
}

// majorCardBtn 大设施购买按钮（名 + 费用 + 说明）
function majorCardBtn(s, a) {
  const m = MAJOR_BY_ID[a.id];
  return `
    <button class="ag-majorbtn" data-act='${esc(JSON.stringify(a))}'>
      <b><i class="ag-bico">${MAJOR_ICON[a.id] || '🏺'}</i> ${tr(m.name)}</b>
      <span class="ag-majorcost">${E.gainList(m.cost)}</span>
      <span class="muted">${tr(m.desc)}</span>
    </button>`;
}

// feedPanel 喂食面板：缺口提示 + 烹食按钮 + 确认
function feedPanel(s, p, legal) {
  const need = E.feedNeedOf(p);
  const short = Math.max(0, need - p.food);
  const cooks = legal.filter((a) => a.kind === 'feedCook');
  const groups = new Map();
  for (const a of cooks) {
    if (!groups.has(a.res)) groups.set(a.res, []);
    groups.get(a.res).push(a);
  }
  const cookBtns = [...groups.entries()].map(([res, acts]) => `
    <span class="ag-cookrow">${RES_INFO[res].emoji}${acts.map((a) =>
      actBtn(a, `${a.n}→🍞${I.cookRates(p)[res] * a.n}`)).join('')}</span>`).join('');
  return `
    <div class="ag-action">
      <p>${fmt(t('ag.ui.feedNeed'), { n: need, m: p.food })}${short ? ` <b class="ag-warn">${fmt(t('ag.ui.feedShort'), { n: short })}</b>` : ''}</p>
      ${cookBtns ? `<div class="ag-btns">${cookBtns}</div>` : ''}
      <div class="ag-btns">${actBtn(legal.find((x) => x.kind === 'feedConfirm'), `✅ ${t('ag.ui.feedConfirm')}`, 'ag-primary')}</div>
    </div>`;
}

// ==== 玩家面板与农场 ====

// fenceSides 牧场组边界方向（组外/农场外每侧都算围栏边，与引擎 compEdges 一致）
function fenceSides(group, idx) {
  const inG = (i) => group.includes(i);
  const row = Math.floor(idx / FARM_COLS);
  return {
    t: !inG(idx - FARM_COLS),
    b: !inG(idx + FARM_COLS),
    l: idx % FARM_COLS === 0 || !inG(idx - 1),
    r: idx % FARM_COLS === FARM_COLS - 1 || !inG(idx + 1),
  };
}

// cellAction 农场格 → 子阶段动作映射（建房/犁/播/围栏）
function cellActions(legal) {
  const m = new Map();
  for (const a of legal) {
    if (!['subRoom', 'subStable', 'subPlow', 'subSow', 'subFenceSel'].includes(a.kind)) continue;
    if (!m.has(a.idx)) m.set(a.idx, []);
    m.get(a.idx).push(a);
  }
  return m;
}

function renderFarm(s, p, clickMap, human) {
  const groupsByIdx = {};
  for (const [gid, idxs] of Object.entries(p.groups)) {
    for (const i of idxs) groupsByIdx[i] = { gid, group: idxs };
  }
  const cells = p.farm.map((f, idx) => {
    const acts = clickMap.get(idx);
    const g = groupsByIdx[idx];
    const ga = g ? p.groupAnimals[g.gid] : null;
    const fs = g ? fenceSides(g.group, idx) : null;
    const cls = [
      'ag-cell',
      `ag-${f.t}`,
      f.mat ? `ag-mat-${f.mat}` : '',
      fs && fs.t ? 'ag-ft' : '', fs && fs.b ? 'ag-fb' : '',
      fs && fs.l ? 'ag-fl' : '', fs && fs.r ? 'ag-fr' : '',
      acts && human ? 'ag-cell-act' : '',
    ].filter(Boolean).join(' ');
    let inner = '';
    if (f.t === 'room') inner = '🏠';
    else if (f.t === 'field') inner = `${f.g ? `🌾${f.g}` : ''}${f.v ? `🥬${f.v}` : ''}`;
    else if (f.t === 'pasture' && ga) {
      inner = `${RES_INFO[ga.type] ? RES_INFO[ga.type].emoji : ''}${ga.n}`;
    }
    const title = g ? `#${idx + 1} · ${t('ag.ui.pasture')} ${ga ? `${ga.n}/${E.groupCapacity(p, g.gid)}` : ''}` : `#${idx + 1}`;
    return `
      <div class="${cls}" data-idx="${idx}" title="${title}">
        <span class="ag-cellin">${inner}</span>
        ${f.stable ? '<span class="ag-stable">🏗️</span>' : ''}
      </div>`;
  }).join('');
  return `<div class="ag-farm" style="--pc:${p.color}">${cells}</div>`;
}

function renderPlayers(s, legal, human) {
  const clickMap = s.phase.kind === 'sub' ? cellActions(legal) : new Map();
  return `<div class="ag-players">${s.players.map((p) => {
    const isCur = p.seat === E.currentPlayer(s);
    const ca = p.cardAnimal;
    return `
      <div class="ag-player ${isCur ? 'ag-cur' : ''}" style="--pc:${p.color}">
        <div class="ag-phead">
          <span class="bg-dot" style="background:${p.color}"></span>
          <b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}
          <span class="muted">${fmt(t('ag.ui.family'), { n: p.family, m: E.remaining(p) })}</span>
          ${p.beggars ? `<span class="ag-warn">🃏${p.beggars}</span>` : ''}
        </div>
        <div class="ag-pbar">${resBar(p)}</div>
        ${ca ? `<div class="muted">${fmt(t('ag.ui.cardAnimal'), { a: RES_INFO[ca.type] ? RES_INFO[ca.type].emoji : '', n: ca.n })}</div>` : ''}
        ${p.majors.length ? `<div class="ag-mrow">${p.majors.map((id) =>
          `<span class="ag-mchip">${MAJOR_ICON[id] || '🏺'} ${tr(MAJOR_BY_ID[id].name)}</span>`).join('')}</div>` : ''}
        ${renderFarm(s, p, isCur ? clickMap : new Map(), human && isCur)}
      </div>`;
  }).join('')}</div>`;
}

// ==== 手牌（仅当前玩家，隐私遮罩保护换手） ====

function renderHand(s, p, legal) {
  const occLegal = new Set(legal.filter((a) => a.kind === 'subOcc').map((a) => a.id));
  const minorLegal = new Set(legal.filter((a) => a.kind === 'subMinor').map((a) => a.id));
  const occRow = p.handOcc.map((id) => {
    const c = OCC_BY_ID[id];
    return `
      <button class="ag-card ag-card-occ ${occLegal.has(id) ? 'ag-card-act' : ''}"
        ${occLegal.has(id) ? `data-act='${esc(JSON.stringify({ kind: 'subOcc', id }))}'` : 'disabled'}>
        <b><i class="ag-bico">🧑‍🌾</i> ${tr(c.name)}</b><span class="muted">${tr(c.desc)}</span>
      </button>`;
  }).join('');
  const minorRow = p.handMinor.map((id) => {
    const c = MINOR_BY_ID[id];
    return `
      <button class="ag-card ag-card-minor ${minorLegal.has(id) ? 'ag-card-act' : ''}"
        ${minorLegal.has(id) ? `data-act='${esc(JSON.stringify({ kind: 'subMinor', id }))}'` : 'disabled'}>
        <b><i class="ag-bico">🃏</i> ${tr(c.name)}</b>
        <span class="muted">${E.gainList(c.cost || {}) || '—'} · ${tr(c.desc)}</span>
      </button>`;
  }).join('');
  return `
    <div class="ag-hand">
      <div class="ag-handrow"><span class="ag-label">${fmt(t('ag.ui.handOcc'), { n: E.occCostOf(p) })}</span>${occRow}</div>
      <div class="ag-handrow"><span class="ag-label">${t('ag.ui.handMinor')}</span>${minorRow}</div>
    </div>`;
}

// ==== 入口 ====

export function renderBoard(el, s, legal, pick) {
  ctx = { el, s, legal, pick };
  const cur = E.currentPlayer(s);
  const p = s.players[cur];
  const human = !p.isAI;
  const promptKey = s.phase.kind === 'place' ? 'ag.ui.prompt.place'
    : s.phase.kind === 'feed' ? 'ag.ui.prompt.feed' : 'ag.ui.prompt.sub';
  let panel = `<div class="ag-action"><p class="muted">${t(promptKey)}</p></div>`;
  if (s.phase.kind === 'sub' && human) panel = subPanel(s, p, s.pending, legal, human);
  else if (s.phase.kind === 'feed' && human) panel = feedPanel(s, p, legal);
  el.innerHTML = `
    <div class="ag-root">
      ${renderStatus(s)}
      ${renderBoardSpaces(s, legal, human)}
      ${panel}
      ${renderPlayers(s, legal, human)}
      ${human ? renderHand(s, p, legal) : ''}
      ${human ? renderMajorsLeft(s) : ''}
    </div>`;
  bind(el, legal, pick, human, s.phase.kind === 'sub' ? cellActions(legal) : new Map());
}

// renderMajorsLeft 未售大设施一览（已购标主人色点）
function renderMajorsLeft(s) {
  const chips = MAJORS.map((m) => {
    const owner = E.ownsMajor(s, m.id) ? s.players.find((x) => x.majors.includes(m.id)) : null;
    return `<span class="ag-mchip ${owner ? 'ag-mchip-own' : ''}" ${owner ? `style="--tk:${owner.color}"` : ''}
      title="${esc(tr(m.desc))}">${MAJOR_ICON[m.id] || '🏺'} ${tr(m.name)}${E.gainList(m.cost)}</span>`;
  }).join('');
  return `<div class="ag-majors"><span class="ag-label">${t('ag.ui.majorsLeft')}</span>${chips}</div>`;
}

// ==== 事件绑定 ====

function bind(el, legal, pick, human, clickMap) {
  el.querySelectorAll('[data-act]').forEach(($b) => {
    $b.onclick = () => { if (human) pick(JSON.parse($b.dataset.act)); };
  });
  el.querySelectorAll('.ag-cell-act').forEach(($c) => {
    $c.onclick = () => {
      if (!human) return;
      const acts = clickMap.get(Number($c.dataset.idx));
      if (acts && acts.length) pick(acts[0]); // 同格多动作（谷/菜）时默认第一个，面板按钮可精确选
    };
  });
}
