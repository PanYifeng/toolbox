import { t } from '/core/i18n.js';

// render HTML 实体编解码
export default function (el) {
  el.innerHTML = `
    <textarea id="h-in" placeholder="${t('he.placeholder')}"></textarea>
    <div class="row">
      <button id="h-enc">${t('common.encode')}</button>
      <button id="h-dec" class="btn-soft">${t('common.decode')}</button>
      <button id="h-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="h-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#h-in');
  const $out = el.querySelector('#h-out');

  el.querySelector('#h-enc').onclick = () => {
    $out.textContent = $in.value
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    $out.className = 'ok';
  };
  el.querySelector('#h-dec').onclick = () => {
    const ta = document.createElement('textarea');
    ta.innerHTML = $in.value;
    $out.textContent = ta.value;
    $out.className = 'ok';
  };
  el.querySelector('#h-copy').onclick = () => navigator.clipboard?.writeText($out.textContent);
}
