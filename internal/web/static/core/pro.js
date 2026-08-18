// Pro Token 客户端：localStorage 存取 + 上传头注入 + 状态查询 + 面板渲染 + 支付核销提交与轮询。
// Pro 面板仅出现在资源消耗大的重工具（视频/音频/文档转换等），与首页纯赞助分离。
import { t, tr } from '/core/i18n.js';

const KEY = 'pro_token';
const REQ_KEY = 'pro_request'; // 进行中的核销请求 ID，用于刷新页面后恢复轮询
const POLL_MS = 30000;
const refreshers = []; // 已挂载面板的刷新回调，上传扣减后统一刷新

// getProToken 读取本地保存的 Pro token
export function getProToken() {
  return localStorage.getItem(KEY) || '';
}

// setProToken 保存或清除 token（空串即清除）
export function setProToken(v) {
  const tok = (v || '').trim();
  if (tok) localStorage.setItem(KEY, tok);
  else localStorage.removeItem(KEY);
}

// proHeaders 返回上传请求应携带的头（无 token 时为空对象）
export function proHeaders() {
  const tok = getProToken();
  return tok ? { 'X-Pro-Token': tok } : {};
}

// proEnabled 当前是否开启 Pro（读 bootstrap 配置）
function proEnabled() {
  return !!(window.BOOT && window.BOOT.pro && window.BOOT.pro.enabled);
}

// plans 定价方案
function plans() {
  return (window.BOOT && window.BOOT.pro && window.BOOT.pro.plans) || [];
}

// fetchProStatus 查询当前 token 状态
export async function fetchProStatus() {
  const r = await fetch('/api/pro/status', { headers: proHeaders() });
  if (!r.ok) return { enabled: proEnabled(), valid: false, status: 'invalid' };
  return r.json();
}

// refreshProPanel 触发所有已挂载面板刷新状态（上传扣减后调用）
export function refreshProPanel() {
  refreshers.forEach((fn) => fn());
}

// fmtBytes 字节数 → 人类可读
function fmtBytes(n) {
  if (!n) return '';
  const gb = n / (1024 * 1024 * 1024);
  if (gb >= 1) return (Number.isInteger(gb) ? gb : gb.toFixed(1)) + 'GB';
  return Math.round(n / (1024 * 1024)) + 'MB';
}

// statusHTML 由状态对象渲染 token 状态行
function statusHTML(s) {
  const lim = s.valid ? fmtBytes(s.proLimit) : fmtBytes(s.freeLimit);
  if (s.valid) {
    if (s.type === 'count') {
      return `${t('pro.active')} · ${t('pro.remaining')} ${s.remaining} ${t('pro.times')} · ${t('pro.limit')} ${lim}`;
    }
    return `${t('pro.active')} · ${t('pro.expires')} ${s.expiresAt} · ${t('pro.limit')} ${lim}`;
  }
  const tag =
    s.status === 'expired' ? t('pro.expired') :
    s.status === 'exhausted' ? t('pro.exhausted') :
    s.status === 'invalid' && getProToken() ? t('pro.invalid') :
    t('pro.inactive');
  return `${tag} · ${t('pro.limit')} ${lim}`;
}

// plansHTML 渲染定价方案卡片
function plansHTML() {
  const ps = plans();
  if (!ps.length) return '';
  const cards = ps.map((p) =>
    `<div class="pro-plan"><span class="pro-plan-name">${tr(p.label) || p.id}</span><span class="pro-plan-price">¥${p.price}</span></div>`
  ).join('');
  return `<div class="pro-plans-title">${t('pro.plansTitle')}</div><div class="pro-plans">${cards}</div>`;
}

// planOptions 渲染方案下拉选项
function planOptions() {
  const ps = plans();
  if (!ps.length) return '';
  const opts = ps.map((p) => `<option value="${p.id}">${tr(p.label) || p.id} — ¥${p.price}</option>`).join('');
  return `<select id="pro-plan"><option value="">${t('pro.planLabel')}</option>${opts}</select>`;
}

// mountProPanel 在 container 内渲染 Pro 面板（资源消耗说明 + 方案 + token 输入 + 支付核销提交 + 状态）
export function mountProPanel(container) {
  if (!proEnabled()) return;
  container.innerHTML = `
    <section class="pro-panel">
      <div class="pro-head"><span class="pro-badge">Pro</span><span class="pro-title">${t('pro.title')}</span></div>
      <p class="pro-note">${t('pro.note')}</p>
      ${plansHTML()}
      <div class="pro-subsection">${t('pro.haveToken')}</div>
      <div class="pro-input-row">
        <input id="pro-token-input" type="text" placeholder="${t('pro.tokenLabel')}" value="${getProToken()}" autocomplete="off" spellcheck="false">
        <button id="pro-save">${t('pro.save')}</button>
      </div>
      <p class="pro-status muted" id="pro-status"></p>
      <div class="pro-subsection">${t('pro.buyTitle')}</div>
      <div class="pro-buy-form">
        ${planOptions()}
        <input id="pro-email" type="email" placeholder="${t('pro.emailLabel')}" autocomplete="email">
        <input id="pro-order" type="text" placeholder="${t('pro.orderLabel')}" autocomplete="off">
        <button id="pro-submit">${t('pro.submitPay')}</button>
      </div>
      <div id="pro-verify" class="pro-verify hidden"></div>
      <p class="pro-howto muted">${t('pro.howto')}</p>
    </section>`;
  const $status = container.querySelector('#pro-status');
  const $input = container.querySelector('#pro-token-input');
  const $save = container.querySelector('#pro-save');
  const $verify = container.querySelector('#pro-verify');

  // refresh 重新查询并渲染 token 状态行
  async function refresh() {
    const s = await fetchProStatus();
    $status.innerHTML = statusHTML(s);
    $status.className = 'pro-status ' + (s.valid ? 'ok' : 'muted');
  }
  refreshers.push(refresh);
  refresh();

  $save.onclick = async () => {
    setProToken($input.value);
    await refresh();
    $save.textContent = t('pro.saved');
    setTimeout(() => { $save.textContent = t('pro.save'); }, 1500);
  };
  $input.addEventListener('keydown', (e) => { if (e.key === 'Enter') $save.click(); });

  // 支付核销提交
  container.querySelector('#pro-submit').onclick = async () => {
    const planId = container.querySelector('#pro-plan').value;
    const email = container.querySelector('#pro-email').value.trim();
    const orderId = container.querySelector('#pro-order').value.trim();
    if (!planId) { showVerify(t('pro.needPlan'), true); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showVerify(t('pro.invalidEmail'), true); return; }
    if (!orderId) { showVerify(t('pro.needOrder'), true); return; }
    const btn = container.querySelector('#pro-submit');
    btn.disabled = true; btn.textContent = t('pro.submitting');
    try {
      const r = await fetch('/api/pro/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, email, orderId }),
      });
      if (!r.ok) { showVerify(t('pro.submitFail') + await r.text(), true); return; }
      const data = await r.json();
      localStorage.setItem(REQ_KEY, data.id);
      startPolling(data.id);
    } catch (e) {
      showVerify(t('pro.submitFail') + e.message, true);
    } finally {
      btn.disabled = false; btn.textContent = t('pro.submitPay');
    }
  };

  // 轮询核销状态；approved/auto 时自动填入 token 并刷新
  let pollTimer = null;
  function startPolling(reqId) {
    if (pollTimer) clearInterval(pollTimer);
    showVerify(`<div class="pro-verifying"><span class="spin">⏳</span> ${t('pro.verifying')}</div><p class="muted">${t('pro.verifyingNote')}</p><p class="muted">ID: <code>${reqId}</code></p>`, false);
    const tick = async () => {
      try {
        const r = await fetch('/api/pro/request/' + reqId);
        const d = await r.json();
        if (d.status === 'approved' || d.status === 'auto') {
          clearInterval(pollTimer); pollTimer = null;
          localStorage.removeItem(REQ_KEY);
          setProToken(d.token);
          $input.value = d.token;
          showVerify(`<div class="pro-ok">✅ ${t('pro.approved')}</div>`, false);
          await refresh();
        }
      } catch (e) { /* 网络抖动，下次重试 */ }
    };
    tick();
    pollTimer = setInterval(tick, POLL_MS);
  }
  function showVerify(html, isErr) {
    $verify.innerHTML = html;
    $verify.className = 'pro-verify' + (isErr ? ' err' : '');
  }

  // 恢复进行中的核销轮询
  const pendingId = localStorage.getItem(REQ_KEY);
  if (pendingId) startPolling(pendingId);
}
