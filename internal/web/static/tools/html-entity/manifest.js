export default {
  id: 'html_entity',
  name: { zh: 'HTML 实体编解码', en: 'HTML Entity Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '&lt;/&gt;',
  keywords: ['html', 'entity', 'escape', 'unescape', '实体', '转义', '编码', '解码', 'htmlentities', 'special chars'],
  desc: `在线 HTML 实体编解码工具，支持 & < > " ' 等特殊字符转义与反转义，纯前端处理不上传。`,
  guide: {
    zh: `## 功能

将文本中的 &、<、>、"、' 等特殊字符转义为 HTML 实体（如 &lt; &gt; &amp;），也可把含实体的字符串反向还原为原始字符。

## 使用场景

- 在 HTML 中显示代码片段或标签时避免被解析
- 处理用户输入、防止 XSS 注入的快速转义
- 还原从接口拿到的含 HTML 实体的字符串

## 常见问题

- **支持哪些字符**：& < > " ' 五种最常见的需要转义的字符
- **解码安全吗**：使用 DOM 原生解析，仅做实体还原不执行脚本
- **数据上传吗**：纯前端处理，不发送到服务器`,
    en: `## Features

Escape special characters like & < > " ' into HTML entities (e.g. &lt; &gt; &amp;) or reverse entity-laden strings back to their original characters.

## Use cases

- Display code snippets or tags in HTML without them being parsed
- Quickly escape user input to help prevent XSS injection
- Decode strings containing HTML entities returned from APIs

## FAQ

- **Which characters are supported**: the five most common ones — & < > " '
- **Is decoding safe**: it uses native DOM parsing to restore entities without executing scripts
- **Is data uploaded**: processing is fully client-side, nothing is sent to a server`,
  },
  component: () => import('./component.js'),
};
