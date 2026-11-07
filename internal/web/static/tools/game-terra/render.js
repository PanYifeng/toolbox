// 神秘大地渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// SVG 六边形棋盘（地形底色 + 玩家色建筑 + 桥）+ 官方环形地形轮（高区分度配色）
// + 邪教轨/能量动作/板块区 + 规划提示（下轮收入 + 终局 VP 投影）+ 阶段操作区。
import { t, tr, getLang } from '/core/i18n.js';
import { fmtArgs, lackOf, noHint, okHint, reasonCap, reasonNoSpot, renderActionHints } from '/core/action-hints.js';
import { HEXES } from './map-data.js';
import { TERRAIN_NAMES, factionById, FACTION_ICON } from './data-factions.js';
import {
  POWER_ACTIONS, BONUS_TILES, FAVOR_TILES, CULT_TRACKS, CULT_TOP,
  CULT_CROSS_REWARD, SHIPPING_COST, WHEEL, TOWN_TILES, BLD_CAP,
  CONVERT_RATES, DIG_UPGRADE_COST, DIG_UPGRADE_VP, SPADE_COST, ROUNDS,
  PRIEST_CULT_SPOTS,
} from './tables.js';
import {
  buildCost, buildRangeSet, upgradeCostOf, spadesNeeded, incomeOf, projectedVp, currentPlayer,
  BLD_NAME, CULT_NAME,
} from './engine.js';

// 地形配色：高区分度七色（色相间隔拉大 + 深浅交错，官方轮环序）
const TERR_COLOR = {
  plains: '#d9b382', swamp: '#454b54', lakes: '#4a90d9', forest: '#2e8b3d',
  mountain: '#9aa0a6', wasteland: '#c0392b', desert: '#f2d13d', river: '#a8d4f0',
};
const CULT_ICON = { fire: '🔥', water: '💧', earth: '⛰️', air: '💨' };
const SQ3 = Math.sqrt(3);
const S = 30; // 六边形边长（SVG 单位）

let ui = { stamp: '', upSel: null, passBonus: null };
let ctx = null; // {el, s, legal, pick}，供局部重绘

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// —— 静态几何：axial 尖顶 → 像素坐标 + 视窗边界（只算一次）——
const POS = {};
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const h of HEXES) {
  const x = SQ3 * (h.q + h.r / 2) * S;
  const y = 1.5 * h.r * S;
  POS[h.id] = { x, y };
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const PAD = S + 8;
const VB = `${minX - PAD} ${minY - PAD} ${maxX - minX + 2 * PAD} ${maxY - minY + 2 * PAD}`;

// hexPoints 尖顶六边形顶点串（size 可缩放：棋盘 S / 地形轮小格）
function hexPoints(x, y, size) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (30 + 60 * k) * Math.PI / 180;
    pts.push(`${(x + size * Math.cos(a)).toFixed(1)},${(y + size * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// incStr 资源串（收入/费用通用）
function incStr(g) {
  const parts = [];
  if (g.coins) parts.push(`💰${g.coins}`);
  if (g.workers) parts.push(`👷${g.workers}`);
  if (g.priests) parts.push(`🙏${g.priests}`);
  if (g.spades) parts.push(`⛏️${g.spades}`);
  if (g.powerGain) parts.push(`⚡${g.powerGain}`);
  return parts.join(' ') || '—';
}

// 中英文标点：冒号与括号跟随界面语言
function colon() { return getLang() === 'zh' ? '：' : ': '; }
function paren(x) { return getLang() === 'zh' ? `（${x}）` : ` (${x})`; }

// digSpadesFor 派系视角挖铲数（与引擎 spadesNeeded 同语义）：
// 家园 0；巨人非家园一律 2（官方 map.pm 固定 color_difference=2）；其余取轮距
function digSpadesFor(f, terr) {
  if (terr === f.terrain) return 0;
  if (f.special === 'giantDigDouble') return 2;
  return WHEEL.indexOf(terr) >= 0 ? Math.min(
    Math.abs(WHEEL.indexOf(terr) - WHEEL.indexOf(f.terrain)),
    7 - Math.abs(WHEEL.indexOf(terr) - WHEEL.indexOf(f.terrain))) : 0;
}

// curFaction 当前行动玩家的派系（选派系阶段为 null）
function curFaction(s) {
  const p = s.players[currentPlayer(s)];
  return p && p.faction ? factionById(p.faction) : null;
}

// actBtn 通用动作按钮
function actBtn(action, label) {
  return `<button class="btn-soft" data-act='${JSON.stringify(action)}'>${label}</button>`;
}

export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.phase.kind}:${s.phase.cur || 0}:${s.round}:${s.log.length}:${s.bridges.length}:${s.pending.map((x) => x.kind).join()}`;
  if (ui.stamp !== stamp) ui = { stamp, upSel: null, passBonus: null };
  ctx = { el, s, legal, pick };
  const human = !s.players[currentPlayer(s)].isAI;
  el.innerHTML = `
    <div class="tm-board">
      ${renderStatus(s)}
      <div class="tm-main">
        <div class="tm-col">
          ${renderAction(s, legal, human)}
          <div class="tm-mapwrap">${renderMap(s, legal, human)}</div>
        </div>
        <div class="tm-side">${renderPlayers(s)}${renderWheel(s)}${renderPlan(s)}</div>
      </div>
      ${renderTable(s)}
    </div>`;
  bind(el, s, legal, pick, human);
}

// —— 顶部状态条 ——

// roundTileText 回合板块描述：邪教收入条件 + 本轮计分 VP
function roundTileText(tile) {
  const inc = `${CULT_ICON[tile.cult]}${t('tm.ui.perCult')}${tile.req}${colon()}${incStr(tile.income)}`;
  let vp = '';
  if (tile.vpMode === 'build') {
    vp = Object.entries(tile.vp).map(([b, v]) => `${tr(BLD_NAME[b])}+${v}🏆`).join(' ');
  } else if (tile.vp.spade) {
    vp = `⛏️+${tile.vp.spade}🏆`;
  } else if (tile.vp.town) {
    vp = `🏘️+${tile.vp.town}🏆`;
  }
  return `${inc} · ${t('tm.ui.roundVp')}${colon()}${vp}`;
}

function renderStatus(s) {
  const tile = s.round >= 1 ? s.roundTiles[s.round - 1] : null;
  const order = s.round >= 1 ? s.turnOrder : s.players.map((p) => p.seat);
  return `
    <div class="tm-status">
      <span class="tm-round">${t('tm.ui.round')} <b>${Math.max(s.round, 0)}</b>/6</span>
      <span>${t('tm.ui.roundTile')}${colon()}<b>${tile ? roundTileText(tile) : '—'}</b></span>
      <span class="tm-order">${order.map((seat, i) => {
        const p = s.players[seat];
        return `<i class="tm-seatchip ${i === 0 ? 'tm-first' : ''}" style="--pc:${p.color}">${esc(p.name)}</i>`;
      }).join('')}</span>
    </div>`;
}

// —— SVG 棋盘 ——

// clickableHexes 可点格 → 动作映射（建民居优先；SH 格目标/初始放置也可点）
function clickableHexes(legal, human) {
  const m = new Map();
  if (!human) return m;
  for (const a of legal) {
    if (a.kind === 'placeDwelling') m.set(a.hex, a);
    else if (a.kind === 'build' && !m.has(a.hex)) m.set(a.hex, a);
    else if (a.kind === 'shAction' && a.hex && !m.has(a.hex)) m.set(a.hex, a);
  }
  return m;
}

// hexTitle 悬停提示（坐标 · 地形 · 费用）
function hexTitle(s, a) {
  const terr = tr(TERRAIN_NAMES[s.hexes[a.hex].terrain]);
  if (a.kind === 'build') {
    const c = buildCost(s, s.players[s.phase.cur], a.hex);
    return `${a.hex} · ${terr} · ${incStr(c)}`;
  }
  return `${a.hex} · ${terr}`;
}

function renderMap(s, legal, human) {
  const clicks = clickableHexes(legal, human);
  const f = curFaction(s);
  const p = f ? s.players[currentPlayer(s)] : null;
  const hexes = HEXES.map((h) => {
    const c = POS[h.id];
    const st = s.hexes[h.id];
    const a = clicks.get(h.id);
    const dug = st.terrain !== h.terrain ? ' stroke="var(--fg)" stroke-width="1.5"' : '';
    // 空陆地块的铲数角标：当前玩家挖到该地形需几铲（家园/河流不标）
    let dig = '';
    if (p && f && st.owner === null && st.terrain !== 'river' && st.terrain !== f.terrain) {
      const n = spadesNeeded(p, st.terrain);
      dig = `<text x="${c.x - S + 11}" y="${c.y - S + 16}" class="tm-dig">${n}</text>`;
    }
    return `
      <g ${a ? `class="tm-hexbtn" data-hex="${h.id}">` : '>'}
        <polygon points="${hexPoints(c.x, c.y, S)}" class="tm-hex" fill="${TERR_COLOR[st.terrain]}"${dug}></polygon>
        ${a ? `<polygon points="${hexPoints(c.x, c.y, S)}" class="tm-ring"></polygon>
          <title>${hexTitle(s, a)}</title>` : ''}
        ${dig}
        ${st.owner !== null ? bldMark(s, st, c) : ''}
      </g>`;
  }).join('');
  const bridges = s.bridges.map((br) => {
    const a = POS[br.a];
    const b = POS[br.b];
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
      class="tm-bridge" style="stroke:${s.players[br.owner].color}"></line>`;
  }).join('');
  return `<svg viewBox="${VB}" class="tm-svg" role="img">${hexes}${bridges}</svg>`;
}

// bldMark 建筑标记：玩家色圆 + 类别图标
function bldMark(s, st, c) {
  const p = s.players[st.owner];
  const lbl = st.bld === 'D' ? '🏠' : st.bld === 'TP' ? '🏪' : st.bld === 'TE' ? '⛪' : st.bld === 'SA' ? '✨' : st.bld === 'SH' ? '🏰' : st.bld;
  return `
    <circle cx="${c.x}" cy="${c.y}" r="13" fill="${p.color}" stroke="var(--bg)" stroke-width="1.5"></circle>
    <text x="${c.x}" y="${c.y + 4}" class="tm-bldlbl" text-anchor="middle">${lbl}</text>`;
}

// —— 玩家面板 ——

function renderBowls(p) {
  return `<div class="tm-bowls" title="${t('tm.ui.bowls')}">
    <span class="tm-bowl">${p.power.i}</span>→<span class="tm-bowl">${p.power.ii}</span>→<span class="tm-bowl tm-bowl3">${p.power.iii}</span>⚡</div>`;
}

// favChip 恩惠板块芯片：邪教推进 + 每轮收入
function favChip(tile) {
  const [track, steps] = Object.entries(tile.advance)[0];
  return `<span class="tm-fav" title="${tr(CULT_NAME[track])} +${steps}">${CULT_ICON[track]}+${steps}${tile.income ? ` ${incStr(tile.income)}` : ''}</span>`;
}

// renderPlayers 玩家面板：派色头像 + 派系名 + VP → 资源 → 三碗能量 → 建筑 → 邪教 → 板块
function renderPlayers(s) {
  return `<div class="tm-players">${s.players.map((p) => {
    const f = factionById(p.faction);
    const isCur = p.seat === currentPlayer(s);
    const cult = CULT_TRACKS.map((k) =>
      `<span class="tm-cchip">${CULT_ICON[k]}${p.cult[k]}${p.priestsOnCult[k] ? `🔒${p.priestsOnCult[k]}` : ''}</span>`).join('');
    const cnt = { D: 0, TP: 0, TE: 0, SH: 0, SA: 0 };
    for (const b of Object.values(p.buildings)) cnt[b] += 1;
    const income = f && s.round >= 1 && s.round < ROUNDS
      ? incStr(incomeOf(s, p, s.round + 1, true)) : '—';
    return `
      <div class="tm-player ${isCur ? 'tm-cur' : ''}" style="--pc:${p.color}">
        <div class="tm-phead">
          ${f ? `<span class="tm-fava" style="background:${f.color}">${FACTION_ICON[p.faction] || '🏳️'}</span><b class="tm-pfacname">${tr(f.name)}</b>` : `<span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>`}
          <span class="tm-pseat">${f ? esc(p.name) : ''}${p.isAI ? ' 🤖' : ''}</span>
          <span class="tm-vp">🏆${p.vp}</span>
        </div>
        ${f ? `<div class="tm-pfac"><i class="tm-terr" style="background:${TERR_COLOR[f.terrain]}"></i>
          ${tr(TERRAIN_NAMES[f.terrain])} · ${tr(f.desc)}${f.buildings.SH.shAction ? ` · ${t('tm.ui.needSH')}` : ''}</div>` : ''}
        <div class="tm-pres" title="${t('tm.ui.income')}${colon()}${income}">💰${p.coins} 👷${p.workers} 🙏${p.priests} ⛏️${p.spades} ⚓${p.shipping} 🏘️${p.towns.length}</div>
        ${renderBowls(p)}
        <div class="tm-pbld" title="${t('tm.ui.bldIncome')}">🏠${cnt.D}/8 🏪${cnt.TP}/4 ⛪${cnt.TE}/3 🏰${cnt.SH}/1 ✨${cnt.SA}/1</div>
        <div class="tm-pcult">${cult}</div>
        ${p.bonus !== null ? `<div class="tm-pbonus">${incStr(BONUS_TILES.find((b) => b.id === p.bonus).income)}</div>` : ''}
        ${p.favor.length ? `<div class="tm-pfavor">${p.favor.map((fid) => favChip(FAVOR_TILES.find((x) => x.id === fid))).join('')}</div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

// —— 官方环形地形轮（议题 1：与官方一致的圆形轮 + 高区分度配色）——
// renderWheel 七地形按官方轮环序摆成一圈：家园 ⌂ 高亮，其余标挖到需几铲（巨人一律 2）
function renderWheel(s) {
  const f = curFaction(s);
  const p = f ? s.players[currentPlayer(s)] : null;
  const R = 58;   // 环半径（SVG 单位）
  const CS = 20;  // 环上小六边形边长
  const cells = WHEEL.map((terr, i) => {
    const ang = (90 - i * 360 / WHEEL.length) * Math.PI / 180; // 正上方起顺时针
    const x = R * Math.cos(ang);
    const y = -R * Math.sin(ang);
    const isHome = f && terr === f.terrain;
    const n = p && f && !isHome ? spadesNeeded(p, terr) : null;
    return `
      <g class="tm-wcell ${isHome ? 'tm-whome' : ''}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
        <polygon points="${hexPoints(0, 0, CS)}" fill="${TERR_COLOR[terr]}"></polygon>
        <text class="tm-wlbl" y="5">${isHome ? '⌂' : n !== null ? `⛏${n}` : ''}</text>
        <title>${tr(TERRAIN_NAMES[terr])}${n !== null ? `${colon()}⛏️${n}` : ''}</title>
      </g>`;
  }).join('');
  const spadeW = p ? SPADE_COST[p.digLevel || 0] : SPADE_COST[0];
  return `
    <div class="tm-wheel" title="${t('tm.ui.wheel')}">
      <span class="tm-label">${t('tm.ui.wheel')}</span>
      <svg viewBox="-86 -86 172 172" class="tm-wsvg" role="img">
        <circle cx="0" cy="0" r="${R + 22}" class="tm-wring"></circle>
        ${cells}
      </svg>
      <span class="tm-wwork">⛏️×1 = ${spadeW}👷 → 🏠</span>
    </div>`;
}

// —— 规划提示（议题 4：预期下轮收入 + 终局 VP 投影）——
function renderPlan(s) {
  if (s.phase.kind !== 'act' || s.round < 1) return '';
  const seat = currentPlayer(s);
  const p = s.players[seat];
  if (!p.faction) return '';
  const rows = [];
  if (s.round < ROUNDS) {
    rows.push(`<div class="tm-planrow"><span class="muted">${t('tm.ui.income')}</span> ${incStr(incomeOf(s, p, s.round + 1, true))}</div>`);
  }
  const proj = projectedVp(s, seat);
  rows.push(`<div class="tm-planrow"><span class="muted">${t('tm.ui.planPassVp')}</span> 🏆+${proj.detail.pass}</div>`);
  rows.push(`<div class="tm-planrow"><span class="muted">${t('tm.ui.planProj')}</span> 🏆${proj.total}
    <span class="tm-plandetail">${t('tm.ui.planDetail')}${colon()}${t('tm.score.cult')}+${proj.detail.cult} · ${t('tm.score.network')}+${proj.detail.network} · ${t('tm.score.resources')}+${proj.detail.resources}</span></div>`);
  return `
    <div class="tm-plan" title="${t('tm.ui.planTip')}">
      <span class="tm-label">${t('tm.ui.plan')}</span>
      ${rows.join('')}
    </div>`;
}

// —— 中央表区：邪教轨 + 能量动作 + 奖励板块 ——

function cellTitle(pos) {
  return CULT_CROSS_REWARD[pos] ? `⚡+${CULT_CROSS_REWARD[pos]}` : '—';
}

function renderCultTracks(s) {
  const rows = CULT_TRACKS.map((track) => {
    let cells = '';
    for (let pos = 1; pos <= CULT_TOP; pos++) {
      const marks = s.players.filter((p) => p.cult[track] === pos)
        .map((p) => `<i class="tm-mark" style="background:${p.color}"></i>`).join('');
      const locks = s.players.reduce((a, p) => a + (p.cult[track] === pos ? p.priestsOnCult[track] : 0), 0);
      cells += `<span class="tm-cell ${pos === CULT_TOP ? 'tm-cell-top' : ''}" title="${cellTitle(pos)}">${marks}${locks ? `<b class="tm-lock">${locks}</b>` : ''}</span>`;
    }
    return `<div class="tm-trackrow"><span class="tm-trackname">${CULT_ICON[track]} ${tr(CULT_NAME[track])}</span>${cells}</div>`;
  }).join('');
  return `<div class="tm-cultboard"><span class="tm-label">${t('tm.ui.cultTracks')}</span>${rows}</div>`;
}

function renderPowerSlots(s) {
  const slots = POWER_ACTIONS.map((pa, i) => {
    const occ = s.powerActions[i];
    const style = occ !== null ? ` style="border-color:${s.players[occ].color}"` : '';
    return `<span class="tm-slot ${occ !== null ? 'tm-slot-occ' : ''}"${style}>⚡${pa.power}→${incStr(pa.gain)}</span>`;
  }).join('');
  return `<div class="tm-slotrow"><span class="tm-label">${t('tm.ui.powerSlots')}</span>${slots}</div>`;
}

function renderBonusRow(s) {
  const tiles = BONUS_TILES.map((b) => {
    const holder = s.players.find((p) => p.bonus === b.id);
    const style = holder ? ` style="border-color:${holder.color}"` : '';
    return `<span class="tm-btile ${holder ? 'tm-btile-taken' : ''}"${style}>
      ${b.id} ${incStr(b.income)}${s.bonusCoins[b.id] ? ` +💰${s.bonusCoins[b.id]}` : ''}</span>`;
  }).join('');
  return `<div class="tm-btilerow"><span class="tm-label">${t('tm.ui.bonusTiles')}</span>${tiles}</div>`;
}

function renderTable(s) {
  return `
    <div class="tm-table">
      ${renderCultTracks(s)}
      ${renderPowerSlots(s)}
      ${renderBonusRow(s)}
    </div>`;
}

// —— 阶段操作区 ——

function renderAction(s, legal, human) {
  const ph = s.phase.kind;
  const promptKey = ph === 'resolve'
    ? `tm.ui.prompt.${s.pending[0] ? s.pending[0].kind : 'cultChoice'}`
    : `tm.ui.prompt.${ph}`;
  const prompt = `<p class="tm-prompt">${t(promptKey)}</p>`;
  // AI 行动时操作区置灰提示，同时保持棋盘与操作区同屏布局一致（不跳位）
  if (!human) return `<div class="tm-action tm-action-ai" data-bg-focus>${prompt}</div>`;
  let body = '';
  if (ph === 'chooseFaction') body = factionPanel(legal);
  else if (ph === 'placeDwelling') body = placePanel(s, legal);
  else if (ph === 'pickBonus') body = bonusPanel(legal);
  else if (ph === 'act') body = actPanel(s, legal);
  else if (ph === 'resolve') body = resolvePanel(s, legal);
  return `<div class="tm-action" data-bg-focus>${prompt}${stageHints(s, legal, ph)}${body}</div>`;
}

// stageHints 阶段级提示：选牌系/放初始民居/领奖励板块/结算选择的选项数与内容
function stageHints(s, legal, ph) {
  const n = (k) => legal.filter((a) => a.kind === k).length;
  if (ph === 'act') return '';
  let items = [];
  switch (ph) {
    case 'chooseFaction':
      items = [okHint('🧙', t('tm.ui.hintFaction'), n('faction'), t('tm.ui.hintFreePick'))];
      break;
    case 'placeDwelling':
      items = [okHint('🏠', t('tm.ui.placeDwelling'), n('placeDwelling'))];
      break;
    case 'pickBonus':
      items = [okHint('🎁', t('tm.ui.hintBonus'), n('pickBonus'))];
      break;
    case 'resolve': items = resolveHints(s, legal); break;
    default: items = [];
  }
  return renderActionHints(items);
}

// resolveHints 结算选择提示（城镇板块 / 恩惠板块 / 祭司上轨）
function resolveHints(s, legal) {
  const item = s.pending[0];
  const kind = item ? item.kind : 'cultChoice';
  const n = (k) => legal.filter((a) => a.kind === k).length;
  if (kind === 'townTile') return [okHint('🏘️', t('tm.ui.hintTownTile'), n('townTile'))];
  if (kind === 'favorChoice') return [okHint('✨', t('tm.ui.hintFavor'), n('favorChoice'))];
  return [okHint('🙏', t('tm.ui.hintCult'), n('cultChoice'))];
}

// factionPanel 选派系卡：派色头像 + 家园地形 + 六地形挖铲行 + 专长
function factionPanel(legal) {
  const cards = legal.filter((a) => a.kind === 'faction').map((a) => {
    const f = factionById(a.faction);
    const digs = WHEEL.filter((terr) => terr !== f.terrain)
      .map((terr) => ({ terr, n: digSpadesFor(f, terr) }));
    return `
      <button class="tm-fcard" data-fac="${f.id}" style="--fc:${f.color}">
        <span class="tm-fname"><span class="tm-fava" style="background:${f.color}">${FACTION_ICON[f.id] || '🏳️'}</span>${tr(f.name)}</span>
        <span class="tm-fterr"><i class="tm-terr" style="background:${TERR_COLOR[f.terrain]}"></i>${tr(TERRAIN_NAMES[f.terrain])}</span>
        <span class="tm-fdig">${digs.map((x) =>
          `<span class="tm-digcell" title="${tr(TERRAIN_NAMES[x.terr])}${colon()}⛏️${x.n}"><i class="tm-terr" style="background:${TERR_COLOR[x.terr]}"></i>${x.n}</span>`).join('')}<span class="tm-dignote">⛏️</span></span>
        <span class="tm-fdesc">${tr(f.desc)}${f.buildings.SH.shAction ? ` · ${t('tm.ui.needSH')}` : ''}</span>
      </button>`;
  }).join('');
  return `<div class="tm-fcards">${cards}</div>`;
}

// placePanel 初始民居放置：把家园地形每个空格列成按钮（棋盘也能点，但操作区必须有按钮）
function placePanel(s, legal) {
  const places = legal.filter((a) => a.kind === 'placeDwelling');
  if (!places.length) return '';
  const btns = places.map((a) => {
    const terr = tr(TERRAIN_NAMES[s.hexes[a.hex].terrain]);
    return actBtn(a, `🏠 ${a.hex} · ${terr}`);
  }).join('');
  return `<span class="tm-label">${t('tm.ui.placeDwelling')}</span><div class="tm-btns">${btns}</div>`;
}

// bonusPanel 开局奖励板块（数据表驱动，杜绝字符串下标）
function bonusPanel(legal) {
  const picks = legal.filter((a) => a.kind === 'pickBonus');
  if (!picks.length) return '';
  const btns = picks.map((a) => {
    const b = BONUS_TILES.find((x) => x.id === a.bonus);
    return actBtn(a, `${b.id} · ${incStr(b.income)}`);
  }).join('');
  return `<div class="tm-btns">${btns}</div>`;
}

// upgradePanel 升级：按（格,目标）分组；TE/SA 展开恩惠板块选择
function upgradePanel(s, legal) {
  const groups = new Map();
  for (const a of legal) {
    if (a.kind !== 'upgrade') continue;
    const key = `${a.hex}|${a.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  if (!groups.size) return '';
  let html = '';
  for (const [key, acts] of groups) {
    const [hex, to] = key.split('|');
    const p = s.players[s.phase.cur];
    // 费用必须走引擎的 upgradeCostOf：TP 无他派系邻接时额外加收一次 TP 费
    const cost = incStr(upgradeCostOf(s, p, to, hex));
    const open = ui.upSel === key;
    html += `<button class="btn-soft tm-upbtn ${open ? 'tm-usel' : ''}" data-up="${key}">
      ${hex} → ${tr(BLD_NAME[to])}${paren(cost)}</button>`;
    const needFavor = to === 'TE' || to === 'SA';
    if (open && needFavor) {
      html += `<div class="tm-favors"><span class="muted">${t('tm.ui.favorHint')}</span>${acts.map((a) =>
        `<button class="btn-soft" data-act='${JSON.stringify(a)}'>${a.favor.map((fid) =>
          favChip(FAVOR_TILES.find((x) => x.id === fid))).join('+')}</button>`).join('')}</div>`;
    } else if (open) {
      html += `<div class="tm-btns">${actBtn(acts[0], `${t('tm.ui.upgrade')} ✅`)}</div>`;
    }
  }
  return `<span class="tm-label">${t('tm.ui.upgrade')}</span><div class="tm-btns">${html}</div>`;
}

// priestPanel 发祭司上轨（每轨空槽任选）
function priestPanel(legal) {
  const acts = legal.filter((a) => a.kind === 'priestSend');
  if (!acts.length) return '';
  const byTrack = new Map();
  for (const a of acts) {
    if (!byTrack.has(a.track)) byTrack.set(a.track, []);
    byTrack.get(a.track).push(a);
  }
  const btns = [...byTrack.entries()].map(([track, list]) => {
    // 标签必须用实际提交的槽位推进量（list[0].spot），不能用轨道下标——两者语义不同
    return actBtn(list[0], `${CULT_ICON[track]} ${tr(CULT_NAME[track])} 🔒+${PRIEST_CULT_SPOTS[list[0].spot]}`);
  }).join('');
  return `<span class="tm-label">${t('tm.ui.priestSend')}</span><div class="tm-btns">${btns}</div>`;
}

// shPanel SH 特别行动：格目标类（女巫/游牧/蜂灵）点棋盘高亮格；四轨/桥对/即时类列按钮
function shPanel(s, legal) {
  const acts = legal.filter((a) => a.kind === 'shAction');
  if (!acts.length) return '';
  const f = curFaction(s);
  const id = acts[0].id;
  const head = `<span class="tm-label">${t('tm.ui.shAction')}${paren(tr(f.name))}</span>`;
  if (id === 'ACTA') {
    return `${head}<div class="tm-btns">${acts.map((a) =>
      actBtn(a, `${CULT_ICON[a.track]} ${tr(CULT_NAME[a.track])} +2`)).join('')}</div>`;
  }
  if (id === 'ACTE') {
    return `${head}<div class="tm-btns">${acts.map((a) => actBtn(a, `🌉${a.a}↔${a.b}`)).join('')}</div>`;
  }
  if (id === 'ACTW' || id === 'ACTN' || id === 'ACTS') {
    // 目标格既有高亮棋盘可点，也在这里列成按钮（否则玩家在操作区看不到可执行项）
    return `${head}<div class="tm-btns">${acts.map((a) => {
      if (id === 'ACTS') return actBtn(a, `🏠→🏪 ${a.hex}`);
      const terr = tr(TERRAIN_NAMES[s.hexes[a.hex].terrain]);
      return actBtn(a, `🏠 ${a.hex} · ${terr}`);
    }).join('')}</div>`;
  }
  // ACTG 巨人 +2 铲 / ACTC 混沌 +2 行动
  return `${head}<div class="tm-btns">${acts.map((a) => actBtn(a, t(`tm.ui.sh.${id}`))).join('')}</div>`;
}

// tilePanel 板块行动（BON1 铲 / BON2、FAV6 邪教步）——占主行动，每张板块每轮 1 次
// （jsnell command_action → require_subaction：板块行动同样消耗 allowed_actions）
function tilePanel(legal) {
  const acts = legal.filter((a) => a.kind === 'tileAction');
  if (!acts.length) return '';
  const btns = acts.map((a) => actBtn(a, `${a.id} · ${t(`tm.ui.tile.${a.id}`)}`)).join('');
  return `<span class="tm-label">${t('tm.ui.tileAction')}</span><div class="tm-btns">${btns}</div>`;
}

// freePanel 免费子行动：转换 + 燃烧（不占行动）
function convertLabel(s, a) {
  const p = s.players[s.phase.cur];
  const key = `${a.from}>${a.to}`;
  const rates = {
    'power>coins': `⚡${CONVERT_RATES.powerToCoin}→💰1`,
    'power>workers': `⚡${CONVERT_RATES.powerToWorker}→👷1`,
    'power>priests': `⚡${CONVERT_RATES.powerToPriest}→🙏1`,
    'workers>coins': `👷${CONVERT_RATES.workerToCoin}→💰1`,
    'priests>coins': `🙏${CONVERT_RATES.priestToCoin}→💰1`,
    'priests>workers': `🙏${CONVERT_RATES.priestToWorker}→👷1`,
    'workers>priestsW': `👷1→🙏1`,
    'vp>coins': `🏆1→💰1`,
  };
  if (key === 'coins>vp') {
    const rate = p.faction === 'alchemists' ? CONVERT_RATES.alchemistCoinsToVp : CONVERT_RATES.coinsToVp;
    return `💰${rate}→🏆1`;
  }
  return rates[key] || key;
}

function freePanel(s, legal) {
  const parts = [];
  const converts = legal.filter((a) => a.kind === 'convert');
  if (converts.length) {
    const btns = converts.map((a) => actBtn(a, convertLabel(s, a))).join('');
    parts.push(`<span class="tm-label">${t('tm.ui.convert')}</span><div class="tm-btns">${btns}</div>`);
  }
  const burns = legal.filter((a) => a.kind === 'burn');
  if (burns.length) {
    // 燃烧是免费子行动、可重复：只给「1 组」和「全部」两个按钮，避免列出 ×1..×6 撑高操作区
    const maxPairs = burns[burns.length - 1].pairs;
    const one = burns.find((a) => a.pairs === 1) || burns[0];
    let btns = actBtn(one, `🔥 II2→III1`);
    if (maxPairs > 1) btns += actBtn({ kind: 'burn', pairs: maxPairs }, `🔥×${maxPairs}${paren(`II${maxPairs * 2}→III${maxPairs}`)}`);
    parts.push(`<span class="tm-label">${t('tm.ui.burn')}</span><div class="tm-btns">${btns}</div>`);
  }
  return parts.join('');
}

// miscPanel 能量动作 / 船运 / 铲子升级 / 暗灵铲 / 造桥
function miscPanel(s, legal) {
  const parts = [];
  const powers = legal.filter((a) => a.kind === 'powerAction');
  if (powers.length) {
    const btns = powers.map((a) => {
      const pa = POWER_ACTIONS[a.slot];
      const label = pa.id === 'ACT1'
        ? `⚡${pa.power}→🌉${a.a}↔${a.b}`
        : `⚡${pa.power}→${incStr(pa.gain)}`;
      return actBtn(a, label);
    }).join('');
    parts.push(`<span class="tm-label">${t('tm.ui.powerSlots')}</span><div class="tm-btns">${btns}</div>`);
  }
  const digs = legal.filter((a) => a.kind === 'darklingDig');
  if (digs.length) parts.push(`<div class="tm-btns">${actBtn(digs[0], `🙏1→⛏️1 🏆+2`)}</div>`);
  // 船运 / 铲子升级常驻显示：不可用时置灰并标注原因，避免玩家以为功能缺失
  const f = curFaction(s);
  if (f && f.ship) {
    const shipAct = legal.find((a) => a.kind === 'shipping');
    const me = s.players[s.phase.cur];
    let why = null;
    if (!shipAct) {
      if (me.shipping >= f.ship.max) why = t('tm.ui.shipMax');
      else why = t('tm.ui.cantAfford');
    }
    parts.push(`<div class="tm-btns">${shipAct
      ? actBtn(shipAct, `${t('tm.ui.shipping')}${paren(incStr(SHIPPING_COST))} → ⚓${me.shipping + 1}`)
      : `<button class="btn-soft" disabled title="${why}">${t('tm.ui.shipping')} · ${why}</button>`}</div>`);
  }
  if (f && !f.noDigUpgrade) {
    const digAct = legal.find((a) => a.kind === 'digUpgrade');
    const me = s.players[s.phase.cur];
    const maxUp = f.digLevels !== undefined ? f.digLevels : 2;
    const cost = incStr(f.digUpgradeCost || DIG_UPGRADE_COST);
    let why = null;
    if (!digAct) {
      if ((me.digLevel || 0) >= maxUp) why = t('tm.ui.digMax');
      else why = t('tm.ui.cantAfford');
    }
    parts.push(`<div class="tm-btns">${digAct
      ? actBtn(digAct, `${t('tm.ui.digUpgrade')}${paren(`${cost} 🏆+${DIG_UPGRADE_VP}`)} → ⛏️${(me.digLevel || 0) + 1}`)
      : `<button class="btn-soft" disabled title="${why}">${t('tm.ui.digUpgrade')} · ${why}</button>`}</div>`);
  }
  const bridges = legal.filter((a) => a.kind === 'bridge');
  if (bridges.length) {
    parts.push(`<span class="tm-label">${t('tm.ui.bridge')}</span><div class="tm-btns">${
      bridges.map((a) => actBtn(a, `🌉${a.a}↔${a.b}`)).join('')}</div>`);
  }
  return parts.join('');
}

// passPanel 过牌：先选奖励板块再过
function passPanel(s, legal) {
  const passes = legal.filter((a) => a.kind === 'pass');
  if (!passes.length) return '';
  if (ui.passBonus === null || !passes.some((a) => a.bonus === ui.passBonus)) {
    ui.passBonus = passes[0].bonus;
  }
  const cur = s.players[s.phase.cur];
  const chips = passes.map((a) => {
    const b = BONUS_TILES.find((x) => x.id === a.bonus);
    const mine = a.bonus !== null && a.bonus === cur.bonus;
    return `<button class="tm-bpick ${ui.passBonus === a.bonus ? 'tm-bsel' : ''}" data-pickb="${a.bonus}">
      ${b ? `${b.id} ${incStr(b.income)}` : t('tm.ui.passNone')}${a.bonus !== null && s.bonusCoins[a.bonus] ? ` +💰${s.bonusCoins[a.bonus]}` : ''}${mine ? ` · ${t('tm.ui.passKeep')}` : ''}</button>`;
  }).join('');
  const go = passes.find((a) => a.bonus === ui.passBonus);
  const passVp = projectedVp(s, s.phase.cur).detail.pass;
  return `
    <div class="tm-pass">
      <span class="muted">${t('tm.ui.passHint')}</span>
      <div class="tm-btns">${chips}${go ? actBtn(go, `${t('tm.ui.pass')}${passVp ? paren(`🏆+${passVp}`) : ''}`) : ''}</div>
    </div>`;
}

// buildPanel 建民居：把每个合法格列成按钮（格号 · 地形 · 完整费用），点按钮即建造。
// 棋盘高亮格也能点，但操作区必须有按钮——否则玩家只看按钮区会以为不能建造。
function buildPanel(s, legal) {
  const p = s.players[s.phase.cur];
  const builds = legal.filter((a) => a.kind === 'build');
  if (builds.length) {
    const btns = builds.map((a) => {
      const c = buildCost(s, p, a.hex);
      const terr = tr(TERRAIN_NAMES[s.hexes[a.hex].terrain]);
      const tp = c.teleport ? ` 🌀${t('tm.ui.teleport')}` : '';
      return actBtn(a, `🏠 ${a.hex} · ${terr}${tp}${paren(incStr(c))}`);
    }).join('');
    return `<span class="tm-label">${t('tm.ui.build')}</span><div class="tm-btns">${btns}</div>`;
  }
  // 无合法建造时给出原因（上限 / 范围无空位 / 资源不足），避免玩家以为按钮缺失
  const dwellings = Object.values(p.buildings).filter((b) => b === 'D').length;
  let why;
  if (dwellings >= BLD_CAP.D) why = t('tm.ui.buildCap');
  else if (buildRangeSet(s, p).size === 0) why = t('tm.ui.buildNoRange');
  else why = t('tm.ui.cantAfford');
  return `<span class="tm-label">${t('tm.ui.build')}</span><div class="tm-btns">
    <button class="btn-soft" disabled title="${why}">🏠 ${tr(BLD_NAME.D)} · ${why}</button></div>`;
}

function actPanel(s, legal) {
  const parts = [
    buildPanel(s, legal),
    upgradePanel(s, legal),
    priestPanel(legal),
    shPanel(s, legal),
    tilePanel(legal),
    freePanel(s, legal),
    miscPanel(s, legal),
  ];
  const rows = parts.filter(Boolean).map((x) => `<div class="tm-row">${x}</div>`).join('');
  return `<div class="tm-row">${renderActionHints(actHints(s, legal))}</div>
    ${rows}<div class="tm-row">${passPanel(s, legal)}</div>`;
}

// actHints 主行动提示条：逐项给出「可选几处」或「缺什么资源 / 为何不可用」
function actHints(s, legal) {
  const p = s.players[s.phase.cur];
  const f = curFaction(s);
  const n = (k) => legal.filter((a) => a.kind === k).length;
  const out = [buildActHint(s, p, n('build')), upgradeHint(legal, n('upgrade'))];
  if (n('priestSend')) out.push(okHint('🙏', t('tm.ui.priestSend'), n('priestSend')));
  if (n('shAction')) out.push(okHint('🏰', t('tm.ui.shAction'), n('shAction')));
  if (f && f.ship) out.push(shipHint(s, p, f, legal.find((a) => a.kind === 'shipping')));
  if (f && !f.noDigUpgrade) out.push(digHint(s, p, f, legal.find((a) => a.kind === 'digUpgrade')));
  const powers = n('powerAction');
  if (powers) out.push(okHint('⚡', t('tm.ui.powerSlots'), powers));
  return out;
}

// buildActHint 建民居：有格可建列出数量，否则区分上限 / 范围无空位 / 缺资源
function buildActHint(s, p, count) {
  const label = tr(BLD_NAME.D);
  if (count > 0) return okHint('🏠', label, count);
  const dwellings = Object.values(p.buildings).filter((b) => b === 'D').length;
  if (dwellings >= BLD_CAP.D) return noHint('🏠', label, reasonCap());
  const range = buildRangeSet(s, p);
  if (range.size === 0) return noHint('🏠', label, reasonNoSpot());
  // 范围有空格但都付不起：取最便宜一格的缺口作为原因
  let best = null;
  for (const hex of range) {
    const c = buildCost(s, p, hex);
    const miss = costLack(p, c);
    if (!best || miss.length < best.length) best = miss;
    if (!miss) break;
  }
  return noHint('🏠', label, best || reasonNoSpot());
}

// upgradeHint 升级：可能因上限/资源不足为空
function upgradeHint(legal, count) {
  const label = t('tm.ui.upgrade');
  if (count > 0) return okHint('⬆️', label, count);
  return noHint('⬆️', label, t('tm.ui.cantAfford'));
}

// shipHint 船运：已满级 / 缺资源 / 可升级
function shipHint(s, p, f, act) {
  const label = t('tm.ui.shipping');
  if (act) return okHint('⚓', label, 1, `${incStr(SHIPPING_COST)} → ⚓${p.shipping + 1}`);
  if (p.shipping >= f.ship.max) return noHint('⚓', label, t('tm.ui.shipMax'));
  return noHint('⚓', label, costLack(p, SHIPPING_COST) || t('tm.ui.cantAfford'));
}

// digHint 铲子升级：已满级 / 缺资源 / 可升级
function digHint(s, p, f, act) {
  const label = t('tm.ui.digUpgrade');
  const cost = f.digUpgradeCost || DIG_UPGRADE_COST;
  if (act) return okHint('⛏️', label, 1, `${incStr(cost)} 🏆+${DIG_UPGRADE_VP}`);
  const maxUp = f.digLevels !== undefined ? f.digLevels : 2;
  if ((p.digLevel || 0) >= maxUp) return noHint('⛏️', label, t('tm.ui.digMax'));
  return noHint('⛏️', label, costLack(p, cost) || t('tm.ui.cantAfford'));
}

// costLack 金币/工人/祭司缺口串（如「缺 💰×2 👷×1」），够付返回空串
function costLack(p, cost) {
  const lack = lackOf([
    ['💰', cost.coins || 0, p.coins],
    ['👷', cost.workers || 0, p.workers],
    ['🙏', cost.priests || 0, p.priests],
  ]);
  return lack ? fmtArgs(t('bg.hint.lack'), { d: lack }) : '';
}

function resolvePanel(s, legal) {
  const item = s.pending[0];
  if (item && item.kind === 'townTile') {
    const btns = legal.filter((a) => a.kind === 'townTile').map((a) => {
      const tw = TOWN_TILES[a.idx];
      return actBtn(a, `${tw.id} · 🏆${tw.vp} · ${incStr(tw.gain)}`);
    }).join('');
    return `<div class="tm-btns">${btns}</div>`;
  }
  if (item && item.kind === 'favorChoice') {
    const btns = legal.filter((a) => a.kind === 'favorChoice').map((a) =>
      actBtn(a, favChip(FAVOR_TILES.find((x) => x.id === a.favor)))).join('');
    return `<div class="tm-btns">${btns}</div>`;
  }
  const cults = legal.filter((a) => a.kind === 'cultChoice');
  if (cults.length) {
    return `<div class="tm-btns">${cults.map((a) =>
      actBtn(a, `${CULT_ICON[a.track]} ${tr(CULT_NAME[a.track])} +${(item && item.amount) || 1}`)).join('')}</div>`;
  }
  return '';
}

// —— 事件绑定 ——

// hexAction 地图点击 → 对应合法动作（建民居优先于 SH 格动作）
function hexAction(legal, hex) {
  return legal.find((a) => (a.kind === 'placeDwelling' || a.kind === 'build'
    || (a.kind === 'shAction' && a.hex)) && a.hex === hex);
}

function bind(el, s, legal, pick, human) {
  el.querySelectorAll('[data-act]').forEach(($b) => {
    $b.onclick = () => { if (human) pick(JSON.parse($b.dataset.act)); };
  });
  el.querySelectorAll('[data-hex]').forEach(($g) => {
    $g.onclick = () => {
      if (!human) return;
      const a = hexAction(legal, $g.dataset.hex);
      if (a) pick(a);
    };
  });
  el.querySelectorAll('[data-fac]').forEach(($b) => {
    $b.onclick = () => { if (human) pick({ kind: 'faction', faction: $b.dataset.fac }); };
  });
  el.querySelectorAll('[data-up]').forEach(($b) => {
    $b.onclick = () => {
      ui.upSel = ui.upSel === $b.dataset.up ? null : $b.dataset.up;
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
  el.querySelectorAll('[data-pickb]').forEach(($b) => {
    $b.onclick = () => {
      ui.passBonus = $b.dataset.pickb === 'null' ? null : $b.dataset.pickb;
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
}
