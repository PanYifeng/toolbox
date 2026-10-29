// 璀璨宝石渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 贵族行 + 宝石供应 + 三阶牌市（牌堆 + 4 明牌）+ 玩家面板（宝石/折扣/预留/贵族）。
// 微阶段：弃宝石时己方面板宝石可点；择贵族时贵族牌可点。
import { t } from '/core/i18n.js';
import { CARDS, NOBLES, MARKET_SLOTS } from './data-cards.js';

// 宝石色（游戏固定色，深浅色主题通用；白/黑加描边保证可辨）
const GEM_COLOR = ['#ece9e2', '#4d84e0', '#57b06a', '#e05d5d', '#43434f'];
const GOLD_COLOR = '#d4a017';
const TIER_LABEL = ['sl.ui.tier1', 'sl.ui.tier2', 'sl.ui.tier3'];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 拿宝石选择状态（模块级，跨重绘保留；提交/换人后清空）
let ui = { sel: [] };
let ctx = null; // {el, s, legal, pick}，供局部重绘

// dot 宝石圆点 HTML
function dot(color, ring) {
  const style = `background:${color};${ring ? 'box-shadow:0 0 0 1.5px var(--border);' : ''}`;
  return `<i class="sl-dot" style="${style}"></i>`;
}

// gemChip 供应堆 / 手牌：圆点 × 数量；kind 决定可点属性（gem=拿取选择 / discard=弃置）
function gemChip(colorIdx, count, ring, clickable, payload, selected, kind) {
  const c = colorIdx === -1 ? GOLD_COLOR : GEM_COLOR[colorIdx];
  const ringed = ring || colorIdx === 0 || colorIdx === 4;
  const act = clickable && count > 0 ? ' sl-chip-act' : '';
  const sel = selected ? ' sl-chip-sel' : '';
  const attr = kind === 'gem' ? 'data-gem' : 'data-discard';
  const data = clickable && count > 0 ? ` ${attr}="${payload}"` : '';
  return `<span class="sl-chip${act}${sel}"${data} title="${count}">${dot(c, ringed)}<b>${count}</b></span>`;
}

// costHtml 卡片成本行（只列非零项）
function costHtml(cost) {
  return cost.map((n, i) => n > 0
    ? `<span class="sl-need">${dot(GEM_COLOR[i], i === 0 || i === 4)}<b>${n}</b></span>`
    : '').join('');
}

// nobleHtml 贵族牌：需求 + 👑3；可选时整牌可点
function nobleHtml(j, clickable) {
  const req = NOBLES[j].map((n, i) => n > 0
    ? `<span class="sl-need">${dot(GEM_COLOR[i], i === 0 || i === 4)}<b>${n}</b></span>`
    : '').join('');
  const act = clickable ? ' sl-noble-act' : '';
  const data = clickable ? ` data-noble="${j}"` : '';
  return `<div class="sl-noble${act}"${data}><span class="sl-crown">👑 +3</span><span class="sl-req">${req}</span></div>`;
}

// cardHtml 发展卡：VP 角标 + 产出色 + 成本；可买整卡可点，预留走角部按钮
function cardHtml(cid, tier, slot, buyable, reservable, extra) {
  const [, vp, gives, cost] = CARDS[cid];
  const act = buyable ? ' sl-card-act' : '';
  const data = buyable ? ` data-buy="${tier}:${slot}"` : '';
  const res = reservable
    ? `<button class="sl-res-btn" data-reserve="${tier}:${slot}" title="${t('sl.ui.reserve')}">🔒</button>`
    : '';
  return `<div class="sl-card${act}${extra || ''}"${data}>
    ${res}
    <div class="sl-card-top"><span class="sl-vp">${vp > 0 ? vp : ''}</span>${dot(GEM_COLOR[gives], gives === 0 || gives === 4)}</div>
    <div class="sl-cost">${costHtml(cost)}</div>
  </div>`;
}

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  ctx = { el, s, legal, pick };
  const pendingDiscard = s.pending && s.pending.kind === 'discard';
  const pendingNoble = s.pending && s.pending.kind === 'noble';
  const humanMain = !s.pending && !s.players[s.cur].isAI;
  if (!humanMain) ui.sel = [];
  const buySet = new Set(legal.filter((a) => a.kind === 'buy' && a.reserved === undefined)
    .map((a) => `${a.tier}:${a.slot}`));
  const resSet = new Set(legal.filter((a) => a.kind === 'reserve' && a.slot >= 0)
    .map((a) => `${a.tier}:${a.slot}`));
  const blindSet = new Set(legal.filter((a) => a.kind === 'reserve' && a.slot < 0)
    .map((a) => a.tier));
  const resBuyIdx = new Set(legal.filter((a) => a.kind === 'buy' && a.reserved !== undefined)
    .map((a) => a.reserved));

  el.innerHTML = `
    <div class="sl-prompt" data-bg-focus>${promptHtml(s, pendingDiscard, pendingNoble, humanMain)}</div>
    <div class="sl-wrap">
      <div class="sl-board">
        <div class="sl-row"><span class="sl-label">${t('sl.ui.nobles')}</span>
          <div class="sl-nobles">${s.nobles.map((j) => nobleHtml(j, pendingNoble)).join('')}</div>
        </div>
        <div class="sl-row"><span class="sl-label">${t('sl.ui.supply')}</span>
          <div class="sl-supply">
            ${s.supply.gems.map((n, i) => gemChip(i, n, false, humanMain, i, ui.sel.includes(i), 'gem')).join('')}
            ${gemChip(-1, s.supply.gold, false, false, -1, false)}
          </div>
          ${ui.sel.length && humanMain ? '<button class="sl-selclear" data-selclear>✕</button>' : ''}
        </div>
        ${[0, 1, 2].map((tier) => marketRowHtml(s, tier, buySet, resSet, blindSet)).join('')}
      </div>
      <div class="sl-players">${s.players.map((p, i) => playerHtml(s, p, i, pendingDiscard && s.pending.seat === i, resBuyIdx)).join('')}</div>
    </div>`;

  wireEvents(el, pick);
}

// promptHtml 阶段提示行（humanMain 时附拿宝石操作提示）
function promptHtml(s, pendingDiscard, pendingNoble, humanMain) {
  if (pendingDiscard) return `⚠️ ${t('sl.ui.prompt.discard')}`;
  if (pendingNoble) return `👑 ${t('sl.ui.prompt.noble')}`;
  const p = s.players[s.cur];
  const hint = humanMain ? ` <span class="sl-hint">💎 ${t('sl.ui.prompt.takeHint')}</span>` : '';
  return `${p.isAI ? '🤖 ' : ''}<b>${esc(p.name)}</b> — ${t('sl.ui.prompt.act')}${hint}`;
}

// marketRowHtml 单阶牌市行：牌堆（盲留）+ 4 张明牌
function marketRowHtml(s, tier, buySet, resSet, blindSet) {
  const blind = blindSet.has(tier);
  const cards = s.market[tier].map((cid, slot) => {
    if (cid === null) return '<div class="sl-card sl-card-empty"></div>';
    return cardHtml(cid, tier, slot, buySet.has(`${tier}:${slot}`), resSet.has(`${tier}:${slot}`));
  }).join('');
  return `
    <div class="sl-row">
      <span class="sl-label">${t(TIER_LABEL[tier])}</span>
      <div class="sl-market">
        <button class="sl-deck${blind ? ' sl-deck-act' : ''}" ${blind ? `data-blind="${tier}"` : 'disabled'}>
          🂠<b>${s.decks[tier].length}</b>
        </button>
        ${cards}
      </div>
    </div>`;
}

// playerHtml 玩家面板：VP / 宝石 / 折扣 / 预留 / 贵族
function playerHtml(s, p, seatIdx, pendingDiscard, resBuyIdx) {
  const isCur = seatIdx === s.cur;
  const chips = p.gems.map((n, i) => gemChip(i, n, false, pendingDiscard, i)).join('')
    + gemChip(-1, p.gold, false, pendingDiscard, -1);
  const bonus = p.bonus.map((n, i) => n > 0
    ? `<span class="sl-bonus" style="background:${GEM_COLOR[i]};color:${i === 0 ? '#333' : '#fff'};${i === 0 || i === 4 ? 'box-shadow:0 0 0 1.5px var(--border);' : ''}">${n}</span>`
    : '').join('');
  const reserved = p.reserved.map((cid, i) => {
    const buyable = seatIdx === s.cur && resBuyIdx.has(i);
    const [, vp, gives, cost] = CARDS[cid];
    return `<div class="sl-card sl-card-res${buyable ? ' sl-card-act' : ''}"${buyable ? ` data-buyres="${i}"` : ''}>
      <div class="sl-card-top"><span class="sl-vp">${vp > 0 ? vp : ''}</span>${dot(GEM_COLOR[gives], gives === 0 || gives === 4)}</div>
      <div class="sl-cost">${costHtml(cost)}</div>
    </div>`;
  }).join('');
  const nobleBadges = p.nobles.map(() => '<span class="sl-crown">👑</span>').join('');
  return `
    <div class="sl-player${isCur ? ' sl-player-cur' : ''}" style="--pc:${p.color}">
      <div class="sl-phead">
        <span class="sl-dot-name"><i class="sl-dot" style="background:${p.color}"></i><b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}</span>
        <span class="sl-pvp"><b>${p.vp}</b> VP ${nobleBadges}</span>
      </div>
      <div class="sl-pgems">${chips}</div>
      ${bonus ? `<div class="sl-pbonus">${t('sl.ui.bonus')} ${bonus}</div>` : ''}
      ${reserved ? `<div class="sl-pres">${reserved}</div>` : ''}
    </div>`;
}

// wireEvents 事件委托：拿宝石 / 购卡 / 预留 / 盲留 / 弃宝石 / 择贵族
function wireEvents(el, pick) {
  el.querySelectorAll('[data-gem]').forEach(($c) => {
    $c.onclick = () => {
      const c = Number($c.dataset.gem);
      const i = ui.sel.indexOf(c);
      if (i >= 0) {
        // 已选中再点：唯一选中时视为同色拿 2，否则取消选择
        if (ui.sel.length === 1) {
          const a2 = ctx.legal.find((x) => x.kind === 'take2' && x.color === c);
          if (a2) { commit(a2); return; }
        }
        ui.sel.splice(i, 1);
      } else if (ui.sel.length < 3) {
        ui.sel.push(c);
      } else return;
      // 凑满 3 色即尝试提交 take3
      if (ui.sel.length) {
        const key = [...ui.sel].sort().join(',');
        const a3 = ctx.legal.find((x) => x.kind === 'take3'
          && [...x.colors].sort().join(',') === key);
        if (a3) { commit(a3); return; }
      }
      redraw();
    };
  });
  el.querySelectorAll('[data-selclear]').forEach(($b) => {
    $b.onclick = () => { ui.sel = []; redraw(); };
  });
  el.querySelectorAll('[data-buy]').forEach(($c) => {
    $c.onclick = () => {
      const [tier, slot] = $c.dataset.buy.split(':').map(Number);
      pick({ kind: 'buy', tier, slot });
    };
  });
  el.querySelectorAll('[data-buyres]').forEach(($c) => {
    $c.onclick = () => pick({ kind: 'buy', reserved: Number($c.dataset.buyres) });
  });
  el.querySelectorAll('[data-reserve]').forEach(($b) => {
    $b.onclick = (e) => {
      e.stopPropagation();
      const [tier, slot] = $b.dataset.reserve.split(':').map(Number);
      pick({ kind: 'reserve', tier, slot });
    };
  });
  el.querySelectorAll('[data-blind]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'reserve', tier: Number($b.dataset.blind), slot: -1 });
  });
  el.querySelectorAll('[data-discard]').forEach(($c) => {
    $c.onclick = () => pick({ kind: 'discard', color: Number($c.dataset.discard) });
  });
  el.querySelectorAll('[data-noble]').forEach(($n) => {
    $n.onclick = () => pick({ kind: 'noble', idx: Number($n.dataset.noble) });
  });
}

// commit 提交动作并清空选择
function commit(a) {
  const { pick } = ctx;
  ui.sel = [];
  pick(a);
}

// redraw 局部重绘（选择态变化，不产生新动作）
function redraw() {
  const { el, s, legal, pick } = ctx;
  renderBoard(el, s, legal, pick);
}
