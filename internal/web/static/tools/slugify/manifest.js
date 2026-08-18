export default {
  id: 'slugify',
  name: { zh: 'Slug 生成', en: 'Slugify' },
  category: { zh: '文本', en: 'Text' },
  icon: '🔗',
  keywords: ['slug', 'url', 'permalink', 'slugify', 'slug 生成', '链接', 'SEO', '中文转拼音'],
  desc: '在线 URL Slug 生成工具，实时将标题转成小写连字符格式，去变音符号，纯前端处理不上传。',
  guide: {
    zh: `## 功能

将输入文本实时转换成 URL 友好的 slug：转小写、去除变音符号与特殊字符、空格与下划线统一为连字符。

## 使用场景

- 生成博客或文档站点的 permalink
- 将商品或文章标题转成 SEO 友好的 URL 片段
- 规范化文件名、目录名

## 常见问题

- **非拉丁字符**：会被过滤，建议先用拼音工具转换中文
- **连续连字符**：会自动合并为单个，首尾连字符会去除
- **空输入**：输出占位符「-」，便于复制判断`,
    en: `## Features

Converts text in real time into a URL-friendly slug: lowercases, strips diacritics and special characters, joins words with hyphens.

## Use cases

- Generate permalinks for blogs or documentation sites
- Turn article or product titles into SEO-friendly URL segments
- Normalize file and directory names

## FAQ

- **Non-latin characters**: filtered out; convert Chinese to pinyin first
- **Consecutive hyphens**: collapsed into one; leading and trailing hyphens trimmed
- **Empty input**: outputs a placeholder "-" so you can tell at a glance`,
  },
  component: () => import('./component.js'),
};
