// 斗地主渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 结构：提示行 → 叫分面板（叫分阶段）/ 上一手牌 + 操作条（出牌阶段）
//       → 两家对手信息（手牌数 + 身份 + 最近出牌）→ 本家手牌（点选组合后出牌）。
// 出牌交互：点击手牌切换选中 → 「出牌」按钮把选中组合交给 pick({kind:'play',cards})；
// 引擎侧复核牌型与压制关系，非法则原样忽略（界面提示回弹）。
import { t, getLang } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { okHint, noHint, renderActionHints } from '/core/action-hints.js';
import { isViewerSeat } from '/core/seat-view.js';
import { rankOf, suitOf, rankLabel, isRed, cardName, sortHand } from './data-cards.js';
import { parseCombo, legalPlays } from './combos.js';
import { comboName, rankLabelOf } from './engine.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// sel 本家当前选中的牌（跨重绘保留；seat 变化即清空）
let sel = { seat: -1, cards: [] };

// cardHtml 一张牌（点数 + 花色角标；选中态高亮）
function cardHtml(id, act, selected) {
  const box = `dd-card${act ? ' dd-card-act' : ''}${selected ? ' dd-card-sel' : ''}`;
  const red = isRed(id);
  const r = rankOf(id);
  const suit = suitOf(id);
  const sym = rankLabel(id);
  const corner = suit >= 0 ? ['♠', '♥', '♣', '♦'][suit] : '';
  return `<div class="${box}${red ? ' dd-card-red' : ''}"${act ? ` data-card="${id}"` : ''}>
    <span class="dd-rank">${sym}</span><span class="dd-suit">${corner}</span></div>`;
}

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  const curSeat = s.phase === 'bid' ? s.bid.cur : s.cur;
  const p = s.players[curSeat];
  // 隐私口径：只有坐在屏幕前的人（热座当前人类 / 联机本人）的手牌可明牌
  const human = isViewerSeat(curSeat);
  // 座位切换时清空选中（避免上一家选牌串到下一家）
  if (sel.seat !== curSeat) sel = { seat: curSeat, cards: [] };
  el.innerHTML = `
    <div class="dd-prompt" data-bg-focus>${promptHtml(s, p, human, legal)}</div>
    ${s.phase === 'bid' ? bidPanel(s, legal, human) : playBar(s, legal, human)}
    ${opponentsHtml(s, curSeat)}
    ${s.gameOver ? resultHtml(s) : handHtml(s, legal, human, curSeat)}
    ${s.phase === 'play' && !s.gameOver ? lastPlayHtml(s) : ''}`;
  wireEvents(el, pick, s, legal);
}

// promptHtml 提示行
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

// hintsHtml 操作提示条（可出牌型数 / 是否必须跟牌）
function hintsHtml(s, legal, human) {
  if (!human) return '';
  const plays = legal.filter((a) => a.kind === 'play').length;
  const items = [];
  items.push(plays
    ? okHint('🎴', t('dd.ui.hintPlay'), plays)
    : noHint('🎴', t('dd.ui.hintPlay'), t('dd.ui.hintNoPlay')));
  if (legal.some((a) => a.kind === 'pass')) items.push(okHint('⏭️', t('dd.ui.hintPass'), 1));
  return renderActionHints(items);
}

// bidPanel 叫分面板（叫 1/2/3 分 + 不叫）
function bidPanel(s, legal, human) {
  if (!human) return '';
  const best = s.bid.best > 0 ? ` ${fmt(t('dd.ui.bestBid'), { p: s.bid.best })}` : '';
  const btns = legal.map((a) => a.kind === 'bid'
    ? `<button class="dd-bid" data-bid="${a.points}">${fmt(t('dd.ui.bid'), { p: a.points })}</button>`
    : `<button class="btn-soft" data-bidpass="1">${t('dd.ui.bidPass')}</button>`).join('');
  return `<div class="dd-actions"><span class="dd-actions-label">${t('dd.ui.bidPrompt')}${best}</span>${btns}</div>`;
}

// playBar 出牌阶段操作条：出牌 / 过牌 / 提示
function playBar(s, legal, human) {
  if (!human) return '';
  const canPass = legal.some((a) => a.kind === 'pass');
  return `<div class="dd-actions">
    <button class="dd-play" data-play="1">${t('dd.ui.playCards')}</button>
    ${canPass ? `<button class="btn-soft" data-pass="1">${t('dd.ui.pass')}</button>` : ''}
    <button class="btn-soft" data-hint="1">${t('dd.ui.hintBtn')}</button>
    <button class="btn-soft" data-clear="1">${t('dd.ui.clear')}</button>
    <span class="dd-actions-label" data-selinfo="1">${selInfo(s)}</span>
  </div>`;
}

// selInfo 选中牌型提示（合法牌型显示名称，否则提示不合法）
function selInfo(s) {
  if (!sel.cards.length) return '';
  const cmb = parseCombo(sel.cards);
  if (!cmb) return `<span class="dd-bad">${t('dd.ui.notCombo')}</span>`;
  const name = comboName(cmb.type)[getLang()] || cmb.type;
  return `<span class="dd-ok">${name}${cmb.type === 'rocket' ? '' : ` ${rankLabelOf(cmb.rank)}`}</span>`;
}

// opponentsHtml 两家对手：名字 + 身份 + 剩余张数
function opponentsHtml(s, curSeat) {
  const others = s.players.filter((x) => x.seat !== curSeat);
  const rows = others.map((x) => {
    const role = x.seat === s.landlord ? t('dd.ui.landlord') : t('dd.ui.peasant');
    const cls = `dd-opp${x.seat === s.landlord ? ' dd-opp-lord' : ''}`;
    return `<div class="${cls}" style="--pc:${x.color}">
      <span class="dd-opp-head"><span class="bg-dot" style="background:${x.color}"></span><b>${esc(x.name)}</b>${x.isAI ? ' 🤖' : ''}</span>
      <span class="dd-opp-role">${role}</span>
      <span class="dd-opp-count" title="${t('dd.ui.cardsLeft')}">${x.hand.length}</span>
    </div>`;
  });
  // 地主视角：当前玩家如果就是地主，则另两行都是农民（信息已在上面体现）
  const meRow = s.players[curSeat];
  const myRole = meRow.seat === s.landlord ? t('dd.ui.youLandlord') : t('dd.ui.youPeasant');
  return `<div class="dd-opps">${rows.join('')}<div class="dd-opp dd-opp-me" style="--pc:${meRow.color}">
    <span class="dd-opp-head"><span class="bg-dot" style="background:${meRow.color}"></span><b>${esc(meRow.name)}</b></span>
    <span class="dd-opp-role">${myRole}</span>
    <span class="dd-opp-count">${meRow.hand.length}</span></div></div>`;
}

// lastPlayHtml 上一手牌（谁出的 + 牌型 + 具体牌）
function lastPlayHtml(s) {
  if (!s.lastPlay) {
    return `<div class="dd-last"><span class="muted">${t('dd.ui.leadFree')}</span></div>`;
  }
  const who = s.players[s.lastPlay.seat];
  const cmb = s.lastPlay.combo;
  const name = comboName(cmb.type)[getLang()] || cmb.type;
  const cards = sortHand(s.lastPlay.cards).map((id) => cardHtml(id, false, false)).join('');
  return `<div class="dd-last">
    <span class="dd-last-head">${fmt(t('dd.ui.lastPlay'), { n: esc(who.name), c: name })}</span>
    <div class="dd-last-cards">${cards}</div>
  </div>`;
}

// handHtml 本家手牌：点击切换选中；AI 玩家不显示具体牌面
function handHtml(s, legal, human, curSeat) {
  const p = s.players[curSeat];
  if (!human) {
    return `<div class="dd-hand"><span class="dd-hand-label"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b> · ${p.hand.length}</span>
      <div class="dd-hand-cards">${p.hand.map(() => '<div class="dd-card dd-card-back"></div>').join('')}</div></div>`;
  }
  const selected = new Set(sel.cards);
  const cards = sortHand(p.hand).map((id) => cardHtml(id, true, selected.has(id))).join('');
  return `<div class="dd-hand">
    <span class="dd-hand-label"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b> · ${p.hand.length}</span>
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

// wireEvents 事件委托
function wireEvents(el, pick, s, legal) {
  el.querySelectorAll('[data-card]').forEach(($c) => {
    $c.onclick = () => {
      const id = Number($c.dataset.card);
      const i = sel.cards.indexOf(id);
      if (i >= 0) sel.cards.splice(i, 1); else sel.cards.push(id);
      renderBoard(el, s, legal, pick);
    };
  });
  el.querySelectorAll('[data-play]').forEach(($b) => {
    $b.onclick = () => {
      if (!sel.cards.length) return;
      const cards = sel.cards.slice();
      sel.cards = [];
      pick({ kind: 'play', cards });
    };
  });
  el.querySelectorAll('[data-pass]').forEach(($b) => {
    $b.onclick = () => { sel.cards = []; pick({ kind: 'pass' }); };
  });
  el.querySelectorAll('[data-clear]').forEach(($b) => {
    $b.onclick = () => { sel.cards = []; renderBoard(el, s, legal, pick); };
  });
  el.querySelectorAll('[data-hint]').forEach(($b) => {
    $b.onclick = () => { sel.cards = hintPick(s, legal); renderBoard(el, s, legal, pick); };
  });
  el.querySelectorAll('[data-bid]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'bid', points: Number($b.dataset.bid) });
  });
  el.querySelectorAll('[data-bidpass]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'bidPass' });
  });
}

// hintPick 提示：取一手能压过当前牌面的最小合法出牌（无处可压返回空选）
function hintPick(s, legal) {
  const plays = legal.filter((a) => a.kind === 'play');
  if (!plays.length) return [];
  // 出牌数最多且主点数最低的一手（协助清牌）
  let best = null;
  let bestScore = -Infinity;
  for (const a of plays) {
    const cmb = parseCombo(a.cards);
    if (!cmb) continue;
    const v = a.cards.length * 2 - cmb.rank * 0.3;
    if (v > bestScore) { bestScore = v; best = a; }
  }
  return best ? best.cards.slice() : [];
}
