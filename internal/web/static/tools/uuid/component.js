import { t } from '/core/i18n.js';

// render UUID v4 生成
export default function (el) {
  el.innerHTML = `
    <div class="row">
      <button id="g-go">${t('common.generate')}</button>
      <button id="g-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="g-out" class="muted">${t('common.output')}</pre>`;

  const $out = el.querySelector('#g-out');
  el.querySelector('#g-go').onclick = () => {
    $out.textContent = crypto.randomUUID();
    $out.className = 'ok';
  };
  el.querySelector('#g-copy').onclick = () => navigator.clipboard?.writeText($out.textContent);
}
