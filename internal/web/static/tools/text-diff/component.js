import { t } from '/core/i18n.js';

// render 文本差异（基于 LCS 的行级 diff）
export default function (el) {
  el.innerHTML = `
    <div class="row" style="align-items:stretch">
      <textarea id="d-left" placeholder="${t('td.left')}"></textarea>
      <textarea id="d-right" placeholder="${t('td.right')}"></textarea>
    </div>
    <button id="d-go">${t('td.diff')}</button>
    <pre id="d-out" class="muted">${t('common.output')}</pre>`;

  el.querySelector('#d-go').onclick = () => {
    const a = el.querySelector('#d-left').value.split('\n');
    const b = el.querySelector('#d-right').value.split('\n');
    const $out = el.querySelector('#d-out');
    const lines = diff(a, b);
    if (!lines.some((l) => l.startsWith('+') || l.startsWith('-'))) {
      $out.textContent = t('td.identical');
      $out.className = 'muted';
      return;
    }
    $out.textContent = lines.join('\n');
    $out.className = 'ok';
  };
}

// diff 返回带 +/- 前缀的行数组
function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push('  ' + a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + a[i]); i++; }
    else { out.push('+ ' + b[j]); j++; }
  }
  while (i < n) out.push('- ' + a[i++]);
  while (j < m) out.push('+ ' + b[j++]);
  return out;
}
