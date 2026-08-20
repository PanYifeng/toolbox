// 用户反馈渠道：全局浮层表单（留言 + 联系邮箱），提交后转发邮件给站主处理与回复。
// 来源模块由调用方传入（app.js 自动捕获当前工具 id），便于站主知道用户在哪个页面反馈。
// 无支付、无确认门——直发站主邮箱；邮箱必填以便回复。
import { t, getLang } from '/core/i18n.js';
import { registry } from '/tools/registry.js';

let open = false; // 防止重复打开多个浮层
let lastMid = null; // 记录当前来源模块，供"再提一条"复用

// moduleName 由模块 id 解析为可读名（首页/关于/工具名）
function moduleName(id) {
  if (!id) return getLang() === 'zh' ? '首页' : 'Home';
  if (id === '__about__') return t('footer.about');
  const m = registry.find((it) => it.id === id);
  return m ? (m.name?.[getLang()] || m.name?.zh || id) : id;
}

// openFeedback 打开反馈浮层；mid 为当前工具 id（首页为 null）
export function openFeedback(mid) {
  if (open) return;
  open = true;
  renderForm(mid);
}

// renderForm 渲染表单态浮层
function renderForm(mid) {
  lastMid = mid;
  const lang = getLang();
  closeExisting();
  document.removeEventListener('keydown', onEsc, true);
  const overlay = document.createElement('div');
  overlay.className = 'fb-overlay';
  overlay.id = 'fb-overlay';
  overlay.innerHTML = `
    <div class="fb-dialog" role="dialog" aria-modal="true" aria-label="${esc(t('fb.title'))}">
      <h3>${esc(t('fb.title'))}</h3>
      <p class="muted fb-intro">${esc(t('fb.intro'))}</p>
      <p class="muted fb-from-module">${esc(t('fb.fromModule').replace('{m}', moduleName(mid)))}</p>
      <label for="fb-msg">${esc(t('fb.message'))}</label>
      <textarea id="fb-msg" placeholder="${esc(t('fb.msgPh'))}" maxlength="4000"></textarea>
      <label for="fb-email">${esc(t('fb.emailLabel'))}</label>
      <input id="fb-email" type="email" placeholder="${esc(t('fb.emailPh'))}">
      <div class="fb-actions">
        <button class="btn-soft" id="fb-cancel">${esc(t('fb.close'))}</button>
        <button class="btn" id="fb-submit">${esc(t('fb.submit'))}</button>
      </div>
      <p class="muted fb-foot">${esc(t('fb.foot'))}</p>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#fb-msg').focus();
  overlay.querySelector('#fb-cancel').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onEsc, true);
  overlay.querySelector('#fb-submit').onclick = () => submit(overlay, mid, lang);
}

// onEsc 按 Esc 关闭浮层
function onEsc(e) { if (e.key === 'Escape') close(); }

// closeExisting 移除已存在的浮层
function closeExisting() {
  document.getElementById('fb-overlay')?.remove();
}

// close 关闭浮层并复位
function close() {
  closeExisting();
  document.removeEventListener('keydown', onEsc, true);
  open = false;
}

// submit 校验 → POST /api/feedback → 成功态
async function submit(overlay, mid, lang) {
  const msg = (overlay.querySelector('#fb-msg')?.value || '').trim();
  const email = (overlay.querySelector('#fb-email')?.value || '').trim();
  if (!msg) { alert(t('fb.needMsg')); return; }
  if (!/.+@.+\..+/.test(email)) { alert(t('fb.needEmail')); return; }
  const $btn = overlay.querySelector('#fb-submit');
  if ($btn) { $btn.disabled = true; $btn.textContent = t('fb.submitting'); }
  let d;
  try {
    const r = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, email, module: mid || '', lang }),
    });
    d = await r.json().catch(() => ({}));
    if (!r.ok) { if ($btn) { $btn.disabled = false; $btn.textContent = t('fb.submit'); } alert(d.message || t('fb.fail')); return; }
  } catch (e) {
    if ($btn) { $btn.disabled = false; $btn.textContent = t('fb.submit'); }
    alert(t('fb.fail'));
    return;
  }
  renderSent(overlay);
}

// renderSent 渲染成功态 + 关闭 / 再提一条
function renderSent(overlay) {
  overlay.querySelector('.fb-dialog').innerHTML = `
    <div class="fb-result">
      <p class="ok">${esc(t('fb.sent'))}</p>
      <p class="muted">${esc(t('fb.sentDesc'))}</p>
      <div class="fb-actions" style="justify-content:center;margin-top:16px">
        <button class="btn-soft" id="fb-close2">${esc(t('fb.close'))}</button>
        <button class="btn" id="fb-another">${esc(t('fb.another'))}</button>
      </div>
    </div>`;
  overlay.querySelector('#fb-close2').onclick = close;
  overlay.querySelector('#fb-another').onclick = () => renderForm(lastMid);
}

// esc 转义 HTML（防注入）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
