# 腾讯云域名部署落地方案

把 Toolbox 单二进制服务部署到公网，通过域名 + HTTPS 让所有人访问。整体链路：

```
用户浏览器 ──HTTPS──> 腾讯云域名(DNSPod 解析) ──> 轻量/CVM 服务器
                                                      │
                                          Nginx(443/80) 反代 + TLS
                                                      │
                                          Toolbox 二进制(:8080, 仅本机)
                                                      │
                                          ffmpeg / LibreOffice / pdf2docx
```

> 核心原则：**只对公网暴露 80/443，8080 仅监听 127.0.0.1**，所有外部流量经 Nginx 进出，便于统一做 TLS、限流、体积限制。

---

## 0. 前置准备清单

| 项 | 说明 | 备注 |
|----|------|------|
| 腾讯云账号 | 实名认证 | 个人/企业均可 |
| 域名 | 腾讯云域名注册（或转入） | `.com`/`.cn` 等 |
| 服务器 | 轻量应用服务器 Lighthouse（推荐，便宜）或 CVM | 2C4G 起步；视频处理建议 4C8G |
| ICP 备案 | 域名指向大陆服务器必须备案 | 备案期间网站不能开 80/443 |
| SSL 证书 | HTTPS 必备 | 腾讯云免费 DV 证书 / Let's Encrypt |

> ⚠️ 大陆服务器 + 大陆访问 → 必须 ICP 备案。若想跳过备案，可买**中国香港/海外地域**的服务器（但国内访问延迟略高、且小程序业务域名仍需备案域名，见小程序文档）。

---

## 1. 购买与备案

### 1.1 买服务器
- 控制台 → 轻量应用服务器 → 新建，地域选「广州/上海/北京」等大陆节点（要备案）或「中国香港」（免备案）。
- 镜像：Ubuntu 22.04。
- 套餐：2C4G 6M（约 ¥60/月）起步；视频转码吃 CPU，建议 4C8G。

### 1.2 买域名
- 腾讯云 → 域名注册 → 搜索购买 → 实名认证（身份证，约 1 个工作日同步）。

### 1.3 ICP 备案（大陆服务器必做）
- 腾讯云 → 网站备案 → 新增备案。
- 要求：服务器包年包月 **≥3 个月**、域名实名通过、主体信息。
- 周期：通常 **7~20 个工作日**，期间 80/443 不能对外提供服务。
- 备案通过后获得备案号，需在网站底部展示（见第 5 节）。

> 备案是小程序「业务域名」「request 合法域名」的前置条件，**必须做**。

---

## 2. DNS 解析

DNSPod（腾讯云旗下）：
- 域名解析 → 添加记录：
  - `A` `@` → 服务器公网 IP
  - `A` `www` → 服务器公网 IP
- TTL 默认 600s 即可。

解析生效后 `ping yourdomain.com` 应为服务器 IP。

---

## 3. 服务器环境准备

SSH 登录后安装运行依赖（按需）：

```bash
# 基础 + Nginx
apt update && apt install -y nginx

# 视频转码/截断/音频转换
apt install -y ffmpeg

# 文档转换（docx↔pdf 等）
apt install -y libreoffice python3 python3-pip
pip3 install pdf2docx
```

上传 Toolbox（本地交叉编译后）：

```bash
# 本地
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o toolbox ./cmd/server
scp -P 22 toolbox config.json start.sh stop.sh root@SERVER_IP:/opt/toolbox/

# 服务器
ssh root@SERVER_IP
cd /opt/toolbox && chmod +x toolbox start.sh
```

### 3.1 修改 config.json
```json
{
  "server": { "addr": "127.0.0.1:8080" },   // 关键：只监听本机，不直接暴露
  "limits": { "maxUploadBytes": 1073741824, "heavyConcurrency": 3, "jobTimeoutSeconds": 600 },
  "pro":   { "tokens": [], "maxUploadBytes": 2147483648 }
}
```
> `jobTimeoutSeconds` 调到 600，1GB 视频转码需要时间。

### 3.2 用 systemd 守护（推荐，替代 start.sh）
`/etc/systemd/system/toolbox.service`：
```ini
[Unit]
Description=Toolbox
After=network.target

[Service]
WorkingDirectory=/opt/toolbox
ExecStart=/opt/toolbox/toolbox /opt/toolbox/config.json
Restart=always
RestartSec=3
# 资源限制（可选，cgroup 兜底防 OOM）
MemoryMax=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```
```bash
systemctl daemon-reload && systemctl enable --now toolbox
systemctl status toolbox
curl -s http://127.0.0.1:8080/api/tools   # 应返回工具清单
```

---

## 4. Nginx 反向代理 + HTTPS

### 4.1 申请 SSL 证书（二选一）
- **腾讯云免费 DV 证书**：控制台 → SSL 证书 → 申请免费证书（TrustAsia），DNS 验证，下载 Nginx 格式，上传 `.crt`/`.key` 到 `/etc/nginx/ssl/`。有效期 1 年，需手动续。
- **Let's Encrypt（自动续期）**：
  ```bash
  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d yourdomain.com -d www.yourdomain.com
  ```

### 4.2 Nginx 配置
`/etc/nginx/conf.d/toolbox.conf`：
```nginx
# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 关键：允许 1GB 上传 + 长处理超时
    client_max_body_size 1024M;
    client_body_timeout  600s;
    proxy_read_timeout   600s;
    proxy_send_timeout   600s;

    # 上传接口限流（防滥用，按需调整）
    limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE/长连接友好（任务轮询）
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # 静态资源缓存（前端 JS/CSS 长期不变）
    location ~* \.(js|css|png|svg)$ {
        proxy_pass http://127.0.0.1:8080;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```
```bash
nginx -t && systemctl reload nginx
```

访问 `https://yourdomain.com` 即可。

---

## 5. 合规与安全

- **备案号展示**：在页面底部展示 ICP 备案号（可在 `config.json` 的广告位 `bottom` 填备案号 HTML，或改前端 footer）。腾讯云要求底部可点击跳转 `https://beian.miit.gov.cn`。
- **安全组**：轻量/CVM 防火墙只开放 `22`(SSH, 建议改端口+密钥)、`80`、`443`。**不要开放 8080**。
- **主机出站网络**：Toolbox 无需出站，建议安全组/iptables 屏蔽全部出站，彻底消除 ffmpeg/LibreOffice 处理恶意文件时的 SSRF 面。
- **资源兜底**：systemd `MemoryMax`/`CPUQuota` 限制单进程；3 并发 ffmpeg 在 4C 机器上约用 3 核，留 1 核给系统。
- **日志**：Nginx 访问日志 + toolbox `journalctl -u toolbox`。

---

## 6. 可选加速

- **腾讯云 CDN**：Toolbox 前端是 `go:embed` 进二进制的，CDN 对动态接口无意义；但对静态 JS/CSS 可加速。若启用，CDN 回源到 Nginx，注意上传接口不要走 CDN（CDN 对大文件上传有限制），把 `/api/*` 配置为直接回源或排除。
- **大文件上传优化**：1GB 在弱网下易超时。后续可加**分片上传**（前端切片 + 服务端合并），或对视频工具改用「对象存储 COS 直传 + 服务端拉取处理」的架构。

---

## 7. 部署验证清单

- [ ] `https://yourdomain.com` 首页打开，卡片网格正常
- [ ] 中英文切换正常
- [ ] 上传一个小视频，转码/截断成功并下载
- [ ] 上传一个 50MB+ 文件不报 413（验证 `client_max_body_size`）
- [ ] `curl http://yourdomain.com:8080` 不通（8080 未暴露）
- [ ] 页面底部有备案号且可跳转工信部
- [ ] HTTP 自动跳 HTTPS
- [ ] SSL 证书有效期正常

---

## 8. 成本估算（月）

| 项 | 个人小规模 | 备注 |
|----|-----------|------|
| 轻量服务器 2C4G | ¥60 | 视频吃紧可升 4C8G ¥150 |
| 域名 .com | ¥6（均摊年费） | |
| SSL 证书 | ¥0 | 免费DV/Let's Encrypt |
| 备案 | ¥0 | |
| CDN（可选） | 按流量 | 小流量几元 |
| **合计** | **约 ¥66/月** | |
