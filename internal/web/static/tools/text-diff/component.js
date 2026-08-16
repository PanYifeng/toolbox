import { t } from '/core/i18n.js';

// render 文本差异（行级 diff，输入框带行号，新增/删除行着色，结果可复制）
export default function (el) {
  el.innerHTML = `
    <div class="lined-row">
      <div class="lined">
        <div class="gutter" id="g-left"></div>
        <textarea id="d-left" placeholder="${t('td.left')}" spellcheck="false"></textarea>
      </div>
      <div class="lined">
        <div class="gutter" id="g-right"></div>
        <textarea id="d-right" placeholder="${t('td.right')}" spellcheck="false"></textarea>
      </div>
    </div>
    <div class="game-bar">
      <button id="d-go">${t('td.diff')}</button>
      <button id="d-copy" class="btn-soft">${t('td.copy')}</button>
    </div>
    <div id="d-out" class="diff muted">${t('common.output')}</div>`;

  const $left = el.querySelector('#d-left');
  const $right = el.querySelector('#d-right');
  const $out = el.querySelector('#d-out');
  let lastPlain = '';

  setupLined($left, el.querySelector('#g-left'));
  setupLined($right, el.querySelector('#g-right'));

  el.querySelector('#d-go').onclick = runDiff;
  el.querySelector('#d-copy').onclick = copyResult;

  // copyResult 复制纯文本差异结果
  async function copyResult(e) {
    if (!lastPlain) return;
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(lastPlain);
      btn.textContent = t('ts.copied');
      setTimeout(() => (btn.textContent = t('td.copy')), 1200);
    } catch {
      btn.textContent = t('ts.copied');
      setTimeout(() => (btn.textContent = t('td.copy')), 1200);
    }
  }

  // runDiff 计算并渲染差异
  function runDiff() {
    const a = $left.value.split('\n');
    const b = $right.value.split('\n');
    const lines = diff(a, b);
    if (!lines.some((l) => l.startsWith('+') || l.startsWith('-'))) {
      $out.className = 'diff muted';
      $out.textContent = t('td.identical');
      lastPlain = t('td.identical');
      return;
    }
    $out.className = 'diff';
    let oldN = 0, newN = 0;
    const html = [], plain = [];
    for (const line of lines) {
      const mk = line[0];
      const text = line.slice(2);
      let o = '', n = '';
      if (mk === ' ') { oldN++; newN++; o = oldN; n = newN; }
      else if (mk === '-') { oldN++; o = oldN; }
      else { newN++; n = newN; }
      html.push(lineHtml(mk, text, o, n));
      plain.push(`${mk} ${text}`);
    }
    $out.innerHTML = html.join('');
    lastPlain = plain.join('\n');
  }
}

// setupLined 为 textarea 绑定行号槽：随输入更新行号、滚动同步
function setupLined(ta, gutter) {
  const update = () => {
    const n = Math.max(1, ta.value.split('\n').length);
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    gutter.textContent = s;
  };
  update();
  ta.addEventListener('input', update);
  ta.addEventListener('scroll', () => {
    gutter.scrollTop = ta.scrollTop;
  });
}

// lineHtml 单行渲染：左行号 + 右行号 + 标记 + 文本，带颜色
function lineHtml(mk, text, o, n) {
  const cls = mk === '-' ? 'del' : mk === '+' ? 'add' : 'ctx';
  return `<div class="diff-line ${cls}">` +
    `<span class="ln">${o}</span><span class="ln">${n}</span>` +
    `<span class="mk">${mk}</span>${escapeHtml(text)}</div>`;
}

// escapeHtml 转义 HTML 特殊字符，防注入
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// diff 返回带 +/- / 空格 前缀的行数组
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
