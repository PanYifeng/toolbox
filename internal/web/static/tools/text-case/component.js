import { t } from '/core/i18n.js';

// render 大小写转换
export default function (el) {
  el.innerHTML = `
    <textarea id="c-in" placeholder="${t('tc.placeholder')}"></textarea>
    <div class="row">
      <button data-f="camel">camelCase</button>
      <button data-f="snake" class="btn-soft">snake_case</button>
      <button data-f="kebab" class="btn-soft">kebab-case</button>
      <button data-f="upper" class="btn-soft">UPPER</button>
      <button data-f="lower" class="btn-soft">lower</button>
      <button data-f="title" class="btn-soft">Title</button>
    </div>
    <pre id="c-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#c-in');
  const $out = el.querySelector('#c-out');
  el.querySelectorAll('button[data-f]').forEach((b) => {
    b.onclick = () => { $out.textContent = convert($in.value, b.dataset.f); $out.className = 'ok'; };
  });
}

// convert 按目标风格转换
function convert(text, f) {
  const words = text.trim().split(/[\s_\-]+/).filter(Boolean);
  switch (f) {
    case 'camel': return words.map((w, i) => i ? cap(w) : w.toLowerCase()).join('');
    case 'snake': return words.map((w) => w.toLowerCase()).join('_');
    case 'kebab': return words.map((w) => w.toLowerCase()).join('-');
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'title': return words.map(cap).join(' ');
  }
  return text;
}

function cap(w) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
