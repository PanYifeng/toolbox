# 广告变现合规落地方案

> 本文是**操作手册**：怎么把广告变现接进 Toolbox，逐步可执行。配置字段含义见 [`commercialization.md`](./commercialization.md) 的「2.2 广告位」。
>
> **选型结论先行**：Toolbox 现状（`dpdns.org` 未备案、首尔服务器、开发者受众、纯前端隐私友好定位）下，**云服务 affiliate 自托管链接是首选**——零代码改动、契合受众、合规友好、无需备案。赞助打赏作补充。Google AdSense 与国内广告联盟不推荐（原因见第 8 节）。

---

## 1. 方案选型

| 方案 | 需备案 | 契合现有架构 | 收益模式 | 合规风险 | 选定 |
|------|:---:|:---:|---------|:---:|:---:|
| **云服务 affiliate（自托管链接）** | 否 | ✅ | CPS 按成交返佣 | 低 | ✅ 首选 |
| 赞助打赏（爱发电 / BMC） | 否 | ✅ 已有骨架 | 自愿捐 | 低 | ✅ 补充 |
| Google AdSense | 否（但不强制） | ⚠️ 需改造 CSP+加载 | CPM/CPC | 中 | ❌ 见 §8 |
| 国内联盟（百度/360） | ✅ 强制 | 需改造 | CPC | — | ❌ 未备案不可用 |
| 自售广告位 | 否 | ✅ | 月固定费 | 低 | ⏳ 等流量 |

---

## 2. 前置约束（动手前必读）

Toolbox 已内置一套「自托管 HTML 广告位」机制，变现方案必须在这个框架内落地：

### 2.1 架构现状

- **配置驱动**：`config.json` 的 `ads.slots` 数组，每个 slot 有 `id` / `position` / `html`。`html` 字段由前端 `loadAds()`（`internal/web/static/core/app.js`）用 `innerHTML` 直接注入页面。
- **三个广告位**：`top`（顶部）、`sidebar`（侧边）、`bottom`（底部）。
- **前端只渲染了 `top` 和 `bottom`**：`loadAds()` 里硬编码映射到 `#ad-top` / `#ad-bottom` 两个 DOM 容器，`sidebar` 位**当前不渲染**。要用 sidebar 需补一段代码（见 §3.5）。

### 2.2 CSP 约束（决定 banner 怎么做）

`internal/web/middleware.go` 的 CSP 头：

```
default-src 'self';
script-src 'self';          // ❌ 外部脚本不可用 → AdSense 排除
img-src 'self' data:;       // ❌ 外链图片不可加载 → banner 图必须本地化或纯文字
style-src 'self' 'unsafe-inline';  // ✅ 内联样式可用
connect-src 'self';         // ❌ 外部 fetch 不可用
```

**对 affiliate 落地的影响**：
- ✅ `<a href="外链">` 跳转不受 CSP 管控，affiliate 链接本身可用
- ✅ 内联 `<style>` / `style=""` 可用
- ❌ `<img src="https://云厂商/banner.png">` 会被浏览器拦截，**不能直接引用云厂商远程 banner 图**
- → banner 实现**二选一**：(A) 纯文字链接条（推荐，零依赖）；(B) 把云厂商 banner 图下载到 `internal/web/static/img/` 用 `/img/xxx.png` 引用

### 2.3 innerHTML 安全限制

`loadAds` 用 `innerHTML` 注入，**`<script>` 标签不会执行**（浏览器安全机制）。这正好与「不走外部脚本」的设计意图一致——只能放静态 HTML（链接、图片、内联样式），不能放 JS 广告代码。

---

## 3. Affiliate 落地操作（核心，逐步）

### 3.1 选择推广计划

按受众匹配度排序，建议先接 1-2 个（国内 + 国际各一）：

| 计划 | 受众 | 返佣模式 | 入口（以官网为准） | 是否需实名 |
|------|------|---------|-------------------|:---:|
| **阿里云「云小站」推广** | 国内开发者 | 按成交返佣，单笔几十~上百 | 阿里云控制台 → 推广中心 / 云小站 | 是（支付宝实名） |
| **腾讯云「代言人」** | 国内开发者 | 按成交返佣 | 腾讯云控制台 → 推广返佣 | 是 |
| **Vultr Affiliate** | 海外开发者 | 新用户消费返佣，比例高 | vultr.com → Affiliates | 否 |
| **DigitalOcean Referral** | 海外开发者 | 注册送信用 + 你得返佣 | digitalocean.com → Referrals | 否 |
| **JetBrains Affiliate** | 全球开发者 | 按成交返佣 | jetbrains.com → Affiliate Program | 否 |

> 注册入口与政策会变，**实际注册前以各平台官网最新说明为准**。本文不保证链接长期有效。

### 3.2 申请返佣链接（通用流程）

1. 登录对应云平台控制台，找到「推广 / 返佣 / Affiliate」入口
2. 阅读返佣规则（比例、结算周期、最低提现额、是否禁止自购）
3. 同意协议，获取**专属推广链接**（形如 `https://www.vultr.com/?ref=XXXXXXXXXX`，`ref` 参数就是你的返佣标识）
4. 部分平台需审核推广渠道，填你的站点域名 `app.allin1box.dpdns.org` 即可
5. 拿到链接后保存好，下一步填进配置

**验证返佣是否计费**：用未登录浏览器点你的推广链接，看是否跳转到带 `ref` 参数的落地页。绝大多数 affiliate 靠链接里的 ref 参数计费，**不依赖 HTTP Referer 头**，所以加 `rel="noreferrer"` 不影响返佣计入（极少数平台如早期 Amazon Associates 依赖 Referer，若发现返佣异常再去掉 `noreferrer`）。

### 3.3 制作 banner（二选一）

#### 方式 A：纯文字链接条（推荐，零依赖、最快上线）

无需图片，纯 HTML + 内联样式。视觉上是一条带背景色的可点击提示条：

```html
<a href="https://www.vultr.com/?ref=你的REF"
   rel="nofollow sponsored noopener noreferrer"
   target="_blank"
   style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;background:#eff6ff;color:#1e40af;text-decoration:none;font-size:13px;">
  <span style="font-weight:600;">🚀 Vultr 新用户专享</span>
  <span>$100 免费试用额度，全球机房按小时计费 →</span>
  <span style="margin-left:auto;font-size:11px;color:#64748b;">广告</span>
</a>
```

要点：
- `rel="nofollow sponsored noopener noreferrer"`：`sponsored` 是广告/返佣链接的合规标注（Google 2019 引入）；`noopener` 防 tabnabbing；`noreferrer` 不传 Referer
- 末尾「广告」字样：合规标识（《广告法》要求可识别，让用户能区分广告与自然内容）
- 文案**禁用极限词**：不能出现「最 / 第一 / 唯一 / 国家级 / 顶级」等（《广告法》第九条）

#### 方式 B：图文 banner（视觉效果好，需本地化图片）

1. 从云厂商推广后台下载官方 banner 图（PNG/JPG/SVG）
2. 放到 `internal/web/static/img/ads/` 下（新建 `ads` 子目录便于管理），如 `vultr-banner.png`
3. HTML 引用本地路径：

```html
<a href="https://www.vultr.com/?ref=你的REF"
   rel="nofollow sponsored noopener noreferrer"
   target="_blank"
   style="display:block;">
  <img src="/img/ads/vultr-banner.png"
       alt="Vultr 云服务器推广"
       style="max-width:100%;height:auto;border-radius:8px;">
  <span style="font-size:11px;color:#64748b;">广告</span>
</a>
```

⚠️ **不能写成 `<img src="https://云厂商/banner.png">`**——CSP `img-src 'self' data:` 会拦截外链图，必须本地化。

> 图文 banner 的图是二进制，不走 `//go:embed all:static` 之外的流程，放进 `internal/web/static/img/ads/` 后会被自动 embed，部署无需额外操作。

### 3.4 填入 config.json

把 `ads.slots` 里的注释占位换成实际 banner。三个位可分别放不同计划：

```json
"ads": {
  "enabled": true,
  "slots": [
    {
      "id": "top",
      "position": "top",
      "html": "<a href=\"https://www.vultr.com/?ref=你的REF\" rel=\"nofollow sponsored noopener noreferrer\" target=\"_blank\" style=\"display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;background:#eff6ff;color:#1e40af;text-decoration:none;font-size:13px;\"><span style=\"font-weight:600;\">🚀 Vultr 新用户专享</span><span>$100 免费试用额度 →</span><span style=\"margin-left:auto;font-size:11px;color:#64748b;\">广告</span></a>"
    },
    {
      "id": "sidebar",
      "position": "sidebar",
      "html": "<!-- sidebar 当前前端未渲染，见 §3.5 -->"
    },
    {
      "id": "bottom",
      "position": "bottom",
      "html": "<a href=\"https://www.aliyun.com/你的云小站链接\" rel=\"nofollow sponsored noopener noreferrer\" target=\"_blank\" style=\"display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;background:#fff7ed;color:#9a3412;text-decoration:none;font-size:13px;\"><span style=\"font-weight:600;\">☁️ 阿里云特惠</span><span>新用户服务器低至 X 折 →</span><span style=\"margin-left:auto;font-size:11px;color:#64748b;\">广告</span></a>"
    }
  ]
}
```

⚠️ JSON 里 HTML 字符串的双引号必须转义为 `\"`，换行去掉写成单行。改完用 `python3 -c "import json;json.load(open('config.json'))"` 校验 JSON 合法。

### 3.5 启用 sidebar 广告位（可选改进）

当前 `loadAds()` 只渲染 `top`/`bottom`。要启用 sidebar：

1. 在页面模板（`internal/web/static/index.html` 或 app.js 渲染逻辑）中，侧边栏容器加 `<div id="ad-sidebar"></div>`
2. 修改 `internal/web/static/core/app.js` 的 `loadAds()`，把映射扩展为三分支：

```js
// 当前（仅 top/bottom）：
['ad-top', 'ad-bottom'].forEach((id) => { ... });
cfg.slots.forEach((s) => {
  const id = 'ad-' + (s.position === 'bottom' ? 'bottom' : 'top');
  ...
});

// 改为（支持 sidebar）：
['ad-top', 'ad-bottom', 'ad-sidebar'].forEach((id) => {
  const e = app.querySelector('#' + id);
  if (e) e.innerHTML = '';
});
cfg.slots.forEach((s) => {
  const e = app.querySelector('#ad-' + s.position);
  if (e) e.innerHTML += s.html;
});
```

> 移动端通常无侧边栏，sidebar 位在窄屏下应隐藏（CSS `@media (max-width: 720px) { #ad-sidebar { display:none; } }`），避免布局错乱。

### 3.6 部署生效

```bash
# 1. 校验 JSON
python3 -c "import json;json.load(open('config.json'))"

# 2. 同步 config.json 到远程（Toolbox 启动参数 /opt/toolbox/config.json，运行时读取，非 embed）
scp config.json root@43.108.34.119:/opt/toolbox/config.json

# 3. 重启服务（重启后 /api/ads 返回新配置）
ssh root@43.108.34.119 "systemctl restart toolbox"

# 4. 验证广告位返回
ssh root@43.108.34.119 "curl -s http://localhost:8080/api/ads"
```

> 仅改 `config.json` 的 `ads.slots` **无需重新编译**，重启即生效。若同时改了 `app.js`（启用 sidebar），需重新 `go build` + 替换二进制。

---

## 4. 赞助入口补充（与广告并行）

Toolbox 已有 `donation` 配置（见 `commercialization.md` §2.1），支持 `image`（二维码）和 `link`（外链按钮）两种 method。补充 affiliate 之外的低门槛收益：

```json
"donation": {
  "enabled": true,
  "title": "支持本项目",
  "desc": "这些工具对你有帮助？欢迎请作者喝杯咖啡 ☕",
  "methods": [
    { "type": "image", "label": "支付宝", "src": "/img/donate-alipay.jpg" },
    { "type": "image", "label": "微信", "src": "/img/donate-wechat.png" },
    { "type": "link", "label": "爱发电", "href": "https://afdian.net/a/你的用户名" },
    { "type": "link", "label": "Buy Me a Coffee", "href": "https://www.buymeacoffee.com/你的用户名" }
  ]
}
```

- **爱发电**：国内开发者常用赞助平台，个人注册免资质，用户用微信/支付宝付款。作为纯打赏入口（非支付确认，无合规争议）
- **Buy Me a Coffee / Ko-fi**：面向国际用户，PayPal/信用卡
- 赞助与广告分离：赞助出现在首页赞助卡 + 顶/底栏赞助按钮，广告出现在广告位，互不干扰

---

## 5. 合规要点

### 5.1 《广告法》

- **禁用极限词**（第九条）：最 / 第一 / 唯一 / 顶级 / 国家级 / 极速 / 最好……广告文案全部避开
- **可识别性**：广告必须能让消费者辨明是广告——每个 banner 加「广告」/「推广」字样
- **真实宣传**：返佣文案不能夸大（如「$100 免费」必须是平台真实提供的新用户福利，写成你虚构的优惠违法）

### 5.2 affiliate 披露

- 链接加 `rel="nofollow sponsored"`（SEO + 合规双重标注，告诉搜索引擎这是付费链接，不传递权重）
- 页脚加一句披露，例如：

  > 「部分外链为推广链接，通过其注册可能为本站带来返佣，不影响你的使用成本。」

  放在 `internal/web/static/index.html` 页脚或 `app.js` 的 footer 渲染处。

- FTC（美国）与国内《互联网广告管理办法》都要求**显著标明广告关系**，页脚披露 + banner「广告」字样双重满足

### 5.3 外链安全

- 所有外链 `target="_blank"` 必须配 `rel="noopener noreferrer"`，防 tabnabbing 攻击（恶意广告页可通过 `window.opener` 篡改原标签）
- 这是 Toolbox 已有规范，`md.js` 渲染链接时已自动加，手写 HTML 时记得带上

### 5.4 不引入追踪脚本

保持现有「自托管 HTML」模式，**不接 AdSense 等需要 JS 的广告**，规避：
- Cookie 追踪引发的《个人信息保护法》/ GDPR 合规义务（需 cookie 同意横幅、隐私政策）
- 第三方脚本的性能与安全风险（CSP 也已锁死）

---

## 6. 操作清单

接 affiliate 的完整步骤，按序打勾：

- [ ] §3.1 选 1-2 个推广计划（建议阿里云云小站 + Vultr）
- [ ] §3.2 登录控制台申请，拿到返佣链接（含 ref 参数）
- [ ] §3.3 决定 banner 形式（推荐方式 A 纯文字）
- [ ] §3.4 替换 `config.json` 的 `ads.slots[].html`，双引号转义
- [ ] `python3 -c "import json;json.load(open('config.json'))"` 校验合法
- [ ] （可选）§3.5 启用 sidebar 位 + 重新编译
- [ ] §3.6 scp config 到远程 + `systemctl restart toolbox`
- [ ] `curl http://localhost:8080/api/ads` 验证返回正确
- [ ] 浏览器访问站点，确认 banner 渲染、点击跳转带 ref、外链新标签打开
- [ ] §5.2 页脚加 affiliate 披露语句
- [ ] （可选）§4 补充爱发电 / BMC 到 donation.methods

---

## 7. 收益预期（诚实）

工具站广告变现普遍偏低，尤其新站。Toolbox 当前流量不大，**短期收益有限**，变现是流量的函数：

| 方案 | 预期量级（月） | 触发条件 |
|------|---------|---------|
| 云服务 affiliate | 几十~几百 RMB | 取决于开发者用户注册转化，需有稳定流量 |
| 赞助打赏 | 不稳定，几十~几百 | 靠忠实用户主动支持 |
| AdSense（若接入） | $1-5 / 千次访问 | 技术站点击率低，且需审核通过 |

**建议**：先把 affiliate 链接架上（零成本零风险），等 SEO 收录起量（GSC/百度站长跟进）后再评估收益。不要为变现牺牲隐私友好定位与加载性能。

---

## 8. 不推荐方案及原因

### Google AdSense

- **架构冲突**：需 `<script async src="https://...adsbygoogle.js">` + `<ins class="adsbygoogle">`，CSP `script-src 'self'` 锁死，需改 `middleware.go` 放开外部脚本域，破坏现有安全策略
- **innerHTML 不执行 script**：现有 `loadAds` 注入方式跑不起来 AdSense，需改加载机制
- **审核风险**：AdSense 要求「高质量原创内容」，`dpdns.org` 免费域名 + 应用型工具站，审核通过率低
- **国内体验差**：AdSense 在国内加载慢，CPM 低（技术站 ~$0.5-2/千次）
- **隐私合规**：Cookie 追踪需加 cookie 同意横幅 + 隐私政策，增加合规负担
- **付款**：电汇到支持美元的国内银行卡，起付 $100，周期长

若未来坚持要接，需：放开 CSP `script-src` 加 `*.google.com`/`*.googlesyndication.com`、改 `loadAds` 用 DOM API 创建 script 节点、加隐私政策与 cookie 横幅。成本远高于收益。

### 国内广告联盟（百度联盟 / 360 联盟 / 搜狗联盟）

- **强制 ICP 备案**：`dpdns.org` 未备案，直接不符合申请条件
- 需企业或个体工商户资质
- 除非未来买独立域名 + 完成 ICP 备案，否则不可用

### 自售广告位

- 等流量起来后，直接把 banner 位按月卖给相关 SaaS / 工具服务商
- 现在流量不够，暂不现实。流量数据可作为后续招商依据（接 `/api/track` 埋点或 Cloudflare Analytics）
