import { t } from '/core/i18n.js';

// render 进制转换（2/8/10/16 互转）
export default function (el) {
  el.innerHTML = `
    <div class="row">
      <input id="x-val" type="text" placeholder="${t('radix.value')}" />
      <select id="x-from">
        <option value="10">DEC (10)</option>
        <option value="2">BIN (2)</option>
        <option value="8">OCT (8)</option>
        <option value="16">HEX (16)</option>
      </select>
    </div>
    <pre id="x-out" class="muted">${t('common.output')}</pre>`;

  const $val = el.querySelector('#x-val');
  const $from = el.querySelector('#x-from');
  const $out = el.querySelector('#x-out');

  $val.oninput = update;
  $from.onchange = update;
  update();

  function update() {
    const v = $val.value.trim();
    if (!v) { $out.textContent = t('common.output'); $out.className = 'muted'; return; }
    const from = parseInt($from.value, 10);
    const n = parseInt(v, from);
    if (isNaN(n)) {
      $out.textContent = t('radix.invalid');
      $out.className = 'err';
      return;
    }
    $out.textContent =
      `BIN: ${n.toString(2)}\nOCT: ${n.toString(8)}\nDEC: ${n.toString(10)}\nHEX: ${n.toString(16).toUpperCase()}`;
    $out.className = 'ok';
  }
}
