export default {
  id: 'text_lines',
  name: { zh: '文本行处理', en: 'Line Tools' },
  category: { zh: '文本', en: 'Text' },
  icon: '☰',
  keywords: ['lines', 'sort', 'dedupe', 'unique', 'trim', '行', '去重', '排序', '反转', '去空行'],
  desc: '在线文本行处理工具，支持排序、去重、去空白、删空行、反转，纯前端处理不上传。',
  guide: {
    zh: `## 功能

对多行文本按行进行排序、去重、去首尾空白、删除空行或反转顺序，一键得到处理结果。

## 使用场景

- 清理日志或数据导出中的重复行
- 对配置项、ID 列表进行排序和去重
- 去除复制粘贴带来的多余空行

## 常见问题

- **区分大小写**：排序与去重均区分大小写，大写字母排在小写之前
- **原顺序丢失**：去重保留首次出现的行，排序后原始顺序会被覆盖
- **数据安全**：所有处理在浏览器本地完成，不上传服务器`,
    en: `## Features

Process multi-line text per line: sort, dedupe, trim whitespace, drop empty lines, or reverse order.

## Use cases

- Clean duplicate lines from logs or data exports
- Sort and dedupe config items or ID lists
- Strip extra blank lines from pasted content

## FAQ

- **Case sensitivity**: sort and dedupe are case-sensitive, uppercase comes first
- **Original order**: dedupe keeps the first occurrence; sorting overwrites the original order
- **Privacy**: all processing runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
