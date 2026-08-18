// renderMarkdown 极简 Markdown → HTML（先转义再替换）。
// 提取自 tools/markdown 组件，供工具页 guide 等场景复用。
export function renderMarkdown(md) {
  if (!md) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split('\n');
  const html = [];
  let inCode = false;
  let inList = false;
  let para = [];
  // closeList 关闭当前列表
  const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };
  // flushPara 把累积的文本行合并成一个 <p>（软换行用 <br>）
  const flushPara = () => { if (para.length) { html.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
  // flushBlocks 关闭所有块级上下文（段落 + 列表）
  const flushBlocks = () => { flushPara(); closeList(); };
  for (const line of lines) {
    if (line.startsWith('```')) { flushBlocks(); inCode = !inCode; html.push(inCode ? '<pre>' : '</pre>'); continue; }
    if (inCode) { html.push(esc(line)); continue; }
    let l = esc(line);
    l = l.replace(/^######\s+/, '<h6>').replace(/^#####\s+/, '<h5>')
         .replace(/^####\s+/, '<h4>').replace(/^###\s+/, '<h3>')
         .replace(/^##\s+/, '<h2>').replace(/^#\s+/, '<h1>');
    if (/^<h[1-6]>/.test(l)) { flushBlocks(); html.push(l + '</h' + l[2] + '>'); continue; }
    if (/^\s*[-*]\s+/.test(l)) {
      flushPara();
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push('<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>');
      continue;
    }
    // 空行：段落分隔，不渲染 <br>（避免多余间距）
    if (l.trim() === '') { flushBlocks(); continue; }
    closeList();
    para.push(inline(l));
  }
  flushBlocks();
  return html.join('\n');
}

// inline 行内格式：粗体/斜体/代码/链接
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
