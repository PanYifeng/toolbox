// 付费悔棋浮层（pay-undo.js）：象棋悔棋收费 5 元/次。
// 复用 pay-notify 的"自觉解锁"模型——无真实支付网关，仅 best-effort 发对账邮件，
// 前端不阻断：用户点"已支付解锁"即放行本次悔棋。诚实用户按次付费，符合站内既定哲学。
//
// 复用样式：.fb-overlay/.fb-dialog（弹层）、.lb-qr/.lb-pay-name（收款码）、.pay-remark（TXID 提示）。
import { t } from '/core/i18n.js';
import { genTxid, remarkHint, notifyPay } from '/core/pay-notify.js';

// requestPaidUndo 弹付费浮层；用户点"已支付解锁"→发对账邮件+resolve(true)，取消→resolve(false)。
// feature 为对账标识（如"国际象棋 悔棋"），amount 为单次金额（元）。
export function requestPaidUndo({ feature, amount = 5 }) {
  return new Promise((resolve) => {
    const txid = genTxid('CU'); // CU = chess undo 交易号前缀
    const $m = document.createElement('div');
    $m.className = 'fb-overlay pu-overlay';
    $m.innerHTML = `
      <div class="fb-dialog">
        <h3>${t('undo.title')}</h3>
        <p class="fb-intro">${t('undo.desc').replace('{amount}', amount)}</p>
        <div class="lb-qr">
          <div><img src="/img/donate-alipay.jpg" alt="Alipay"><p class="lb-pay-name">${t('pay.alipay')}</p><p class="muted">${t('undo.payHint')}</p></div>
          <div><img src="/img/donate-wechat.png" alt="Wechat"><p class="lb-pay-name">${t('pay.wechat')}</p><p class="muted">${t('undo.payHint')}</p></div>
        </div>
        ${remarkHint(txid)}
        <label>${t('undo.email')}</label>
        <input type="email" id="pu-email" placeholder="${t('undo.emailPh')}">
        <div class="fb-actions">
          <button id="pu-cancel" class="btn-soft">${t('undo.cancel')}</button>
          <button id="pu-confirm" class="btn">${t('undo.confirm')}</button>
        </div>
      </div>`;
    document.body.appendChild($m);
    const close = (v) => { $m.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    $m.querySelector('#pu-cancel').onclick = () => close(false);
    $m.querySelector('#pu-confirm').onclick = () => {
      const email = $m.querySelector('#pu-email').value.trim();
      // best-effort 发对账邮件；失败静默，不影响解锁体验
      notifyPay({ feature, amount, txid, name: '', email });
      close(true);
    };
  });
}
