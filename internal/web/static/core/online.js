// 联机对局层（全桌游共用）：房间中继 + 确定性重放。
// 服务端只存座位表与有序行动日志（见 internal/web/rooms.go），本端用与热座
// 完全相同的纯函数引擎重放日志重建棋面：
//   state = initialState(__start 快照) → 依次 apply 每条日志行动
// 提交走 POST（base = 本地日志长度，乐观并发），SSE 实时推送 + ?since 轮询兜底，
// 掉线重连 = 拉全量日志重放。机器人由「最低已占人类座位」的客户端分布式代驱，
// 双驱竞态由服务端 base 409 裁决后重同步收敛。
// 联机模式不提供存档/付费悔棋；隐藏信息游戏的手牌经中继同步至各端（好友对局信任模型）。
import { t, tr } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import { mountGameCard } from '/core/game-card.js';

const ON_AI_DELAY = 550;    // 机器人代驱延迟（与热座节奏一致）
const ON_AI_JITTER = 350;   // 机器人代驱抖动上限
const ON_POLL_MS = 2500;    // 轮询兜底间隔
const ON_TOAST_MS = 2600;   // 浮层提示停留时长
const CLIENT_KEY = 'bg-client-id'; // 本浏览器客户端 id（localStorage 持久）
const START_KIND = '__start';      // 日志首条：开局快照（座位表冻结进日志，各端重放起点一致）

// —— 基础工具 ——

// esc 转义玩家输入，防注入
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// clientId 本浏览器唯一 id（占座凭证；跨房间复用）
function clientId() {
  let id = '';
  try { id = localStorage.getItem(CLIENT_KEY) || ''; } catch { /* 隐私模式 */ }
  if (!id) {
    id = crypto.randomUUID();
    try { localStorage.setItem(CLIENT_KEY, id); } catch { /* 忽略 */ }
  }
  return id;
}

// toolId 当前工具页 id（建房 game 字段与邀请链接用；从 /t/<id> 路径取，兜底 game-<adapter id>）
function toolId(game) {
  const m = location.pathname.match(/^\/t\/([a-z0-9_-]+)/i);
  return m ? m[1] : `game-${game.id}`;
}

// apiPost JSON POST：非 2xx 抛带 status 的错误
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error((await res.text()).trim());
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// apiGet JSON GET
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// toast 顶部浮层提示（错误/复制反馈），自动消失
function toast(msg) {
  const $t = document.createElement('div');
  $t.className = 'on-toast';
  $t.textContent = msg;
  document.body.appendChild($t);
  setTimeout(() => $t.remove(), ON_TOAST_MS);
}

// —— 挂载入口 ——

// mountOnlineCreate 从热座配置屏发起：建房（座位 0 = 房主）→ 占座 → 转联机会话
export async function mountOnlineCreate(el, game, cfg) {
  // cfg.seats 来自热座配置屏；除房主外的人类座位清空名字留待加入者填
  const seats = cfg.seats.map((s, i) => ({ name: i === 0 ? s.name : (s.isAI ? s.name : ''), isAI: s.isAI }));
  try {
    const room = await apiPost('/api/rooms', {
      game: toolId(game), clientId: clientId(), seats, options: cfg.extras ?? null,
    });
    await apiPost(`/api/rooms/${room.code}/join`, { clientId: clientId(), name: cfg.seats[0].name, seat: 0 });
    mountOnlineRoom(el, game, room.code);
  } catch (e) {
    toast(e.message || t('on.netErr'));
  }
}

// mountOnlineRoom 邀请链接进入（?room=CODE）：加入 → 大厅 → 对局 → 结算全流程
export function mountOnlineRoom(el, game, code) {
  el.innerHTML = '<div class="on-root"></div>';
  const $root = el.querySelector('.on-root');
  const me = clientId();
  let room = null;      // 服务端房间视图（seats/count/closed/host）
  let log = [];         // 已收行动日志（重放数据源）
  let state = null;     // 引擎状态（log 重放产物；null = 尚未开局）
  let mySeat = -1;      // 我的座位（-1 = 观战）
  let mode = 'loading'; // 当前屏：join / lobby / game / over
  let es = null;        // EventSource
  let pollTimer = null; // 轮询兜底句柄
  let driverTick = 0;   // 机器人代驱回调作废令牌

  init();

  // init 拉全量快照定模式：未开局 → 加入屏/大厅；已开局 → 重放进对局
  async function init() {
    try {
      room = await apiGet(`/api/rooms/${code}?me=${encodeURIComponent(me)}`);
    } catch {
      $root.innerHTML = `<div class="on-card"><p>${t('on.notFound')}</p></div>`;
      return;
    }
    const mine = room.seats.find((s) => s.you);
    mySeat = mine ? mine.seat : -1;
    log = room.actions || [];
    state = rebuildFromLog();
    connect();
    ensurePoll();
    if (state) refresh();
    else if (mySeat < 0 && hasOpenSeat()) renderJoin();
    else renderLobby();
  }

  // hasOpenSeat 是否还有空人类座位
  function hasOpenSeat() {
    return room.seats.some((s) => !s.isAI && !s.taken);
  }

  // —— 同步核心：重放 / 应用 / 重同步 ——

  // rebuildFromLog 用开局快照 + 行动日志重建状态；空日志返回 null（未开局）
  function rebuildFromLog() {
    if (!log.length) return null;
    const start = log[0].action;
    if (!start || start.kind !== START_KIND) return null;
    const seats = start.seats.map((s, i) => ({ ...s, color: game.colors[i] }));
    let st = game.initialState({ seats, extras: room.options, seed: room.seed });
    for (let i = 1; i < log.length; i++) st = game.apply(st, log[i].action);
    return st;
  }

  // applyRemote 按序应用一条远端行动；非开局快照须通过本地合法性校验，
  // 不合法说明本地状态落后/分叉 → 全量重同步
  function applyRemote(a) {
    if (a.action && a.action.kind === START_KIND) {
      log.push(a);
      state = rebuildFromLog();
      refresh();
      return;
    }
    const legal = game.legalActions(state);
    if (!legal.some((x) => JSON.stringify(x) === JSON.stringify(a.action))) {
      resync();
      return;
    }
    log.push(a);
    state = game.apply(state, a.action);
    refresh();
  }

  // resync 全量重同步：拉快照 → 重建 → 按需刷新界面
  async function resync() {
    try {
      room = await apiGet(`/api/rooms/${code}?me=${encodeURIComponent(me)}`);
      log = room.actions || [];
      state = rebuildFromLog();
      if (!state && mySeat < 0) mySeat = (room.seats.find((s) => s.you) || {}).seat ?? -1;
      refresh();
    } catch {
      toast(t('on.netErr'));
    }
  }

  // submit 提交行动（人类点击或机器人代驱共用）；base = 本地日志长度
  async function submit(action, seat) {
    try {
      const av = await apiPost(`/api/rooms/${code}/action`, {
        clientId: me, seat, base: log.length, action,
      });
      // SSE 可能先到（同 seq 只应用一次）；POST 回包保证弱网下也能即时推进
      if (av.seq === log.length) applyRemote(av);
    } catch (e) {
      if (e.status === 409) resync(); // 日志已前移（双驱竞态/漏事件）→ 重同步
      else toast(e.message || t('on.netErr'));
    }
  }

  // pick 人类经游戏 UI 提交行动的唯一入口（仅本人回合生效）
  function pick(action) {
    if (!state || state.gameOver) return;
    const seat = game.currentPlayer(state);
    if (seat !== mySeat || state.players[seat].isAI) return;
    submit(action, seat);
  }

  // —— SSE + 轮询兜底 ——

  // connect 订阅 SSE；action 按 seq 去重按序应用，seats/close 更新房间视图
  function connect() {
    if (es) es.close();
    es = new EventSource(`/api/rooms/${code}/events?since=${log.length - 1}`);
    es.onopen = () => setConn(true);
    es.onerror = () => { setConn(false); ensurePoll(); };
    es.addEventListener('action', (e) => {
      const a = JSON.parse(e.data);
      if (a.seq < log.length) return; // 与 POST 回包重复
      if (a.seq > log.length) { resync(); return; } // 有缺口 → 全量重放
      applyRemote(a);
    });
    es.addEventListener('seats', (e) => {
      const v = JSON.parse(e.data);
      room.seats = v.seats;
      if (mode === 'lobby') renderLobby(); // 大厅实时刷新座位；对局只刷横幅；加入屏不动
      else if (mode === 'game') updateGameChrome();
    });
    es.addEventListener('close', () => {
      room.closed = true;
      toast(t('on.closed'));
      updateGameChrome();
    });
  }

  // ensurePoll 轮询兜底（SSE 断连/被代理掐断时补位，恢复即停）
  function ensurePoll() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      if (document.hidden) return;
      if (es && es.readyState === 1) { clearInterval(pollTimer); pollTimer = null; return; }
      try {
        const v = await apiGet(`/api/rooms/${code}?since=${log.length - 1}&me=${encodeURIComponent(me)}`);
        room = { ...v, actions: undefined };
        if (v.count > log.length) {
          for (const a of v.actions) applyRemote(a);
        } else if (mode === 'lobby') {
          renderLobby(); // 座位变动兜底刷新
        }
        setConn(true);
      } catch { setConn(false); }
    }, ON_POLL_MS);
  }

  // —— 机器人代驱 ——

  // iAmDriver 驱动权 = 最低已占人类座位（各端独立计算，竞态由 base 409 收敛）
  function iAmDriver() {
    if (mySeat < 0) return false;
    for (const s of room.seats) {
      if (!s.isAI && s.taken) return s.seat === mySeat;
    }
    return false;
  }

  // scheduleBots 当前座位是 AI 且握有驱动权时延迟代驱
  function scheduleBots() {
    if (!state || state.gameOver || !iAmDriver()) return;
    const seat = game.currentPlayer(state);
    if (!state.players[seat].isAI) return;
    driverTick++;
    const tick = driverTick;
    setTimeout(() => {
      if (tick !== driverTick || !state || state.gameOver || !iAmDriver()) return;
      const legal = game.legalActions(state);
      if (legal.length) submit(game.bot(state, legal), seat);
    }, ON_AI_DELAY + Math.random() * ON_AI_JITTER);
  }

  // —— 界面渲染 ——

  // refresh 状态推进后的统一入口
  function refresh() {
    if (!state || game.isGameOver(state)) { if (state) renderResults(); return; }
    renderGame();
    scheduleBots();
  }

  // renderJoin 加入屏：输入昵称占座（或观战）
  function renderJoin() {
    mode = 'join';
    $root.innerHTML = `
      <div class="on-card">
        <h3>🌐 ${tr(game.name)} — ${t('on.joinTitle')}</h3>
        <p class="muted">${t('on.roomCode')} <b class="on-code">${esc(room.code)}</b></p>
        <div class="on-join-row">
          <input id="on-name" maxlength="24" placeholder="${t('on.yourName')}">
          <button id="on-join" class="btn-soft">${t('on.joinBtn')}</button>
        </div>
        ${game.needsPrivacy ? `<p class="on-warn">⚠️ ${t('on.privacyNote')}</p>` : ''}
        <button id="on-watch">${t('on.spectateBtn')}</button>
      </div>`;
    const doJoin = async () => {
      const name = $root.querySelector('#on-name').value.trim().slice(0, 24);
      if (!name) { toast(t('on.needName')); return; }
      try {
        const v = await apiPost(`/api/rooms/${code}/join`, { clientId: me, name });
        mySeat = v.seat;
        room = v.room;
        renderLobby();
      } catch (e) { toast(e.message || t('on.netErr')); }
    };
    $root.querySelector('#on-join').onclick = doJoin;
    $root.querySelector('#on-name').onkeydown = (e) => { if (e.key === 'Enter') doJoin(); };
    $root.querySelector('#on-watch').onclick = () => renderLobby();
  }

  // renderLobby 大厅：房间码 + 邀请链接 + 座位表 + （房主）开局按钮
  function renderLobby() {
    const started = log.length > 0;
    if (started) { refresh(); return; } // 已开局（含观战者）→ 直接进对局
    mode = 'lobby';
    const invite = `${location.origin}/t/${toolId(game)}?room=${room.code}`;
    $root.innerHTML = `
      <div class="on-card">
        <h3>🌐 ${tr(game.name)}</h3>
        <p>${t('on.roomCode')} <b class="on-code">${esc(room.code)}</b>
           <button id="on-copy" class="btn-soft">${t('on.copy')}</button></p>
        <p class="muted">${t('on.invite')}<br><code class="on-invite">${esc(invite)}</code></p>
        <div class="on-seats">${room.seats.map(seatRowHtml).join('')}</div>
        ${room.host ? `
          <p class="muted">${t('on.startHint')}</p>
          <button id="on-start">${t('on.start')}</button>` : `
          <p class="muted">${started ? '' : t('on.waitHost')}</p>`}
        <div class="on-lobby-actions">
          <span id="on-conn" class="on-conn"></span>
          <button id="on-leave" class="btn-soft">${t('on.leave')}</button>
        </div>
        ${game.needsPrivacy ? `<p class="on-warn">⚠️ ${t('on.privacyNote')}</p>` : ''}
      </div>`;
    wireLobby(invite);
    setConn(es && es.readyState === 1);
  }

  // seatRowHtml 大厅单行座位
  function seatRowHtml(s) {
    const dot = `<span class="bg-dot" style="background:${game.colors[s.seat]}"></span>`;
    const tag = s.seat === mySeat
      ? ` <span class="on-tag">${t('on.youTag')}</span>`
      : (s.taken || s.isAI ? '' : ` <span class="on-tag on-tag-open">${t('on.openSeat')}</span>`);
    const label = s.isAI ? `🤖 ${esc(s.name || 'AI')}` : esc(s.name || `${t('bg.seat')} ${s.seat + 1}`);
    return `<div class="on-seat-row${s.seat === mySeat ? ' on-seat-mine' : ''}">${dot}<span>${label}</span>${tag}</div>`;
  }

  // wireLobby 大厅事件：复制邀请 / 开局 / 离开
  function wireLobby(invite) {
    const $copy = $root.querySelector('#on-copy');
    if ($copy) $copy.onclick = async () => {
      try { await navigator.clipboard.writeText(invite); toast(t('on.copied')); }
      catch { toast(invite); }
    };
    const $start = $root.querySelector('#on-start');
    if ($start) $start.onclick = onStartGame;
    $root.querySelector('#on-leave').onclick = onLeave;
  }

  // onStartGame 房主开局：空人类座位转 AI，快照座位表冻结进日志首条
  function onStartGame() {
    const seats = room.seats.map((s) => ({
      name: s.isAI ? (s.name || `AI ${s.seat + 1}`) : (s.taken ? s.name : `AI ${s.seat + 1}`),
      isAI: s.isAI || !s.taken,
    }));
    submit({ kind: START_KIND, seats }, Math.max(mySeat, 0));
  }

  // onLeave 离开房间：释放座位 → 回热座配置屏（清查询串防刷新重进）
  async function onLeave() {
    if (!confirm(t('on.confirmLeave'))) return;
    try { await apiPost(`/api/rooms/${code}/leave`, { clientId: me }); } catch { /* 尽力而为 */ }
    if (es) es.close();
    if (pollTimer) clearInterval(pollTimer);
    history.replaceState({}, '', location.pathname);
    location.reload();
  }

  // renderGame 对局屏：横幅（房间码 + 连接态 + 我的座位）+ 棋面 + 日志
  function renderGame() {
    mode = 'game';
    if (!$root.querySelector('#on-board')) {
      $root.innerHTML = `
        <div class="game-bar">
          <span id="on-banner" class="bg-banner"></span>
          <span id="on-conn" class="on-conn"></span>
          <button id="on-leave2" class="btn-soft">${t('on.leave')}</button>
        </div>
        <div class="bg-layout">
          <div class="bg-main"><div id="on-board"></div></div>
          <aside class="bg-side">
            <h4 class="bg-log-title">${t('bg.log')}</h4>
            <div id="on-log" class="bg-log"></div>
          </aside>
        </div>`;
      $root.querySelector('#on-leave2').onclick = onLeave;
    }
    updateGameChrome();
    const legal = game.legalActions(state);
    game.renderBoard($root.querySelector('#on-board'), state, legal, pick);
    renderLog();
    setConn(es && es.readyState === 1);
  }

  // updateGameChrome 只刷横幅（座位事件/断连时避免整棋面重绘）
  function updateGameChrome() {
    const $b = $root.querySelector('#on-banner');
    if (!$b || !state) return;
    if (game.isGameOver(state)) return; // 结算屏接管
    const seat = game.currentPlayer(state);
    const p = state.players[seat];
    const mine = seat === mySeat ? ` · ${t('on.yourTurn')}` : '';
    $b.innerHTML =
      `🌐 ${esc(room.code)} · <span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>` +
      (p.isAI ? ' 🤖' : '') + mine + (mySeat < 0 ? ` · ${t('on.spectator')}` : '');
  }

  // renderLog 行动日志（与热座同格式，seat=-1 为系统条目）
  function renderLog() {
    const $log = $root.querySelector('#on-log');
    if (!$log) return;
    const entries = state.log || [];
    $log.innerHTML = entries.slice(-160).map((e) => {
      const pl = e.seat >= 0 && e.seat < state.players.length ? state.players[e.seat] : null;
      const dot = pl ? `<span class="bg-dot" style="background:${pl.color}"></span>` : '';
      return `<p>${dot}${esc(fmt(t(e.key), e.args))}</p>`;
    }).join('');
    $log.scrollTop = $log.scrollHeight;
  }

  // setConn 连接指示灯
  function setConn(ok) {
    const $c = $root.querySelector('#on-conn');
    if ($c) { $c.classList.toggle('on-conn-off', !ok); $c.title = ok ? t('on.connOk') : t('on.connLost'); }
  }

  // renderResults 结算屏：排名 + 明细 + 纪念卡（与热座一致），附返回大厅
  function renderResults() {
    mode = 'over';
    const results = game.score(state)
      .map((r) => ({ ...r, name: state.players[r.seat].name, isAI: state.players[r.seat].isAI, color: state.players[r.seat].color }))
      .sort((a, b) => b.total - a.total || a.seat - b.seat);
    if (es) es.close();
    if (pollTimer) clearInterval(pollTimer);
    $root.innerHTML = `
      <div class="bg-results">
        <h3>🏆 ${t('bg.gameOver')} — ${esc(results[0].name)} ${t('bg.winner')}</h3>
        ${results.map((r, i) => `
          <div class="bg-result-row">
            <div class="bg-result-head">
              <span class="bg-rank">${i + 1}</span>
              <span class="bg-dot" style="background:${r.color}"></span>
              <b>${esc(r.name)}</b>${r.isAI ? ' 🤖' : ''}${r.seat === mySeat ? ` <span class="on-tag">${t('on.youTag')}</span>` : ''}
              <span class="bg-total">${r.total}</span>
            </div>
            <div class="bg-breakdown">
              ${r.breakdown.map(([k, v]) => `<span class="bg-chip">${t(k)} <b>${v}</b></span>`).join('')}
            </div>
          </div>`).join('')}
        <div id="on-card"></div>
        <button id="on-exit">${t('on.exit')}</button>
      </div>`;
    $root.querySelector('#on-exit').onclick = onLeave;
    mountGameCard($root.querySelector('#on-card'), () => {
      const r = results.find((x) => !x.isAI && x.seat === mySeat) || results.find((x) => !x.isAI);
      return r ? r.total : 0;
    }, game.id);
  }
}
