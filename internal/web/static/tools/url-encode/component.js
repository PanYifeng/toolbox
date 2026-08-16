import { t } from '/core/i18n.js';

// render URL 编解码
export default function (el) {
  el.innerHTML = `
    <textarea id="u-in" placeholder="${t('url.placeholder')}"></textarea>
    <div class="row">
      <button id="u-enc">${t('common.encode')}</button>
      <button id="u-dec" class="btn-soft">${t('common.decode')}</button>
      <button id="u-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="u-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#u-in');
  const $out = el.querySelector('#u-out');

  el.querySelector('#u-enc').onclick = () => {
    $out.textContent = encodeURIComponent($in.value);
    $out.className = 'ok';
  };
  el.querySelector('#u-dec').onclick = () => {
    try {
      $out.textContent = decodeURIComponent($in.value.trim());
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('common.error') + ': ' + e.message;
      $out.className = 'err';
    }
  };
  el.querySelector('#u-copy').onclick = () => navigator.clipboard?.writeText($out.textContent);
}
