export default {
  id: 'hash',
  name: { zh: '哈希计算', en: 'Hash Generator' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '#️⃣',
  keywords: ['hash', 'sha', 'sha256', 'sha512', '摘要', 'digest', 'sha1', 'sha384', '散列', '指纹'],
  desc: '在线哈希计算工具，基于 Web Crypto 计算 SHA-1/256/384/512 摘要，纯前端本地运算不上传文本。',
  guide: {
    zh: `## 功能

输入任意文本，调用浏览器原生 Web Crypto API 计算 SHA-1、SHA-256、SHA-384、SHA-512 摘要，输出十六进制字符串并支持一键复制。

## 使用场景

- 校验文件或文本的完整性、比对内容是否一致
- 生成接口签名所需的摘要值
- 验证密码哈希、数据指纹等场景

## 常见问题

- **支持 MD5 吗**：不支持，Web Crypto 不提供 MD5，且 MD5 已不安全
- **数据会上传吗**：不会，全部在浏览器本地计算
- **大文本会卡吗**：Web Crypto 异步执行，常规文本秒级出结果`,
    en: `## Features

Compute SHA-1, SHA-256, SHA-384 and SHA-512 digests of any text using the browser's native Web Crypto API, output as a hex string with one-click copy.

## Use cases

- Verify text or file integrity and compare content
- Generate digest values for API signatures
- Hash passwords or data fingerprints

## FAQ

- **Is MD5 supported**: no, Web Crypto does not provide MD5 and it is insecure
- **Is data uploaded**: no, all computation runs locally in your browser
- **Will large text freeze**: Web Crypto is asynchronous, normal text finishes in milliseconds`,
  },
  component: () => import('./component.js'),
};
