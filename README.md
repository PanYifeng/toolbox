# Toolbox · 一站式开发者工具站

> 在线 demo：部署后替换为正式域名（34 个工具 · 纯前端零成本 · 可安装到桌面）

JSON 格式化、时间戳转换、视频转码等常用开发者工具的一站式网页服务。**纯前端工具文件不上传**，隐私友好；可安装为桌面/移动 PWA 离线使用。

## 设计原则

> 能在浏览器跑的绝不上服务器；必须上服务器的，进队列限流跑。

- **80% 工具纯前端**（JSON / 时间戳 / Base64 / 二维码 …），零服务器成本
- **重型工具**（视频转码）走服务端 ffmpeg + 异步队列 + 严格限流
- **单二进制部署**：Go 编译产物，前端通过 `go:embed` 打包进二进制
- **插件化**：新增工具只需加一个目录，不碰核心代码

## 技术栈

- 后端：Go 1.21+，零第三方依赖
- 前端：原生 ES Modules，无框架
- PWA：manifest + service worker，可安装到桌面、离线可用
- SEO：每工具独立 meta description / canonical / OG 图 / JSON-LD，noscript 注入文案供爬虫索引，自动生成 sitemap.xml
- 分享：移动端原生分享面板，桌面端复制链接
- 重型处理：ffmpeg（视频/音频）、LibreOffice（文档→pdf/html）、pdf2docx（PDF→docx）

## 功能一览

| 类别 | 工具 |
|------|------|
| 编码 | JSON 格式化、Base64、URL、Hash(SHA)、JWT 解码、HTML 实体 |
| 时间 | 时间戳转换 |
| 文本 | 正则测试、大小写、文本统计、Markdown 预览、文本差异、Slug、文本行处理 |
| 生成 | UUID、密码、Lorem ipsum |
| 数学/设计 | 进制转换、颜色转换 |
| 网络 | URL 解析 |
| 视频 | 视频转码（ffmpeg）、视频截断（ffmpeg 流复制，无损不重编码） |
| 音频 | 音频转换（ffmpeg：mp3/wav/flac/ogg/m4a） |
| 文档 | 文档转换（docx↔pdf 等） |
| 游戏 | 2048、贪吃蛇、井字棋（纯前端，零负载） |

> 纯前端工具零服务器成本；视频/音频/文档转换走服务端队列限流。PDF→docx 依赖 `pip install pdf2docx`，docx→pdf 等依赖 LibreOffice。

## 目录结构

```
toolbox/
├── cmd/server/main.go                 # 启动入口
├── internal/
│   ├── config/                        # 配置加载
│   ├── queue/                         # 内存任务队列（限流）
│   ├── tools/
│   │   ├── registry.go                # 工具注册中心
│   │   └── server/video_convert/      # 服务端工具示例
│   └── web/
│       ├── server.go                  # HTTP 服务 + embed
│       └── static/                    # 前端源码（embed 进二进制）
│           ├── core/                  # 应用框架 / 样式
│           └── tools/                 # 每个前端工具一个目录
├── scripts/gen-registry.sh            # 重新生成前端工具索引
├── config.json                        # 运行配置
└── Dockerfile
```

## 快速开始

### 本地构建运行

```bash
# 构建单二进制
go build -o toolbox ./cmd/server

# 运行（默认加载 ./config.json）
./toolbox
# 或指定配置
./toolbox /path/to/config.json
```

访问 http://localhost:8080

### Docker 部署

```bash
docker build -t toolbox .
docker run -d -p 80:8080 --restart=always --name toolbox toolbox
```

### 1C2G 服务器部署

```bash
# 本地交叉编译
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o toolbox ./cmd/server
# 上传（服务器需安装 ffmpeg）
scp toolbox config.json root@server:/opt/toolbox/
# 启动（仓库自带 start.sh / stop.sh）
ssh root@server "cd /opt/toolbox && chmod +x toolbox start.sh stop.sh && ./start.sh"
# 停止 / 重启
ssh root@server "cd /opt/toolbox && ./stop.sh && ./start.sh"
```

> 生产建议用 systemd 或 cgroup 做硬性内存/CPU 上限。容器环境无 systemd 时，用仓库的 `start.sh`（nohup + pidfile）即可。

## 新增工具

### 前端工具（纯客户端计算）

1. 在 `internal/web/static/tools/<tool-name>/` 下新建目录
2. 创建 `manifest.js`（声明 id / name / category / keywords）
3. 创建 `component.js`（导出默认渲染函数）
4. 运行 `bash scripts/gen-registry.sh` 重新生成索引

```js
// manifest.js
export default {
  id: 'base64',
  name: 'Base64 编解码',
  category: '编码',
  icon: '🔤',
  keywords: ['base64', 'encode', 'decode'],
  component: () => import('./component.js'),
};
```

### 服务端工具（需要后端算力）

1. 在 `internal/tools/server/<tool-name>/` 下新建包
2. 实现 `tools.Tool` 接口
3. 在包的 `init()` 中调用 `tools.Register(t)`
4. 在 `cmd/server/main.go` 添加 blank import

```go
func init() {
    tools.Register(&MyTool{})
}
```

## 视频处理在 1C2G 上的保护策略

- 文件大小硬限（默认 1GB，见 `config.json`）
- 全局最多 3 个视频/重型任务并发（`heavyConcurrency: 3`），其余排队
- ffmpeg `-threads 1` 限制 CPU；视频截断用 `-c copy` 流复制，不重编码
- 单任务超时熔断（默认 300s）
- 产物 1 小时后自动清理，防磁盘打满
- 上传走流式落盘，1GB 文件不会全量缓冲进内存

## 变现方式

### 广告位（配置化，改广告无需重新部署）

`config.json` 的 `ads` 段配置广告位，支持按位置投放（`top` / `bottom` / `sidebar`），前端运行时拉取 `/api/ads` 渲染：

```json
{
  "ads": {
    "enabled": true,
    "slots": [
      { "id": "top", "position": "top", "html": "<!-- AdSense / 自售赞助 -->" },
      { "id": "side", "position": "sidebar", "html": "<!-- 侧边 -->" }
    ]
  }
}
```

自售广告位收益高于 AdSense（用户画像精准：开发者）。接入 AdSense 时把对应 `html` 换成 AdSense 代码片段，并按需放宽 CSP（`script-src` 允许 `googlesyndication.com`）。

### Pro 付费层（API token / 订阅）

售卖 `X-Pro-Token`，持有者享：**绕过上传限流** + **更大上传配额**（默认 2GB）。token 常数时间校验，防时序攻击。

```json
{
  "pro": { "tokens": ["issued-token-1", "issued-token-2"], "maxUploadBytes": 2147483648 }
}
```

调用示例：

```bash
curl -X POST -H "X-Pro-Token: issued-token-1" \
  -F "file=@big.mp4" -F "format=mp4" \
  http://your-host/api/tools/video_convert
```

发卡方式：手工生成随机 token 填入配置 + 重启，或对接支付回调自动写入。这是可售卖的 API 计费层，无需引入支付 SDK 即可起步。

## 配置说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `server.addr` | 监听地址 | `:8080` |
| `limits.maxUploadBytes` | 上传上限 | 1073741824 (1GB) |
| `limits.heavyConcurrency` | 重型任务并发数（视频/音频/文档，其余排队） | 3 |
| `limits.jobTimeoutSeconds` | 任务超时 | 300 |
| `pro.tokens` | Pro token 列表 | `[]` |
| `pro.maxUploadBytes` | Pro 上传上限 | 2147483648 (2GB) |

## 中英文切换

- 前端内置 i18n（`internal/web/static/core/i18n.js`），默认按 `navigator.language` 自动选择，右上角按钮可手动切换，偏好存入 `localStorage`。
- 工具名等文案通过 `t(key)` / `tr(obj)` 取值；新增工具在 manifest 中用 `name: { zh, en }` 即可。

## 安全加固

公开文件上传 + ffmpeg 服务的攻击面已做防护：

- **ffmpeg SSRF 阻断**：`-protocol_whitelist file`，恶意媒体文件无法触发 `http/rtmp/data` 等网络或越权读取。
- **资源限制**：上传大小硬限（流式落盘，1GB 不爆内存）、ffmpeg `-threads 1`、输出时长 `-t 600`、输出体积 `-fs 200M`/`-fs 500M`、单任务超时熔断、3 并发队列。
- **限流**：上传接口每 IP 每分钟 20 次，超限 429。
- **路径穿越防护**：下载产物路径校验绝对路径 + `..` 段拒绝。
- **HTTP 加固**：`ReadHeaderTimeout` 防 slowloris、`MaxHeaderBytes` 限制、安全响应头（CSP / X-Frame-Options / nosniff / Referrer-Policy）。
- **文件名安全**：上传文件用 `CreateTemp` 落盘，输出用时间戳命名，不信任客户端文件名。
- **LibreOffice 隔离**：文档转换每任务独立输出目录 + 独立 UserInstallation profile（防锁冲突与 profile 污染），`--headless --norestore --nologo` 不执行宏；输入/输出格式白名单。

> 生产建议：在 ffmpeg/LibreOffice 进程外用 cgroup 限制内存上限（如 1G），并用反代（Nginx/Caddy）做 TLS 与连接级限流。**建议在主机防火墙屏蔽全部出站网络**——本服务无需出站，可直接消除 ffmpeg/LibreOffice 处理恶意文件时的 SSRF 面。

## 延伸文档

`docs/` 目录下的深度文档：

| 文档 | 内容 |
|------|------|
| [腾讯云域名部署](docs/deployment-tencent-cloud.md) | 服务器/域名/备案/DNS/Nginx/HTTPS/安全/成本，让服务通过域名对外访问 |
| [微信小程序方案](docs/wechat-miniprogram.md) | web-view 内嵌 vs 原生两条路径、平台约束、落地步骤 |

- **想让别人用域名访问** → 看部署文档，约 ¥66/月，备案 7~20 天。
- **想做微信小程序** → 看小程序文档：有企业/个体主体走 web-view 内嵌（1~2 天上线）；只有个人主体走原生纯前端工具（小程序单文件 10MB 上限，1GB 视频做不了，引导网页版）。

## GitHub Topics

为提升可发现性，建议在仓库 About → Topics 添加：

`developer-tools` `online-tools` `json-formatter` `pwa` `go` `ffmpeg` `self-hosted` `privacy-friendly`

## 许可证

AGPL-3.0。详见 [LICENSE](LICENSE)。

任何人可自由使用、修改、分发，但**修改后的网络服务也必须开源**（AGPL 网络条款）。商用闭源使用需另行授权。
