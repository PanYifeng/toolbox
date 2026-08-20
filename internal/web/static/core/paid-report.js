// 通用付费内容解锁模块（站主确认门）：访客填邮箱+交易号提交申请 → 站主邮件确认收款 → 内容邮件发访客。
// 复用于人格测试完整版（¥5）等场景；前端无自解锁，内容绝不前端展示，确认后经邮件送达。
// 两个入口：
//   renderPaidReportEntry：先放"查看完整版"按钮；点击后进申请表单（email+txid+提交）。
//     report 为客户端按访客语言预生成的完整内容文本，随申请落盘，确认后原样邮件送达。
//     onSubmitted 在提交成功后触发，供调用方记入快照（语言切换恢复用 renderPaidReportSubmitted）。
//   renderPaidReportSubmitted：直接渲染"已提交待确认"态（语言切换恢复用）。
import { t, getLang } from '/core/i18n.js';
import { genTxid, remarkHint } from '/core/pay-notify.js';

// esc 转义 HTML（项目惯例就地复制）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// fmtYuan 价格 → 两位小数元
function fmtYuan(n) {
  return n.toFixed(2);
}

// renderPaidReportEntry 付费内容入口：先"查看完整版"按钮，点击后进申请表单
export function renderPaidReportEntry(container, { feature, title, amount, report, onSubmitted, getPng } = {}) {
  const lang = getLang();
  const wrap = document.createElement('div');
  wrap.className = 'pr-entry';
  const btn = document.createElement('button');
  btn.className = 'btn pr-entry-btn';
  btn.textContent = `${t('pr.viewFull')}（¥${fmtYuan(amount)}）`;
  btn.onclick = () => renderClaimForm(wrap, { feature, title, amount, report, lang, onSubmitted, getPng });
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

// renderPaidReportSubmitted 直接渲染已提交态（语言切换恢复用，跳过申请表单）
export function renderPaidReportSubmitted(container, { claimId, email, amount } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'pr-entry';
  wrap.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('pr.title')}</h3>
      <p class="ok">${t('pr.claimSubmitted')}</p>
      ${claimId ? `<p class="muted">${t('pr.claimId').replace('{id}', esc(claimId))}</p>` : ''}
      <p class="muted">${t('pr.claimPending').replace('{email}', esc(email || ''))}</p>
      <p class="muted lb-upgrade-foot">${t('pr.foot')}</p>
    </div>`;
  container.appendChild(wrap);
}

// renderClaimForm 申请态：开价 + 收款码（标注 Alipay/WeChat）+ TXID 备注 + 邮箱 + 提交按钮
function renderClaimForm(container, { feature, title, amount, report, lang, onSubmitted, getPng }) {
  const txid = genTxid('PR');
  container.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('pr.title')}</h3>
      <div class="lb-upgrade errata-gate">
        <p class="lb-upgrade-desc">${t('pr.costHint').replace('{n}', fmtYuan(amount))}</p>
        <div class="lb-qr">
          <div><img src="/img/donate-alipay.jpg" alt="Alipay"><p class="lb-pay-name">${t('pay.alipay')}</p><p class="muted">${t('pr.payHint')}</p></div>
          <div><img src="/img/donate-wechat.png" alt="WeChat Pay"><p class="lb-pay-name">${t('pay.wechat')}</p><p class="muted">${t('pr.payHint')}</p></div>
        </div>
        ${remarkHint(txid)}
        <label>${t('pr.emailLabel')} <input id="pr-email" type="email" placeholder="${t('pr.emailPh')}"></label>
        <button id="pr-submit" class="btn">${t('pr.submitClaim')}</button>
        <p class="muted lb-upgrade-foot">${t('pr.foot')}</p>
      </div>
    </div>`;
  container.querySelector('#pr-submit').onclick = () => submitClaim(container, { feature, title, amount, report, txid, lang, onSubmitted, getPng });
}

// submitClaim 校验邮箱 → POST /api/paidreport/claim（报告随申请落盘）→ 渲染已提交态
async function submitClaim(container, { feature, title, amount, report, txid, lang, onSubmitted, getPng }) {
  const email = (container.querySelector('#pr-email')?.value || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { alert(t('pr.needEmail')); return; }
  const $btn = container.querySelector('#pr-submit');
  if ($btn) $btn.disabled = true;
  // 金纪念卡 PNG（人格测试完整版）：提交前异步生成，失败则不附带（服务端回退纯文本邮件）
  let png = null;
  try { png = getPng ? await getPng() : null; } catch (_) { png = null; }
  const payload = { feature, title, amount, email, txId: txid, lang, report };
  if (png) payload.png = png;
  let d;
  try {
    const r = await fetch('/api/paidreport/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    d = await r.json().catch(() => ({}));
    if (!r.ok) { if ($btn) $btn.disabled = false; alert(d.message || t('pr.claimFail')); return; }
  } catch (err) {
    if ($btn) $btn.disabled = false;
    alert(t('pr.claimFail'));
    return;
  }
  renderSubmitted(container, { id: d.id, email });
  if (onSubmitted) onSubmitted(d.id, email);
}

// renderSubmitted 已提交态：申请号 + 提示内容将在站主确认后发至邮箱
function renderSubmitted(container, { id, email }) {
  container.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('pr.title')}</h3>
      <p class="ok">${t('pr.claimSubmitted')}</p>
      <p class="muted">${t('pr.claimId').replace('{id}', esc(id || ''))}</p>
      <p class="muted">${t('pr.claimPending').replace('{email}', esc(email || ''))}</p>
      <p class="muted lb-upgrade-foot">${t('pr.foot')}</p>
    </div>`;
}
