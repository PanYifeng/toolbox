// renderErrata 错题解析模块：按错题数开价 → 访客填邮箱+交易号提交申请 → 站主邮件确认收款 → 解析邮件发访客。
// 三个入口：
//   renderErrata（宗教等旧调用方）：直接进入申请态，付款前展示题干+你选的（用户自己的数据）。
//   renderErrataEntry（知识问答）：交卷后仅给分数，先放"查看错题和解析"按钮；点击后进入申请态，
//     付款前不暴露任何错题内容（仅错题数与价格）。onSubmitted 在提交成功后触发，供调用方记入快照。
//   renderErrataSubmitted：直接渲染"已提交，待站主确认"态（语言切换重渲染时恢复用）。
// 站主确认门：前端无自解锁按钮，解析绝不前端展示——确认前只暴露错题数与价格；
// review 快照随申请落盘服务端，确认后渲染入访客邮件（访客 tab 关闭后仍可送达）。
// review 项结构：{ q:{zh,en}, options:[{zh,en}×4], userPick:-1|0..3, correctIndex:0..3, explanation?:{zh,en} }

import { t, getLang } from '/core/i18n.js';
import { genTxid, remarkHint } from '/core/pay-notify.js';

// featOn 读 bootstrap feature 开关（与 game-card.js / app.js 同范本，项目惯例就地复制）
function featOn(key) {
  return !!(window.BOOT && window.BOOT.features && window.BOOT.features[key]);
}

// esc 转义 HTML（项目惯例就地复制）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// fmtYuan 价格 → 两位小数元
function fmtYuan(n) {
  return n.toFixed(2);
}

// renderErrata 错题解析（旧入口，宗教等用）：直接进入申请态，付款前保留题干+你选的
// 有解析的错题展示锁定态并计费，无解析的错题展示免费"解析待补"
export function renderErrata(container, review, { pricePerQ, feature } = {}) {
  if (!featOn('errata')) return;
  const wrong = review.filter((r) => r.userPick !== r.correctIndex);
  if (wrong.length === 0) {
    container.innerHTML = `<div class="quiz-result ok"><p>${t('errata.allCorrect')}</p></div>`;
    return;
  }
  const explained = wrong.filter((r) => r.explanation && r.explanation.zh && r.explanation.en);
  renderClaimForm(container, wrong, { explained, pricePerQ, feature, showStems: true, onSubmitted: null });
}

// renderErrataEntry 错题解析入口（知识问答用）：交卷后仅给分数，此处先渲染"查看错题和解析"按钮；
// 点击后进入申请态；付款前不暴露任何错题内容。onSubmitted 在提交成功后触发，供调用方记入快照。
export function renderErrataEntry(container, review, { pricePerQ, feature, onSubmitted } = {}) {
  if (!featOn('errata')) return;
  const wrong = review.filter((r) => r.userPick !== r.correctIndex);
  const explained = wrong.filter((r) => r.explanation && r.explanation.zh && r.explanation.en);
  if (wrong.length === 0) return; // 全对，无需入口
  const wrap = document.createElement('div');
  wrap.className = 'errata-entry';
  const btn = document.createElement('button');
  btn.className = 'btn kq-errata-entry';
  btn.textContent = `${t('errata.viewWrong')}（${t('errata.wrongCountShort').replace('{n}', wrong.length)}）`;
  btn.onclick = () => renderClaimForm(wrap, wrong, { explained, pricePerQ, feature, showStems: false, onSubmitted });
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

// renderErrataSubmitted 直接渲染已提交态（语言切换后恢复用，跳过申请表单）
export function renderErrataSubmitted(container, { claimId, email } = {}) {
  if (!featOn('errata')) return;
  const wrap = document.createElement('div');
  wrap.className = 'errata-entry';
  wrap.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('errata.title')}</h3>
      <p class="ok">${t('errata.claimSubmitted')}</p>
      ${claimId ? `<p class="muted">${t('errata.claimId').replace('{id}', esc(claimId))}</p>` : ''}
      <p class="muted">${t('errata.claimPending').replace('{email}', esc(email || ''))}</p>
      <p class="muted lb-upgrade-foot">${t('errata.foot')}</p>
    </div>`;
  container.appendChild(wrap);
}

// renderClaimForm 申请态：按有解析的错题数开价 + 收款码 + TXID 备注 + 邮箱 + 提交按钮。
// showStems=true 付款前展示题干+你选的（旧入口）；=false 仅展示错题数与价格（知识问答入口）。
// 有解析的错题锁定态收费，无解析的错题免费显示"解析待补"。
function renderClaimForm(container, wrong, { explained, pricePerQ, feature, showStems, onSubmitted }) {
  const lang = getLang();
  const cost = Math.round((explained || wrong).length * (pricePerQ || 0) * 100) / 100;
  const txid = genTxid('KQ');
  const unexplained = wrong.filter((r) => !r.explanation || !r.explanation.zh || !r.explanation.en);
  container.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('errata.title')}</h3>
      <p class="muted">${t('errata.wrongCount').replace('{n}', wrong.length)}</p>
      ${showStems ? `<div class="errata-list">${wrong.map((r, i) => wrongItemLocked(r, i, lang)).join('')}</div>` : ''}
      ${unexplained.length > 0 ? `<p class="errata-free-hint">${t('errata.freeHint').replace('{n}', unexplained.length)}</p>` : ''}
      <div class="lb-upgrade errata-gate">
        <p class="lb-upgrade-desc">${t('errata.costHint').replace('{n}', fmtYuan(cost))}</p>
        <div class="lb-qr">
          <div><img src="/img/donate-alipay.jpg" alt="Alipay"><p class="lb-pay-name">${t('pay.alipay')}</p><p class="muted">${t('errata.payHint')}</p></div>
          <div><img src="/img/donate-wechat.png" alt="WeChat Pay"><p class="lb-pay-name">${t('pay.wechat')}</p><p class="muted">${t('errata.payHint')}</p></div>
        </div>
        ${remarkHint(txid)}
        <label>${t('errata.emailLabel')} <input id="er-email" type="email" placeholder="${t('errata.emailPh')}"></label>
        <button id="er-submit" class="btn">${t('errata.submitClaim')}</button>
        <p class="muted lb-upgrade-foot">${t('errata.foot')}</p>
      </div>
    </div>`;
  container.querySelector('#er-submit').onclick = () => submitClaim(container, wrong, { cost, txid, feature, lang, onSubmitted, explained: explained || wrong });
}

// submitClaim 校验邮箱 → POST /api/errata/claim（有解析的错题快照随申请落盘，无解析的免费显示）→ 渲染已提交态
async function submitClaim(container, wrong, { cost, txid, feature, lang, onSubmitted, explained }) {
  const email = (container.querySelector('#er-email')?.value || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { alert(t('errata.needEmail')); return; }
  const $btn = container.querySelector('#er-submit');
  if ($btn) $btn.disabled = true;
  const explainedItems = explained || wrong;
  const payload = {
    feature: feature || t('kq.errataFeature'),
    amount: cost, count: explainedItems.length, email, txId: txid, lang,
    review: explainedItems.map((r) => ({
      q: r.q, options: r.options, userPick: r.userPick,
      correctIndex: r.correctIndex, explanation: r.explanation || null,
    })),
  };
  let d;
  try {
    const r = await fetch('/api/errata/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    d = await r.json().catch(() => ({}));
    if (!r.ok) { if ($btn) $btn.disabled = false; alert(d.message || t('errata.claimFail')); return; }
  } catch (err) {
    if ($btn) $btn.disabled = false;
    alert(t('errata.claimFail'));
    return;
  }
  renderSubmitted(container, { id: d.id, email });
  if (onSubmitted) onSubmitted(d.id, email);
}

// renderSubmitted 已提交态：申请号 + 提示解析将在站主确认后发至邮箱
function renderSubmitted(container, { id, email }) {
  container.innerHTML = `
    <div class="errata-wrap">
      <h3 class="errata-title">${t('errata.title')}</h3>
      <p class="ok">${t('errata.claimSubmitted')}</p>
      <p class="muted">${t('errata.claimId').replace('{id}', esc(id || ''))}</p>
      <p class="muted">${t('errata.claimPending').replace('{email}', esc(email || ''))}</p>
      <p class="muted lb-upgrade-foot">${t('errata.foot')}</p>
    </div>`;
}

// wrongItemLocked 单题锁定项：题干 + 你选的（用户自己的数据），正确答案/解析占位
// 有解析的题锁定态收费，无解析的题免费显示"暂无解析"
function wrongItemLocked(r, i, lang) {
  const hasExpl = r.explanation && r.explanation.zh && r.explanation.en;
  if (!hasExpl) {
    return `
    <div class="errata-item">
      <p class="quiz-stem"><b>${i + 1}.</b> ${esc(r.q[lang] || r.q.zh)}</p>
      <p class="errata-picked">${t('errata.youPicked')}: <span class="errata-wrong">${esc(optText(r, r.userPick, lang))}</span></p>
      <p class="errata-free">${t('errata.noExpl')}</p>
    </div>`;
  }
  return `
  <div class="errata-item">
    <p class="quiz-stem"><b>${i + 1}.</b> ${esc(r.q[lang] || r.q.zh)}</p>
    <p class="errata-picked">${t('errata.youPicked')}: <span class="errata-wrong">${esc(optText(r, r.userPick, lang))}</span></p>
    <p class="errata-locked-hint">🔒 ${t('errata.lockedHint')}</p>
  </div>`;
}

// optText 取选项文案；userPick=-1（未作答）显示"未作答"
function optText(r, idx, lang) {
  if (idx < 0 || idx == null) return t('errata.unanswered');
  const op = r.options[idx];
  return op ? (op[lang] || op.zh) : '';
}
