export default {
  id: 'text_stats',
  name: { zh: '文本统计', en: 'Text Stats' },
  category: { zh: '文本', en: 'Text' },
  icon: '📊',
  keywords: ['count', 'words', 'chars', 'lines', '统计', '字数', '字符数', '字节', '阅读时间'],
  desc: '在线文本统计工具，实时计算字符数、单词数、行数、字节数与预估阅读时间，纯前端处理。',
  guide: {
    zh: `## 功能

输入文本即可实时统计字符数、单词数、行数、字节数，并按 200 词/分钟估算阅读时间。

## 使用场景

- 撰写文章、推文时控制字数
- 检查字符串长度是否符合接口字段限制
- 估算博客或文档的阅读时长

## 常见问题

- **单词计数规则**：以连续非空白字符作为一个单词，中文按字符显示而非分词
- **字节数**：按 UTF-8 编码计算，中文一个字符占 3 字节
- **数据安全**：统计在浏览器本地完成，不上传服务器`,
    en: `## Features

Type to get live counts of characters, words, lines, and bytes, plus an estimated read time at 200 wpm.

## Use cases

- Keep word count within limits while writing posts or tweets
- Check string length against API field limits
- Estimate reading time for blogs or docs

## FAQ

- **Word counting**: a word is a run of non-whitespace characters; Chinese is counted by character, not segmented
- **Bytes**: UTF-8 encoded size; a Chinese character takes 3 bytes
- **Privacy**: counting runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
