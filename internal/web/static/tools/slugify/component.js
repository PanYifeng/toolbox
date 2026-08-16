import { t } from '/core/i18n.js';

// render 文本 → URL slug（实时）
export default function (el) {
  el.innerHTML = `
    <input id="g-in" type="text" placeholder="${t('sg.placeholder')}" />
    <pre id="g-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#g-in');
  const $out = el.querySelector('#g-out');
  $in.oninput = update;
  update();

  function update() {
    const s = $in.value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // 去变音符号
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    $out.textContent = s || '-';
    $out.className = s ? 'ok' : 'muted';
  }
}
