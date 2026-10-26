// 神秘大地渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// SVG 六边形棋盘（地形底色 + 玩家色建筑 + 桥）+ 邪教轨/能量动作/板块区 + 阶段操作区。
import { t, tr, getLang } from '/core/i18n.js';
import { HEXES } from './map-data.js';
import { TERRAIN_NAMES, factionById, FACTION_ICON } from './data-factions.js';
import {
  BUILDINGS, POWER_ACTIONS, BONUS_TILES, FAVOR_TILES, CULT_TRACKS, CULT_TOP,
  cultSpaceReward, SHIPPING_COST,
} from './tables.js';
import { buildCost, tpVariant, BLD_NAME, CULT_NAME, currentPlayer } from './engine.js';

const TERR_COLOR = {
  plains: '#d8c98e', swamp: '#7d9268', lakes: '#7fb5dd', forest: '#4e8a5f',
  mountain: '#a5988b', wasteland: '#b09b72', desert: '#e3cd97', river: '#8fc4e4',
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

// hexPoints 尖顶六边形顶点串
function hexPoints(x, y) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (30 + 60 * k) * Math.PI / 180;
    pts.push(`${(x + S * Math.cos(a)).toFixed(1)},${(y + S * Math.sin(a)).toFixed(1)}`);
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

// actBtn 通用动作按钮
function actBtn(action, label) {
  return `<button class="btn-soft" data-act='${JSON.stringify(action)}'>${label}</button>`;
}

export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.phase.kind}:${s.phase.cur || 0}:${s.phase.idx || 0}:${s.round}:${s.log.length}:${s.bridges.length}`;
  if (ui.stamp !== stamp) ui = { stamp, upSel: null, passBonus: null };
  ctx = { el, s, legal, pick };
  const human = !s.players[currentPlayer(s)].isAI;
  el.innerHTML = `
    <div class="tm-board">
      ${renderStatus(s)}
      <div class="tm-main">
        <div class="tm-mapwrap">${renderMap(s, legal, human)}</div>
        <div class="tm-side">${renderPlayers(s)}</div>
      </div>
      ${renderTable(s)}
      ${renderAction(s, legal, human)}
    </div>`;
  bind(el, s, legal, pick, human);
}

// —— 顶部状态条 ——

function renderStatus(s) {
  const tile = s.round >= 1 ? s.roundTiles[s.round - 1] : null;
  const order = s.round >= 1 ? s.turnOrder : s.players.map((p) => p.seat);
  const tileTxt = tile
    ? `${incStr(tile.income)} · ${tile.cultEnd === 'choice' ? t('tm.ui.anyTrack') : tr(CULT_NAME[tile.cultEnd])}`
    : '—';
  return `
    <div class="tm-status">
      <span class="tm-round">${t('tm.ui.round')} <b>${Math.max(s.round, 0)}</b>/6</span>
      <span>${t('tm.ui.roundTile')}${colon()}<b>${tileTxt}</b></span>
      <span class="tm-order">${order.map((seat, i) => {
        const p = s.players[seat];
        return `<i class="tm-seatchip ${i === 0 ? 'tm-first' : ''}" style="--pc:${p.color}">${esc(p.name)}</i>`;
      }).join('')}</span>
    </div>`;
}

// —— SVG 棋盘 ——

// clickableHexes 可点格 → 动作映射（建民居非代工优先）
function clickableHexes(legal, human) {
  const m = new Map();
  if (!human) return m;
  for (const a of legal) {
    if (a.kind === 'placeDwelling' || a.kind === 'witchDwelling') m.set(a.hex, a);
    else if (a.kind === 'build' && !m.has(a.hex)) m.set(a.hex, a);
  }
  return m;
}

// hexTitle 悬停提示（坐标 · 地形 · 费用）
function hexTitle(s, a) {
  const terr = tr(TERRAIN_NAMES[s.hexes[a.hex].terrain]);
  if (a.kind === 'build') {
    const c = buildCost(s, s.players[s.phase.cur], a.hex, false);
    return `${a.hex} · ${terr} · ${incStr(c)}`;
  }
  return `${a.hex} · ${terr}`;
}

function renderMap(s, legal, human) {
  const clicks = clickableHexes(legal, human);
  const hexes = HEXES.map((h) => {
    const c = POS[h.id];
    const st = s.hexes[h.id];
    const a = clicks.get(h.id);
    const dug = st.terrain !== h.terrain ? ' stroke="var(--fg)" stroke-width="1.5"' : '';
    return `
      <g ${a ? `class="tm-hexbtn" data-hex="${h.id}">` : '>'}
        <polygon points="${hexPoints(c.x, c.y)}" class="tm-hex" fill="${TERR_COLOR[st.terrain]}"${dug}></polygon>
        ${a ? `<polygon points="${hexPoints(c.x, c.y)}" class="tm-ring"></polygon>
          <title>${hexTitle(s, a)}</title>` : ''}
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

// bldMark 建筑标记：玩家色圆 + 类别图标（D 民居 🏠 / TP 贸易站 🏪 / TE 神庙 ⛪ / SA 圣域 ✨ / SH 要塞 🏰）
function bldMark(s, st, c) {
  const p = s.players[st.owner];
  const lbl = st.bld === 'D' ? '🏠' : st.bld === 'TP' ? '🏪' : st.bld === 'TP2' ? '🏪' : st.bld === 'TE' ? '⛪' : st.bld === 'SA' ? '✨' : st.bld === 'SH' ? '🏰' : st.bld;
  return `
    <circle cx="${c.x}" cy="${c.y}" r="13" fill="${p.color}" stroke="var(--bg)" stroke-width="1.5"></circle>
    <text x="${c.x}" y="${c.y + 4}" class="tm-bldlbl" text-anchor="middle">${lbl}</text>`;
}

// —— 玩家面板 ——

function renderBowls(p) {
  return `<div class="tm-bowls" title="${t('tm.ui.bowls')}">
    <span class="tm-bowl">${p.power.i}</span>→<span class="tm-bowl">${p.power.ii}</span>→<span class="tm-bowl tm-bowl3">${p.power.iii}</span>⚡</div>`;
}

function favChip(f) {
  return `<span class="tm-fav" title="${tr(CULT_NAME[f.track])} +${f.advance}">${CULT_ICON[f.track]}${incStr(f.income)}</span>`;
}

function renderPlayers(s) {
  return `<div class="tm-players">${s.players.map((p) => {
    const f = factionById(p.faction);
    const isCur = p.seat === currentPlayer(s);
    const cult = CULT_TRACKS.map((k) =>
      `<span class="tm-cchip">${CULT_ICON[k]}${p.cult[k]}${p.priestsOnCult[k] ? `🔒${p.priestsOnCult[k]}` : ''}</span>`).join('');
    return `
      <div class="tm-player ${isCur ? 'tm-cur' : ''}" style="--pc:${p.color}">
        <div class="tm-phead">
          <span class="bg-dot" style="background:${p.color}"></span>
          <b>${FACTION_ICON[p.faction] || ''} ${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}
          <span class="tm-vp">🏆${p.vp}</span>
        </div>
        ${f ? `<div class="tm-pfac"><i class="tm-terr" style="background:${TERR_COLOR[f.terrain]}"></i>
          ${tr(TERRAIN_NAMES[f.terrain])} · ${tr(f.desc)}${f.shAbility ? ` · ${t('tm.ui.needSH')}` : ''}</div>` : ''}
        <div class="tm-pres">💰${p.coins} 👷${p.workers} 🙏${p.priests} ⛏️${p.spades} ⚓${p.shipping} 🏘️${p.towns.length}</div>
        ${renderBowls(p)}
        <div class="tm-pcult">${cult}</div>
        ${p.bonus !== null ? `<div class="tm-pbonus">${incStr(BONUS_TILES[p.bonus].income)}</div>` : ''}
        ${p.favor.length ? `<div class="tm-pfavor">${p.favor.map((fid) => favChip(FAVOR_TILES.find((x) => x.id === fid))).join('')}</div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

// —— 中央表区：邪教轨 + 能量动作 + 奖励板块 ——

function cellTitle(pos) {
  return incStr(cultSpaceReward(pos));
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
      ${incStr(b.income)}${holder ? ` · ${esc(holder.name)}` : ''}</span>`;
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
  const prompt = `<p class="tm-prompt">${t('tm.ui.prompt.' + ph)}</p>`;
  if (!human) return `<div class="tm-action">${prompt}</div>`;
  let body = '';
  if (ph === 'chooseFaction') body = factionPanel(legal);
  else if (ph === 'act') body = actPanel(s, legal);
  else if (ph === 'resolve') body = resolvePanel(legal);
  return `<div class="tm-action">${prompt}${body}</div>`;
}

function factionPanel(legal) {
  const cards = legal.filter((a) => a.kind === 'faction').map((a) => {
    const f = factionById(a.faction);
    return `
      <button class="tm-fcard" data-fac="${f.id}">
        <span class="tm-fname"><i class="tm-fico">${FACTION_ICON[f.id] || '🏳️'}</i> ${tr(f.name)}</span>
        <span class="tm-fterr"><i class="tm-terr" style="background:${TERR_COLOR[f.terrain]}"></i>${tr(TERRAIN_NAMES[f.terrain])}</span>
        <span class="tm-fdesc">${tr(f.desc)}${f.shAbility ? ` · ${t('tm.ui.needSH')}` : ''}</span>
      </button>`;
  }).join('');
  return `<div class="tm-fcards">${cards}</div>`;
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
    const variant = to === 'TP' ? tpVariant(s, hex) : to;
    const cost = incStr(BUILDINGS[variant].cost);
    const open = ui.upSel === key;
    html += `<button class="btn-soft tm-upbtn ${open ? 'tm-usel' : ''}" data-up="${key}">
      ${hex} → ${tr(BLD_NAME[to])}${paren(cost)}</button>`;
    const needFavor = to === 'TE' || to === 'SA';
    if (open && needFavor) {
      html += `<div class="tm-favors"><span class="muted">${t('tm.ui.favorHint')}</span>${acts.map((a) =>
        `<button class="btn-soft" data-act='${JSON.stringify(a)}'>${favChip(FAVOR_TILES.find((x) => x.id === a.favor))}</button>`).join('')}</div>`;
    } else if (open) {
      html += `<div class="tm-btns">${actBtn(acts[0], `${t('tm.ui.upgrade')} ✅`)}</div>`;
    }
  }
  return `<span class="tm-label">${t('tm.ui.upgrade')}</span><div class="tm-btns">${html}</div>`;
}

// trackBtns 四轨迹按钮（发祭司 / 混沌仪式共用）
function trackBtns(legal, kind) {
  const acts = legal.filter((a) => a.kind === kind);
  if (!acts.length) return '';
  const key = kind === 'priestSend' ? 'tm.ui.priestSend' : 'tm.ui.chaosCult';
  const btns = acts.map((a) =>
    actBtn(a, `${CULT_ICON[a.track]} ${tr(CULT_NAME[a.track])}${kind === 'chaosCult' ? ' +2' : ''}`)).join('');
  return `<span class="tm-label">${t(key)}</span><div class="tm-btns">${btns}</div>`;
}

// miscPanel 能量动作 / 燃烧 / 船运 / 桥
function miscPanel(s, legal) {
  const parts = [];
  const powers = legal.filter((a) => a.kind === 'powerAction');
  if (powers.length) {
    const btns = powers.map((a) => {
      const pa = POWER_ACTIONS[a.slot];
      return actBtn(a, `⚡${pa.power}→${incStr(pa.gain)}`);
    }).join('');
    parts.push(`<span class="tm-label">${t('tm.ui.powerSlots')}</span><div class="tm-btns">${btns}</div>`);
  }
  const burns = legal.filter((a) => a.kind === 'burn');
  if (burns.length) {
    parts.push(`<span class="tm-label">${t('tm.ui.burn')}</span><div class="tm-btns">${
      burns.map((a) => actBtn(a, `×${a.pairs}${paren(`II${a.pairs * 2}→III${a.pairs}`)}`)).join('')}</div>`);
  }
  if (legal.some((a) => a.kind === 'shipping')) {
    parts.push(`<div class="tm-btns">${actBtn({ kind: 'shipping' }, `${t('tm.ui.shipping')}${paren(incStr(SHIPPING_COST))}`)}</div>`);
  }
  const bridges = legal.filter((a) => a.kind === 'bridge');
  if (bridges.length) {
    parts.push(`<span class="tm-label">${t('tm.ui.bridge')}</span><div class="tm-btns">${
      bridges.slice(0, 12).map((a) => actBtn(a, `🌉${a.a}↔${a.b}`)).join('')}</div>`);
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
  const chips = passes.map((a) =>
    `<button class="tm-bpick ${ui.passBonus === a.bonus ? 'tm-bsel' : ''}" data-pickb="${a.bonus}">${incStr(BONUS_TILES[a.bonus].income)}</button>`).join('');
  const go = passes.find((a) => a.bonus === ui.passBonus);
  return `
    <div class="tm-pass">
      <span class="muted">${t('tm.ui.passHint')}</span>
      <div class="tm-btns">${chips}${actBtn(go, t('tm.ui.pass'))}</div>
    </div>`;
}

function actPanel(s, legal) {
  const parts = [upgradePanel(s, legal), trackBtns(legal, 'priestSend'), trackBtns(legal, 'chaosCult'), miscPanel(s, legal)];
  const rows = parts.filter(Boolean).map((x) => `<div class="tm-row">${x}</div>`).join('');
  return `${rows}<div class="tm-row">${passPanel(s, legal)}</div>`;
}

function resolvePanel(legal) {
  const cults = legal.filter((a) => a.kind === 'cultChoice');
  if (cults.length) {
    return `<div class="tm-btns">${cults.map((a) =>
      actBtn(a, `${CULT_ICON[a.track]} ${tr(CULT_NAME[a.track])} +1`)).join('')}</div>`;
  }
  return legal.some((a) => a.kind === 'witchSkip')
    ? `<div class="tm-btns">${actBtn({ kind: 'witchSkip' }, t('tm.ui.skip'))}</div>` : '';
}

// —— 事件绑定 ——

// hexAction 地图点击 → 对应合法动作
function hexAction(legal, hex) {
  return legal.find((a) => (a.kind === 'placeDwelling' || a.kind === 'witchDwelling' || a.kind === 'build')
    && a.hex === hex && !a.coinDig) || legal.find((a) => a.kind === 'build' && a.hex === hex);
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
      ui.passBonus = Number($b.dataset.pickb);
      renderBoard(ctx.el, ctx.s, ctx.legal, ctx.pick);
    };
  });
}
