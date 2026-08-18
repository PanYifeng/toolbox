export default {
  id: 'uuid',
  name: { zh: 'UUID 生成', en: 'UUID Generator' },
  category: { zh: '生成', en: 'Generate' },
  icon: '🆔',
  keywords: ['uuid', 'guid', '唯一', 'unique', 'v4', '生成', 'identifier', '随机'],
  desc: '在线 UUID v4 生成工具，一键产生随机唯一标识符并复制，基于浏览器原生 crypto.randomUUID，纯前端处理。',
  guide: {
    zh: `## 功能

调用浏览器原生 crypto.randomUUID 生成符合 RFC 4122 的 UUID v4 随机唯一标识符，支持一键复制。

## 使用场景

- 为新建数据记录生成唯一主键
- 前端调试时为请求生成追踪 ID
- 给文件、会话分配不重复标识

## 常见问题

- **版本说明**：仅生成 v4（随机）版本，不提供 v1 时间序或 v5 命名空间版本
- **唯一性**：v4 随机碰撞概率极低，可放心用于绝大多数业务场景
- **数据安全**：生成过程在浏览器本地完成，不上传服务器`,
    en: `## Features

Generate RFC 4122 UUID v4 random unique identifiers via the native crypto.randomUUID, with one-click copy.

## Use cases

- Generate unique primary keys for new records
- Create trace IDs for requests during front-end debugging
- Assign non-duplicate identifiers to files or sessions

## FAQ

- **Versions**: only v4 (random) is generated; v1 time-based or v5 namespace versions are not provided
- **Uniqueness**: v4 collision probability is negligible and safe for most use cases
- **Privacy**: generation runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
