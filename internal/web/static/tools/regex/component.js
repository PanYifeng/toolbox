import { t } from '/core/i18n.js';

// render 正则匹配测试
export default function (el) {
  el.innerHTML = `
    <input id="r-pat" type="text" placeholder="${t('regex.pattern')}" />
    <div class="row">
      <input id="r-flags" type="text" placeholder="${t('regex.flags')}" value="g" />
      <button id="r-go">${t('regex.test')}</button>
    </div>
    <textarea id="r-in" placeholder="${t('regex.input')}"></textarea>
    <pre id="r-out" class="muted">${t('common.output')}</pre>`;

  const $pat = el.querySelector('#r-pat');
  const $flags = el.querySelector('#r-flags');
  const $in = el.querySelector('#r-in');
  const $out = el.querySelector('#r-out');

  el.querySelector('#r-go').onclick = () => {
    try {
      const re = new RegExp($pat.value, $flags.value);
      const matches = $flags.value.includes('g')
        ? [...$in.value.matchAll(re)]
        : [$in.value.match(re)].filter(Boolean);
      if (!matches.length) {
        $out.textContent = t('regex.noMatch');
        $out.className = 'muted';
        return;
      }
      $out.textContent = matches.map((m, i) => `${i + 1}: ${JSON.stringify(m[0])}`).join('\n');
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('common.error') + ': ' + e.message;
      $out.className = 'err';
    }
  };
}
