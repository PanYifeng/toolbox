// 璀璨宝石渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 贵族行 + 宝石供应 + 三阶牌市（牌堆 + 4 明牌）+ 玩家面板（宝石/折扣/预留/贵族）。
// 微阶段：弃宝石时己方面板宝石可点；择贵族时贵族牌可点。
import { t } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { isViewerSeat } from '/core/seat-view.js';
import { noHint, okHint, renderActionHints } from '/core/action-hints.js';
import { CARDS, NOBLES, MARKET_SLOTS, RESERVE_CAP, GEM_CAP, VP_TO_END } from './data-cards.js';

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
  // 操作权口径：只有本人的回合/微阶段才给可点交互（旧的 !isAI 在联机里会把
  // 远端人类的回合也做成可点，点了也提交不上去，还会误导旁观者）
  const pendingDiscard = s.pending && s.pending.kind === 'discard' && isViewerSeat(s.pending.seat);
  const pendingNoble = s.pending && s.pending.kind === 'noble' && isViewerSeat(s.pending.seat);
  const humanMain = !s.pending && isViewerSeat(s.cur);
  if (!humanMain) ui.sel = [];
  // 可点集合也按视角收口：非本人回合一律不给可点高亮，避免误导（牌市本身是公开信息）
  const buySet = new Set((humanMain ? legal.filter((a) => a.kind === 'buy' && a.reserved === undefined) : [])
    .map((a) => `${a.tier}:${a.slot}`));
  const resSet = new Set((humanMain ? legal.filter((a) => a.kind === 'reserve' && a.slot >= 0) : [])
    .map((a) => `${a.tier}:${a.slot}`));
  const blindSet = new Set((humanMain ? legal.filter((a) => a.kind === 'reserve' && a.slot < 0) : [])
    .map((a) => a.tier));
  const resBuyIdx = new Set(legal.filter((a) => a.kind === 'buy' && a.reserved !== undefined)
    .map((a) => a.reserved));

  el.innerHTML = `
    <div class="sl-prompt" data-bg-focus>${promptHtml(s, pendingDiscard, pendingNoble)}</div>
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
          ${humanMain ? take2RowHtml(s) : ''}
          ${ui.sel.length && humanMain ? '<button class="sl-selclear" data-selclear>✕</button>' : ''}
        </div>
        ${[0, 1, 2].map((tier) => marketRowHtml(s, tier, buySet, resSet, blindSet)).join('')}
      </div>
      <div class="sl-players">${s.players.map((p, i) => playerHtml(s, p, i, pendingDiscard && s.pending.seat === i, resBuyIdx)).join('')}</div>
    </div>`;

  wireEvents(el, pick);
}

// promptHtml 阶段提示行（本人视角时附拿宝石操作提示）
function promptHtml(s, pendingDiscard, pendingNoble) {
  const humanMain = !s.pending && isViewerSeat(s.cur);
  if (pendingDiscard) return `⚠️ ${t('sl.ui.prompt.discard')}${pendingHints(s, 'discard')}`;
  if (pendingNoble) return `👑 ${t('sl.ui.prompt.noble')}${pendingHints(s, 'noble')}`;
  const p = s.players[s.cur];
  const hint = humanMain ? ` <span class="sl-hint">💎 ${t('sl.ui.prompt.takeHint')}</span>` : '';
  const chips = humanMain ? renderActionHints(mainHints(s)) : '';
  // 终局已触发：其余玩家各剩最后一回合，必须明示（原先成品触发后全无提示）
  const last = s.endTrigger !== null && s.endTrigger !== undefined
    ? `<div class="sl-lastround">🏁 ${fmt(t('sl.ui.lastRound'), { n: s.players[s.endTrigger].name })}</div>` : '';
  return `${last}${p.isAI ? '🤖 ' : ''}<b>${esc(p.name)}</b> — ${t('sl.ui.prompt.act')}${hint}${chips}`;
}

// pendingHints 微阶段提示：弃宝石还需弃几颗 / 可选贵族数（提示条与其他阶段同构）
function pendingHints(s, kind) {
  if (kind === 'discard') {
    const p = s.players[s.pending.seat];
    const over = p.gold + p.gems.reduce((a, b) => a + b, 0) - GEM_CAP;
    return renderActionHints([okHint('💎', t('sl.ui.hintDiscard'), Math.max(0, over))]);
  }
  return renderActionHints([okHint('👑', t('sl.ui.hintNoble'), s.pending.options.length)]);
}

// mainHints 主行动提示：拿 3 色 / 拿 2 同色 / 预留 / 买卡 四项的可做性与原因
function mainHints(s) {
  const p = s.players[s.cur];
  const avail = s.supply.gems.map((n, i) => (n > 0 ? i : -1)).filter((i) => i >= 0);
  const take2Cols = avail.filter((c) => s.supply.gems[c] >= 4);
  const buyable = buyCount(s, p);
  return [
    avail.length
      ? okHint('💎', t('sl.ui.hintTake3'), Math.min(3, avail.length))
      : noHint('💎', t('sl.ui.hintTake3'), t('sl.ui.hintSupplyEmpty')),
    take2Cols.length
      ? okHint('💎', t('sl.ui.hintTake2'), take2Cols.length)
      : noHint('💎', t('sl.ui.hintTake2'), t('sl.ui.hintTake2Why')),
    p.reserved.length < RESERVE_CAP
      ? okHint('🔒', t('sl.ui.hintReserve'), RESERVE_CAP - p.reserved.length)
      : noHint('🔒', t('sl.ui.hintReserve'), t('sl.ui.hintReserveFull')),
    buyable > 0
      ? okHint('🛒', t('sl.ui.hintBuy'), buyable)
      : noHint('🛒', t('sl.ui.hintBuy'), t('sl.ui.hintBuyWhy')),
  ];
}

// buyCount 当前买得起的卡数（明牌 + 预留），与引擎 canAfford 同口径
function buyCount(s, p) {
  let n = 0;
  for (let t = 0; t < 3; t++) {
    for (let k = 0; k < MARKET_SLOTS; k++) {
      const cid = s.market[t][k];
      if (cid !== null && affordable(p, cid)) n++;
    }
  }
  for (const cid of p.reserved) if (affordable(p, cid)) n++;
  return n;
}

// affordable 宝石+金+折扣是否够付卡价（复刻引擎 canAfford，金可替代任一色）
function affordable(p, cid) {
  const cost = CARDS[cid][3];
  let need = 0;
  for (let i = 0; i < 5; i++) need += Math.max(0, cost[i] - p.bonus[i] - p.gems[i]);
  return need <= p.gold;
}

// take2RowHtml 同色拿 2 快捷按钮行（供应 ≥4 时才有合法 take2；点即提交）
function take2RowHtml(s) {
  const acts = ctx.legal.filter((a) => a.kind === 'take2');
  if (!acts.length) return '';
  const btns = acts.map((a) => {
    const c = GEM_COLOR[a.color];
    const ring = a.color === 0 || a.color === 4;
    return `<button class="sl-take2btn" data-take2="${a.color}">${dot(c, ring)}×2</button>`;
  }).join('');
  return `<div class="sl-take2row">${btns}</div>`;
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
// vpGoalHtml 距 15 分触发终局还差几分（一次可达即高亮，让玩家知道自己的收尾节奏）
function vpGoalHtml(p) {
  const left = VP_TO_END - p.vp;
  if (left <= 0) return `<i class="sl-vpdone">✔ ${t('sl.ui.vpDone')}</i>`;
  return `<i class="sl-vpleft">${fmt(t('sl.ui.vpLeft'), { n: left })}</i>`;
}

// boughtTip 平局判据提示：同分时购卡数少者胜，故这一项需要一直可见
function boughtTip(p) {
  return `<i class="sl-pbought" title="${t('sl.ui.tieBreakTip')}">🛒${p.bought}</i>`;
}

function playerHtml(s, p, seatIdx, pendingDiscard, resBuyIdx) {
  const isCur = seatIdx === s.cur;
  const chips = p.gems.map((n, i) => gemChip(i, n, false, pendingDiscard, i)).join('')
    + gemChip(-1, p.gold, false, pendingDiscard, -1);
  const bonus = p.bonus.map((n, i) => n > 0
    ? `<span class="sl-bonus" style="background:${GEM_COLOR[i]};color:${i === 0 ? '#333' : '#fff'};${i === 0 || i === 4 ? 'box-shadow:0 0 0 1.5px var(--border);' : ''}">${n}</span>`
    : '').join('');
  // 预留牌是隐藏信息（官方规则：手牌不对他人公开，盲留尤其如此）：
  // 只有本人视角看得到牌面，其他人只看到牌背与张数
  const ownView = isViewerSeat(seatIdx);
  const reserved = p.reserved.map((cid, i) => {
    if (!ownView) return '<div class="sl-card sl-card-res sl-card-back"></div>';
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
        <span class="sl-pvp"><b>${p.vp}</b> VP ${nobleBadges}${vpGoalHtml(p)}${boughtTip(p)}</span>
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
  el.querySelectorAll('[data-take2]').forEach(($b) => {
    $b.onclick = () => {
      const a = ctx.legal.find((x) => x.kind === 'take2' && x.color === Number($b.dataset.take2));
      if (a) commit(a);
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
