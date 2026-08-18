# 商业化与可发现性配置指南

Toolbox 内置一套**配置驱动**的商业化与合规体系：盈利入口（赞助/广告/Pro）、SEO 可发现性、合规风险开关，全部通过 `config.json` 控制，无需改代码。核心原则是**单一事实源**——前端启动拉一次 `/api/bootstrap`，所有显隐与门控都看它；服务端 sitemap 与路由同步门控，被关掉的项对爬虫和用户都不可见。

```
config.json
    │
    ▼
/api/bootstrap ──┬──> 前端：过滤工具 / 显隐赞助·署名 / 路由守卫 / 埋点
                │
                └──> 服务端：sitemap.xml / robots.txt / /t/{id} 同步门控
```

---

## 1. 功能开关与合规预设

### 1.1 features 细粒度开关

```json
"features": {
  "ads": true,          // 广告位（自售 HTML，不走外部脚本）
  "donation": true,     // 赞助 / 捐赠入口
  "signature": true,    // 个人署名（逸丰 ❤ 思宏）
  "religion": true,     // 宗教文化分类（合规风险）
  "memorialCard": true, // 纪念卡 + 验真（发证资质风险）
  "analytics": false    // 匿名埋点上报（默认关）
}
```

每个开关控制一类 UI/工具的显隐，前端过滤工具清单 + 路由守卫，服务端 sitemap 与 `/t/{id}` 同步：

- `religion=false` → 隐藏佛教/基督教/伊斯兰三个工具，`/t/religion-*` 返回 404，sitemap 不含
- `memorialCard=false` → 隐藏纪念卡验真工具，`/t/cert-verify` 返回 404
- `signature=false` → 底栏不渲染"逸丰 ❤ 思宏"
- `donation=false` → 隐藏首页赞助卡与顶栏/底栏赞助按钮
- `ads=false` → 清空广告位
- `analytics=false` → 不注册 `/api/track` 路由（连接口都不存在）

### 1.2 compliance.strict 一键合规预设

```json
"compliance": { "strict": false }
```

设为 `true` 时，服务端 `EffectiveFeatures()` 自动把 **religion / memorialCard / signature / analytics** 置 false，其余（ads/donation）保持。这是面向大陆公众部署的合规预设——**一个开关隐藏全部合规风险项**。

> `strict` 不强制关闭 SEO 抓取（robotsAllow 独立控制）。strict 模式下若想彻底不被搜索引擎收录，把 `seo.robotsAllow` 设为 `false`。

### 1.3 门控对照表

| 配置 | religion 工具 | 纪念卡验真 | 个人署名 | 埋点 |
|------|:---:|:---:|:---:|:---:|
| 默认（全开） | ✅ | ✅ | ✅ | ❌（默认关） |
| `compliance.strict=true` | ❌ | ❌ | ❌ | ❌ |
| 单独 `features.religion=false` | ❌ | ✅ | ✅ | ✅ |

---

## 2. 盈利入口

> **赞助与收费严格分离。** 赞助（donation）是纯自愿支持，出现在首页，不绑定任何权益；收费（Pro）按资源消耗计费，只出现在视频/音频/文档转换等重工具内。两者各自独立配置、独立开关。

### 2.1 赞助 / 捐赠（首页，纯自愿）

```json
"donation": {
  "enabled": true,
  "title": "支持本项目",
  "desc": "这些工具对你有帮助？欢迎请作者喝杯咖啡 ☕",
  "methods": [
    { "type": "image", "label": "支付宝", "src": "/img/donate-alipay.jpg" },
    { "type": "image", "label": "微信", "src": "/img/donate-wechat.png" }
  ]
}
```

- `methods` 支持两种类型：`image`（二维码图片，放 `internal/web/static/img/` 下）和 `link`（外链按钮，如 Buy Me a Coffee）。
- 渲染位置：首页顶部可关闭的赞助卡 + 顶栏/底栏赞助按钮（任意页面可唤起）。
- 同时受 `features.donation` 总开关控制——关掉则全部消失。
- **不再含 `proHint`**：赞助卡只做自愿支持，不引导任何付费权益。Pro 入口在重工具内独立呈现（见 2.3）。

### 2.2 广告位

```json
"ads": {
  "enabled": true,
  "slots": [
    { "id": "top",    "position": "top",    "html": "<!-- 自售赞助 banner / 二维码 -->" },
    { "id": "bottom", "position": "bottom", "html": "<!-- 底部广告 -->" }
  ]
}
```

- `html` 字段直接注入页面，建议放**自售赞助 banner、合作链接、二维码**。
- **故意不支持外部脚本（如 AdSense）**：CSP 锁死 `script-src 'self'`，大陆合规更安全；要走外部广告需自行调整 `internal/web/middleware.go` 的 CSP 并承担合规风险。
- 受 `features.ads` 控制。

### 2.3 Pro Token（重工具内，按资源消耗计费）

针对服务端转码/转换类重工具（视频/音频/文档转换、视频截断）售卖上传额度。这些功能消耗 CPU 与存储成本较高，免费用户上限 1GB，Pro 用户上限 2GB 并旁路上传限流。

```json
"pro": {
  "enabled": true,
  "maxUploadBytes": 2147483648,
  "tokensFile": "/opt/toolbox/pro-tokens.json",
  "plans": [
    { "id": "time-year", "type": "time",  "durationDays": 365, "price": 19,   "label": { "zh": "年度 · 1 年", "en": "Annual · 1 year" } },
    { "id": "count-20",  "type": "count", "count": 20,         "price": 9.9,  "label": { "zh": "次数包 · 20 次", "en": "Pack · 20 uses" } }
  ]
}
```

**Token 模型**（两种，用户可选，分开定价）：

| 类型 | state 字段 | 校验规则 | 扣减 |
|------|-----------|---------|------|
| `time` | `expiresAt`（YYYY-MM-DD，含当天） | `now ≤ expiresAt 当天结束` | 不扣减（无状态） |
| `count` | `remaining`（剩余次数） | `remaining > 0` | 每次上传被接受后 `remaining--` 并原子写回 |

`pro-tokens.json`（独立 state 文件，作者手动维护，签发即追加）：

```json
[
  { "token": "a1b2...hex", "type": "time",  "expiresAt": "2027-08-18" },
  { "token": "c3d4...hex", "type": "count", "remaining": 20 }
]
```

- **运行时行为**：启动加载；mtime 变化自动重载（作者追加新 token 即时生效）；次数型在内存扣减 + 原子持久化（临时文件 + rename，mutex 保护）。token 用常数时间比较防时序枚举。
- **扣减时机**：上传被接受（入队后）扣减，失败任务不计费。耗尽后回退免费 1GB 限额，前端提示"次数已用完"。
- **API**：
  - `GET /api/pro/status`（带 `X-Pro-Token` 头）→ `{enabled, valid, status, freeLimit, proLimit, type?, remaining?, expiresAt?}`，供前端输入 token 后即时显示状态。
  - 上传 `POST /api/tools/{id}` 携带 `X-Pro-Token` 头即享 Pro 限额；响应附 `pro: {type, status, remaining?|expiresAt?}` 供前端刷新。
- **前端**：`core/pro.js` 提供 token 存取（localStorage `pro_token`）、`proHeaders()`、状态查询、面板渲染、支付核销提交与轮询。4 个重工具 `component.js` 内嵌 Pro 面板（资源消耗说明 + 方案 + token 输入 + 支付核销提交 + 状态），上传带 `X-Pro-Token`，响应回填剩余次数。首页捐赠卡不含任何 Pro 内容。

**支付核销流程**（半自动：作者邮件一键确认 + 1h 超时自动通过）：

Token 由系统自动生成，作者只需在邮件里点确认。状态文件 `pro-requests.json` 记录每条核销请求（独立于 `pro-tokens.json`，确认前 token 不生效）：

```json
[
  { "id":"...", "planId":"count-20", "email":"u@x.com", "orderId":"ALIPAY...",
    "token":"预生成token", "createdAt":"2026-08-18T12:00:00+08:00", "status":"pending", "activatedAt":"" }
]
```

1. 用户在重工具内扫码支付（支付宝/微信），在 Pro 面板提交方案 + 邮箱 + 订单号 → `POST /api/pro/request`。系统生成 token（pending，未生效），返回请求 ID。
2. 前端显示"核销中 · 1 小时内出结果"并每 30s 轮询 `GET /api/pro/request/{id}`；刷新页面后凭 localStorage 中的请求 ID 恢复轮询。
3. 系统向 `pro.adminEmail` 发一封含 HMAC 签名确认链接的邮件：`{site.url}/api/pro/confirm?id=<reqId>&sig=<hmac>`。
4. 作者点击链接 → `GET /api/pro/confirm` 校验签名，按方案把 token 写入 `pro-tokens.json`（生效），请求状态置 `approved`，并向用户邮箱发送 token。
5. 前端轮询到 `approved`/`auto` 即自动把 token 填入并激活，无需用户手动粘贴。
6. **超时自动通过**：后台每分钟扫描，`createdAt` 超过 `pro.autoApproveTTL`（默认 `1h`）仍 `pending` 的请求自动激活为 `auto`——作者未及时确认也不阻塞付费用户。

配置项（`config.json` `pro` 段）：

| 字段 | 说明 |
|------|------|
| `requestsFile` | 核销请求 state 文件路径（默认 `./pro-requests.json`） |
| `adminSecret` | 确认链接 HMAC 密钥；**留空则禁用邮件确认**，仅靠 1h 自动通过 |
| `adminEmail` | 接收确认邮件的作者邮箱（需同时配置 `mail` SMTP） |
| `autoApproveTTL` | 未确认自动通过时限，如 `1h` / `30m` |

> 邮件依赖 `mail` SMTP 配置（与纪念卡发送共用）。未配置 SMTP 时：作者收不到确认邮件 → 全部走 1h 自动通过；用户仍可在页面轮询到结果。确认链接签名 `HMAC-SHA256(adminSecret, id)`，伪造返回 403。

- `plans` 仅用于前端展示，价格/数量随时改。
- 文案诚实：只承诺"2GB 上传额度"，不提"更高并发"（`heavyConcurrency` 全局固定，未按 token 提升）。
- `compliance.strict` 下 Pro 保持可见（变现功能，与 donation 一致），不强制隐藏。
- 爱发电已隐藏（未注册，不如支付宝/微信直接）。

---

## 3. SEO 可发现性

### 3.1 站点元信息

```json
"site": {
  "name": "Toolbox",
  "url": "https://app.mytoolbox.eu.org",
  "description": "JSON 格式化、时间戳转换、视频转码等常用开发者工具，纯前端零成本，轻量高性能。",
  "ogImage": "/img/og.png"
}
```

- `url`：站点公网地址（不含末尾斜杠）。**部署时务必改成真实域名**，sitemap/canonical/OG 全部基于它。
- `ogImage`：社交分享卡片图片，放 `internal/web/static/img/` 下；留空则用 `summary` 卡片样式。
- `name`/`description` 注入到 `<title>`/`<meta description>`/OG/JSON-LD。

### 3.2 自动生成的 SEO 资产

| 路由 | 内容 |
|------|------|
| `/robots.txt` | 根据 `seo.robotsAllow` 输出 Allow/Disallow + sitemap 指向 |
| `/sitemap.xml` | 列 `/` 与每个**可见**工具 `/t/{id}`（被开关关闭的不出现） |
| `/t/{id}` | 服务端注入该工具专属 title/description/keywords/canonical/OG/JSON-LD |
| `/` | 站点级 meta + noscript 全工具链接列表（爬虫与无 JS 用户可读） |

### 3.3 干净 URL（history 路由）

工具页 URL 从旧的 `#json-format`（hash，爬虫不可索引）改为 `/t/json_format`（history，可索引）。

- 旧 hash 链接自动重定向到 `/t/{id}`，向后兼容。
- 点工具卡用 `pushState` 切换，支持前进/后退。
- 每个工具页服务端渲染独立 meta，搜索引擎能区分收录。

### 3.4 结构化数据

- 首页：JSON-LD `WebSite`
- 工具页：JSON-LD `SoftwareApplication`（含免费 Offer）

### 3.5 robots 控制

```json
"seo": { "robotsAllow": true }
```

- `true`：允许抓取，输出 sitemap。
- `false`：全站 Disallow（仍输出 sitemap 供自己调测，可按需移除）。
- 不设置（nil）：默认 `!strict`——strict 模式默认禁止抓取，非 strict 默认允许。

---

## 4. 匿名埋点（可选）

```json
"features": { "analytics": true }
```

开启后：

- 服务端注册 `POST /api/track`，仅记录 `path` + `referrer`，**无 PII**，内存计数。
- 前端每次访问 `fetch('/api/track', {path, ref})` 轻量上报。
- 关闭时路由不注册，接口直接 404，零开销零隐私。

> 默认关闭。需要详细统计可接 Plausible/Umami 等自托管方案，或扩展 `/api/track` 落盘。

---

## 5. 部署配置模板

### 大陆面向公众（合规优先）

```json
"compliance": { "strict": true },
"seo": { "robotsAllow": true }
```

宗教/纪念卡/署名/埋点全隐藏，保留安全工具的 SEO。

### 海外 / 个人自用（全开）

```json
"compliance": { "strict": false },
"features": { "ads": true, "donation": true, "signature": true, "religion": true, "memorialCard": true, "analytics": false },
"seo": { "robotsAllow": true }
```

### 内网 / 不想被收录

```json
"seo": { "robotsAllow": false }
```

---

## 6. 修改流程速查

| 想做的事 | 改哪里 |
|---------|--------|
| 上线赞助二维码/外链 | `donation.methods`，图片放 `internal/web/static/img/` |
| 换站点域名 | `site.url` |
| 上 OG 分享图 | `site.ogImage`，图片放 `internal/web/static/img/` |
| 发放 Pro token | `pro.tokens` 加字符串 |
| 换广告内容 | `ads.slots[].html` |
| 隐藏宗教/纪念卡 | `features.religion`/`features.memorialCard` 设 false，或 `compliance.strict=true` |
| 关掉埋点 | `features.analytics=false`（默认即关） |
| 新增工具后补 SEO | 运行 `bash scripts/gen-registry.sh`（自动生成 `tools.json`） |

---

## 7. 验证

```bash
# 1. 生成 SEO 元数据
bash scripts/gen-registry.sh

# 2. 起服务
go run ./cmd/server ./config.json

# 3. 检查 SEO
curl localhost:8080/robots.txt
curl localhost:8080/sitemap.xml
curl localhost:8080/t/json_format | grep -E 'title|description|canonical|ld\+json'

# 4. 检查门控（strict 模式）
curl localhost:8080/api/bootstrap   # features 应 religion/memorialCard=false
curl -o /dev/null -w '%{http_code}' localhost:8080/t/religion-buddhism   # 404
```
