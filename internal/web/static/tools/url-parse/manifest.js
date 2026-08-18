export default {
  id: 'url_parse',
  name: { zh: 'URL 解析', en: 'URL Parser' },
  category: { zh: '网络', en: 'Network' },
  icon: '🌐',
  keywords: ['url', 'parse', 'uri', '解析', 'query', '参数', 'pathname', '拆解'],
  desc: '在线 URL 解析工具，实时拆解协议、主机、路径、查询参数和锚点，纯前端处理不上传。',
  guide: {
    zh: `## 功能

输入 URL 即可实时解析出协议、主机、端口、路径、查询参数、锚点及身份信息等组成部分。

## 使用场景

- 排查 URL 拼接错误，确认参数是否正确传递
- 提取并核对查询字符串中的键值对
- 分析带认证信息的 URL 结构

## 常见问题

- **解析失败**：URL 必须包含协议（http 或 https），否则浏览器无法识别
- **查询参数**：自动解码已编码的参数值，逐行展示键值对
- **数据安全**：解析在浏览器本地完成，不上传服务器`,
    en: `## Features

Type a URL to instantly break it down into protocol, host, port, path, query params, hash, and credentials.

## Use cases

- Debug URL construction and verify that params are passed correctly
- Extract and inspect key-value pairs in the query string
- Analyze URLs that carry authentication info

## FAQ

- **Parse failure**: the URL must include a protocol (http or https) or the browser cannot parse it
- **Query params**: encoded values are auto-decoded and shown line by line
- **Privacy**: parsing runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
