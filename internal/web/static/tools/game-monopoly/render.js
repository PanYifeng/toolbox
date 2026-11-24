// 大富翁渲染层：renderBoard(el, state, legal, pick) 全量重绘 + 事件委托。
// 结构：提示行 → 11×11 标准棋盘（外圈 40 格 + 中央骰子与操作区）→ 玩家信息
//   → 操作面板（购买 / 竞拍 / 负债变现 / 交易裁决 / 掷骰与经营）→ 交易表单。
// 交互：点格查看地产详情（选中态），经营动作按合法动作渲染按钮，交易用表单组包。
import { t, getLang } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { isViewerSeat } from '/core/seat-view.js';
import { okHint, noHint, renderActionHints } from '/core/action-hints.js';
import { SPACES, GROUP_COLORS, isOwnable } from './data-board.js';
import { ownerOf, unmortgageCost, buildCost } from './rules.js';
import { rentalHint } from './rules-view.js';

const GRID = 11; // 11×11 外圈 = 40 格
const JAIL_FINE = 50;

// ui 跨重绘保留的界面状态（选中格、交易表单草稿）
let ui = { sel: -1, stamp: '', trade: null };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// —— 坐标映射：标准美式棋盘（起点右下角，逆时针外圈）——

// cellPos 格下标 → {row, col}（1 起始）
export function cellPos(i) {
  if (i === 0) return { row: GRID, col: GRID };
  if (i === 10) return { row: GRID, col: 1 };
  if (i === 20) return { row: 1, col: 1 };
  if (i === 30) return { row: 1, col: GRID };
  if (i < 10) return { row: GRID, col: GRID - i };
  if (i < 20) return { row: GRID - (i - 10), col: 1 };
  if (i < 30) return { row: 1, col: i - 19 };
  return { row: i - 29, col: GRID };
}

// —— 棋盘 ——

// renderBoard 全量重绘入口
export function renderBoard(el, s, legal, pick) {
  const stamp = `${s.turn}|${s.phase}|${s.pending ? s.pending.kind : ''}|${curSeat(s)}`;
  if (stamp !== ui.stamp) { ui.stamp = stamp; if (ui.sel >= 0 && ownerOf(s, ui.sel) !== curSeat(s)) ui.sel = -1; }
  el.innerHTML = `
    <div class="mo-prompt" data-bg-focus>${promptHtml(s, legal)}</div>
    ${boardHtml(s)}
    ${playersHtml(s)}
    ${actionPanelHtml(s, legal)}`;
  wire(el, s, legal, pick);
}

// curSeat 当前待决策座位
function curSeat(s) {
  if (s.pending) return s.pending.kind === 'auction' ? s.pending.turnSeat : s.pending.seat;
  return s.cur;
}

// promptHtml 提示行
function promptHtml(s, legal) {
  const seat = curSeat(s);
  const p = s.players[seat];
  if (s.gameOver) {
    const w = s.result && s.result.winner >= 0 ? s.players[s.result.winner] : null;
    return `🏁 ${w ? fmt(t('mo.ui.gameOver'), { n: esc(w.name) }) : t('mo.ui.gameOverNoWinner')}`;
  }
  const ai = p.isAI ? '🤖 ' : '';
  const stage = stageLabel(s);
  return `<b>${ai}${esc(p.name)}</b> — ${stage}${hintsHtml(s, legal, p)}`;
}

// stageLabel 阶段文案
function stageLabel(s) {
  const pd = s.pending;
  if (pd) {
    const m = {
      buy: 'mo.ui.promptBuy', auction: 'mo.ui.promptAuction', debt: 'mo.ui.promptDebt',
      tradeRespond: 'mo.ui.promptTrade',
    };
    return m[pd.kind] ? t(m[pd.kind]) : '';
  }
  if (s.phase === 'roll') return s.players[s.cur].inJail ? t('mo.ui.promptJail') : t('mo.ui.promptRoll');
  return t('mo.ui.promptManage');
}

// hintsHtml 操作提示条
// 视角口径：提示条列的是「我这一手能做什么」，只有坐在屏幕前的人看才有意义
function hintsHtml(s, legal, p) {
  if (!isViewerSeat(p.seat)) return '';
  const items = [];
  const count = (k) => legal.filter((a) => a.kind === k).length;
  if (count('roll')) items.push(okHint('🎲', t('mo.ui.roll'), 1));
  if (p.inJail) {
    if (count('payJailFine')) items.push(okHint('💰', t('mo.ui.payFine'), 1, `$${JAIL_FINE}`));
    else items.push(noHint('💰', t('mo.ui.payFine'), t('mo.ui.noCash')));
    if (count('useJailCard')) items.push(okHint('🔑', t('mo.ui.useCard'), 1));
  }
  if (count('build')) items.push(okHint('🏠', t('mo.ui.build'), count('build')));
  if (count('mortgage')) items.push(okHint('🏦', t('mo.ui.mortgage'), count('mortgage')));
  if (count('unmortgage')) items.push(okHint('💵', t('mo.ui.unmortgage'), count('unmortgage')));
  if (count('endTurn')) items.push(okHint('➡️', t('mo.ui.endTurn'), 1));
  return renderActionHints(items);
}

// boardHtml 11×11 棋盘
function boardHtml(s) {
  const cells = SPACES.map((sp) => cellHtml(s, sp)).join('');
  return `<div class="mo-board">${cells}
    <div class="mo-center">${centerHtml(s)}</div></div>`;
}

// centerHtml 中央：骰子 + 当前玩家挂牌
function centerHtml(s) {
  const dice = s.dice ? `<div class="mo-dice"><span>${s.dice[0]}</span><span>${s.dice[1]}</span></div>` : '';
  const turn = s.players[curSeat(s)];
  return `<div class="mo-turn" style="--pc:${turn.color}">
      <span class="bg-dot" style="background:${turn.color}"></span>
      <b>${esc(turn.name)}</b>${turn.isAI ? ' 🤖' : ''}
    </div>
    ${dice}
    <div class="mo-center-note">${s.dice ? `🎲 ${s.dice[0]} + ${s.dice[1]} = ${s.dice[0] + s.dice[1]}` : t('mo.ui.rollToStart')}</div>`;
}

// cellHtml 单格：可购买格显示色条 / 名称 / 价格 / 持有者 / 房屋
function cellHtml(s, sp) {
  const { row, col } = cellPos(sp.i);
  const cls = ['mo-cell', `mo-${sp.type}`];
  const owner = isOwnable(sp.i) ? ownerOf(s, sp.i) : -1;
  if (ui.sel === sp.i) cls.push('mo-sel');
  if (isOwnable(sp.i) && owner < 0) cls.push('mo-unowned');
  if (owner >= 0) cls.push('mo-owned');
  const style = `grid-row:${row};grid-column:${col};--pc:${owner >= 0 ? s.players[owner].color : 'transparent'}`;
  return `<div class="${cls.join(' ')}" style="${style}" data-cell="${sp.i}">${cellInner(s, sp, owner)}</div>`;
}

// cellInner 格内容
function cellInner(s, sp, owner) {
  const lang = getLang();
  const name = sp.short[lang] || sp.short.zh;
  const bar = colorBar(sp);
  const tokens = tokensHtml(s, sp.i);
  const top = `<div class="mo-cell-name">${esc(name)}</div>`;
  const bottom = `<div class="mo-cell-foot">${priceHtml(sp)}${housesHtml(s, sp.i)}</div>`;
  return `${bar}${top}${bottom}${tokens}`;
}

// colorBar 色组色条（地产）/ 类型图标（铁路、公用事业、特殊格）
function colorBar(sp) {
  if (sp.type === 'prop') return `<div class="mo-bar" style="background:${GROUP_COLORS[sp.group]}"></div>`;
  if (sp.type === 'rail') return `<div class="mo-icon">🚂</div>`;
  if (sp.type === 'util') return `<div class="mo-icon">${sp.i === 12 ? '💡' : '🚰'}</div>`;
  const icons = {
    go: '🟢', jail: '🚔', free: '🅿️', gotojail: '👮', chance: '❓', cc: '🎁', tax: '💸', luxury: '💎',
  };
  return `<div class="mo-icon">${icons[sp.type] || ''}</div>`;
}

// priceHtml 价格（无主时显示，有人持有则显示持有标记）
function priceHtml(sp) {
  if (!isOwnable(sp.i)) return '';
  return `<span class="mo-price">$${sp.price}</span>`;
}

// housesHtml 房屋/旅馆与抵押标记
function housesHtml(s, i) {
  const h = s.houses[i] || 0;
  const parts = [];
  if (h === 5) parts.push('<span class="mo-hotel">🏨</span>');
  else if (h > 0) parts.push(`<span class="mo-house">${'🏠'.repeat(h)}</span>`);
  if (s.mortgaged[i]) parts.push('<span class="mo-mort">M</span>');
  return parts.join('');
}

// tokensHtml 该格上的玩家棋子
function tokensHtml(s, i) {
  const here = s.players.filter((p) => p.pos === i && !p.bankrupt);
  if (!here.length) return '';
  return `<div class="mo-tokens">${here.map((p) => `<span class="mo-token" style="background:${p.color}" title="${esc(p.name)}"></span>`).join('')}</div>`;
}

// —— 玩家信息 ——

// playersHtml 玩家条：现金 / 位置 / 监狱 / 资产数
function playersHtml(s) {
  const rows = s.players.map((p) => {
    const cls = `mo-player${p.seat === curSeat(s) ? ' mo-player-cur' : ''}${p.bankrupt ? ' mo-player-out' : ''}`;
    const jail = p.inJail ? ` · 🚔 ${p.jailTurns}/3` : '';
    const card = p.jailCardIds.length ? ' · 🔑' : '';
    return `<div class="${cls}" style="--pc:${p.color}">
      <span class="mo-phead"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}</span>
      <span class="mo-pcash">$${p.bankrupt ? 0 : p.cash}</span>
      <span class="mo-pmeta">${esc(SPACES[p.pos].short[getLang()] || '')}${jail}${card}</span>
    </div>`;
  });
  return `<div class="mo-players">${rows.join('')}</div>`;
}

// —— 操作面板 ——

// actionPanelHtml 按微阶段分发操作面板
// 操作权口径：只有坐在屏幕前的人（热座当前人类 / 联机本人座位）才拿到可点面板，
// 否则远端人类或 AI 的回合也会摊出一排按钮，点了提交不上去还会误导旁观者。
function actionPanelHtml(s, legal) {
  if (s.gameOver) return resultHtml(s);
  if (!isViewerSeat(curSeat(s))) return waitPanelHtml(s);
  const pd = s.pending;
  if (pd && pd.kind === 'buy') return buyPanel(s, legal, pd);
  if (pd && pd.kind === 'auction') return auctionPanel(s, legal, pd);
  if (pd && pd.kind === 'debt') return debtPanel(s, legal, pd);
  if (pd && pd.kind === 'tradeRespond') return tradeRespondPanel(s, legal, pd);
  return managePanel(s, legal);
}

// waitPanelHtml 非本人回合的只读占位：明说「等谁」，不留任何可点控件
function waitPanelHtml(s) {
  const p = s.players[curSeat(s)];
  return `<div class="mo-actions mo-wait"><span class="muted">⏳ ${esc(p.name)}${p.isAI ? ' 🤖' : ''} ${t('mo.ui.waitTurn')}</span></div>`;
}

// propCard 地产详情卡
function propCard(s, i) {
  const sp = SPACES[i];
  const lang = getLang();
  const owner = ownerOf(s, i);
  const ownerTxt = owner >= 0 ? `${t('mo.ui.owner')}: ${esc(s.players[owner].name)}` : t('mo.ui.noOwner');
  return `<div class="mo-card-info">
    <b>${esc(sp.name[lang] || sp.name.zh)}</b>
    <span>${sp.price ? `$${sp.price}` : ''} · ${ownerTxt}</span>
    <span class="mo-rent-hint">${rentalHint(s, i)}</span>
  </div>`;
}

// buyPanel 购买询问
function buyPanel(s, legal, pd) {
  const canBuy = legal.some((a) => a.kind === 'buy');
  return `<div class="mo-actions">
    ${propCard(s, pd.i)}
    ${canBuy ? `<button class="mo-go" data-act="buy">${t('mo.ui.buyBtn')} $${SPACES[pd.i].price}</button>` : ''}
    <button class="btn-soft" data-act="declineBuy">${canBuy ? t('mo.ui.declineBuy') : t('mo.ui.auctionIt')}</button>
  </div>`;
}

// auctionPanel 竞拍面板
function auctionPanel(s, legal, pd) {
  const p = s.players[pd.turnSeat];
  const high = pd.high > 0
    ? fmt(t('mo.ui.highBid'), { a: pd.high, n: esc(s.players[pd.highSeat].name) })
    : t('mo.ui.noBid');
  const bids = legal.filter((a) => a.kind === 'bid').map((a) =>
    `<button class="mo-bid" data-bid="${a.amount}">$${a.amount}</button>`).join('');
  return `<div class="mo-actions">
    ${propCard(s, pd.i)}
    <span class="mo-actions-label">${high} · ${esc(p.name)} ${t('mo.ui.yourBid')} ($${p.cash})</span>
    <div class="mo-bidrow">${bids || `<span class="muted">${t('mo.ui.cannotBid')}</span>`}
      <button class="btn-soft" data-act="bidPass">${t('mo.ui.bidPass')}</button></div>
  </div>`;
}

// debtPanel 负债变现面板
function debtPanel(s, legal, pd) {
  const p = s.players[pd.seat];
  const cred = pd.creditor >= 0 ? s.players[pd.creditor].name : t('mo.ui.bank');
  const canPay = legal.some((a) => a.kind === 'payDebt');
  return `<div class="mo-actions mo-danger">
    <span class="mo-actions-label">${fmt(t('mo.ui.debtTitle'), { a: pd.amount, m: esc(cred) })} · ${t('mo.ui.cash')}: $${p.cash}</span>
    ${canPay ? `<button class="mo-go" data-act="payDebt">${t('mo.ui.payDebt')}</button>` : `<span class="dd-bad">${t('mo.ui.needLiquidate')}</span>`}
    <button class="btn-soft" data-act="bankrupt">${t('mo.ui.bankrupt')}</button>
    ${ownedActionsHtml(s, legal, pd.seat)}
  </div>`;
}

// tradeRespondPanel 交易裁决面板
function tradeRespondPanel(s, legal, pd) {
  const g = sideText(s, pd.give);
  const w = sideText(s, pd.get);
  return `<div class="mo-actions">
    <span class="mo-actions-label">${fmt(t('mo.ui.tradeFrom'), { n: esc(s.players[pd.from].name) })}</span>
    <div class="mo-trade-summary"><span>${t('mo.ui.youGet')}: <b>${g}</b></span><span>${t('mo.ui.youGive')}: <b>${w}</b></span></div>
    <button class="mo-go" data-act="tradeAccept">${t('mo.ui.accept')}</button>
    <button class="btn-soft" data-act="tradeDecline">${t('mo.ui.decline')}</button>
  </div>`;
}

// sideText 交易一侧的内容文本
function sideText(s, side) {
  const lang = getLang();
  const names = side.props.map((i) => SPACES[i].short[lang] || SPACES[i].short.zh);
  if (side.cash > 0) names.push(`$${side.cash}`);
  return esc(names.join(' + ') || t('mo.ui.nothing'));
}

// managePanel 常规操作面板：掷骰/出狱/结束回合 + 自有地产经营 + 交易
function managePanel(s, legal) {
  const p = s.players[s.cur];
  return `<div class="mo-actions">
    ${rollButtons(s, legal, p)}
    ${ownedActionsHtml(s, legal, s.cur)}
    ${tradeEntryHtml(s)}
  </div>`;
}

// rollButtons 掷骰/出狱/结束回合按钮
function rollButtons(s, legal, p) {
  const out = [];
  if (legal.some((a) => a.kind === 'roll')) out.push(`<button class="mo-go" data-act="roll">🎲 ${t('mo.ui.roll')}</button>`);
  if (legal.some((a) => a.kind === 'useJailCard')) out.push(`<button class="btn-soft" data-act="useJailCard">🔑 ${t('mo.ui.useCard')}</button>`);
  if (legal.some((a) => a.kind === 'payJailFine')) out.push(`<button class="btn-soft" data-act="payJailFine">💰 ${t('mo.ui.payFine')} $${JAIL_FINE}</button>`);
  if (legal.some((a) => a.kind === 'endTurn')) out.push(`<button class="mo-go" data-act="endTurn">➡️ ${t('mo.ui.endTurn')}</button>`);
  return out.join('');
}

// ownedActionsHtml 自有地产逐项操作（建房/拆屋/抵押/赎回）
function ownedActionsHtml(s, legal, seat) {
  const owned = legal.filter((a) => ['build', 'sellHouse', 'mortgage', 'unmortgage'].includes(a.kind));
  if (!owned.length) return '';
  const byProp = new Map();
  for (const a of owned) {
    if (!byProp.has(a.i)) byProp.set(a.i, []);
    byProp.get(a.i).push(a);
  }
  const rows = [...byProp.entries()].map(([i, acts]) => propRow(s, i, acts)).join('');
  return `<div class="mo-manage">${rows}</div>`;
}

// propRow 单块地产的操作行
function propRow(s, i, acts) {
  const sp = SPACES[i];
  const lang = getLang();
  const h = s.houses[i] || 0;
  const stateTxt = h === 5 ? '🏨' : h > 0 ? `🏠×${h}` : '';
  const mort = s.mortgaged[i] ? ` <span class="mo-mort">${t('mo.ui.mortgaged')}</span>` : '';
  const btns = acts.map((a) => `<button class="${a.kind === 'build' ? 'mo-go' : 'mo-mini'}" data-prop="${i}" data-act="${a.kind}">${actLabel(a)}</button>`).join('');
  return `<div class="mo-prow" style="--pc:${GROUP_COLORS[sp.group] || 'var(--border)'}">
    <span class="mo-pname">${esc(sp.short[lang] || sp.short.zh)} ${stateTxt}${mort}</span>${btns}</div>`;
}

// actLabel 经营按钮文案
function actLabel(a) {
  if (a.kind === 'build') return `${t('mo.ui.build')} $${buildCost(a.i)}`;
  if (a.kind === 'sellHouse') return t('mo.ui.sellHouse');
  if (a.kind === 'mortgage') return `${t('mo.ui.mortgage')} +$${SPACES[a.i].mortgage}`;
  return `${t('mo.ui.unmortgage')} $${unmortgageCost(a.i)}`;
}

// tradeEntryHtml 交易表单入口（无可交易对象时隐藏）
function tradeEntryHtml(s) {
  const others = s.players.filter((p) => p.seat !== s.cur && !p.bankrupt);
  if (!others.length) return '';
  return `<div class="mo-trade-wrap">
    <button class="btn-soft" data-act="tradeOpen">🤝 ${t('mo.ui.trade')}</button>
    ${ui.trade ? tradeBuilderHtml(s, others) : ''}</div>`;
}

// tradeBuilderHtml 交易组包表单（give = 我方让出，get = 对方让出）
function tradeBuilderHtml(s, others) {
  const tr = ui.trade;
  const toSel = others.map((p) => `<option value="${p.seat}"${p.seat === tr.to ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  return `<div class="mo-trade-form">
    <label>${t('mo.ui.tradeWith')} <select data-trade="to">${toSel}</select></label>
    ${tradeSideHtml(s, s.cur, 'give', t('mo.ui.youGive'))}
    ${tradeSideHtml(s, tr.to, 'get', t('mo.ui.youGet'))}
    <div class="mo-trade-btns">
      <button class="mo-go" data-act="tradeSend">${t('mo.ui.propose')}</button>
      <button class="mo-mini" data-act="tradeClose">${t('mo.ui.cancel')}</button>
    </div>
  </div>`;
}

// tradeSideHtml 一侧的可选资产（地产复选框 + 现金输入）；无房屋的地产才可转让
function tradeSideHtml(s, seat, key, label) {
  const lang = getLang();
  const mine = Object.keys(s.owner).filter((k) => s.owner[k] === seat).map(Number)
    .filter((i) => (s.houses[i] || 0) === 0);
  const cur = ui.trade[key] || { props: [], cash: 0 };
  const boxes = mine.map((i) => `<label class="mo-chk">
      <input type="checkbox" data-side="${key}" data-prop="${i}"${cur.props.includes(i) ? ' checked' : ''}>
      ${esc(SPACES[i].short[lang] || '')}</label>`).join('');
  return `<div class="mo-side"><span class="mo-side-label">${label}</span>
    <div class="mo-side-props">${boxes || `<span class="muted">${t('mo.ui.noProps')}</span>`}</div>
    <input type="number" min="0" step="10" class="mo-cash" data-side-cash="${key}" value="${cur.cash}"></div>`;
}

// resultHtml 终局结果
function resultHtml(s) {
  const rows = s.players.map((p) => `<span class="mo-res-row">${esc(p.name)}: ${p.bankrupt ? t('mo.ui.bankruptTag') : `$${p.cash}`}</span>`).join('');
  return `<div class="mo-actions mo-result"><b>${t('mo.ui.finished')}</b>${rows}</div>`;
}

// —— 事件 ——

// wire 事件委托：点格选中 / 按钮 / 表单
function wire(el, s, legal, pick) {
  el.querySelectorAll('[data-cell]').forEach(($c) => {
    $c.onclick = () => { ui.sel = Number($c.dataset.cell); renderBoard(el, s, legal, pick); };
  });
  el.querySelectorAll('button[data-act]').forEach(($b) => {
    $b.onclick = () => onClickBtn($b, s, legal, pick, el);
  });
  el.querySelectorAll('button[data-bid]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'bid', amount: Number($b.dataset.bid) });
  });
  wireTradeForm(el, s, legal, pick);
}

// onClickBtn 按钮动作分发
function onClickBtn($b, s, legal, pick, el) {
  const act = $b.dataset.act;
  if (act === 'tradeOpen') { ui.trade = { to: firstOther(s), give: { props: [], cash: 0 }, get: { props: [], cash: 0 } }; renderBoard(el, s, legal, pick); return; }
  if (act === 'tradeClose') { ui.trade = null; renderBoard(el, s, legal, pick); return; }
  if (act === 'tradeSend') { sendTrade(s, pick); return; }
  const i = $b.dataset.prop !== undefined ? Number($b.dataset.prop) : undefined;
  const simple = ['roll', 'endTurn', 'payJailFine', 'useJailCard', 'buy', 'declineBuy', 'bidPass',
    'payDebt', 'bankrupt', 'tradeAccept', 'tradeDecline'];
  if (simple.includes(act)) { pick(i === undefined ? { kind: act } : { kind: act, i }); return; }
  if (['build', 'sellHouse', 'mortgage', 'unmortgage'].includes(act)) pick({ kind: act, i });
}

// firstOther 第一个可交易的对手座位
function firstOther(s) {
  const o = s.players.find((p) => p.seat !== s.cur && !p.bankrupt);
  return o ? o.seat : -1;
}

// wireTradeForm 交易表单变更与提交
function wireTradeForm(el, s, legal, pick) {
  const $to = el.querySelector('select[data-trade="to"]');
  if ($to) $to.onchange = () => { ui.trade.to = Number($to.value); renderBoard(el, s, legal, pick); };
  el.querySelectorAll('input[data-side]').forEach(($c) => {
    $c.onchange = () => updateSide($c.dataset.side, Number($c.dataset.prop), $c.checked);
  });
  el.querySelectorAll('input[data-side-cash]').forEach(($c) => {
    $c.onchange = () => updateCash($c.dataset.sideCash, Number($c.value));
  });
}

// updateSide 勾选/取消一侧的地产
function updateSide(key, i, on) {
  if (!ui.trade) return;
  const list = ui.trade[key].props;
  const at = list.indexOf(i);
  if (on && at < 0) list.push(i);
  if (!on && at >= 0) list.splice(at, 1);
}

// updateCash 更新一侧的现金数额
function updateCash(key, v) {
  if (!ui.trade) return;
  ui.trade[key].cash = Number.isFinite(v) && v > 0 ? v : 0;
}

// sendTrade 提交交易提案
function sendTrade(s, pick) {
  if (!ui.trade) return;
  const action = {
    kind: 'trade', to: ui.trade.to,
    give: { props: ui.trade.give.props, cash: ui.trade.give.cash },
    get: { props: ui.trade.get.props, cash: ui.trade.get.cash },
  };
  ui.trade = null;
  pick(action);
}
