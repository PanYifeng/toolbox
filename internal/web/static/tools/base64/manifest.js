export default {
  id: 'base64',
  name: { zh: 'Base64 编解码', en: 'Base64 Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔤',
  keywords: ['base64', 'encode', 'decode', '编码', '解码', 'utf-8', '字符串', '加密'],
  desc: '在线 Base64 编码解码工具，兼容 UTF-8 中文，纯浏览器本地处理不上传。',
  guide: {
    zh: `## 功能

将文本编码为 Base64 字符串，或将 Base64 字符串解码回原文，完整兼容 UTF-8（含中文）。

## 使用场景

- 在 HTTP、URL 或 JSON 中传递二进制或特殊字符
- 解码 Data URI 中的图片、字体等内嵌资源
- 排查接口返回的 Base64 字段内容

## 常见问题

- **中文乱码**：本工具使用 UTF-8 安全的编解码方式，中文不会被替换成问号
- **解码失败**：输入包含非法字符或长度不正确时会提示错误，请检查是否完整复制
- **数据安全**：编解码完全在浏览器本地完成，不上传服务器`,
    en: `## Features

Encode text to a Base64 string or decode it back, with full UTF-8 support including CJK characters.

## Use cases

- Transport binary or special characters over HTTP, URL, or JSON
- Decode embedded images and fonts in Data URIs
- Inspect Base64 fields returned by APIs

## FAQ

- **Chinese garbled**: this tool uses a UTF-8-safe routine, so CJK text never turns into question marks
- **Decode error**: illegal characters or wrong length trigger an error; check that the input is fully copied
- **Privacy**: encoding and decoding run locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
