// 支付对账通知（pay-notify.js）：自觉解锁付费项时，生成 TXID 并 best-effort 通知站主邮箱。
// 无状态、无确认、不阻断解锁——仅给站主发一封对账邮件，站主按 TXID 备注（或金额+时间）人工对账。
// TXID 字符表与 cert.js 的 ANTI_ALPHABET 一致（去易混字符），方便人工抄写到支付备注。

import { t } from '/core/i18n.js';

// TXID_ALPHABET 交易号字符表：去 0/O/1/I/L 等易混字符（与 cert.js ANTI_ALPHABET 同源，不导入以解耦）
const TXID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// genTxid 生成交易号：prefix-XXXXX（5 位随机，约 2800 万种，人工可抄写）
export function genTxid(prefix) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += TXID_ALPHABET[Math.floor(Math.random() * TXID_ALPHABET.length)];
  }
  return `${prefix}-${s}`;
}

// notifyPay best-effort 发送对账通知到站主邮箱（失败静默，绝不影响解锁体验）
export function notifyPay({ feature, amount, txid, name, email }) {
  try {
    fetch('/api/pay/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ feature, amount, txId: txid, name: name || '', email: email || '' }),
    }).catch(() => {});
  } catch (e) {
    // 静默：通知失败不阻断解锁
  }
}

// remarkHint 渲染"请在备注填写 TXID"提示行（TXID 由本模块生成，无需转义）
export function remarkHint(txid) {
  return `<p class="muted pay-remark">${t('pay.remarkHint').replace('{txid}', `<code>${txid}</code>`)}</p>`;
}
