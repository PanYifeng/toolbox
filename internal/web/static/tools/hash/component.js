import { t } from '/core/i18n.js';
import { digestHex } from '/core/crypto-compat.js';
import { copyText } from '/core/clipboard.js';

// render 哈希计算（SHA-1/256/384/512，crypto.subtle 不可用时走纯 JS 回退）
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
  const $go = el.querySelector('#h-go');
  const $copy = el.querySelector('#h-copy');

  $go.onclick = async () => {
    const algo = el.querySelector('#h-algo').value;
    $go.disabled = true; // 大输入下纯 JS 回退是同步计算，禁用按钮防重复触发
    try {
      const data = new TextEncoder().encode($in.value);
      $out.textContent = await digestHex(algo, data);
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('common.error') + ': ' + e.message;
      $out.className = 'err';
    } finally {
      $go.disabled = false;
    }
  };

  // 复制反馈如实：HTTP 非安全上下文下 clipboard 不可用，走降级后仍失败就明说
  $copy.onclick = async () => {
    const ok = await copyText($out.textContent);
    const old = t('common.copy');
    $copy.textContent = ok ? t('common.copied') : t('common.copyFail');
    setTimeout(() => { $copy.textContent = old; }, 1400);
  };
}
