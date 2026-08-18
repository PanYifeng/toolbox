// renderMarkdown 极简 Markdown → HTML（先转义再替换）。
// 提取自 tools/markdown 组件，供工具页 guide 等场景复用。
export function renderMarkdown(md) {
  if (!md) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split('\n');
  const html = [];
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith('```')) { inCode = !inCode; html.push(inCode ? '<pre>' : '</pre>'); continue; }
    if (inCode) { html.push(esc(line)); continue; }
    let l = esc(line);
    l = l.replace(/^######\s+/, '<h6>').replace(/^#####\s+/, '<h5>')
         .replace(/^####\s+/, '<h4>').replace(/^###\s+/, '<h3>')
         .replace(/^##\s+/, '<h2>').replace(/^#\s+/, '<h1>');
    if (/^<h[1-6]>/.test(l)) { html.push(l + '</h' + l[2] + '>'); continue; }
    if (/^\s*[-*]\s+/.test(l)) { html.push('<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue; }
    html.push(inline(l) || '<br>');
  }
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
