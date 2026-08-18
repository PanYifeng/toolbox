export default {
  id: 'text_case',
  name: { zh: '大小写转换', en: 'Case Converter' },
  category: { zh: '文本', en: 'Text' },
  icon: 'Aa',
  keywords: ['case', 'camel', 'snake', 'kebab', 'upper', 'lower', '大小写', '转换', 'title', 'pascal'],
  desc: '在线文本大小写转换工具，支持 camelCase、snake_case、kebab-case、UPPER、lower、Title 互转，纯前端处理。',
  guide: {
    zh: `## 功能

一键将文本在六种命名风格之间转换：camelCase、snake_case、kebab-case、UPPER、lower、Title Case。

## 使用场景

- 编程时在变量、常量、文件名风格间切换
- 统一文档标题或按钮文案的大小写
- 清洗导入数据中的字段名

## 常见问题

- **分词规则**：按空格、下划线、连字符切分单词，连续大小写视为一个整体
- **空文本**：输出为空，需先输入内容
- **保留原文本**：UPPER 与 lower 直接转换原文本，不重新分词`,
    en: `## Features

Convert text between six naming styles with one click: camelCase, snake_case, kebab-case, UPPER, lower and Title Case.

## Use cases

- Switch between variable, constant and filename conventions while coding
- Unify casing for document titles or button labels
- Clean up field names from imported data

## FAQ

- **Tokenization**: splits on spaces, underscores and hyphens; consecutive case changes are treated as one token
- **Empty input**: outputs nothing; enter text first
- **Original preserved**: UPPER and lower convert the raw text without re-tokenizing`,
  },
  component: () => import('./component.js'),
};
