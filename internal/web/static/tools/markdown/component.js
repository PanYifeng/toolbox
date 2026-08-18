import { t } from '/core/i18n.js';
import { renderMarkdown } from '/core/md.js';

// render Markdown 预览（实时）
export default function (el) {
  el.innerHTML = `
    <div class="row" style="align-items:stretch">
      <textarea id="m-in" placeholder="${t('md.placeholder')}">${t('md.placeholder')}</textarea>
      <div id="m-out" class="md-preview"></div>
    </div>`;

  const $in = el.querySelector('#m-in');
  const $out = el.querySelector('#m-out');
  $in.oninput = () => ($out.innerHTML = renderMarkdown($in.value));
  $out.innerHTML = renderMarkdown($in.value);
}
