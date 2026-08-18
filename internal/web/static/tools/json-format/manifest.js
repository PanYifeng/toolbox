export default {
  id: 'json_format',
  name: { zh: 'JSON 格式化', en: 'JSON Format' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '{ }',
  keywords: ['json', 'format', '格式化', '校验', 'beautify', '压缩', '转义'],
  desc: '在线 JSON 格式化与校验工具，支持美化、压缩、错误定位，纯前端处理不上传。',
  guide: {
    zh: `## 功能

将杂乱或压缩的 JSON 字符串美化成带缩进的可读格式，同时校验语法并定位错误位置。

## 使用场景

- 调试 API 返回的 JSON，快速看清嵌套结构
- 检查 JSON 配置文件语法是否正确
- 压缩 JSON 去除空白，减小传输体积

## 常见问题

- **解析报错**：错误信息会指出行号与原因，常见是多余逗号、引号未闭合或键名缺引号
- **数据安全**：所有解析在浏览器本地完成，不上传服务器`,
    en: `## Features

Beautify compact JSON into indented readable form, validate syntax and pinpoint errors.

## Use cases

- Debug API responses and inspect nested structure
- Validate JSON config files
- Minify JSON by stripping whitespace

## FAQ

- **Parse error**: the message points to the line and cause — usually a trailing comma, unclosed quote, or unquoted key
- **Privacy**: parsing runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
