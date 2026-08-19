# 淘宝联盟 / 京东联盟 导购返佣接入手册

> 本文是**操作手册**：怎么把国内电商 CPS 返佣接进 Toolbox（免费子域名 + 首尔服务器、无 ICP 备案）。云服务 affiliate（Vultr / 阿里云）与广告位的接入见 [`ad-monetization.md`](./ad-monetization.md)；本文专讲**淘宝客 / 京粉**这条国内导购返佣线，与广告位机制互补。
>
> **结论先行**：在「不额外花钱、能提现到真人民币、用户操作成本低、免费子域名能过审」四条硬约束下，**唯一可行的是淘宝联盟 + 京东联盟，且必须用「社交渠道」注册**（媒体类型选「无自有阵地」/「导购媒体」），**绕开 ICP 备案**。官网推广渠道与可嵌入组件（淘宝超级组件 / 京粉组件）都强制 ICP，本站用不了。

---

## 1. 为什么是这两家

### 1.1 四条硬约束

| # | 约束 | 含义 |
|---|------|------|
| 1 | **不涉及额外支出** | 连「开收款账户」的年费都算支出 → 排除 Payoneer（$29.95/yr）、Awin（$1 注册费） |
| 2 | **能提现到真人民币** | 信用额度 / 礼品卡不算 → 排除 Amazon Associates（需美国银行账户 = Payoneer，否则只能换礼品卡） |
| 3 | **用户操作成本低** | 优先「点一下就完事」，避免多步注册填表 |
| 4 | **免费子域名 + 海外服务器能过审（≤3 天）** | 排除所有强制 ICP 备案的官网推广渠道 |

### 1.2 平台横评

| 平台 | 提现 | 额外支出 | 免费子域名过审 | 结论 |
|------|------|:---:|:---:|------|
| **淘宝联盟（淘宝客）** | 支付宝到人民币 | 无 | ✅ 走社交渠道 | ✅ 选定 |
| **京东联盟（京粉）** | 银行卡到人民币 | 无 | ✅ 走导购媒体 | ✅ 选定 |
| Amazon Associates | 礼品卡 / 美国银行 | 需 Payoneer（年费） | ✅ 接受子域名 | ❌ 违反 1、2 |
| Awin / ShareASale | 银行转账（美元） | $1 注册费 | ⚠️ 人工审 | ❌ 违反 1 |
| Impact | — | — | ❌ 自动拒 dpdns 子域名 | ❌ 不过审 |
| Rakuten | — | — | ⚠️ 人工审，对免费子域名扣分 | ❌ 风险高 |
| 国内广告联盟（百度/360 CPC） | 人民币 | 无 | ❌ 强制 ICP | ❌ 违反 4 |

> Amazon 表面最友好（接受免费子域名），但提现要么美国银行账户（=Payoneer 年费，违反约束 1），要么礼品卡（违反约束 2），两头堵死。**只有淘宝 / 京东联盟同时满足四条。**

---

## 2. ICP 备案：核心卡点

ICP 备案是中国大陆的**法律硬要求**：要在中国大陆服务器上对外提供网站服务，域名必须备案。Toolbox 用 `dpdns.org` 免费子域名 + 首尔服务器，**没有独立域名、没有大陆服务器，无法备案**。

| 渠道类型 | 是否强制 ICP | Toolbox 可用 |
|----------|:---:|:---:|
| 网站推广渠道（官网投放返佣链接） | ✅ 强制 | ❌ |
| 淘宝超级组件 / 京粉组件（可嵌入 JS 挂件） | ✅ 强制 + 独立域名 + 网站媒体类型 | ❌ |
| **社交推广渠道**（社交 / 聊天工具分享） | ❌ 不强制 | ✅ |

**所以必须走社交渠道注册**——把阵地登记成「今日头条 / 微信」等社交账号，而非本站域名。这是绕开 ICP 的唯一合法路径。

---

## 3. 注册流程

### 3.1 淘宝联盟（media.taobao.com）

媒体类型只有三选：自有平台 / 他方平台 / **无自有阵地**。本站没有可备案的独立域名 → 选「无自有阵地」。

1. **媒体类型**：选「无自有阵地」
2. **推广平台**：选「今日头条」（头条号已有账号即可；本站域名不能填，因未备案）
3. **广告类型**：选「信息流」（不是搜索 SEM / 展示类，更贴合内容分享）
4. **推广位名称**：随意起名，如「开发者工具站推广位」
5. 生成推广位后，进入「选品」→「收藏夹」模式建商品清单页

### 3.2 京东联盟（union.jd.com / 京粉）

1. **媒体类型**：选「导购媒体」
2. **导购类型**：选「聊天工具」
3. **媒体类型**：选「微信」
4. 进入活动页 / 单品推广，生成联盟推广链接

> 两家都**不填本站域名**——阵地登记的是社交账号，不是 Toolbox。这是社交渠道的核心：声明的阵地 ≠ 实际投放位置。

---

## 4. 链接生成

### 4.1 两种产出形态

| 形态 | 淘宝 | 京东 | 用途 |
|------|------|------|------|
| **聚合页链接**（一整页商品清单） | 收藏夹页面短链 `mo.m.taobao.com/union2/page_...&union_lens=...` | 活动页 `jingfen.jd.com/item?...&utm_campaign=...` | 放捐赠卡外链，跳转出去逛 |
| **单品短链**（每件一个追踪链接） | 淘宝客短链 `s.click.taobao.com/xxxxx`（300 天有效） | 联盟推广短链 `u.jd.com/xxxxx` | 自托管好物卡 inline 展示 |

### 4.2 单品导出

- **淘宝**：「选品」→「收藏夹」→ 导出商品列表 CSV，字段含 `商品名称 / 商品主图 / 活动到手价 / 淘宝客短链接(300天内有效)`
- **京东**：「推广」→「导购媒体推广」→「导购分享」→ 导出 xls（CDFV2 二进制，需 `xlrd` 解析），字段含 `商品名称 / 商品主图链接 / 到手价 / 联盟推广链接`

> 单品拆开后才能在自己页面 inline 展示（聚合页是 iframe 跳转，见 §6）。

---

## 5. 计佣机制（关键）

**佣金靠链接里的 PID 计入，不靠 Referer，也不靠审核投放位置 URL。**

- 淘宝：PID 在 `union_lens` 参数里
- 京东：PID 在 `utm_campaign=t_2038489630` 里

含义：

1. **链接放在 Toolbox 上，佣金照样算到你头上**——即使你声明阵地是「今日头条 / 微信」。社交渠道对个人小推广者并不主动核查「声明阵地 ≠ 实际位置」，属灰色但不被主动执法的区间。
2. **`Referrer-Policy: no-referrer` 不影响计佣**——PID 在 URL 里，不在 Referer 头里。本站全局 `no-referrer` 反而帮绕过淘宝 / 京东 CDN 防盗链（见 §7.3）。
3. **链接有效期**：淘宝客短链 300 天，过期需重新生成；京东短链同理，定期更新池子。

---

## 6. 落地方式：为什么不能 inline 嵌入官方组件

最初想「像阿里云广告一样每工具页 inline 嵌入商品长条」，调研后**不可行**：

| 方案 | 卡点 |
|------|------|
| iframe 嵌淘宝聚合页 | 淘宝登录墙，iframe 内跳登录页，无法直接展示 |
| 淘宝超级组件（JS 挂件） | 强制 ICP + 独立域名 + 网站媒体类型，本站拿不到 |
| 京粉组件 | 同上，强制 ICP |

** pivoted 方案：自托管好物卡**——把导出的单品短链存进 config，前端随机抽取渲染成自己的商品卡，链接仍指向带 PID 的追踪短链。视觉上是「在自己页面展示」，点击后跳到淘宝 / 京东商品页完成下单，佣金照算。

---

## 7. 自托管好物卡实现

### 7.1 数据流

```
config.json donation.picks (20 件池)
  ↓ /api/bootstrap 透传（DonationConfig.Picks []DonationPick）
前端 picksCardHTML()
  ↓ Fisher-Yates 洗牌，按平台分组各取 2 件（共 4 件）
  ↓ renderTool 在 #tool-body 之后渲染
2 列网格 + 可折叠 + 「换一批」刷新随机选择
```

**「不选死」**：每次进工具页随机抽 4 件，两平台各 2 件均匀曝光 + 新鲜感；「换一批」不整卡重建，只重渲染网格项。

### 7.2 字段

```go
// internal/config/config.go
type DonationPick struct {
    Platform string `json:"platform"` // taobao / jd
    Name     string `json:"name"`
    Image    string `json:"image"`    // https://img.alicdn.com / https://img14.360buyimg.com
    Price    string `json:"price"`    // 到手价
    URL      string `json:"url"`      // 带 PID 的导购推广短链（s.click / u.jd）
}
```

前端渲染的 `<a href>` **必须取 `pick.url`**（带 PID 的追踪短链），不可误用裸商品页 URL——否则佣金不计入。`rel="nofollow sponsored noopener noreferrer"`。

### 7.3 商品图加载（CSP + 防盗链）

商品图来自淘宝 / 京东 CDN，两个坑：

1. **CSP 拦截**：默认 CSP 是 `img-src 'self' data:`，外站图全裂。需在 `internal/web/middleware.go` 放行 CDN：
   ```
   img-src 'self' data: https://*.alicdn.com https://*.360buyimg.com
   ```
   用通配 `*.` 覆盖所有子域（`img`/`img14`/`gw`/`i` 等），未来加商品不踩坑。
2. **防盗链**：两平台 CDN 按 Referer 拦截外站。本站全局 `Referrer-Policy: no-referrer` 已设，**不带 Referer 反而能出图**（CDN 只拦带外站 Referer 的请求）。实测淘宝图 200/webp、京东图 200/jpeg。

### 7.4 文案与 UX

- 工具页底部、可折叠、默认展开（每个工具页都能看到，类似底部广告位）
- 副标题恳切带 ❤：「你不加价，点一下就支持本站 ❤」
- 平台徽章配色：淘宝橙 `#ff5000` / 京东红 `#e1251b`，便于识别
- 与阿里云底部广告位**并存**，互不影响

---

## 8. 部署

### 8.1 二进制（含静态资源）

工具页前端（`app.js` / `style.css` / `i18n.js`）与 CSP（`middleware.go`）都通过 `//go:embed all:static` 编进二进制，改动需重新编译 + 重启：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o /tmp/toolbox-linux ./cmd/server
scp /tmp/toolbox-linux root@43.108.34.119:/opt/toolbox/toolbox.new
ssh root@43.108.34.119 'cp /opt/toolbox/toolbox /opt/toolbox/toolbox.bak && mv /opt/toolbox/toolbox.new /opt/toolbox/toolbox && chmod +x /opt/toolbox/toolbox && systemctl restart toolbox'
```

### 8.2 配置（深合并，绝不覆盖生产密钥）

⚠️ **绝不能 `scp` 本地 config.json 覆盖远程**——本地是 dev 模板（`site.url=localhost`、`mail` 空、`adminSecret` 空），覆盖会擦掉生产 SMTP 授权码 / adminSecret / 站点 URL。必须深合并：

`/tmp/merge-affiliate.py`：读远程 config → 设置 `donation.title/desc` → 按 URL 合并 `links`（更新已有、追加缺失）→ 读 `/tmp/picks-pool.json` 设 `donation.picks`（整体替换 + 校验 url 必须是 `s.click`/`u.jd` 追踪链）→ 备份 `config.json.bak` → 写回。**全程不碰 `mail` / `pro.adminSecret` / `site.url`。**

```bash
scp /tmp/picks-pool.json /tmp/merge-affiliate.py root@43.108.34.119:/tmp/
ssh root@43.108.34.119 'python3 /tmp/merge-affiliate.py'
```

### 8.3 回滚

```bash
ssh root@43.108.34.119 'mv /opt/toolbox/toolbox.bak /opt/toolbox/toolbox && cp /opt/toolbox/config.json.bak /opt/toolbox/config.json && systemctl restart toolbox'
```

### 8.4 验证

```bash
# 服务存活
ssh root@43.108.34.119 'systemctl is-active toolbox'
# CSP 放行 CDN
ssh root@43.108.34.119 'curl -sI http://localhost:8080/ | grep -i content-security-policy'
# picks 透传 + 全追踪链
ssh root@43.108.34.119 'curl -s http://localhost:8080/api/bootstrap | python3 -c "import sys,json;p=json.load(sys.stdin)[\"donation\"][\"picks\"];print(len(p))"'
```

---

## 9. 合规与风险

| 项 | 说明 |
|----|------|
| 社交渠道灰色 | 声明阵地（头条 / 微信）≠ 实际投放（Toolbox）；对个人小推广者不主动执法，但不消除风险。不作为主力，仅作云服务 affiliate 的补充 |
| 不影响用户成本 | 链接是 CPS 返佣，用户按正常价下单，不加价；文案明确「你不加价」 |
| `rel=nofollow sponsored` | 所有返佣链接标注，对搜索引擎透明 |
| 底部「广告」披露 | footer 已有「部分外链含返佣」提示 |
| 无 ICP 的天花板 | 不能用官网渠道、不能用官方嵌入组件、不能上国内广告联盟 CPC。本方案是天花板内的最优解 |

---

## 10. 已知限制与维护

1. **链接有效期**：淘宝客短链 300 天，到期需重新导出生成池子、重跑 merge
2. **商品图依赖 CDN**：淘宝 / 京东 CDN 改域名 / 改防盗链策略会导致裂图；CSP 通配已尽量覆盖子域
3. **池子容量**：当前 20 件（12 淘宝 + 8 京东），前端每次抽 4 件。扩池只需往 `picks-pool.json` 加、重跑 merge
4. **无 ICP**：官网推广渠道与官方组件永久不可用，除非将来买独立域名 + 大陆服务器备案
5. **单品短链 ≠ 商品详情页**：渲染必须用 `pick.url`（追踪短链），改错则佣金不计入

---

## 11. 相关文件

| 文件 | 作用 |
|------|------|
| `internal/config/config.go` | `DonationConfig.Picks` + `DonationPick` 结构 |
| `config.json`（dev 模板）/ 远程 `/opt/toolbox/config.json` | `donation.picks` 池 + `donation.links` 聚合页外链 |
| `internal/web/static/core/app.js` | `picksCardHTML` / `picksItemsHTML` / `bindPicksCard`（随机抽取 + 折叠 + 换一批） |
| `internal/web/static/core/style.css` | `.picks-card` / `.pick-item` 样式 |
| `internal/web/static/core/i18n.js` | `picks.*` 中英文案 |
| `internal/web/middleware.go` | CSP `img-src` 放行 CDN |
| `internal/web/seo.go` | `handleBootstrap` 透传 `donation`（含 picks） |
| `/tmp/merge-affiliate.py` | 远程 config 深合并部署脚本（保留生产密钥） |
| `/tmp/picks-pool.json` | 20 件 affiliate 单品池源 |
