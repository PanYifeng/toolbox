export default {
  id: 'text_diff',
  name: { zh: '文本差异', en: 'Text Diff' },
  category: { zh: '文本', en: 'Text' },
  icon: '⚖️',
  keywords: ['diff', 'compare', '差异', '对比', '文本比较', '行级 diff', '代码对比', 'merge'],
  desc: '在线文本差异对比工具，行级 diff 高亮新增与删除行，带行号与一键复制，纯前端处理不上传。',
  guide: {
    zh: `## 功能

左右两栏输入文本，按行计算差异，新增行绿色、删除行红色、上下文行灰色，并显示新旧行号；结果可一键复制。

## 使用场景

- 比较两版配置文件或代码片段的改动
- 核对文档修订前后的差异
- 检查数据导出是否一致

## 常见问题

- **完全相同**：返回「内容一致」提示
- **行级对比**：按整行比较，不做字符级 diff
- **数据安全**：所有比较在浏览器本地完成，不上传服务器`,
    en: `## Features

Paste text into two panes to get a line-level diff: added lines in green, removed in red, context in grey, with old and new line numbers; results can be copied.

## Use cases

- Compare two versions of a config file or code snippet
- Review document revisions
- Verify data export consistency

## FAQ

- **Identical input**: returns an "identical" hint
- **Granularity**: compares whole lines, not characters
- **Privacy**: diffing runs locally in the browser; nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
