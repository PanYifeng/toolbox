export default {
  id: 'markdown',
  name: { zh: 'Markdown 预览', en: 'Markdown Preview' },
  category: { zh: '文本', en: 'Text' },
  icon: '📝',
  keywords: ['markdown', 'md', 'preview', '预览', '实时', 'render', '渲染', '编辑器', 'md to html'],
  desc: '在线 Markdown 实时预览工具，左侧编辑右侧即时渲染 HTML，纯前端解析不上传文档。',
  guide: {
    zh: `## 功能

左侧输入 Markdown 文本，右侧通过内置渲染器实时输出 HTML 预览，输入即渲染，无需点击按钮。

## 使用场景

- 写文档时即时查看 Markdown 排版效果
- 复制一段 Markdown 快速确认渲染样式
- 在不支持 MD 的地方粘贴前先转成预览效果

## 常见问题

- **支持哪些语法**：标题、列表、代码、引用、链接、图片、表格等常见语法
- **内容会上传吗**：不会，渲染完全在浏览器本地完成
- **能导出 HTML 吗**：本工具只做预览，不提供导出文件`,
    en: `## Features

Type Markdown on the left and get real-time HTML preview on the right via the built-in renderer — rendering happens on every keystroke with no button to click.

## Use cases

- Instantly check Markdown formatting while writing docs
- Paste a Markdown snippet to quickly verify the rendered look
- Preview before pasting into a place that does not support MD

## FAQ

- **Which syntax is supported**: headings, lists, code, quotes, links, images, tables and other common syntax
- **Is content uploaded**: no, rendering runs entirely in your browser
- **Can I export HTML**: this tool only previews and does not export files`,
  },
  component: () => import('./component.js'),
};
