import { t } from '/core/i18n.js';

// render JWT 解码（仅解码 header/payload，不验签）
export default function (el) {
  el.innerHTML = `
    <textarea id="j-in" placeholder="${t('jwt.placeholder')}"></textarea>
    <button id="j-go">${t('common.decode')}</button>
    <pre id="j-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#j-in');
  const $out = el.querySelector('#j-out');

  el.querySelector('#j-go').onclick = () => {
    try {
      const parts = $in.value.trim().split('.');
      if (parts.length < 2) throw new Error(t('jwt.invalid'));
      const dec = (s) => JSON.stringify(JSON.parse(b64url(s)), null, 2);
      $out.textContent =
        `${t('jwt.header')}:\n${dec(parts[0])}\n\n${t('jwt.payload')}:\n${dec(parts[1])}`;
      $out.className = 'ok';
    } catch (e) {
      $out.textContent = t('jwt.invalid') + ': ' + e.message;
      $out.className = 'err';
    }
  };
}

// b64url base64url → UTF-8 字符串
function b64url(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return decodeURIComponent(
    escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)));
}
