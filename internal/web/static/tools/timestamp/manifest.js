export default {
  id: 'timestamp',
  name: { zh: '时间戳转换', en: 'Timestamp Converter' },
  category: { zh: '时间', en: 'Time' },
  icon: '🕐',
  keywords: ['timestamp', 'unix', '时间戳', 'date', '时间', 'epoch', '日期转换', 'UTC'],
  desc: '在线 Unix 时间戳转换工具，支持时间戳转日期、日期转时间戳，秒级与毫秒级自动识别，纯前端处理。',
  guide: {
    zh: `## 功能

实时显示当前 Unix 时间戳，并支持时间戳与日期字符串双向转换，自动识别秒级和毫秒级。

## 使用场景

- 调试接口中时间戳字段的实际日期
- 数据库或日志中 Unix 时间戳与可读时间互转
- 快速复制当前时间戳用于请求签名

## 常见问题

- **秒与毫秒**：输入 13 位按毫秒处理，10 位按秒处理
- **时区**：同时输出本地时间与 UTC 时间，便于跨时区对照
- **日期格式**：日期转时间戳支持 「2024-01-01 12:00:00」 或 ISO 8601 格式`,
    en: `## Features

Show the current Unix timestamp live, and convert between timestamps and date strings in both directions, auto-detecting seconds vs milliseconds.

## Use cases

- Debug the actual date behind a timestamp field in an API
- Convert Unix timestamps in databases or logs to readable time and back
- Copy the current timestamp for request signing

## FAQ

- **Seconds vs milliseconds**: 13-digit input is treated as ms, 10-digit as seconds
- **Timezone**: outputs both local and UTC time for cross-zone comparison
- **Date format**: date-to-timestamp accepts "2024-01-01 12:00:00" or ISO 8601`,
  },
  component: () => import('./component.js'),
};
