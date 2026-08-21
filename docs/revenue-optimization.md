# 收益提升可落地方案

> 范围：人格 / 猎奇测试 + 分享卡 / 金卡的付费漏斗与体验深化。
> 互补关系：广告、Pro、SEO、合规等**配置驱动**项见 [`commercialization.md`](./commercialization.md)，本文不重复，只覆盖其未触及的"内容付费漏斗 + 卡面体验"。
>
> 底层逻辑：用户为「情绪价值 / 社交货币 / 确定性 / 专属仪式」四类需求买单。下文把这四维映射到现状差距，给出三层漏斗与可落地项。

---

## 1. 现状盘点 vs 付费意愿四维

| 维度 | 现状 | 差距 |
|---|---|---|
| 自我认知与深度解读（核心） | MBTI/大五/DISC 完整版 ¥5，`buildFullReport` 拼画像+维度+人际+压力+成长，DISC 实测 ~720 字 | 远未达"万字级深度"；无独立「职业参考」「恋爱类型」「优劣势」「场景行为」结构化板块 |
| 社交货币与身份认同 | 免费版有分享卡（雷达+类型标签+双语）；金卡随付费邮件附件 | 分享卡缺"金句 tagline"与回站引流；金卡未强差异化 |
| 降低决策门槛与确定性 | 错题解析 ¥0.2/题（仅有解析才计费，无解析免费） | 无 ¥0.99–1.99 猎奇微付费线（心理年龄/黑暗三人格/天赋领域/答案之书）；完整版无"免费预览首段"降低不确定 |
| 专属感与仪式感 | 站主 HMAC 确认门 + multipart 邮件 + 金卡 PNG | 流程顺但"仪式感"单薄：邮件文案平、卡面无持证人/编号/烫金质感、无"揭封"动效 |

> 现状数据来自 `tools/{mbti,big-five,disc}/data.js`（字段：`name/low/mid/high/full/relationship/stress/growth`，无 career/romance 独立字段）与 `internal/web/paidreport_http.go`。

---

## 2. 三层漏斗（免费引流 → 微付费破冰 → 深度利润 + 捆绑）

| 层 | 定价 | 内容 | 现状 |
|---|---|---|---|
| 免费层 | ¥0 | 小游戏、基础工具、人格简版（含分享卡）、错题"解析待补"免费看 | ✅ 已有 |
| 微付费层 | ¥0.99–1.99 | 猎奇测试完整结果 + 精美分享卡（福勒效应 + 社交传播） | ❌ 缺失（最高 ROI 新增项） |
| 深度付费层 | ¥9.9–19.9 | 人格完整版万字报告（职业/恋爱/优劣势/场景/成长）+ 金卡 | ⚠️ 现 ¥5 + 720 字，需扩容 + 提价 |
| 捆绑层 | ¥29.9 | 三大人格深度报告合集 + "人格护照"合集金卡 | ❌ 缺失（提 AOV） |

---

## 3. 落地项

### A. 深度报告扩容（核心付费点，最大杠杆）
**差距**：现 ~720 字 → 目标 6000–10000 字结构化报告。框架点明"职业参考宝典 / 最佳恋爱类型推荐 / 荣格八维 / 优劣势"是用户愿付几十元的核心。

**动作**：
1. `data.js` 每类型/维度补结构化双语字段（现仅有 `full` 散文 + relationship/stress/growth）：
   - `career: { fit:[{role,why}], avoid:[{role,why}] }` —— 职业参考（适配 + 规避）
   - `romance: { match:[{type,why}], caution:[{type,why}] }` —— 恋爱类型推荐（MBTI 经典型配、大五/DISC 按 combo）
   - `strengths:[{t,d}]` / `blindspots:[{t,d}]` —— 优劣势清单
   - `scenarios: { work, social, conflict }` —— 具体场景行为（满足"被看见的安全感"）
   - MBTI 额外 `cognitiveStack` —— 荣格八维（Ti/Te/Ni/Ne…）排序 + 简释
2. `buildFullReport`（三 `component.js`）按"画像 → 维度详解 → 子维度 → 优势盲点 → 职业参考 → 恋爱推荐 → 场景行为 → 人际 → 压力 → 成长 → 荣格八维(MBTI)"分段拼装，每段带标题。
3. `paidreport.go`/`paidreport_http.go`：`Report` 落盘无碍（万字纯文本 ~30KB，PNG dataURL 另存 `png` 字段；MaxBytesReader 6MB 足够）。注意 `paid-reports.json` 体积随条目累积，定期归档已 `approved` 项。

**文件**：`internal/web/static/tools/{mbti,big-five,disc}/data.js`（文案主工作量）、对应 `component.js` 的 `buildFullReport`。
**收益**：报告深度直接决定提价空间，¥5 → ¥9.9–19.9 的依据即在此。
**effort**：高（原创双语文案，是主要工作量，可分批：先"职业+恋爱"两段，先上线 MBTI）。

### B. 猎奇微付费测试线（破冰，新增最高 ROI）
**动作**：新增 ≤20 题轻量测试，复用现 `paidreport` + 分享卡基建，免费给一句结论、¥0.99 解锁完整 + 分享卡：
- 心理年龄、黑暗三人格（马基/自恋/精神质，猎奇钩子）、天赋领域、答案之书（输入问题 → 抽取一句"答案"，花钱买确定性）。
- 定价 ¥0.99：价格可忽略 → "买不了吃亏"顺手付；配福勒效应（笼统但走心）+ 精美分享卡 → 朋友圈传播。

**文件**：`internal/web/static/tools/{mental-age,dark-triad,talent,answer-book}/` 各一个 `data.js` + `component.js`（仿 mbti 范本）、`manifest` 注册 + `features` 开关、`config.json` 价目。
**收益**：低单价 × 高转化 × 自传播，拉新 + 破冰。
**effort**：中（单测 20 题 + 解锁文案，结构成熟可快速复制）。

### C. 分享卡社交货币化（免费 → 病毒）
**动作**：
1. 免费分享卡加"金句 tagline"（如 `INTP · 逻辑学家 — 用思考丈量世界的人`）：`buildShareOpts` 增 `tagline`，`drawPersonalityBody` 在类型标签下绘 tagline。
2. 免费分享卡角落加回站 QR/短链（新增 `showSiteQR`，与 `showDonate` 正交）；**金卡（付费）保持纯净不加 QR**，反衬"专属"。
3. 分享卡底部署名行：人格卡现 `showDonate:false`，可改为轻量 site URL 水印（一行小字）。

**文件**：`internal/web/static/core/cert.js`（`drawPersonalityBody` + `drawFooter` 分支）、各 `buildShareOpts`。
**收益**：免费卡是传播引擎，金句 + QR 把每张卡变成拉新入口。
**effort**：低。

### D. 金卡差异化与美感（用户明示重点，详见 §4）

### E. 定价与捆绑（提 ARPU）
**动作**：
1. 人格完整版：报告扩容（A）后提价 ¥5 → ¥9.9（单测）/ ¥19.9（含荣格八维增强版 MBTI）。
2. 三测捆绑 ¥29.9：一次付，三大人格深度报告 + 一张"人格护照"合集金卡（`renderMemorialCard` 多测汇总变体）。
3. `paidreport` 增 `bundle` 标记，确认门邮件一次发三段报告 + 1 张合集卡。

**文件**：各 `component.js` 的 `AMOUNT` 常量、`internal/web/paidreport_http.go`（bundle 分支）、`internal/web/static/core/cert.js`（合集卡布局）。
**收益**：提 AOV；捆绑把"单次冲动"变"一次买齐"。
**effort**：中（合集卡是新布局，其余复用）。

### F. 决策门槛与确定性（降低犹豫）
**动作**：
1. 完整版结果页付费墙前"免费预览首段"：报告第一段（画像）截断展示 + "付费解锁余 N 段"，用"已看到一半"制造确定性 + 沉没感。`renderPaidReportEntry` 增 `preview` 渲染。
2. ¥0.99 答案之书即"花钱买确定性"的极致形态（见 B）。

**文件**：`internal/web/static/core/paid-report.js`（`renderPaidReportEntry` preview）、各 component 传 `reportPreview`。
**effort**：低。

### G. 仪式感与专属（让"花钱"郑重）
**动作**：
1. 确认邮件文案升级：主题 `你的{测试名}深度报告已封缄`，正文顶部置顶一句个性化寄语（复用 `message` 寄语）。
2. 金卡附件文件名 `gold-card.png` → `人格金卡-{type}-{date}.png`（`buildMultipartMail` filename 参数）。
3. 卡面"揭封"动效：付费确认后，金卡在结果页有一次性的 scale+fade 揭示（纯前端 CSS/JS，邮件附件仍静态 PNG）。

**文件**：`internal/web/paidreport_http.go`（`notifyPaidReportApprovedUser` 文案 + filename）、`internal/web/static/core/cert.js`（动效预览态）、`internal/web/static/core/style.css`。
**effort**：低–中。

---

## 4. 金卡差异化与美感深化（重点）

### 现状
`renderMemorialCard({gold:true})` → 金边 + `drawMemorialBanner`（🏆 纪念）+ 雷达 + 双语类型标签 + 类型代号水印 + 寄语 + 防伪码。统一模板，仅按测试换主题色（DISC 暖橙 / 大五 青绿 / MBTI 蓝）。

### 差异化方向
1. **按类型图形标识**（现是字母水印，可升级为图形）：
   - DISC：D=⚡（进取）/ I=☀（辐射）/ S=⚓（稳固）/ C=⚙（精密），canvas 手绘路径、烫金描边。
   - MBTI：16 型 sigil（四象限几何，NT/NF/SP/SJ 四族各一底纹 + 类型字母组合）。
   - 大五：5 维图标（O=星芒 / C=齿轮 / E=太阳 / A=花 / N=月相）。
   - 文件：`cert.js` 增 `drawTypeEmblem(ctx, typeKey, ...)`，`buildShareOpts` 传 `typeEmblem`。
2. **分层金属质感**（对应定价层）：
   - 铜：免费分享卡（现 share card）。
   - 金：¥5/¥9.9 单测（现 gold）。
   - 翡翠/铂金：¥29.9 捆绑合集卡（新 `platinum`，更密 guilloché 底纹 + 四角花饰 + 双层金边）。
   - 文件：`cert.js` `drawBackground` 按 metal 切换纹理。
3. **证书感底纹**：`drawThemePattern` 增 guilloché（密集细线旋纹，仿钞票/证书）；金边走渐变（多档金色调 `createLinearGradient`，替代单色）。
4. **专属化信息**：卡面加"持证人 ____"行（前端付费表单增 `name` 字段，随 claim 落盘、绘入卡面）、"签发日期"、把现 `antiFake` 码包装成"认证编号 No.{code}"显式排版。

### 美感方向
1. **字体**：类型标签与寄语统一衬线 display 字族 + 字重对比，强化证书重量感（现 `"PingFang SC","Microsoft YaHei",serif` 已偏衬线，可进一步收敛为单一衬线字族）。
2. **烫金渐变**：金边/横幅用 `createLinearGradient` 多档金色（`#B8860B → #FFD700 → #FFF8DC → #B8860B`）模拟烫金反光，替代单色 `gold`。
3. **四角花饰**：`drawCornerFlourish` 在四角绘对称卷草/几何花饰，增强"封缄"感。
4. **配色**：金卡叠加暖金统一基调 + 测试主题色点缀，既有差异又显"同源高端"。

### 金卡子项优先级
| 子项 | effort | 感知价值 |
|---|---|---|
| 烫金渐变边 + 四角花饰 | 低 | 高（一眼"值得"） |
| 认证编号排版 + 持证人/签发日期 | 低 | 中（专属感） |
| 按类型图形标识（DISC 4 图标先行） | 中 | 高（差异化） |
| 翡翠/铂金合集卡 | 中 | 中（捆绑提价支撑） |

---

## 5. 优先级与路线图

| 阶段 | 项 | 预期 |
|---|---|---|
| P0（立刻） | C 分享卡金句+QR；G 邮件文案+附件名；金卡烫金渐变+花饰+认证编号排版 | 低成本抬升"值得感"与拉新 |
| P1（短期） | A 深度报告扩容（先 MBTI 职业+恋爱两段，提价 ¥9.9）；F 免费预览首段 | 直接抬升客单价 |
| P2（中期） | B 猎奇微付费线（心理年龄/黑暗三人格先行）；E 捆绑 ¥29.9 + 合集卡 | 拉新 + 提 AOV |
| P3（长期） | DISC/大五深度扩容；MBTI 荣格八维；铂金合集卡；金卡图形标识全套 | 完整产品矩阵 |

> 全程遵循 honor-system 诚实立场：报告文案真实、band 为量表相对位非虚构百分位、错题无解析免费展示。深度报告提价以"内容真实扩容"为依据，不做空壳涨价。
