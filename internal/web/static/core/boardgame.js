// 热座桌游框架：座位配置、回合横幅、AI 循环、行动日志、付费悔棋、隐私交接、终局结算。
// 游戏以 adapter 对象接入 mountBoardGame(el, game)，契约：
//   game = {
//     id, name:{zh,en}, minPlayers, maxPlayers, needsPrivacy, colors[],
//     initialState(setup) -> state,        // setup = {seats:[{name,isAI,color}], extras, seed}
//                                         // 必须把 seats 嵌入 state.players[i] = {seat,name,isAI,color,...}
//     legalActions(state) -> action[],    // 唯一合法性来源，UI 高亮由此驱动
//     apply(state, action) -> state,      // 不改入参；内部深拷贝；追加 state.log 条目 {seat,key,args}
//     currentPlayer(state) -> seatIdx,    // 当前待决策座位（微阶段也精确到人）
//     isGameOver(state) -> bool, score(state) -> [{seat,total,breakdown:[[i18nKey,val],...]}]
//     bot(state, legalActions) -> action, // 同步启发式；AI 座位由框架驱动
//     renderBoard(el, state, legal, pick),// 游戏自绘全部面板；人类点击 → pick(action)
//     setupOptions?(el, ctx) -> extras,   // 可选：游戏专属开局项（人数变化与开局时会重新调用）
//   }
// 引擎纯函数、state 必须 JSON-safe 且零 DOM/i18n 依赖（node 可直接 import 自测）。
// 随机数入 state（state.rng），框架只透传 seed，保证悔棋/存档确定性。
import { t, tr } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';
import { requestPaidUndo } from '/core/pay-undo.js';

const AI_DELAY = 550;      // AI 行动基础延迟（ms），营造思考节奏
const AI_JITTER = 350;     // AI 行动随机抖动上限
const HISTORY_CAP = 240;   // 悔棋快照栈上限，防超长对局内存膨胀
const UNDO_FEE = 5;        // 悔棋价格（元/次），与象棋等现有游戏一致

// fmt 模板插值：t() 不支持参数，日志/UI 用 {k} 占位自替换
export function fmt(template, args) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) =>
    args && args[k] !== undefined ? String(args[k]) : m);
}

// —— 存档（state JSON → localStorage，长对局刷新不丢）——

function saveKey(id) { return `bg-${id}-save`; }
function loadSave(id) {
  try { return JSON.parse(localStorage.getItem(saveKey(id)) || 'null'); } catch { return null; }
}
function writeSave(id, state, usedUndo) {
  try { localStorage.setItem(saveKey(id), JSON.stringify({ state, usedUndo })); } catch { /* 配额满静默放弃 */ }
}
function clearSave(id) { try { localStorage.removeItem(saveKey(id)); } catch { /* 忽略 */ } }

// mountBoardGame 唯一入口：负责 setup → play → results 三屏流转
export function mountBoardGame(el, game) {
  let session = null; // {state, history:[], usedUndo, reqId, lastHumanSeen}
  el.innerHTML = '<div class="bg-root"></div>';
  const $root = el.querySelector('.bg-root');
  const save = loadSave(game.id);
  if (save && save.state && !save.state.gameOver) offerResume();
  else renderSetup();

  // offerResume 有未完存档时先问一句
  function offerResume() {
    $root.innerHTML = `
      <div class="bg-setup">
        <h3>${tr(game.name)}</h3>
        <p class="muted">${t('bg.foundSave')}</p>
        <div class="bg-setup-actions">
          <button id="bg-resume" class="btn-soft">${t('bg.resume')}</button>
          <button id="bg-new">${t('bg.new')}</button>
        </div>
      </div>`;
    $root.querySelector('#bg-resume').onclick = () => startSession(save.state, [], !!save.usedUndo, false);
    $root.querySelector('#bg-new').onclick = renderSetup;
  }

  // renderSetup 座位配置屏：人数、姓名、人类/AI、游戏专属选项、随机种子
  function renderSetup() {
    $root.innerHTML = `
      <div class="bg-setup">
        <h3>${tr(game.name)}</h3>
        <div class="bg-setup-row">
          <label>${t('bg.players')}
            <select id="bg-count">${countOptions()}</select>
          </label>
          <label class="bg-seed">${t('bg.seed')}
            <input id="bg-seed" type="number" placeholder="${t('bg.seedPh')}">
          </label>
        </div>
        <div id="bg-seats"></div>
        <div id="bg-extras"></div>
        <button id="bg-start">${t('bg.start')}</button>
      </div>`;
    const $count = $root.querySelector('#bg-count');
    $count.onchange = () => { renderSeatRows(); renderExtras(); };
    $root.querySelector('#bg-start').onclick = onStart;
    renderSeatRows(); renderExtras();
  }

  function countOptions() {
    let html = '';
    for (let n = game.minPlayers; n <= game.maxPlayers; n++) html += `<option value="${n}">${n}</option>`;
    return html;
  }

  // renderSeatRows 每个座位：颜色点 + 姓名输入 + 人类/AI 切换
  function renderSeatRows() {
    const n = Number($root.querySelector('#bg-count').value);
    const $seats = $root.querySelector('#bg-seats');
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div class="bg-seat-row">
          <span class="bg-dot" style="background:${game.colors[i]}"></span>
          <input class="bg-name" maxlength="12" value="${t('bg.seat')} ${i + 1}" data-i="${i}">
          <button type="button" class="btn-soft bg-kind" data-i="${i}"></button>
        </div>`;
    }
    $seats.innerHTML = html;
    $seats.querySelectorAll('.bg-name').forEach(($inp) => { $inp.dataset.default = $inp.value; });
    $seats.querySelectorAll('.bg-kind').forEach(($btn) => {
      $btn.dataset.ai = '0';
      $btn.textContent = t('bg.human');
      $btn.onclick = () => {
        $btn.dataset.ai = $btn.dataset.ai === '0' ? '1' : '0';
        $btn.textContent = $btn.dataset.ai === '1' ? `🤖 ${t('bg.ai')}` : t('bg.human');
        $btn.classList.toggle('bg-kind-ai', $btn.dataset.ai === '1');
      };
    });
  }

  // renderExtras 调游戏的开局附加项（人数变化与开局时都会重新调用）
  function renderExtras() {
    const $ex = $root.querySelector('#bg-extras');
    if (!game.setupOptions) { $ex.innerHTML = ''; return; }
    const count = Number($root.querySelector('#bg-count').value);
    $ex.innerHTML = '';
    game.setupOptions($ex, { count });
  }

  // onStart 收集座位与附加项，调 initialState 开局
  function onStart() {
    const count = Number($root.querySelector('#bg-count').value);
    const seats = [];
    $root.querySelectorAll('.bg-seat-row').forEach(($row, i) => {
      const $name = $row.querySelector('.bg-name');
      const name = ($name.value.trim() || $name.dataset.default).slice(0, 12);
      seats.push({ name, isAI: $row.querySelector('.bg-kind').dataset.ai === '1', color: game.colors[i] });
    });
    const extras = game.setupOptions ? game.setupOptions($root.querySelector('#bg-extras'), { count }) : undefined;
    const seedIn = Number($root.querySelector('#bg-seed').value);
    const seed = Number.isFinite(seedIn) && seedIn > 0 ? Math.floor(seedIn) : Math.floor(Math.random() * 2 ** 31);
    const state = game.initialState({ seats, extras, seed });
    startSession(state, [], false, true);
  }

  // startSession 进入对局屏。fromSetup=false 表示从存档恢复（悔棋历史不恢复）
  function startSession(state, history, usedUndo, fromSetup) {
    if (fromSetup) clearSave(game.id);
    session = { state, history, usedUndo, reqId: 0, lastHumanSeen: null };
    $root.innerHTML = `
      <div class="game-bar">
        <span id="bg-banner" class="bg-banner"></span>
        <button id="bg-undo">${t('bg.undo')}</button>
        <button id="bg-newgame">${t('bg.new')}</button>
      </div>
      <div class="bg-layout">
        <div class="bg-main"><div id="bg-board"></div></div>
        <aside class="bg-side">
          <h4 class="bg-log-title">${t('bg.log')}</h4>
          <div id="bg-log" class="bg-log"></div>
        </aside>
      </div>
      <div id="bg-privacy" class="bg-overlay" style="display:none"></div>`;
    $root.querySelector('#bg-undo').onclick = onUndo;
    $root.querySelector('#bg-newgame').onclick = () => {
      if (session && !session.state.gameOver && !confirm(t('bg.confirmNew'))) return;
      clearSave(game.id); renderSetup();
    };
    refresh();
  }

  // pick 人类玩家经游戏 UI 提交行动的唯一入口
  function pick(action) {
    if (!session || session.state.gameOver) return;
    if (session.state.players[game.currentPlayer(session.state)].isAI) return;
    commit(action);
  }

  // commit 应用一个行动：快照入悔棋栈 → apply → 存档 → 刷新
  function commit(action) {
    session.history.push(JSON.stringify(session.state));
    if (session.history.length > HISTORY_CAP) session.history.shift();
    session.state = game.apply(session.state, action);
    writeSave(game.id, session.state, session.usedUndo);
    refresh();
  }

  // refresh 每次状态变化后的统一入口：结算 / 隐私交接 / 渲染 / AI 调度
  function refresh() {
    if (game.isGameOver(session.state)) { renderResults(); return; }
    updateBanner();
    if (needPrivacyGate()) return; // 遮罩确认后再继续渲染
    const legal = game.legalActions(session.state);
    game.renderBoard($root.querySelector('#bg-board'), session.state, legal, pick);
    renderLog();
    scheduleAI();
  }

  function updateBanner() {
    const seat = game.currentPlayer(session.state);
    const p = session.state.players[seat];
    $root.querySelector('#bg-banner').innerHTML =
      `<span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>` +
      (p.isAI ? ' 🤖' : '') + ` <span class="muted">· ${t('bg.turnOf')}</span>`;
  }

  // needPrivacyGate 隐藏手牌游戏（如农场主）在人类间换手时弹交接遮罩
  function needPrivacyGate() {
    if (!game.needsPrivacy) return false;
    const humans = session.state.players.filter((p) => !p.isAI).length;
    if (humans < 2) return false;
    const seat = game.currentPlayer(session.state);
    const p = session.state.players[seat];
    if (p.isAI || session.lastHumanSeen === seat) return false;
    const $ov = $root.querySelector('#bg-privacy');
    $ov.innerHTML = `
      <div class="bg-overlay-card">
        <h3>🔒 ${fmt(t('bg.passTo'), { n: esc(p.name) })}</h3>
        <button id="bg-ready">${fmt(t('bg.imReady'), { n: esc(p.name) })}</button>
      </div>`;
    $ov.style.display = 'flex';
    $ov.querySelector('#bg-ready').onclick = () => {
      session.lastHumanSeen = seat;
      $ov.style.display = 'none';
      refresh();
    };
    return true;
  }

  // scheduleAI 当前座位是 AI 时延迟行动；reqId 作废机制防旧回调落到新状态
  function scheduleAI() {
    const seat = game.currentPlayer(session.state);
    if (!session.state.players[seat].isAI) return;
    session.reqId++;
    const id = session.reqId;
    setTimeout(() => {
      if (!session || session.reqId !== id || session.state.gameOver) return;
      const legal = game.legalActions(session.state);
      if (!legal.length) return; // 引擎保证非终局必有合法动作，防御性兜底
      commit(game.bot(session.state, legal));
    }, AI_DELAY + Math.random() * AI_JITTER);
  }

  // renderLog 渲染行动日志（seat=-1 为系统条目），自动滚到底部
  function renderLog() {
    const $log = $root.querySelector('#bg-log');
    if (!$log) return;
    const log = session.state.log || [];
    $log.innerHTML = log.slice(-160).map((e) => {
      const pl = e.seat >= 0 && e.seat < session.state.players.length ? session.state.players[e.seat] : null;
      const dot = pl ? `<span class="bg-dot" style="background:${pl.color}"></span>` : '';
      return `<p>${dot}${esc(fmt(t(e.key), e.args))}</p>`;
    }).join('');
    $log.scrollTop = $log.scrollHeight;
  }

  // onUndo 付费悔棋：回退到最近一次人类待决策状态（>1 人类时先确认）
  async function onUndo() {
    if (!session || !session.history.length) return;
    const humans = session.state.players.filter((p) => !p.isAI).length;
    if (humans > 1 && !confirm(t('bg.confirmUndoMulti'))) return;
    const ok = await requestPaidUndo({ feature: `${tr(game.name)} ${t('bg.undo')}(${UNDO_FEE}元/次)`, amount: UNDO_FEE });
    if (!ok || !session) return;
    session.reqId++; // 作废在途 AI 回调
    let snap = session.history.pop();
    if (humans > 0) {
      // 连续回退直到轮到人类（跳过 AI 的行动）
      while (session.history.length) {
        const st = JSON.parse(snap);
        if (!st.players[game.currentPlayer(st)].isAI) break;
        snap = session.history.pop();
      }
    }
    session.state = JSON.parse(snap);
    session.usedUndo = true;
    session.lastHumanSeen = null;
    writeSave(game.id, session.state, session.usedUndo);
    refresh();
  }

  // renderResults 终局结算：排名 + 明细 + 纪念卡（按首位人类玩家分数）
  function renderResults() {
    const results = game.score(session.state)
      .map((r) => ({ ...r, name: session.state.players[r.seat].name, isAI: session.state.players[r.seat].isAI, color: session.state.players[r.seat].color }))
      .sort((a, b) => b.total - a.total || a.seat - b.seat);
    clearSave(game.id);
    $root.innerHTML = `
      <div class="bg-results">
        <h3>🏆 ${t('bg.gameOver')} — ${esc(results[0].name)} ${t('bg.winner')}</h3>
        ${results.map((r, i) => `
          <div class="bg-result-row">
            <div class="bg-result-head">
              <span class="bg-rank">${i + 1}</span>
              <span class="bg-dot" style="background:${r.color}"></span>
              <b>${esc(r.name)}</b>${r.isAI ? ' 🤖' : ''}
              <span class="bg-total">${r.total}</span>
            </div>
            <div class="bg-breakdown">
              ${r.breakdown.map(([k, v]) => `<span class="bg-chip">${t(k)} <b>${v}</b></span>`).join('')}
            </div>
          </div>`).join('')}
        ${session.usedUndo ? `<p class="muted">${t('bg.undoUsed')}</p>` : ''}
        <div id="bg-card"></div>
        <button id="bg-again">${t('bg.again')}</button>
      </div>`;
    $root.querySelector('#bg-again').onclick = renderSetup;
    mountGameCard($root.querySelector('#bg-card'), () => humanScore(results), game.id);
  }

  // humanScore 纪念卡分数 = 排名最靠前的人类玩家总分（纯 AI 局记 0）
  function humanScore(results) {
    const r = results.find((x) => !x.isAI);
    return r ? r.total : 0;
  }
}

// esc 转义玩家输入，防注入
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
