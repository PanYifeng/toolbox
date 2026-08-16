import { t } from '/core/i18n.js';

// render 颜色 HEX/RGB/HSL 转换
export default function (el) {
  el.innerHTML = `
    <div class="row">
      <input id="c-hex" type="text" value="#2563eb" />
      <span id="c-swatch"></span>
    </div>
    <pre id="c-out" class="muted">${t('common.output')}</pre>`;

  const $hex = el.querySelector('#c-hex');
  const $out = el.querySelector('#c-out');
  const $sw = el.querySelector('#c-swatch');

  $hex.oninput = update;
  update();

  function update() {
    const m = $hex.value.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m) {
      $out.textContent = t('color.invalid');
      $out.className = 'err';
      return;
    }
    const hex = m[1];
    const n = parseInt(hex, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    $sw.style.background = '#' + hex;
    $out.textContent =
      `HEX: #${hex.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: ${hsl(r, g, b)}`;
    $out.className = 'ok';
  }
}

// hsl RGB → HSL 字符串
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
