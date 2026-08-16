import { t } from '/core/i18n.js';

// render 密码生成器（crypto.getRandomValues）
export default function (el) {
  el.innerHTML = `
    <label>${t('pw.length')}: <input id="p-len" type="number" value="16" min="4" max="128" style="width:80px"/></label>
    <div class="row" style="flex-wrap:wrap">
      <label><input type="checkbox" id="p-upper" checked> ${t('pw.upper')}</label>
      <label><input type="checkbox" id="p-lower" checked> ${t('pw.lower')}</label>
      <label><input type="checkbox" id="p-num" checked> ${t('pw.number')}</label>
      <label><input type="checkbox" id="p-sym"> ${t('pw.symbol')}</label>
      <label><input type="checkbox" id="p-amb" checked> ${t('pw.excludeAmbiguous')}</label>
    </div>
    <div class="row">
      <button id="p-go">${t('common.generate')}</button>
      <button id="p-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="p-out" class="muted">${t('common.output')}</pre>`;

  el.querySelector('#p-go').onclick = () => {
    el.querySelector('#p-out').textContent = gen();
    el.querySelector('#p-out').className = 'ok';
  };
  el.querySelector('#p-copy').onclick = () => navigator.clipboard?.writeText(el.querySelector('#p-out').textContent);

  function gen() {
    const len = parseInt(el.querySelector('#p-len').value) || 16;
    let pool = '';
    if (el.querySelector('#p-upper').checked) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (el.querySelector('#p-lower').checked) pool += 'abcdefghijkmnopqrstuvwxyz';
    if (el.querySelector('#p-num').checked) pool += '23456789';
    if (el.querySelector('#p-sym').checked) pool += '!@#$%^&*-_=+?';
    if (!el.querySelector('#p-amb').checked) pool += 'O0Il1IO';
    if (!pool) return '';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let out = '';
    for (let i = 0; i < len; i++) out += pool[arr[i] % pool.length];
    return out;
  }
}
