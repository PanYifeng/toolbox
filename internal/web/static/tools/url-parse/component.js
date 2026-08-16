import { t } from '/core/i18n.js';

// render URL 解析（基于 URL API，实时）
export default function (el) {
  el.innerHTML = `
    <input id="u-in" type="text" placeholder="${t('up.placeholder')}" />
    <pre id="u-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#u-in');
  const $out = el.querySelector('#u-out');
  $in.oninput = update;
  update();

  function update() {
    const raw = $in.value.trim();
    if (!raw) { $out.textContent = t('common.output'); $out.className = 'muted'; return; }
    try {
      const u = new URL(raw);
      const params = [...u.searchParams.entries()].map(([k, v]) => `  ${k} = ${v}`).join('\n');
      $out.textContent =
        `protocol: ${u.protocol}\nhost:     ${u.host}\nhostname: ${u.hostname}\nport:     ${u.port}\n` +
        `pathname: ${u.pathname}\nsearch:   ${u.search}\nhash:     ${u.hash}\n` +
        `username: ${u.username}\npassword: ${u.password}\nquery:\n${params || '  (none)'}`;
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('common.error') + ': ' + e.message;
      $out.className = 'err';
    }
  }
}
