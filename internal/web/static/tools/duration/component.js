import { t } from '/core/i18n.js';

// 单位 → 毫秒（年/月为近似：365.25 天 / 30.4375 天）
const TO_MS = {
  year: 365.25 * 86400 * 1000,
  month: 30.4375 * 86400 * 1000,
  week: 7 * 86400 * 1000,
  day: 86400 * 1000,
  hour: 3600 * 1000,
  min: 60 * 1000,
  sec: 1000,
  ms: 1,
};

// 输入单位顺序（含月/周，便于选择）
const UNITS = ['year', 'month', 'week', 'day', 'hour', 'min', 'sec', 'ms'];
// 复合分解顺序（跳过月/周——它们无法确定性组合）
const COMPOUND = [
  ['year', 365.25 * 86400 * 1000],
  ['day', 86400 * 1000],
  ['hour', 3600 * 1000],
  ['min', 60 * 1000],
  ['sec', 1000],
  ['ms', 1],
];

// render 时间长度换算：输入数值 + 单位，输出复合分解 + 各单位等价
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('dur.desc')}</p>
    <div class="row">
      <input id="d-amount" type="text" placeholder="${t('dur.amount')}" />
      <select id="d-unit">
        ${UNITS.map((u) => `<option value="${u}">${t('dur.u_' + u)}</option>`).join('')}
      </select>
      <button id="d-go">${t('dur.convert')}</button>
    </div>
    <pre id="d-out" class="muted">-</pre>`;

  el.querySelector('#d-go').onclick = convert;
  el.querySelector('#d-amount').onkeydown = (e) => {
    if (e.key === 'Enter') convert();
  };

  // convert 执行换算并渲染结果
  function convert() {
    const $out = el.querySelector('#d-out');
    const raw = el.querySelector('#d-amount').value.trim();
    const n = Number(raw);
    if (!raw || Number.isNaN(n)) {
      $out.textContent = t('dur.invalid');
      $out.className = 'err';
      return;
    }
    const unit = el.querySelector('#d-unit').value;
    const totalMs = n * TO_MS[unit];
    const compound = breakdown(totalMs);
    const equiv = UNITS.map((u) => `${t('dur.u_' + u)}: ${fmt(totalMs / TO_MS[u])}`);
    $out.textContent = `${compound}\n\n${equiv.join('\n')}`;
    $out.className = 'ok';
  }
}

// breakdown 把总毫秒分解为 "31 年 251 天 7 小时 46 分 40 秒" 形式
// 年/天/时/分/秒始终展示（含 0）；毫秒仅在有非零余数时追加
function breakdown(totalMs) {
  let rem = Math.abs(totalMs);
  const parts = [];
  COMPOUND.forEach(([u, ms], i) => {
    const v = Math.floor(rem / ms);
    rem -= v * ms;
    if (i < COMPOUND.length - 1) parts.push(`${v} ${t('dur.u_' + u)}`);
    else if (v > 0) parts.push(`${v} ${t('dur.u_' + u)}`); // 毫秒仅非零展示
  });
  const sign = totalMs < 0 ? '-' : '';
  return sign + parts.join(' ');
}

// fmt 格式化数值，超大/过小用科学计数法，否则保留 6 位去尾零
function fmt(v) {
  if (!isFinite(v)) return '∞';
  if (v !== 0 && (Math.abs(v) >= 1e12 || Math.abs(v) < 1e-6)) return v.toExponential(4);
  return String(parseFloat(v.toFixed(6)));
}
