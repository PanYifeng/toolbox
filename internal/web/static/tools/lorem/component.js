import { t } from '/core/i18n.js';

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ' +
  'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit').split(' ');

// render Lorem ipsum 生成
export default function (el) {
  el.innerHTML = `
    <div class="row">
      <label>${t('lm.paragraphs')}: <input id="l-p" type="number" value="3" min="1" max="20" style="width:80px"/></label>
      <label>${t('lm.wordsPer')}: <input id="l-w" type="number" value="40" min="5" max="200" style="width:80px"/></label>
      <button id="l-go">${t('common.generate')}</button>
      <button id="l-copy" class="btn-soft">${t('common.copy')}</button>
    </div>
    <pre id="l-out" class="muted">${t('common.output')}</pre>`;

  el.querySelector('#l-go').onclick = () => {
    const p = parseInt(el.querySelector('#l-p').value) || 3;
    const w = parseInt(el.querySelector('#l-w').value) || 40;
    const paras = [];
    for (let i = 0; i < p; i++) paras.push(para(w));
    el.querySelector('#l-out').textContent = paras.join('\n\n');
    el.querySelector('#l-out').className = 'ok';
  };
  el.querySelector('#l-copy').onclick = () => navigator.clipboard?.writeText(el.querySelector('#l-out').textContent);
}

// para 生成一段
function para(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  let s = arr.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
