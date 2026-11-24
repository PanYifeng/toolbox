// 斗地主渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 结构：牌局信息条（底分/倍数/地主/底牌）→ 提示行 → 座位条 → 上一手牌 → 操作条 → 本家手牌。
// 交互：点手牌切换选中；操作条实时判定「选中组合能否压过上一手」，
//       不合法时禁用出牌按钮并说明原因；「提示」在候选解之间循环切换。
import { t, getLang } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { okHint, noHint, renderActionHints } from '/core/action-hints.js';
import { isViewerSeat, getViewerSeat } from '/core/seat-view.js';
import { BIG_JOKER, SMALL_JOKER, rankOf, suitOf, rankLabel, isRed, sortHand } from './data-cards.js';
import { parseCombo, beats } from './combos.js';
import { comboName, rankLabelOf } from './engine.js';

const HINT_LIMIT = 5;   // 提示最多保留的候选解数量
const LOW_HAND = 2;     // 手牌 ≤ 2 张算「快出完」，座位条高亮警示

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ui 跨重绘保留的界面状态（座位切换即清空选中）
let ui = { seat: -1, cards: [], hintCursor: 0 };

// —— 牌面 ——

// cardHtml 一张牌：普通牌显示点数 + 花色角标；大小王单独样式（「王」+ 大/小标记）
function cardHtml(id, act, selected) {
  const r = rankOf(id);
  const box = `dd-card${act ? ' dd-card-act' : ''}${selected ? ' dd-card-sel' : ''}${isRed(id) ? ' dd-card-red' : ''}`;
  const data = act ? ` data-card="${id}"` : '';
  if (r === SMALL_JOKER || r === BIG_JOKER) {
    const tag = r === BIG_JOKER ? '大' : '小';
    return `<div class="${box} dd-card-joker"${data}>
      <span class="dd-rank">王</span><span class="dd-suit">${tag}</span></div>`;
  }
  const corner = ['♠', '♥', '♣', '♦'][suitOf(id)] || '';
  return `<div class="${box}"${data}>
    <span class="dd-rank">${rankLabel(id)}</span><span class="dd-suit">${corner}</span></div>`;
}

// backHtml 牌背（非本家视角的手牌）
function backHtml() {
  return '<div class="dd-card dd-card-back"></div>';
}

// comboLabel 牌型 + 主点数的可读描述（王炸无主点）
function comboLabel(cmb) {
  const name = comboName(cmb.type)[getLang()] || cmb.type;
  return cmb.type === 'rocket' ? name : `${name} ${rankLabelOf(cmb.rank)}`;
}

// —— 主入口 ——

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  const curSeat = s.phase === 'bid' ? s.bid.cur : s.cur;
  const p = s.players[curSeat];
  // 隐私口径：只有坐在屏幕前的人（热座当前人类 / 联机本人）的手牌可明牌
  const human = isViewerSeat(curSeat);
  if (ui.seat !== curSeat) ui = { seat: curSeat, cards: [], hintCursor: 0 };
  el.innerHTML = `
    ${statusBarHtml(s)}
    <div class="dd-prompt" data-bg-focus>${promptHtml(s, p, human, legal)}</div>
    ${seatsHtml(s, curSeat)}
    ${s.phase === 'play' && !s.gameOver ? lastPlayHtml(s) : ''}
    ${s.phase === 'bid' ? bidPanel(s, legal, human) : playBar(s, legal, human)}
    ${s.gameOver ? resultHtml(s) : handHtml(s, curSeat, human)}`;
  wireEvents(el, pick, s, legal);
}

// —— 顶部信息 ——

// statusBarHtml 牌局信息：底分 × 倍数 = 当前分值、地主、底牌（地主确定后公开）
function statusBarHtml(s) {
  const chips = [
    `<span class="dd-chip">${t('dd.score.base')} <b>${s.baseScore || '—'}</b></span>`,
    `<span class="dd-chip">${t('dd.score.multiplier')} <b>${s.multiplier}×</b></span>`,
  ];
  if (s.landlord >= 0) {
    const lord = s.players[s.landlord];
    chips.push(`<span class="dd-chip">${t('dd.ui.points')} <b>${s.baseScore * s.multiplier}</b></span>`);
    chips.push(`<span class="dd-chip dd-chip-lord"><span class="bg-dot" style="background:${lord.color}"></span>${t('dd.ui.landlord')} <b>${esc(lord.name)}</b></span>`);
  }
  const bottom = s.landlord >= 0 && s.bottom.length
    ? `<span class="dd-chip dd-chip-bottom">${t('dd.ui.bottom')}${s.bottom.map((id) => cardHtml(id, false, false)).join('')}</span>`
    : '';
  return `<div class="dd-status">${chips.join('')}${bottom}</div>`;
}

// promptHtml 提示行：轮到谁 + 该做什么 + 操作提示条
function promptHtml(s, p, human, legal) {
  if (s.gameOver) {
    const w = s.players[s.result.winner];
    return `🏁 ${fmt(t('dd.ui.gameOver'), { n: esc(w.name) })}`;
  }
  if (s.phase === 'bid') {
    const who = human ? t('dd.ui.promptBid') : `🤖 ${esc(p.name)}…`;
    return `<b>${esc(p.name)}</b> — ${who}`;
  }
  const stage = human ? t('dd.ui.promptPlay') : `🤖 ${esc(p.name)}…`;
  return `<b>${esc(p.name)}</b> — ${stage}${hintsHtml(s, legal, human)}`;
}

// hintsHtml 操作提示条（可出牌数 / 是否必须跟牌 / 可过牌）
function hintsHtml(s, legal, human) {
  if (!human) return '';
  const plays = legal.filter((a) => a.kind === 'play').length;
  const items = [plays
    ? okHint('🎴', t('dd.ui.hintPlay'), plays)
    : noHint('🎴', t('dd.ui.hintPlay'), t('dd.ui.hintNoPlay'))];
  if (legal.some((a) => a.kind === 'pass')) items.push(okHint('⏭️', t('dd.ui.hintPass'), 1));
  return renderActionHints(items);
}

// —— 座位 ——

// seatsHtml 三家座位条：身份 / 剩余张数 / 相对位置（「我」「上家」「下家」）
// 相对位置锚定在「坐在屏幕前的人」；没有视角（交接遮罩期间）时不标相对位置，
// 否则会把「下一位玩家」错标成「我」。
function seatsHtml(s, curSeat) {
  const n = s.n;
  const viewer = getViewerSeat();
  const anchored = viewer >= 0 && viewer < n;
  return `<div class="dd-seats">${s.players.map((p) => seatHtml(s, p, curSeat, anchored ? viewer : -1, n)).join('')}</div>`;
}

// seatHtml 单个座位块（anchor 为 -1 时不显示相对位置标签）
function seatHtml(s, p, curSeat, anchor, n) {
  const tag = anchor < 0 ? ''
    : p.seat === anchor ? t('dd.ui.me')
      : p.seat === (anchor - 1 + n) % n ? t('dd.ui.prevPlayer') : t('dd.ui.nextPlayer');
  const lord = p.seat === s.landlord;
  const low = p.hand.length <= LOW_HAND && !s.gameOver;
  const cls = ['dd-seat'];
  if (p.seat === curSeat) cls.push('dd-seat-cur');
  if (lord) cls.push('dd-seat-lord');
  if (low) cls.push('dd-seat-low');
  const count = p.hand.length ? p.hand.length : t('dd.ui.out');
  const tagHtml = tag ? `<span class="dd-seat-tag">${tag}</span>` : '';
  return `<div class="${cls.join(' ')}" style="--pc:${p.color}">
    ${tagHtml}
    <span class="dd-seat-name"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}</span>
    <span class="dd-seat-role">${lord ? t('dd.ui.landlord') : s.landlord >= 0 ? t('dd.ui.peasant') : ''}</span>
    <span class="dd-seat-count">${count}</span>
  </div>`;
}

// —— 上一手 ——

// lastPlayHtml 上一手牌（谁出的 + 牌型 + 具体牌）；无人出牌时提示可自由领出
function lastPlayHtml(s) {
  if (!s.lastPlay) {
    return `<div class="dd-last"><span class="muted">${t('dd.ui.leadFree')}</span></div>`;
  }
  const who = s.players[s.lastPlay.seat];
  const cmb = s.lastPlay.combo;
  const cards = sortHand(s.lastPlay.cards).map((id) => cardHtml(id, false, false)).join('');
  return `<div class="dd-last">
    <span class="dd-last-head">${fmt(t('dd.ui.lastPlay'), { n: esc(who.name), c: comboLabel(cmb) })}</span>
    <div class="dd-last-cards">${cards}</div>
  </div>`;
}

// —— 操作条 ——

// bidPanel 叫分面板（叫 1/2/3 分 + 不叫）
function bidPanel(s, legal, human) {
  if (!human) return '';
  const best = s.bid.best > 0 ? ` ${fmt(t('dd.ui.bestBid'), { p: s.bid.best })}` : '';
  const btns = legal.map((a) => a.kind === 'bid'
    ? `<button class="dd-bid" data-bid="${a.points}">${fmt(t('dd.ui.bid'), { p: a.points })}</button>`
    : `<button class="dd-bid-soft" data-bidpass="1">${t('dd.ui.bidPass')}</button>`).join('');
  return `<div class="dd-actions"><span class="dd-actions-label">${t('dd.ui.bidPrompt')}${best}</span>${btns}</div>`;
}

// playBar 出牌阶段操作条：出牌（选中不合法时禁用）/ 过牌 / 提示 / 清空
function playBar(s, legal, human) {
  if (!human) return '';
  const st = selectionStatus(s);
  const canPass = legal.some((a) => a.kind === 'pass');
  const canHint = legal.some((a) => a.kind === 'play');
  const sel = st.text
    ? `<span class="dd-selinfo ${st.ok ? 'dd-ok' : 'dd-bad'}">${st.text}${st.reason ? ` · ${st.reason}` : ''}</span>`
    : `<span class="dd-selinfo muted">${t('dd.ui.needSelect')}</span>`;
  return `<div class="dd-actions">
    <button class="dd-play" data-play="1"${st.ok ? '' : ' disabled'}>${t('dd.ui.playCards')}</button>
    ${canPass ? `<button class="dd-pass" data-pass="1">${t('dd.ui.pass')}</button>` : ''}
    <button class="btn-soft" data-hint="1"${canHint ? '' : ' disabled'}>${t('dd.ui.hintBtn')}</button>
    <button class="btn-soft" data-clear="1"${ui.cards.length ? '' : ' disabled'}>${t('dd.ui.clear')}</button>
    ${sel}
  </div>`;
}

// selectionStatus 选中牌能否出：不成牌型 / 压不过上一手时给出可读原因
function selectionStatus(s) {
  if (!ui.cards.length) return { ok: false, text: '', reason: '' };
  const cmb = parseCombo(ui.cards);
  if (!cmb) return { ok: false, text: t('dd.ui.notCombo'), reason: '' };
  const last = s.lastPlay ? s.lastPlay.combo : null;
  if (last && !beats(cmb, last)) {
    return { ok: false, text: comboLabel(cmb), reason: t('dd.ui.cannotBeat') };
  }
  return { ok: true, text: comboLabel(cmb), reason: '' };
}

// —— 手牌 ——

// handHtml 本家手牌：点击切换选中；非本家视角一律牌背（不泄露牌面）
function handHtml(s, curSeat, human) {
  const p = s.players[curSeat];
  const role = s.landlord === curSeat ? ` · ${t('dd.ui.landlord')}` : '';
  const label = `<span class="dd-hand-label"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>${role} · ${p.hand.length}</span>`;
  if (!human) {
    return `<div class="dd-hand">${label}<div class="dd-hand-cards">${p.hand.map(() => backHtml()).join('')}</div></div>`;
  }
  const selected = new Set(ui.cards);
  const cards = sortHand(p.hand).map((id) => cardHtml(id, true, selected.has(id))).join('');
  return `<div class="dd-hand">${label}
    <div class="dd-hand-cards">${cards || `<span class="muted">${t('dd.ui.emptyHand')}</span>`}</div>
  </div>`;
}

// resultHtml 终局结果：胜方 + 底分 × 倍数 = 结算分
function resultHtml(s) {
  const r = s.result;
  const w = s.players[r.winner];
  return `<div class="dd-result">
    <b>${fmt(t('dd.ui.resultTitle'), { n: esc(w.name) })}</b>
    <span>${fmt(t('dd.ui.resultCalc'), { b: s.baseScore, m: s.multiplier, p: r.points })}</span>
    ${s.spring ? `<span class="dd-spring">${t(s.spring === 'spring' ? 'dd.ui.spring' : 'dd.ui.antiSpring')}</span>` : ''}
  </div>`;
}

// —— 提示 ——

// countRanks 手牌/牌组的点数计数（拆组惩罚用）
function countRanks(cards) {
  const m = {};
  for (const id of cards) { const r = rankOf(id); m[r] = (m[r] || 0) + 1; }
  return m;
}

// hintScore 候选出牌评分：炸弹只在别无选择时推荐，优先多甩牌、留大牌、不拆成组的牌
function hintScore(cards, cmb, hand) {
  let v = cmb.type === 'bomb' || cmb.type === 'rocket' ? -100 : 0;
  v += cards.length * 2;
  v -= cmb.rank * 0.25;
  const all = countRanks(hand);
  const used = countRanks(cards);
  for (const r of Object.keys(used)) {
    if (all[r] - used[r] > 0 && all[r] >= 2) v -= 1.5; // 拆开成组的牌
  }
  return v;
}

// hintList 候选解（按推荐度降序，最多 HINT_LIMIT 个）
function hintList(s, legal) {
  const hand = s.players[s.cur].hand;
  const out = [];
  for (const a of legal) {
    if (a.kind !== 'play') continue;
    const cmb = parseCombo(a.cards);
    if (cmb) out.push({ cards: a.cards, v: hintScore(a.cards, cmb, hand) });
  }
  out.sort((x, y) => y.v - x.v);
  return out.slice(0, HINT_LIMIT);
}

// —— 事件 ——

// wireEvents 事件委托
function wireEvents(el, pick, s, legal) {
  el.querySelectorAll('[data-card]').forEach(($c) => {
    $c.onclick = () => {
      const id = Number($c.dataset.card);
      const i = ui.cards.indexOf(id);
      if (i >= 0) ui.cards.splice(i, 1); else ui.cards.push(id);
      ui.hintCursor = 0;
      renderBoard(el, s, legal, pick);
    };
  });
  el.querySelectorAll('[data-play]').forEach(($b) => {
    $b.onclick = () => {
      if (!selectionStatus(s).ok) return;
      const cards = ui.cards.slice();
      ui.cards = [];
      pick({ kind: 'play', cards });
    };
  });
  el.querySelectorAll('[data-pass]').forEach(($b) => {
    $b.onclick = () => { ui.cards = []; pick({ kind: 'pass' }); };
  });
  el.querySelectorAll('[data-clear]').forEach(($b) => {
    $b.onclick = () => { ui.cards = []; ui.hintCursor = 0; renderBoard(el, s, legal, pick); };
  });
  el.querySelectorAll('[data-hint]').forEach(($b) => {
    $b.onclick = () => {
      const list = hintList(s, legal);
      if (!list.length) return;
      ui.cards = list[ui.hintCursor % list.length].cards.slice();
      ui.hintCursor += 1; // 连续点提示在候选解之间轮换
      renderBoard(el, s, legal, pick);
    };
  });
  el.querySelectorAll('[data-bid]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'bid', points: Number($b.dataset.bid) });
  });
  el.querySelectorAll('[data-bidpass]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'bidPass' });
  });
}
