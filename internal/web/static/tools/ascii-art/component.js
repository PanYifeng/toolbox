// ASCII 艺术生成器：上传图片 → FileReader → canvas 取像素 → 灰度 → 亮度映射字符 → 文本输出。
// 字符集按暗→亮排列（索引 0 = 最暗）；明暗方向可反转；行数按比例折半（字符高宽比约 2:1）。
import { t } from '/core/i18n.js';

// RAMPS 字符集预设（暗→亮）：从密到疏，@ 最暗、空格最亮
const RAMPS = [
  { id: 'classic', label: '@#%*+=-:. ', chars: '@#%*+=-:. ' },
  { id: 'dense', label: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ', chars: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ' },
  { id: 'blocks', label: '█▓▒░ ', chars: '█▓▒░ ' },
];
const WIDTHS = [80, 120, 160, 200];

export default function (el) {
  let img = null; // 已解码的 HTMLImageElement
  let invert = false; // 明暗反转

  el.innerHTML = `
    <div class="asc-bar">
      <label class="btn-soft asc-upload">${t('asc.upload')}
        <input id="asc-file" type="file" accept="image/*" hidden>
      </label>
      <label>${t('asc.width')}
        <select id="asc-width">${WIDTHS.map((w) => `<option value="${w}">${w}</option>`).join('')}</select>
      </label>
      <label>${t('asc.charset')}
        <select id="asc-ramp">${RAMPS.map((r) => `<option value="${r.id}">${r.label}</option>`).join('')}</select>
      </label>
      <label class="asc-chk"><input id="asc-invert" type="checkbox"> ${t('asc.invert')}</label>
      <button id="asc-copy" class="btn-soft">${t('asc.copy')}</button>
    </div>
    <p class="muted asc-tip">${t('asc.tip')}</p>
    <div id="asc-preview" class="asc-preview"></div>
    <pre id="asc-out" class="asc-out muted"></pre>`;

  const $file = el.querySelector('#asc-file');
  const $out = el.querySelector('#asc-out');
  const $prev = el.querySelector('#asc-preview');
  $file.onchange = (e) => onFile(e, $prev, () => render($out));
  el.querySelector('#asc-width').onchange = () => render($out);
  el.querySelector('#asc-ramp').onchange = () => render($out);
  el.querySelector('#asc-invert').onchange = (e) => { invert = e.target.checked; render($out); };
  el.querySelector('#asc-copy').onclick = () => copyOut($out);
  render($out);
}

// onFile 读取文件并解码为 Image，预览缩略图后触发渲染
function onFile(e, $prev, done) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const im = new Image();
    im.onload = () => { img = im; $prev.innerHTML = `<img src="${im.src}" alt="preview">`; done(); };
    im.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// render 主渲染：取当前参数把 img 转成 ASCII 写入输出区
function render($out) {
  if (!img) { $out.textContent = t('asc.tip'); return; }
  const ramp = currentRamp(document.getElementById('asc-ramp').value);
  const cols = Number(document.getElementById('asc-width').value);
  $out.textContent = toAscii(img, cols, ramp, invert);
}

// currentRamp 按 id 取字符集（找不到回退 classic）
function currentRamp(id) {
  return (RAMPS.find((r) => r.id === id) || RAMPS[0]).chars;
}

// toAscii 核心：按列数缩放采样，逐像素灰度映射字符，行数折半（高宽比 2:1）
function toAscii(im, cols, ramp, invert) {
  const ch = ramp.length;
  // 行数折半：字符高约为宽的 2 倍
  const rows = Math.max(1, Math.round((im.height / im.width) * cols / 2));
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const cx = c.getContext('2d');
  cx.drawImage(im, 0, 0, cols, rows);
  const data = cx.getImageData(0, 0, cols, rows).data;
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      // 系数法 ITU-R BT.601 灰度
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // 亮→低索引？默认暗→0：idx=(255-g)/255*(ch-1)；反转则亮→0
      let idx = Math.round((invert ? g : (255 - g)) / 255 * (ch - 1));
      if (idx < 0) idx = 0; else if (idx >= ch) idx = ch - 1;
      line += ramp[idx];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

// copyOut 复制输出文本到剪贴板（降级用 textarea + execCommand）
function copyOut($out) {
  const txt = $out.textContent || '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(() => hint($out)).catch(() => fallbackCopy(txt));
  } else {
    fallbackCopy(txt);
  }
}

// fallbackCopy 无 Clipboard API 时的降级复制
function fallbackCopy(txt) {
  const ta = document.createElement('textarea');
  ta.value = txt; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
  ta.remove();
}

// hint 短暂提示已复制（改按钮文案 1.2s）
function hint($out) {
  const $btn = document.getElementById('asc-copy');
  if (!$btn) return;
  const old = $btn.textContent;
  $btn.textContent = '✓'; setTimeout(() => { $btn.textContent = old; }, 1200);
}
