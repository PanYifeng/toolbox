export default {
  id: 'jwt',
  name: { zh: 'JWT 解码', en: 'JWT Decoder' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔑',
  keywords: ['jwt', 'json', 'token', '解码', 'decode', 'json web token', 'base64url', 'header', 'payload', '调试'],
  desc: '在线 JWT 解码工具，解析 token 的 header 与 payload 为可读 JSON，不验证签名，纯前端本地解析不上传。',
  guide: {
    zh: `## 功能

粘贴 JWT 字符串后，按点号切分出 header 和 payload 两段，对 base64url 部分解码并以缩进 JSON 展示，方便查看其中的算法、过期时间、用户声明等字段。

## 使用场景

- 调试登录态 token，查看 sub、exp、iat 等声明是否正确
- 排查接口鉴权失败，确认 token 内容是否被篡改
- 学习 JWT 三段式结构与 base64url 编码

## 常见问题

- **会验证签名吗**：不会，本工具只解码不验签，不能据此信任 token 内容
- **数据安全吗**：解析完全在浏览器本地完成，token 不会上传服务器
- **解析报错**：token 格式不正确（少于两段或非合法 base64url）会给出错误提示`,
    en: `## Features

Paste a JWT and the tool splits it on dots, decodes the base64url header and payload segments, and displays them as indented JSON so you can inspect the algorithm, expiry, user claims and other fields.

## Use cases

- Debug login tokens by checking sub, exp, iat and other claims
- Troubleshoot auth failures by confirming token contents
- Learn the three-segment JWT structure and base64url encoding

## FAQ

- **Does it verify the signature**: no, this tool only decodes and never verifies — do not trust token contents based on it
- **Is it safe**: decoding runs fully in your browser and the token is never uploaded
- **Parse errors**: malformed tokens (fewer than two segments or invalid base64url) show an error message`,
  },
  component: () => import('./component.js'),
};
