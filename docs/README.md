# Toolbox 落地文档

| 文档 | 内容 |
|------|------|
| [腾讯云域名部署](./deployment-tencent-cloud.md) | 服务器/域名/备案/DNS/Nginx/HTTPS/安全/成本，让服务通过域名对外访问 |
| [微信小程序方案](./wechat-miniprogram.md) | web-view 内嵌 vs 原生两条路径、平台约束、落地步骤 |

## 快速决策

- **想让别人用域名访问** → 看[部署文档](./deployment-tencent-cloud.md)，约 ¥66/月，备案 7~20 天。
- **想做微信小程序** → 看[小程序文档](./wechat-miniprogram.md)：
  - 有企业/个体主体 → web-view 内嵌，1~2 天上线。
  - 只有个人主体 → 原生开发纯前端工具，视频等大文件引导网页版（小程序单文件上传 10MB 上限，1GB 视频做不了）。
