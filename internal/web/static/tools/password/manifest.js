export default {
  id: 'password',
  name: { zh: '密码生成', en: 'Password Generator' },
  category: { zh: '生成', en: 'Generate' },
  icon: '🔐',
  keywords: ['password', '随机', 'random', '密码', 'generator', '强密码', 'secure', 'crypto'],
  desc: '在线密码生成器，自定义长度与大小写、数字、符号字符集，基于 crypto.getRandomValues 真随机，纯前端生成不上传。',
  guide: {
    zh: `## 功能

按设定长度（4-128）和勾选的字符集（大写、小写、数字、符号、是否排除易混淆字符）生成随机密码，使用浏览器原生 crypto.getRandomValues 保证真随机性，可一键复制。

## 使用场景

- 注册新账号时生成高强度不可猜测的密码
- 为数据库、API Key、服务令牌生成随机串
- 演示密码强度与字符集、长度之间的关系

## 常见问题

- **安全吗**：使用 crypto.getRandomValues 真随机，比 Math.random 安全得多
- **默认排除哪些字符**：勾选「排除易混淆」后会去掉 O 0 I l 1 等形似字符
- **会上传吗**：不会，密码在浏览器本地生成后不发送任何地方`,
    en: `## Features

Generate random passwords with configurable length (4-128) and selectable character sets — uppercase, lowercase, digits, symbols, and whether to exclude ambiguous characters. Uses the browser's native crypto.getRandomValues for true randomness, with one-click copy.

## Use cases

- Generate strong, unguessable passwords when registering new accounts
- Create random strings for databases, API keys and service tokens
- Demonstrate how password strength relates to length and character set

## FAQ

- **Is it secure**: it uses crypto.getRandomValues for true randomness, far safer than Math.random
- **Which characters are excluded by default**: enabling exclude-ambiguous removes look-alike characters like O 0 I l 1
- **Is it uploaded**: no, the password is generated locally and never sent anywhere`,
  },
  component: () => import('./component.js'),
};
