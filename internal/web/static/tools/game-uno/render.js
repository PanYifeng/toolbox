// 巫诺（UNO）渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 结构：提示行（阶段 + 操作提示条）→ 对手手牌区 → 中央牌堆/弃牌堆 + 当前色 →
// 本家手牌（可出的牌高亮，点击即出）。微阶段操作面板插在提示行下方：
// 万能牌选色、摸到可出的牌「打/留」、剩 1 张喊/不喊 UNO、连锁罚牌认罚。
import { t, getLang } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { noHint, okHint, renderActionHints } from '/core/action-hints.js';
import { DECK, CARD_BG, CARD_FG, WILD, COLOR_NAMES, cardSym } from './data-cards.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ctx 当前渲染上下文（供局部重绘）
let ctx = null;

// colorLabel 颜色双语名（按当前语言）
function colorLabel(c) {
  return COLOR_NAMES[c][getLang()] || COLOR_NAMES[c].zh;
}

// cardHtml 一张牌（颜色底 + 大符号）；act 时整牌可点，attr 指定点击属性名
function cardHtml(id, act, attr) {
  const card = DECK[id];
  const wild = card.c === WILD;
  const bg = wild ? 'linear-gradient(135deg,#2b2b2b,#555)' : CARD_BG[card.c];
  const fg = wild ? '#ffffff' : CARD_FG[card.c];
  const cls = `un-card${wild ? ' un-card-wild' : ''}${act ? ' un-card-act' : ''}`;
  const data = act && attr ? ` ${attr}="${id}"` : '';
  return `<div class="${cls}" style="--cbg:${bg};--cfg:${fg}"${data}>${cardSym(id)}</div>`;
}

// backHtml 牌背（对手手牌）
function backHtml() {
  return '<div class="un-card un-back"></div>';
}

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  ctx = { el, s, legal, pick };
  const curSeat = s.pending ? s.pending.seat : s.cur;
  const p = s.players[curSeat];
  const human = !p.isAI;

  el.innerHTML = `
    <div class="un-prompt" data-bg-focus>${promptHtml(s, p, human)}</div>
    ${pendingPanel(s, legal, human)}
    <div class="un-table">
      ${opponentsHtml(s, curSeat)}
      <div class="un-center">
        <div class="un-piles">
          ${drawPileHtml(s, legal, human)}
          ${discardPileHtml(s)}
        </div>
        ${colorIndicatorHtml(s)}
        ${rulesHtml(s)}
      </div>
    </div>
    ${handHtml(s, legal, human)}`;

  wireEvents(el, pick);
}

// promptHtml 提示行：阶段说明 + 操作提示条
function promptHtml(s, p, human) {
  if (s.roundOver) {
    const w = s.players[s.lastWinner];
    return `🏁 ${fmt(t('un.ui.roundOver'), { n: esc(w.name), r: s.round })}`;
  }
  const stage = human ? t(stageKey(s)) : `🤖 ${esc(p.name)}…`;
  return `<b>${esc(p.name)}</b> — ${stage}${hintsHtml(s, human)}`;
}

// stageKey 当前阶段文案 key
function stageKey(s) {
  if (s.pending && s.pending.kind === 'chooseColor') return 'un.ui.prompt.color';
  if (s.pending && s.pending.kind === 'uno') return 'un.ui.prompt.uno';
  if (s.pending && s.pending.kind === 'drawPlay') return 'un.ui.prompt.drawPlay';
  if (s.rules.stacking && s.drawStack > 0) return 'un.ui.prompt.stack';
  return 'un.ui.prompt.play';
}

// hintsHtml 操作提示条（可出牌数 / 摸牌 / 罚牌）
function hintsHtml(s, human) {
  if (!human) return '';
  const plays = ctx.legal.filter((a) => a.kind === 'play').length;
  const items = [];
  if (s.rules.stacking && s.drawStack > 0) {
    items.push(plays
      ? okHint('🎴', t('un.ui.hintStack'), plays)
      : noHint('🎴', t('un.ui.hintStack'), t('un.ui.hintNoStack')));
    items.push(okHint('🃏', t('un.ui.hintPenalty'), s.drawStack));
  } else {
    items.push(plays
      ? okHint('🎴', t('un.ui.hintPlay'), plays)
      : noHint('🎴', t('un.ui.hintPlay'), t('un.ui.hintNoPlay')));
    if (ctx.legal.some((a) => a.kind === 'draw')) items.push(okHint('🃏', t('un.ui.hintDraw'), 1));
  }
  return renderActionHints(items);
}

// pendingPanel 微阶段操作面板（无微阶段时为空）
function pendingPanel(s, legal, human) {
  if (!human) return '';
  // 局末的「下一局」按钮独立于 pending，放在这里
  if (s.roundOver) {
    return `<div class="un-actions"><button class="un-next" data-next="1">▶ ${t('un.ui.nextRound')}</button></div>`;
  }
  if (s.rules.stacking && s.drawStack > 0 && legal.some((a) => a.kind === 'drawPenalty')) {
    return `<div class="un-actions"><button class="un-next" data-penalty="1">${fmt(t('un.ui.takePenalty'), { k: s.drawStack })}</button></div>`;
  }
  if (!s.pending) return '';
  const k = s.pending.kind;
  if (k === 'chooseColor') {
    return `<div class="un-actions">
      <span class="un-actions-label">${t('un.ui.chooseColor')}</span>
      ${[0, 1, 2, 3].map((c) => `<button class="un-colorbtn" style="--cbg:${CARD_BG[c]};--cfg:${CARD_FG[c]}" data-color="${c}">${colorLabel(c)}</button>`).join('')}
    </div>`;
  }
  if (k === 'uno') {
    return `<div class="un-actions">
      <span class="un-actions-label">${t('un.ui.unoPrompt')}</span>
      <button class="un-next" data-pending="unoCall">${t('un.ui.unoCall')}</button>
      <button class="btn-soft" data-pending="unoMiss">${t('un.ui.unoMiss')}</button>
    </div>`;
  }
  if (k === 'drawPlay') {
    return `<div class="un-actions">
      <span class="un-actions-label">${t('un.ui.drawPlayPrompt')}</span>
      <button class="un-next" data-pending="playDrawn">${t('un.ui.playDrawn')}</button>
      <button class="btn-soft" data-pending="keepDrawn">${t('un.ui.keepDrawn')}</button>
    </div>`;
  }
  return '';
}

// opponentsHtml 其他玩家手牌区（张数 + 名称 + 累计分，当前行动者高亮）
function opponentsHtml(s, curSeat) {
  const others = s.players.filter((x) => x.seat !== curSeat);
  if (!others.length) return '';
  return `<div class="un-opps">${others.map((x) => `
    <div class="un-opp${x.seat === s.cur ? ' un-opp-cur' : ''}" style="--pc:${x.color}">
      <span class="un-opp-head"><span class="bg-dot" style="background:${x.color}"></span><b>${esc(x.name)}</b>${x.isAI ? ' 🤖' : ''}</span>
      <span class="un-opp-cards">${backHtml().repeat(Math.min(x.hand.length, 10))}<b>${x.hand.length}</b></span>
      <span class="un-opp-score" title="${t('un.ui.scoreTip')}">${x.score}</span>
    </div>`).join('')}</div>`;
}

// drawPileHtml 牌堆（可摸时高亮可点；局末位置留空）
function drawPileHtml(s, legal, human) {
  const act = human && legal.some((a) => a.kind === 'draw');
  return `<div class="un-pile">
    <div class="un-card un-back${act ? ' un-card-act' : ''}"${act ? ' data-draw="1"' : ''}></div>
    <span class="un-pile-label">${t('un.ui.drawPile')} ${s.draw.length}</span>
  </div>`;
}

// discardPileHtml 弃牌堆顶
function discardPileHtml(s) {
  const top = s.discard[s.discard.length - 1];
  return `<div class="un-pile">
    ${top === undefined ? '<div class="un-card"></div>' : `<div class="un-card" style="--cbg:${CARD_BG[DECK[top].c] || 'var(--bg-soft)'};--cfg:${CARD_FG[DECK[top].c] || 'var(--fg)'}">${cardSym(top)}</div>`}
    <span class="un-pile-label">${t('un.ui.discardPile')}</span>
  </div>`;
}

// colorIndicatorHtml 当前生效颜色指示（万能牌出后显示玩家所选的色）
function colorIndicatorHtml(s) {
  const c = s.activeColor;
  if (c === undefined || c < 0) return '';
  return `<span class="un-color-chip" style="--cbg:${CARD_BG[c]};--cfg:${CARD_FG[c]}">
    ${t('un.ui.activeColor')} ${colorLabel(c)}</span>`;
}

// rulesHtml 本局启用的家庭规则标注
function rulesHtml(s) {
  const chips = [];
  if (s.rules.stacking) chips.push(`🔗 ${t('un.ui.ruleStacking')}`);
  chips.push(`🎯 ${s.rules.target}`);
  return `<div class="un-rules">${chips.map((c) => `<span>${c}</span>`).join('')}</div>`;
}

// handHtml 本家手牌：可出的牌高亮可点
function handHtml(s, legal, human) {
  const me = s.pending ? s.pending.seat : s.cur;
  const p = s.players[me];
  const playable = new Set(legal.filter((a) => a.kind === 'play').map((a) => a.card));
  const cards = p.hand.map((id) => cardHtml(id, human && playable.has(id), 'data-play')).join('');
  return `<div class="un-hand">
    <span class="un-hand-label"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b> · ${p.hand.length}</span>
    <div class="un-hand-cards">${cards || `<span class="muted">${t('un.ui.emptyHand')}</span>`}</div>
  </div>`;
}

// wireEvents 事件委托
function wireEvents(el, pick) {
  el.querySelectorAll('[data-play]').forEach(($c) => {
    $c.onclick = () => pick({ kind: 'play', card: Number($c.dataset.play) });
  });
  el.querySelectorAll('[data-draw]').forEach(($c) => {
    $c.onclick = () => pick({ kind: 'draw' });
  });
  el.querySelectorAll('[data-next]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'nextRound' });
  });
  el.querySelectorAll('[data-color]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'chooseColor', color: Number($b.dataset.color) });
  });
  el.querySelectorAll('[data-pending]').forEach(($b) => {
    $b.onclick = () => pick({ kind: $b.dataset.pending });
  });
  el.querySelectorAll('[data-penalty]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'drawPenalty' });
  });
}
