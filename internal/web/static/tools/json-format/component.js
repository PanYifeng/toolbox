import { t } from '/core/i18n.js';

// render JSON 格式化 / 压缩 / 转义
export default function (el) {
  el.innerHTML = `
    <textarea id="j-in" placeholder='${t('json.placeholder')}'></textarea>
    <div class="row">
      <button id="j-fmt">${t('json.fmt')}</button>
      <button id="j-min" class="btn-soft">${t('json.min')}</button>
      <button id="j-esc" class="btn-soft">${t('json.esc')}</button>
    </div>
    <pre id="j-out" class="muted">${t('json.out')}</pre>`;

  const $in = el.querySelector('#j-in');
  const $out = el.querySelector('#j-out');

  el.querySelector('#j-fmt').onclick = () => run(() => JSON.stringify(JSON.parse($in.value), null, 2));
  el.querySelector('#j-min').onclick = () => run(() => JSON.stringify(JSON.parse($in.value)));
  el.querySelector('#j-esc').onclick = () => run(() => JSON.stringify($in.value));

  function run(fn) {
    try {
      $out.textContent = fn();
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('json.errPrefix') + e.message;
      $out.className = 'err';
    }
  }
}
