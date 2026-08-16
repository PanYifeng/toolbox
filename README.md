# Toolbox · 一站式开发者工具站

JSON 格式化、时间戳转换、视频转码等常用开发者工具的一站式网页服务。

## 设计原则

> 能在浏览器跑的绝不上服务器；必须上服务器的，进队列限流跑。

- **80% 工具纯前端**（JSON / 时间戳 / Base64 / 二维码 …），零服务器成本
- **重型工具**（视频转码）走服务端 ffmpeg + 异步队列 + 严格限流
- **单二进制部署**：Go 编译产物，前端通过 `go:embed` 打包进二进制
- **插件化**：新增工具只需加一个目录，不碰核心代码

## 技术栈

- 后端：Go 1.21+，零第三方依赖
- 前端：原生 ES Modules，无框架
- 重型处理：ffmpeg（系统包）

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
# 运行
ssh root@server "cd /opt/toolbox && nohup ./toolbox > app.log 2>&1 &"
```

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

## 视频转码在 1C2G 上的保护策略

- 文件大小硬限（默认 50MB，见 `config.json`）
- 全局单并发（`videoConcurrency: 1`），其余排队
- ffmpeg `-threads 1` 限制 CPU
- 单任务超时熔断（默认 300s）
- 产物 1 小时后自动清理，防磁盘打满

## 变现方式

`config.json` 的 `ads` 段配置广告位，前端运行时拉取，**改广告无需重新部署**：

```json
{
  "ads": {
    "enabled": true,
    "slots": [{ "id": "sidebar", "html": "<!-- AdSense / 自售赞助 -->" }]
  }
}
```

推荐组合：自售广告位 + Pro 订阅（去广告 / 大文件 / 高并发）+ API 计费。

## 配置说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `server.addr` | 监听地址 | `:8080` |
| `limits.maxUploadBytes` | 上传上限 | 52428800 (50MB) |
| `limits.videoConcurrency` | 重型任务并发数 | 1 |
| `limits.jobTimeoutSeconds` | 任务超时 | 300 |

## 中英文切换

- 前端内置 i18n（`internal/web/static/core/i18n.js`），默认按 `navigator.language` 自动选择，右上角按钮可手动切换，偏好存入 `localStorage`。
- 工具名等文案通过 `t(key)` / `tr(obj)` 取值；新增工具在 manifest 中用 `name: { zh, en }` 即可。

## 安全加固

公开文件上传 + ffmpeg 服务的攻击面已做防护：

- **ffmpeg SSRF 阻断**：`-protocol_whitelist file`，恶意媒体文件无法触发 `http/rtmp/data` 等网络或越权读取。
- **资源限制**：上传大小硬限、ffmpeg `-threads 1`、输出时长 `-t 600`、输出体积 `-fs 200M`、单任务超时熔断、单并发队列。
- **限流**：上传接口每 IP 每分钟 20 次，超限 429。
- **路径穿越防护**：下载产物路径校验绝对路径 + `..` 段拒绝。
- **HTTP 加固**：`ReadHeaderTimeout` 防 slowloris、`MaxHeaderBytes` 限制、安全响应头（CSP / X-Frame-Options / nosniff / Referrer-Policy）。
- **文件名安全**：上传文件用 `CreateTemp` 落盘，输出用时间戳命名，不信任客户端文件名。

> 生产建议：在 ffmpeg 进程外再用 cgroup 限制内存上限（如 1G），并用反代（Nginx/Caddy）做 TLS 与连接级限流。

## 许可证

AGPL-3.0。详见 [LICENSE](LICENSE)。

任何人可自由使用、修改、分发，但**修改后的网络服务也必须开源**（AGPL 网络条款）。商用闭源使用需另行授权。
