import { t } from '/core/i18n.js';
import { randomUUID } from '/core/crypto-compat.js';
import { copyText } from '/core/clipboard.js';

// render UUID v4 生成
export default function (el) {
  el.innerHTML = `
    <div class="row">
      <button id="g-go">${t('common.generate')}</button>
      <button id="g-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="g-out" class="muted">${t('common.output')}</pre>`;

  const $out = el.querySelector('#g-out');
  const $copy = el.querySelector('#g-copy');

  el.querySelector('#g-go').onclick = () => {
    $out.textContent = randomUUID();
    $out.className = 'ok';
  };

  // 复制反馈如实：HTTP 非安全上下文下 clipboard 不可用，走降级后仍失败就明说
  $copy.onclick = async () => {
    const ok = await copyText($out.textContent);
    const old = t('common.copy');
    $copy.textContent = ok ? t('common.copied') : t('common.copyFail');
    setTimeout(() => { $copy.textContent = old; }, 1400);
  };
}
