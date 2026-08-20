// 人格测试可视化原语：雷达图（内联 SVG）、进度条（HTML）、顶点坐标（SVG 与 canvas 共享）。
// 无外部依赖，纯内联 SVG/CSS，可同时用于免费结果页渲染与 PNG 分享卡绘制。

// esc 转义 HTML 文本节点
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// radarPoints 计算各轴雷达顶点 [x,y]；values 为 0-100，从正上方起顺时针均匀分布
export function radarPoints(values, radius, cx, cy) {
  const n = values.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2; // 正上方起，顺时针
    const r = (Math.max(0, Math.min(100, values[i])) / 100) * radius;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
}

// radarSVG 在 container 内渲染一张内联 SVG 雷达图（4 圈网格 + 轴线 + 数据多边形 + 标签）
// opts: { axes:[{label,pct}], accent, size }
export function radarSVG(container, opts) {
  const { axes, accent = '#2A5DB0', size = 260 } = opts;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 38; // 留边给标签
  const n = axes.length;
  const values = axes.map((a) => a.pct);
  let grid = '';
  for (let ring = 1; ring <= 4; ring++) {
    const rr = (radius * ring) / 4;
    const rp = radarPoints(new Array(n).fill((ring / 4) * 100), rr, cx, cy);
    grid += `<polygon points="${rp.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--border,#e2e2e2)" stroke-width="1"/>`;
  }
  let axesLine = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    axesLine += `<line x1="${cx}" y1="${cy}" x2="${cx + radius * Math.cos(a)}" y2="${cy + radius * Math.sin(a)}" stroke="var(--border,#e2e2e2)" stroke-width="1"/>`;
  }
  const dp = radarPoints(values, radius, cx, cy);
  const poly = `<polygon points="${dp.map((p) => p.join(',')).join(' ')}" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2"/>`;
  let dotsLabels = '';
  axes.forEach((ax, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lx = cx + (radius + 20) * Math.cos(a);
    const ly = cy + (radius + 20) * Math.sin(a);
    dotsLabels += `<circle cx="${dp[i][0]}" cy="${dp[i][1]}" r="3.5" fill="${accent}"/>`;
    dotsLabels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--fg,#333)">${esc(ax.label)}</text>`;
  });
  container.innerHTML = `<svg class="ps-radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="radar">${grid}${axesLine}${poly}${dotsLabels}</svg>`;
}

// barHTML 返回一条 CSS 进度条 HTML（pct 0-100，label 文本）
export function barHTML(pct, label, accent = '#2A5DB0') {
  const p = Math.max(0, Math.min(100, pct));
  return `<div class="ps-bar"><span class="ps-bar-label">${esc(label)} <b>${Math.round(p)}%</b></span><span class="ps-bar-track"><span class="ps-bar-fill" style="width:${p}%;background:${accent}"></span></span></div>`;
}

// dichotomyHTML 返回二选一偏好条（左 first 占 a%，右 second 占 b%，accent 高亮胜出侧）
// 用于 MBTI 四 dichotomy；pctA 为第一极占比（0-100）
export function dichotomyHTML(pctA, first, second, accent = '#2A5DB0') {
  const a = Math.max(0, Math.min(100, pctA));
  const b = 100 - a;
  const winIsA = a >= b;
  const left = winIsA ? `<b>${esc(first)}</b> ${Math.round(a)}%` : `${esc(first)} ${Math.round(a)}%`;
  const right = winIsA ? `${esc(second)} ${Math.round(b)}%` : `<b>${esc(second)}</b> ${Math.round(b)}%`;
  return `<div class="ps-dicho"><span class="ps-dicho-side">${left}</span><span class="ps-dicho-track"><span class="ps-dicho-fill" style="width:${a}%;background:${accent}"></span></span><span class="ps-dicho-side">${right}</span></div>`;
}

export default { radarPoints, radarSVG, barHTML, dichotomyHTML };
