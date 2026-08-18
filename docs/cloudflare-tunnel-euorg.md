# Cloudflare Tunnel + eu.org 免费域名与 HTTPS 部署方案

把 Toolbox 单二进制服务通过**免费域名（eu.org）+ 免费 HTTPS（Cloudflare Tunnel）**暴露到公网，全程零证书费用、无需开放服务器入站端口、无需 ICP 备案（域名非大陆、服务器在海外）。整体链路：

```
用户浏览器 ──HTTPS──> app.mytoolbox.eu.org
                        │
                  Cloudflare 边缘（全球 Anycast，终结 TLS）
                        │  (出站长连接，由服务器主动发起)
                  cloudflared 进程（阿里云服务器）
                        │  (本机回环)
                  Toolbox 二进制（:8080，仅本机）
```

> 核心原则：**服务器不开放任何公网入站端口**，cloudflared 主动向 Cloudflare 边缘建立出站长连接，公网流量经 Cloudflare 反代进来。TLS 由 Cloudflare 边终结，无需在服务器上申请/续期证书。

---

## 0. 整体思路

需求是给 Toolbox 配一个**免费的固定 HTTPS 域名**。拆成两个独立子问题：

1. **域名从哪来** → 用 eu.org 免费二级域名（`mytoolbox.eu.org`）。
2. **HTTPS / 入口怎么搭** → 用 Cloudflare Tunnel，不依赖服务器公网 IP、不需证书、不需开放端口。

为什么选这套组合：

| 方案 | 域名 | HTTPS | 服务器端口 | 备案 | 成本 |
|------|------|-------|-----------|------|------|
| 腾讯云 + Nginx（见另一文档） | 自购 `.com` | 自购/Let's Encrypt | 需开 80/443 | 大陆需备案 | 域名+服务器 |
| **Cloudflare Tunnel + eu.org** | 免费 eu.org | Cloudflare 免费终结 | **零入站端口** | 免备案 | 0 |

关键点：Cloudflare Tunnel 是**反向**的——不是用户连服务器，而是服务器里的 `cloudflared` 主动出站连到 Cloudflare 边缘，Cloudflare 再把用户请求顺着这条出站连接转发回来。所以服务器哪怕在 NAT 后面、没有公网 IP、不开任何端口，也能被公网访问。

---

## 1. 涉及的组件与原理

### 1.1 eu.org 域名

- eu.org 是一个免费的二级域名注册服务，由 volunteers 维护，发放形如 `xxx.eu.org` 的域名。
- 它本质上是 **eu.org 这个域名的子域委派**：你申请 `mytoolbox.eu.org` 通过后，eu.org 会在它的父域 zone 里加一条 NS 记录，把 `mytoolbox.eu.org` 的解析权委派给你指定的权威 NS。
- 审核是人工的，通常几天到几周。
- 委派链路：`根 → .org → eu.org → (NS 委派) → 你的权威 NS`。在 eu.org 批准并写入委派前，公网解析不到 `*.mytoolbox.eu.org`。

### 1.2 Cloudflare 作为权威 DNS

- 把 `mytoolbox.eu.org` 这个 zone 添加到 Cloudflare，Cloudflare 分配两个权威 NS（如 `henry.ns.cloudflare.com`、`kia.ns.cloudflare.com`）。
- 这两个 NS 就是将来填给 eu.org 的「Name servers」。
- **zone 激活条件**：Cloudflare 要求父域（eu.org）的 NS 指向自己，才算 fully active。但在等待 eu.org 批准期间，Cloudflare 仍会以权威方式响应直接查询（用 `dig @henry.ns.cloudflare.com` 能查到记录）——这一点被 eu.org 的 SOA/NS 验证用来确认 NS 配置正确。

### 1.3 Cloudflare Tunnel（命名隧道）

- 命名隧道是一条持久的、由 `cloudflared` 主动建立的出站隧道，绑定一个固定的隧道 ID（UUID）。
- 配置三要素：
  1. **credentials 文件**：`cloudflared tunnel create` 生成，含隧道私钥，证明「我是这条隧道」。
  2. **config.yml**：声明隧道 ID + ingress 规则（哪个 hostname 转发到哪个本地 service）。
  3. **DNS 路由**：`cloudflared tunnel route dns <tunnel> <hostname>` 会在 Cloudflare zone 里自动建一条 CNAME，`<hostname> → <tunnel-id>.cfargotunnel.com`，走橙色云代理。
- 用户访问 `app.mytoolbox.eu.org` → Cloudflare 边缘收到 → 查到 CNAME 指向某隧道 → 把请求顺着该隧道那条出站连接送到服务器 → cloudflared 按 ingress 转发到 `localhost:8080`。

### 1.4 trycloudflare 临时隧道（过渡方案）

- `cloudflared tunnel --url http://localhost:8080`（不带隧道名）会起一条**临时隧道**，Cloudflare 自动分配一个 `xxx.trycloudflare.com` 的随机域名。
- 无需域名、无需登录、即时可用，但 **URL 随机且重启会变**，不能当正式入口。
- 在 eu.org 批准前，用它作为「当前可用的 HTTPS 入口」兜底。

---

## 2. 实际操作步骤

### 2.1 在 Cloudflare 添加 zone

1. 注册 Cloudflare 账号。
2. Add site → 输入 `mytoolbox.eu.org` → 免费计划。
3. Cloudflare 分配权威 NS：`henry.ns.cloudflare.com`、`kia.ns.cloudflare.com`。
4. 加一条 A 记录（如 `192.0.2.1`，DNS-only）占位，用于触发 zone 初始化。此时 Cloudflare 会提示「not fully protected」——这是因为它建议你开橙色云代理，对 DNS-only 占位记录无害，可忽略。

### 2.2 提交 eu.org 申请

在 nic.eu.org 填表：

| 字段 | 内容 |
|------|------|
| Complete domain name | `mytoolbox.eu.org` |
| Name1 | `henry.ns.cloudflare.com`（IP 留空，Cloudflare NS 是 anycast，无需 glue） |
| Name2 | `kia.ns.cloudflare.com` |
| Verification level | `server names + replies on SOA + replies on NS`（推荐项） |

提交前先用 dig 自检 Cloudflare NS 是否权威响应：

```bash
dig SOA mytoolbox.eu.org @henry.ns.cloudflare.com +short
# 返回 SOA serial → 说明 Cloudflare 已权威服务该 zone，推荐项验证能过
```

eu.org 的校验器会直接查这两个 NS 的 SOA 和 NS 响应，全部通过后保存为 request（如 `20260817172432-arf-53611`），进入人工审核。

### 2.3 服务器安装 cloudflared

```bash
# 阿里云 Ubuntu 24.04，用 Cloudflare 官方 deb 源
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/cloudflared.list
apt update && apt install -y cloudflared
```

### 2.4 认证 cloudflared（拿 origin cert）

```bash
cloudflared tunnel login
# 输出一个 https://dash.cloudflare.com/argotunnel?... 链接
# 浏览器打开 → 选 mytoolbox.eu.org zone → Authorize
# 成功后服务器下载 cert.pem 到 ~/.cloudflared/cert.pem
```

> 原理：`cert.pem` 是「origin certificate」，授权这台机器在 mytoolbox.eu.org zone 下创建/管理隧道。它不是 API token，作用域仅限隧道相关操作。
>
> 坑：`cloudflared tunnel login` 必须常驻运行才能接收浏览器回调。SSH 里直接跑容易因会话退出被杀，用 `systemd-run --unit=cflogin ...` 起一个临时 systemd 单元最稳，授权完 `systemctl stop cflogin`。

### 2.5 创建命名隧道

```bash
cloudflared tunnel create mytoolbox
# 输出：Created tunnel mytoolbox with id e72e5c56-97f8-4327-a389-99069a8a07f2
# 凭据写入 ~/.cloudflared/<tunnel-id>.json
```

### 2.6 写 config.yml

```yaml
# /opt/toolbox/named-tunnel.yml
tunnel: e72e5c56-97f8-4327-a389-99069a8a07f2
credentials-file: /root/.cloudflared/e72e5c56-97f8-4327-a389-99069a8a07f2.json

ingress:
  - hostname: app.mytoolbox.eu.org
    service: http://localhost:8080
  - service: http_status:404   # 兜底：未匹配的 hostname 返回 404
```

> 坑：config.yml **不要**放在 `~/.cloudflared/config.yml` 默认路径，否则 trycloudflare 临时隧道会加载它、被 `http_status:404` 兜底覆盖 `--url` 隐式路由，导致临时隧道返回 404。命名隧道用 `--config /opt/toolbox/named-tunnel.yml` 显式指定，把默认路径让给临时隧道。

### 2.7 建 DNS 路由（CNAME）

```bash
cloudflared tunnel route dns mytoolbox app.mytoolbox.eu.org
# 在 Cloudflare zone 自动创建 CNAME：
# app.mytoolbox.eu.org → e72e5c56-...cfargotunnel.com（橙色云代理）
```

此步只会在 Cloudflare zone 里建记录，**公网能否解析仍取决于 eu.org 父域委派**（见 §3）。

### 2.8 systemd 服务

命名隧道服务 `/etc/systemd/system/toolbox-tunnel.service`：

```ini
[Unit]
Description=Toolbox Cloudflare named tunnel (mytoolbox)
After=network-online.target toolbox.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/root
ExecStart=/usr/bin/cloudflared --config /opt/toolbox/named-tunnel.yml tunnel run mytoolbox
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

临时隧道脚本 `/opt/toolbox/tunnel-quick.sh`（起 trycloudflare 并把 URL 写文件）：

```bash
#!/usr/bin/env bash
set -e
URL_FILE=/opt/toolbox/current-tunnel-url.txt
LOG=/opt/toolbox/quick-tunnel.log
: > "$LOG"
cloudflared tunnel --url http://localhost:8080 --no-autoupdate >"$LOG" 2>&1 &
CFPID=$!
for i in $(seq 1 40); do
  sleep 1
  U=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1)
  if [ -n "$U" ]; then echo "$U" > "$URL_FILE"; break; fi
done
wait "$CFPID"
```

临时隧道服务 `/etc/systemd/system/toolbox-quick.service`（ExecStart 指向上面的脚本）。

启用并启动：

```bash
systemctl daemon-reload
systemctl enable --now toolbox-tunnel toolbox-quick
```

---

## 3. 关键原理：为什么 eu.org 批准前公网访问不了

DNS 解析是**自顶向下委派**的链路：

```
根 DNS ─NS→ .org 权威 ─NS→ eu.org 权威 ─NS(委派)→ Cloudflare NS ─A/CNAME→ 隧道
```

- eu.org 批准前，eu.org 父域 zone 里**没有** `mytoolbox.eu.org` 的 NS 委派记录。
- 公网解析器（如 8.8.8.8）查到 eu.org 权威后，发现没有下级委派，直接返回 NXDOMAIN/空。
- 所以即便 Cloudflare zone 里 CNAME 已配好，公网也查不到。

验证方法：

```bash
# 直接查 Cloudflare NS → 能查到（zone 内部权威响应）
dig app.mytoolbox.eu.org @henry.ns.cloudflare.com +short
# → e72e5c56-...cfargotunnel.com.

# 公网解析器查 → 空（父域未委派）
dig app.mytoolbox.eu.org @8.8.8.8 +short
# → (空)

# 查 eu.org 父域是否有委派 → 只有 eu.org 顶点 SOA，无 NS 委派
dig NS mytoolbox.eu.org @ns.eu.org +noall +authority
# → eu.org. IN SOA ns.eu.org. ...   （说明未委派）
```

**eu.org 批准并写入父域 NS 委派后**，公网解析器才能一路找到 Cloudflare NS，`app.mytoolbox.eu.org` 立即全球可解析，命名隧道自动生效，无需任何额外操作。

---

## 4. 当前状态与过渡期策略

| 项 | 状态 |
|----|------|
| Toolbox 应用（:8080） | ✅ systemd 托管，开机自启 + 崩溃重启 |
| 命名隧道 `mytoolbox` | ✅ 运行中，连 Cloudflare 边缘（4 连接） |
| CNAME `app.mytoolbox.eu.org` → 隧道 | ✅ 已在 Cloudflare zone 配好 |
| 临时隧道 trycloudflare | ✅ 运行中，当前可用 HTTPS 入口（URL 重启会变） |
| eu.org 申请 | ⏳ 已提交（request `20260817172432-arf-53611`），等人工审核 |
| 公网 `app.mytoolbox.eu.org` | ⏳ 等 eu.org 父域委派 |

**过渡期入口：**
- HTTPS（临时）：`https://<当前 trycloudflare URL>`，见服务器 `/opt/toolbox/current-tunnel-url.txt`
- HTTP（直连固定）：`http://43.108.34.119:8080`

**eu.org 批准后的收尾：**
1. 确认公网解析：`dig app.mytoolbox.eu.org @8.8.8.8 +short` 返回 Cloudflare IP
2. 访问 `https://app.mytoolbox.eu.org` 验证
3. 关掉临时隧道：`systemctl disable --now toolbox-quick`

> ⚠️ 本节为 eu.org 早期过渡记录。eu.org 人工审核太慢（已等数日仍未批准），**实际主入口已切换到 DigitalPlat 的 `app.allin1box.dpdns.org`**，见 §7。eu.org 批准后只作二级备份（ingress 已保留该 hostname，无需任何操作即可自动生效）。

---

## 5. 常见坑小结

1. **`cloudflared tunnel login` 回调接收**：必须常驻进程，SSH 里用 `systemd-run` 起临时单元，别用 `timeout` 或裸后台。
2. **config.yml 默认路径冲突**：命名隧道配置放 `~/.cloudflared/config.yml` 会被临时隧道误加载，导致 `--url` 路由被 `http_status:404` 兜底覆盖。命名隧道用 `--config` 显式指定独立路径。
3. **「not fully protected」告警**：Cloudflare 对 DNS-only 记录的提示，非错误，占位记录可忽略。
4. **eu.org 验证级别**：先自检 `dig SOA @Cloudflare-NS` 能拿到 serial，再用推荐项（SOA+NS）；拿不到则退回基础 `server names` 级别。
5. **公网不解析 ≠ 配置错**：Cloudflare NS 能查到、公网查不到，是 eu.org 父域未委派的正常现象，批准后自动恢复。
6. **两个 cloudflared 并存**：命名隧道与临时隧道是独立进程、独立出站连接，互不干扰，可同时运行做平滑过渡。

---

## 6. 参考命令速查

```bash
# 隧道管理
cloudflared tunnel list
cloudflared tunnel info mytoolbox
cloudflared tunnel route dns mytoolbox app.mytoolbox.eu.org
cloudflared tunnel delete mytoolbox   # 删除前需先停服务并清 DNS 记录

# 服务管理
systemctl status toolbox-tunnel toolbox-quick
systemctl restart toolbox-tunnel
journalctl -u toolbox-tunnel --no-pager -n 50

# DNS 诊断
dig app.mytoolbox.eu.org @henry.ns.cloudflare.com +short   # Cloudflare 内部
dig app.mytoolbox.eu.org @8.8.8.8 +short                    # 公网
dig NS mytoolbox.eu.org @ns.eu.org +noall +authority        # 父域委派状态

# 当前临时 URL
cat /opt/toolbox/current-tunnel-url.txt
```

---

## 7. DigitalPlat dpdns.org：即时可用的免费固定域名（当前主入口）

### 7.1 为什么换

eu.org 人工审核数日未批准，公网 `app.mytoolbox.eu.org` 一直解析不到。需要一个**免费、即时、固定**的替代域名。Cloudflare 自身不送域名（workers.dev/pages.dev 又跑不了 Go/ffmpeg），Freenom 系免费 TLD 已停发，最终选 **DigitalPlat** 的免费域名。

### 7.2 DigitalPlat 免费域名选型

DigitalPlat（非营利）在统一面板 https://dash.domain.digitalplat.org 发放多个免费命名空间：

| 后缀 | 形态 | 能否把 NS 委托给 Cloudflare |
|------|------|:---:|
| `.us.kg` | 二级域 `yours.us.kg` | ✅ |
| `.xx.kg` | 二级域 `yours.xx.kg` | ✅ |
| `.dpdns.org` | 子域 `yours.dpdns.org` | ✅（注册时选「外部名称服务器」即可） |
| `.qzz.io` / `.qd.je` | — | 不确定 |

> 关键判据：**只有能把 NS 委托给 Cloudflare 的后缀，才能成为 Cloudflare zone，命隧道才能正常路由**。只给 A/CNAME 记录管理、不给 NS 委托的，命隧道不会路由（Host 头对不上 zone）。
>
> 实测 `.dpdns.org` 在注册时可选「DigitalPlat DNS / 外部名称服务器 / 稍后配置」三种模式，选「外部名称服务器」即等价于 NS 委托，可作为 CF 子域 zone。

最终申请到 `allin1box.dpdns.org`，入口子域用 `app.allin1box.dpdns.org`。

> 旧入口 `register.us.kg` 已废弃，会显示 "This domain is paused register"，要用上面的统一面板。

### 7.3 操作步骤

1. **注册域名**：在 dash.domain.digitalplat.org 申请 `allin1box.dpdns.org`，DNS 模式选 **外部名称服务器**（External nameservers）。
2. **Cloudflare 添加子域 zone**：Add a Site → 选 **Connect a domain**（不是 Transfer/Buy）→ 输入 `allin1box.dpdns.org`（完整子域）→ Free 计划。Cloudflare 支持「子域 zone」（父域加 NS 记录委托过来），免费计划即可。
3. **回填 NS**：把 Cloudflare 给的两个 NS（如 `elly.ns.cloudflare.com`、`olof.ns.cloudflare.com`）填回 DigitalPlat 面板的「外部名称服务器」。
4. **Cloudflare 校验**：点 Check nameservers，等状态变 Active（收到 "Cloudflare's network is now boosting…" 邮件即生效）。
5. **建 CNAME 指向隧道**（见 §7.4 的坑，手动建）：
   - zone `allin1box.dpdns.org` → DNS → Add record
   - Type `CNAME`，Name `app`，Target `e72e5c56-97f8-4327-a389-99069a8a07f2.cfargotunnel.com`，Proxy **Proxied（橙云）**
6. **更新隧道 ingress**（`/opt/toolbox/named-tunnel.yml`）：
   ```yaml
   ingress:
     - hostname: app.allin1box.dpdns.org
       service: http://localhost:8080
     - hostname: app.mytoolbox.eu.org      # 保留，eu.org 批准后自动生效作备份
       service: http://localhost:8080
     - service: http_status:404
   ```
   `systemctl restart toolbox-tunnel`。
7. **改 site.url**：`/opt/toolbox/config.json` 的 `site.url` → `https://app.allin1box.dpdns.org`，`systemctl restart toolbox`。
8. **关临时隧道**：`systemctl disable --now toolbox-quick`（已有固定域名，不再需要）。

### 7.4 坑：cert.pem 是 zone 限定的，`route dns` 会建歪

本以为 `cloudflared tunnel route dns mytoolbox app.allin1box.dpdns.org` 会自动建 CNAME，但它把记录建到了 **`mytoolbox.eu.org` zone** 里，FQDN 变成 `app.allin1box.dpdns.org.mytoolbox.eu.org`（错位拼接）。

**原因**：服务器上的 `cert.pem` 是当初给 `mytoolbox.eu.org` zone 签发的（§2.4），origin cert 的作用域**仅限那一个 zone**，无权操作 `allin1box.dpdns.org` zone。cloudflared 退化到它能管理的旧 zone 里，把传入 hostname 当记录名追加，产生错位 FQDN。

**解决**：不用 `route dns`，直接在 Cloudflare 面板手动建 CNAME（§7.3 第 5 步），效果完全等价。stray 记录建议手动删除（不删也无害，Host 对不上 ingress 只会 404）。

> 若想让 `route dns` 对新 zone 生效，需重新 `cloudflared tunnel login` 并在浏览器里选 `allin1box.dpdns.org` zone 重新签发 cert——比手动建 CNAME 麻烦，没必要。

### 7.5 当前状态

| 项 | 状态 |
|----|------|
| 主入口 `https://app.allin1box.dpdns.org` | ✅ 上线，Cloudflare 边缘终结 TLS |
| `site.url` / sitemap / canonical / OG / JSON-LD | ✅ 全部指向新域名 |
| 命名隧道 ingress | ✅ 含 allin1box + eu.org 两条 |
| 临时隧道 trycloudflare | 🛑 已 disable（不再需要） |
| eu.org | ⏳ 仍在等审批，批准后自动作二级备份 |

### 7.6 隐患与维护

- **dpdns.org 不能在大陆做 ICP 备案**：所以必须继续走 Cloudflare 隧道（HTTPS 在边缘终结、回源走隧道，不碰阿里云 80/443），不能直接 A 记录指向 43.108.34.119。
- **免费域名可能改政策/回收**：DigitalPlat 偶尔会要求重新验证（收到邮件按提示点一下，别忽略）。eu.org 批准后作备份；真要长期稳定仍建议花 ¥7 买个 `.xyz`。
- **子域 zone 校验**：`dig NS allin1box.dpdns.org +short` 应返回两个 Cloudflare NS。

