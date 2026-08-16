import { t } from '/core/i18n.js';

// render Base64 编解码（兼容 UTF-8）
export default function (el) {
  el.innerHTML = `
    <textarea id="b-in" placeholder="${t('b64.placeholder')}"></textarea>
    <div class="row">
      <button id="b-enc">${t('common.encode')}</button>
      <button id="b-dec" class="btn-soft">${t('common.decode')}</button>
      <button id="b-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="b-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#b-in');
  const $out = el.querySelector('#b-out');

  el.querySelector('#b-enc').onclick = () => {
    try {
      $out.textContent = btoa(unescape(encodeURIComponent($in.value)));
      $out.className = 'ok';
    } catch (e) { fail(e); }
  };
  el.querySelector('#b-dec').onclick = () => {
    try {
      $out.textContent = decodeURIComponent(escape(atob($in.value.trim())));
      $out.className = 'ok';
    } catch (e) { fail(e); }
  };
  el.querySelector('#b-copy').onclick = () => copy($out.textContent);

  function fail(e) {
    $out.textContent = t('common.error') + ': ' + e.message;
    $out.className = 'err';
  }
  function copy(text) {
    navigator.clipboard?.writeText(text);
  }
}
