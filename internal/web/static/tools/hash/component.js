import { t } from '/core/i18n.js';

// render 哈希计算（Web Crypto SHA-1/256/384/512）
export default function (el) {
  el.innerHTML = `
    <textarea id="h-in" placeholder="${t('hash.placeholder')}"></textarea>
    <div class="row">
      <select id="h-algo">
        <option>SHA-1</option>
        <option selected>SHA-256</option>
        <option>SHA-384</option>
        <option>SHA-512</option>
      </select>
      <button id="h-go">${t('common.generate')}</button>
      <button id="h-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="h-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#h-in');
  const $out = el.querySelector('#h-out');

  el.querySelector('#h-go').onclick = async () => {
    const algo = el.querySelector('#h-algo').value;
    const data = new TextEncoder().encode($in.value);
    const buf = await crypto.subtle.digest(algo, data);
    $out.textContent = toHex(buf);
    $out.className = 'ok';
  };
  el.querySelector('#h-copy').onclick = () => navigator.clipboard?.writeText($out.textContent);
}

// toHex ArrayBuffer → 十六进制串
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
