export default {
  id: 'url_encode',
  name: { zh: 'URL 编解码', en: 'URL Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔗',
  keywords: ['url', 'uri', 'encode', 'decode', 'percent', '编码', '解码', '百分号', '转义'],
  desc: '在线 URL 编解码工具，支持百分号编码与解码，处理特殊字符与中文，纯前端处理不上传。',
  guide: {
    zh: `## 功能

对文本进行 URL 百分号编码（encodeURIComponent）或解码（decodeURIComponent），处理空格、中文及特殊符号。

## 使用场景

- 拼接带查询参数的 URL，避免中文或符号破坏结构
- 解码被编码的 URL 参数查看原始内容
- 处理接口返回的编码字符串

## 常见问题

- **解码报错**：常见于序列中存在非法百分号编码，如残缺的 「%2」
- **与 encodeURI 区别**：本工具使用 encodeURIComponent，会编码 「:」「/」「?」 等分隔符，适合查询参数
- **数据安全**：编解码在浏览器本地完成，不上传服务器`,
    en: `## Features

Encode text with URL percent-encoding (encodeURIComponent) or decode it, handling spaces, Chinese, and special symbols.

## Use cases

- Build URLs with query params without breaking them on Chinese or symbols
- Decode encoded URL params to inspect the original content
- Process encoded strings returned by APIs

## FAQ

- **Decode error**: usually caused by an illegal percent-encoding sequence such as a truncated "%2"
- **vs encodeURI**: this tool uses encodeURIComponent, which also encodes ":", "/", "?" and is suited for query params
- **Privacy**: encoding and decoding run locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
