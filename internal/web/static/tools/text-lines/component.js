import { t } from '/core/i18n.js';

// render 文本行处理（排序/去重/去空格/删空行/反转）
export default function (el) {
  el.innerHTML = `
    <textarea id="l-in" placeholder="${t('tl.placeholder')}"></textarea>
    <div class="row" style="flex-wrap:wrap">
      <button data-f="sort">${t('tl.sort')}</button>
      <button data-f="dedup" class="btn-soft">${t('tl.dedup')}</button>
      <button data-f="trim" class="btn-soft">${t('tl.trim')}</button>
      <button data-f="empty" class="btn-soft">${t('tl.empty')}</button>
      <button data-f="reverse" class="btn-soft">${t('tl.reverse')}</button>
    </div>
    <pre id="l-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#l-in');
  const $out = el.querySelector('#l-out');
  el.querySelectorAll('button[data-f]').forEach((b) => {
    b.onclick = () => { $out.textContent = process($in.value, b.dataset.f); $out.className = 'ok'; };
  });
}

// process 按操作处理行
function process(text, f) {
  let lines = text.split('\n');
  switch (f) {
    case 'sort': lines = [...lines].sort(); break;
    case 'dedup': lines = [...new Set(lines)]; break;
    case 'trim': lines = lines.map((l) => l.trim()); break;
    case 'empty': lines = lines.filter((l) => l.trim() !== ''); break;
    case 'reverse': lines = lines.reverse(); break;
  }
  return lines.join('\n');
}
