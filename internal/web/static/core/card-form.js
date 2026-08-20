// 通用纪念卡表单与满分特别版解锁面板（card-form.js）。
// 从 religion.js 抽取并通用化：知识问答与未来工具复用同一发卡流程。
// 卡面文案用 card.* i18n 键（非 rel.*），避免在非宗教场景出现宗教语义。
// 满分特别版卡走客户端 computeAntiFake 普通防伪码 + drawPerfectBanner 金绶带（区别于破纪录卡服务端 TB-R-）。

import { t, getLang } from '/core/i18n.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';
import { genTxid, notifyPay, remarkHint } from '/core/pay-notify.js';

// featOn 读 bootstrap feature 开关（项目惯例就地复制）
function featOn(key) {
  return !!(window.BOOT && window.BOOT.features && window.BOOT.features[key]);
}

// esc 转义 HTML（项目惯例就地复制）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// renderCardForm 测验及格后的普通纪念卡表单：姓名/邮箱 + 生成 + 下载/发送
export function renderCardForm(el, { themeKey, score }) {
  const lang = getLang();
  const box = document.createElement('div');
  box.className = 'rel-card-form';
  box.innerHTML = `
    <p class="muted">${t('card.cardUnlocked').replace('{score}', score)}</p>
    <div class="rel-form">
      <label>${t('card.name')} <input id="cf-name" type="text" maxlength="30"></label>
      <label>${t('card.email')} <input id="cf-email" type="email"></label>
      <button id="cf-gen" class="btn">${t('card.genCard')}</button>
    </div>
    <div id="cf-out"></div>`;
  el.appendChild(box);
  box.querySelector('#cf-gen').onclick = () => onGenerate(box, themeKey, score, lang);
}

// onGenerate 生成普通纪念卡并展示结果
async function onGenerate(box, themeKey, score, lang) {
  const name = box.querySelector('#cf-name').value.trim();
  if (!name) { alert(t('card.needName')); return; }
  const email = box.querySelector('#cf-email').value.trim();
  const $out = box.querySelector('#cf-out');
  $out.innerHTML = `<p class="muted">${t('card.gening')}</p>`;
  try {
    const { dataUrl, code } = await renderMemorialCard({ themeKey, name, score, showDonate: true });
    renderCardResult($out, { dataUrl, code, themeKey, name, score, email, lang });
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('card.genFail')}</p>`;
  }
}

// renderCardResult 卡片结果区：图片 + 防伪码 + 下载/发送（普通卡与满分卡共用）
function renderCardResult($out, { dataUrl, code, themeKey, name, score, email, lang }) {
  $out.innerHTML = `
    <img class="rc-preview" src="${dataUrl}" alt="memorial card">
    <p class="muted">${t('card.antiFake')}: <code>${code}</code></p>
    <div class="row">
      <button id="cf-dl" class="btn">${t('card.download')}</button>
      <button id="cf-mail" class="btn-soft">${t('card.sendMail')}</button>
    </div>`;
  $out.querySelector('#cf-dl').onclick = () => downloadPng(dataUrl, `${themeKey}-memorial.png`);
  $out.querySelector('#cf-mail').onclick = () => sendCardMail($out, { themeKey, name, score, code, dataUrl, email });
}

// sendCardMail 调服务端把纪念卡发到邮箱（需 SMTP）
function sendCardMail($out, { themeKey, name, score, code, dataUrl, email }) {
  if (!email) { alert(t('card.needEmail')); return; }
  const $btn = $out.querySelector('#cf-mail');
  $btn.disabled = true;
  $btn.textContent = '...';
  fetch('/api/cert/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, score, code, png: dataUrl, religion: themeKey }),
  })
    .then((r) => r.json())
    .then((res) => { $btn.textContent = res.ok ? t('card.mailOk') : (res.message || t('card.mailFail')); })
    .catch(() => { $btn.textContent = t('card.mailFail'); })
    .finally(() => { $btn.disabled = false; });
}

// openPerfectUpgrade 满分特别版面板：姓名 + 收款码 + 暖文案 + self-unlock → 金版满分卡
export function openPerfectUpgrade(el, { themeKey, score }) {
  const lang = getLang();
  const txid = genTxid('PF');
  const box = document.createElement('div');
  box.className = 'rel-card-form';
  box.innerHTML = `
    <div class="lb-upgrade">
      <p class="lb-upgrade-desc">${t('card.perfectDesc')}</p>
      <div class="rel-form"><label>${t('card.name')} <input id="pf-name" type="text" maxlength="30"></label></div>
      <div class="lb-qr">
        <div><img src="/img/donate-alipay.jpg" alt="alipay"><p class="muted">${t('card.payHint')}</p></div>
        <div><img src="/img/donate-wechat.png" alt="wechat"><p class="muted">${t('card.payHint')}</p></div>
      </div>
      ${remarkHint(txid)}
      <button id="pf-unlock" class="btn">${t('card.unlock')}</button>
      <p class="muted lb-upgrade-foot">${t('card.foot')}</p>
    </div>
    <div id="pf-out"></div>`;
  el.appendChild(box);
  box.querySelector('#pf-unlock').onclick = () => {
    const name = box.querySelector('#pf-name').value.trim();
    if (!name) { alert(t('card.needName')); return; }
    notifyPay({ feature: '满分特别版纪念卡', amount: 1, txid, name, email: '' });
    onUnlockPerfect(box, themeKey, score, lang);
  };
}

// onUnlockPerfect 解锁生成满分特别版卡（perfect:true 启用金绶带）
async function onUnlockPerfect(box, themeKey, score, lang) {
  const name = box.querySelector('#pf-name').value.trim();
  if (!name) { alert(t('card.needName')); return; }
  const $out = box.querySelector('#pf-out');
  $out.innerHTML = `<p class="muted">${t('card.gening')}</p>`;
  try {
    const { dataUrl, code } = await renderMemorialCard({ themeKey, name, score, perfect: true, showDonate: true });
    renderCardResult($out, { dataUrl, code, themeKey, name, score, email: '', lang });
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('card.genFail')}</p>`;
  }
}
