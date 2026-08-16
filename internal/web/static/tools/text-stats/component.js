import { t } from '/core/i18n.js';

// render 文本统计（字符/单词/行/字节/阅读时间，实时）
export default function (el) {
  el.innerHTML = `
    <textarea id="s-in" placeholder="${t('ts.placeholder')}"></textarea>
    <pre id="s-out" class="muted">${t('common.output')}</pre>`;

  const $in = el.querySelector('#s-in');
  const $out = el.querySelector('#s-out');
  $in.oninput = update;
  update();

  function update() {
    const text = $in.value;
    const chars = text.length;
    const words = (text.match(/\S+/g) || []).length;
    const lines = text === '' ? 0 : text.split('\n').length;
    const bytes = new Blob([text]).size;
    const mins = Math.max(1, Math.round(words / 200));
    $out.textContent =
      `${t('ts.chars')}: ${chars}\n${t('ts.words')}: ${words}\n` +
      `${t('ts.lines')}: ${lines}\n${t('ts.bytes')}: ${bytes}\n` +
      `${t('ts.readtime')}: ${mins} ${t('ts.minute')}`;
    $out.className = chars ? 'ok' : 'muted';
  }
}
