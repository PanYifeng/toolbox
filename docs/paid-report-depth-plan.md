# 付费人格报告万字解析优化方案

> 目标：把当前单薄的纯文本付费报告（MBTI ~677 字 / Big Five ~2000 字 / DISC ~1700 字）升级为**万字级深度解析 PDF**，让 ¥5 的付费价值感名副其实。

## 1. 现状与差距

### 1.1 精确测量（2026-08-21）

| 工具 | 当前段数 | 当前后中文字数 | 目标 | 差距倍数 |
|------|---------|--------------|------|---------|
| MBTI | 8 段 | **677** | ~10000 | 15× |
| Big Five | 6 段 | ~2000 | ~10000 | 5× |
| DISC | 5 段 | ~1700 | ~10000 | 6× |

### 1.2 核心痛点

1. **类型画像太短**：MBTI 每类型 `full` 字段仅 ~120 字，Big Five/DISC 每维度 `full` 仅 ~130-180 字——付费用户买到的深度与免费版几乎无差。
2. **子维度无文字解读**：Big Five 15 子面、MBTI 12 子面只输出"名称+百分比"，缺高低分的行为解读。
3. **缺核心深度段**：无认知功能栈（MBTI 灵魂）、无优势/盲点场景化、无压力倦怠预警、无人际兼容矩阵、无沟通/领导/学习风格。
4. **DISC blends 一句话带过**：12 种混合风格 `desc` 仅 30-40 字，混合效应（主+次维度互动）完全没展开。
5. **排版单薄**：PDF 纯文本流式排版，无封面/目录/分级标题/数据高亮，视觉价值感不足。

---

## 2. 目标定义

**"万字解析"标准**：正文 ≥ 8000 中文字符（≈ 10-12 页 A4 PDF），三工具均达标，中英双语。

> 取 8000 而非 10000 作为硬线：扣除标题/数据/留白后，正文 8000 字已构成"万字级"体感；留余量给排版与可读性。

---

## 3. 核心架构：三层内容分层 + 维度级复用

### 3.1 为什么要分层

朴素方案是"每个类型从零写万字"——MBTI 16 类型 × 10000 = 16 万字原创，双语 32 万字，不可落地。

**关键洞察**：MBTI 16 类型由 4 维度 × 2 极组合而成。"内向(I)的深度解读"对所有含 I 的类型（INTJ/INTP/INFJ/INFP/ISTJ/ISFJ/ISTP/ISFP 共 8 种）通用。把维度极性写成**可复用的维度级内容**，报告按用户实际偏好组合拼装——生产量从 16×N 降到 8+N。

```
用户报告 = L1 维度级内容（按偏好组合，复用率高）
         + L2 类型/组合级内容（专属画像）
         + L3 通用内容（所有报告共享）
```

### 3.2 三层定义

| 层 | 内容 | 复用率 | 生产量（MBTI 为例） |
|----|------|--------|---------------------|
| **L1 维度级** | 每个维度极性的深度解读、子面解读 | 高（8 极服务 16 类型） | ~11200 字 |
| **L2 类型级** | 类型专属画像/功能栈/优势盲点/职业/沟通/领导 | 低（每类型 1 份） | 16 × ~6800 = 108800 字 |
| **L3 通用** | 卷首语/阅读指南/局限声明 | 全局共享 | ~500 字 |

> Big Five / DISC 同构：L1 按"维度+档位"组织，L2 按"主导组合"组织（见 §5）。

---

## 4. 段落架构（万字版）

### 4.1 MBTI 报告 17 段（当前 8 → 17）

| # | 段落 | 层 | 来源字段 | 字数 |
|---|------|----|---------|------|
| 1 | 卷首语与阅读指南 | L3 | `i18n.ps.intro` | 300 |
| 2 | 类型全景快照 | L2 | `type.nick`+四维计数 | 200 |
| 3 | **类型深度画像** | L2 | `type.deep`（新，扩自 full） | 1200 |
| 4 | **认知功能栈** | L2 | `type.cogStack`（新） | 1000 |
| 5 | 四维度详解 | L1 | `dimPole.deep`（新）4×800 | 3200 |
| 6 | 子维度细描 | L1 | `facet.high/low`（扩）12×200 | 2400 |
| 7 | **优势 TOP3** | L2 | `type.strengths`（新） | 600 |
| 8 | **盲点 TOP3** | L2 | `type.blindspots`（新） | 600 |
| 9 | 压力与倦怠 | L2+L1 | `type.stress`+`dimPole.stress` | 500 |
| 10 | **人际兼容矩阵** | L2 | `type.compat`（新） | 400 |
| 11 | **沟通风格** | L2 | `type.comm`（新） | 500 |
| 12 | **领导力与团队** | L2 | `type.leadership`（新） | 400 |
| 13 | 职业深度指南 | L2 | `type.careerDeep`（扩自 career） | 600 |
| 14 | 学习风格 | L2 | `type.learning`（新） | 300 |
| 15 | 成长路径 | L2 | `type.growthPath`（新） | 500 |
| 16 | 每日实践清单 | L2 | `type.practices`（新） | 200 |
| 17 | 局限与说明 | L3 | `i18n.ps.disclaimer` | 200 |
| | | | **合计** | **~13100** |

### 4.2 Big Five 报告段（当前 6 → 16）

Big Five 无离散类型，按"主导维度+档位"组织 L2。5 维度 × 3 档（高/中/低）= 15 份主导画像，但用户只看自己主导维度+档位那 1 份。

| # | 段落 | 层 | 字数 |
|---|------|----|------|
| 1 | 卷首语 | L3 | 300 |
| 2 | 主导画像快照 | L2 | 200 |
| 3 | **主导维度深度画像** | L2 `domProfile[dom][level].deep`（新） | 1200 |
| 4 | 五维度详解 | L1 `dimPole.deep` 5×800 | 4000 |
| 5 | **子维度细描（15 面）** | L1 `facet.high/low`（扩）15×250 | 3750 |
| 6 | 优势 TOP3 | L2 `domProfile.strengths` | 500 |
| 7 | 盲点 TOP3 | L2 `domProfile.blindspots` | 500 |
| 8 | 压力倦怠 | L2+L1 | 400 |
| 9 | 人际兼容 | L2 `domProfile.compat` | 400 |
| 10 | 沟通风格 | L2 `domProfile.comm` | 400 |
| 11 | 领导力 | L2 `domProfile.leadership` | 400 |
| 12 | 职业深度 | L2 `domProfile.careerDeep` | 500 |
| 13 | 学习风格 | L2 | 300 |
| 14 | 成长路径 | L2 | 400 |
| 15 | 每日实践 | L2 | 200 |
| 16 | 局限声明 | L3 | 200 |
| | | **合计** | **~13150** |

### 4.3 DISC 报告段（当前 5 → 15）

DISC 以 12 blends 为 L2 单元（主+次维度组合），L1 为 4 维度详解。

| # | 段落 | 层 | 字数 |
|---|------|----|------|
| 1 | 卷首语 | L3 | 300 |
| 2 | 混合风格快照 | L2 | 200 |
| 3 | **混合风格深度画像** | L2 `blend.deep`（扩自 desc 30→800） | 1200 |
| 4 | 主+次维度互动效应 | L2 `blend.interplay`（新） | 600 |
| 5 | 四维度详解 | L1 `dimPole.deep` 4×900 | 3600 |
| 6 | 优势 TOP3 | L2 `blend.strengths` | 500 |
| 7 | 盲点 TOP3 | L2 `blend.blindspots` | 500 |
| 8 | 压力倦怠 | L2+L1 | 400 |
| 9 | 人际兼容 | L2 `blend.compat` | 400 |
| 10 | 沟通风格 | L2 `blend.comm` | 400 |
| 11 | 领导力 | L2 `blend.leadership` | 400 |
| 12 | 职业深度 | L2 `blend.careerDeep` | 500 |
| 13 | 成长路径 | L2 | 400 |
| 14 | 每日实践 | L2 | 200 |
| 15 | 局限声明 | L3 | 200 |
| | | **合计** | **~10200** |

---

## 5. 数据结构扩展 Schema

### 5.1 MBTI `data.js`

```js
// dims 扩展：每极加 deep（维度级深度解读，L1）
dims: {
  EI: {
    name: {...}, first: 'E', second: 'I',
    relationship: {...}, stress: {...}, growth: {...},  // 既有
    poleDeep: {  // 新：维度级深度
      E: { deep: '外向极深度解读 ~800字...', stress: '...', growth: '...' },
      I: { deep: '内向极深度解读 ~800字...', stress: '...', growth: '...' },
    },
  },
  // SN/TF/JP 同构
}

// facets 扩展：每面加 high/low 文字解读（L1）
facets: {
  EI: [
    { name: {...}, items: [...], high: '高分行为解读 ~200字', low: '低分行为解读 ~200字' },
    // 3 面/维
  ],
}

// types 扩展：L2 类型级深度字段
types: {
  INTJ: {
    nick: {...}, brief: {...}, full: {...},  // 既有（full 保留作免费版诱饵）
    career: {...}, romance: {...},          // 既有
    // —— 新增 L2 深度字段 ——
    deep: { zh: '类型深度画像 ~1200字', en: '...' },
    cogStack: {  // 认知功能栈（MBTI 灵魂）
      order: 'Ni > Te > Fi > Se',
      dominant: { name: '内倾直觉 Ni', desc: '...' },
      auxiliary: { name: '外倾思考 Te', desc: '...' },
      tertiary: { name: '内倾情感 Fi', desc: '...' },
      inferior: { name: '外倾感觉 Se', desc: '...' },
    },
    strengths: [{ title: '...', desc: '...' }×3],
    blindspots: [{ title: '...', desc: '...' }×3],
    compat: { high: ['ENTP','ENFP'], low: ['ESFP'], note: '...' },
    comm: { style: '...', expression: '...', conflict: '...' },
    leadership: { style: '...', teamRole: '...', delegation: '...' },
    careerDeep: { fit: '...', avoid: '...', env: '...', path: '...' },
    learning: { style: '...', bestEnv: '...' },
    growthPath: [{ stage: '...', practice: '...' }×3],
    practices: ['...'×7],
  },
}
```

### 5.2 Big Five `data.js`

```js
// dims 扩展：poleDeep（高/低两档深度，L1）
dims: {
  O: { name: {...}, low/mid/high: {...}, full: {...}, relationship/stress/growth: {...},
    poleDeep: { high: { deep: '~800字', ... }, low: { deep: '~800字', ... } } },
  // C/E/A/N 同构
}
// facets 扩展：high/low 文字解读（L1）
facets: { O: [{ name, items, high: '~250字', low: '~250字' }×3], ... }
// 新增 domProfile：主导维度×档位的 L2 画像（5 维×3 档=15 份）
domProfile: {
  O: {
    high: { deep: '~1200字', strengths:[...], blindspots:[...], compat, comm, leadership, careerDeep, learning, growthPath, practices },
    mid: { ... }, low: { ... },
  },
  // C/E/A/N 同构
}
```

### 5.3 DISC `data.js`

```js
// dims 扩展：poleDeep（高/低两档，L1）
dims: {
  D: { name: {...}, low/mid/high: {...}, full: {...}, relationship/stress/growth: {...},
    poleDeep: { high: { deep: '~900字' }, low: { deep: '~900字' } } },
  // I/S/C 同构
}
// blends 扩展：desc 30字 → deep 800字 + 互动 + 场景化（L2）
blends: {
  DI: { name: {...}, desc: {...},  // 既有
    deep: '~800字', interplay: '~600字主+次互动',
    strengths, blindspots, compat, comm, leadership, careerDeep, growthPath, practices },
  // 12 blends 同构
}
```

---

## 6. `buildFullReport` 重构

当前 `buildFullReport` 在各 `component.js` 内联拼装。重构为**段落注册表**驱动，便于按分期增减段落：

```js
// core/report-sections.js（新）
// 段落注册表：每段 { key, title(i18n), render(snap, data, lang) -> string, phase }
export const MBTI_SECTIONS = [
  { key:'intro', phase:0, render:(s,d,L)=>L(i18n.ps.intro) },
  { key:'snapshot', phase:0, render:(s,d,L)=>`${s.code} ${L(d.types[s.code].nick)}\n四维：...` },
  { key:'deep', phase:0, render:(s,d,L)=>L(d.types[s.code].deep) },
  { key:'cogStack', phase:0, render:(s,d,L)=>{ const cs=d.types[s.code].cogStack; return ... } },
  { key:'dimDeep', phase:0, render:(s,d,L)=> DIMS.map(...) },  // L1 维度级
  { key:'facet', phase:1, render:(s,d,L)=> ... },              // L1 子面
  { key:'strengths', phase:1, render:(s,d,L)=> ... },
  // ...phase 0/1/2 对应 P0/P1/P2 分期
];

// component.js
function buildFullReport(snap, lang) {
  const sections = MBTI_SECTIONS.filter(s => s.phase <= ACTIVE_PHASE);
  return sections.map(s => `== ${t('ps.sec_'+s.key)} ==\n${s.render(snap, data, L)}`).join('\n\n');
}
```

> `ACTIVE_PHASE` 控制分期上线：P0=0、P1=1、P2=2。数据未就绪的段自动跳过（render 返回空串则该段不输出）。

---

## 7. PDF 渲染增强（`pdfreport.go`）

当前 `renderPDFReport` 是流式 MultiCell。万字版需增强：

| 增强 | 说明 |
|------|------|
| **封面页** | 类型名+昵称+生成日期+品牌色，独立首页 |
| **目录页** | 自动段标题+页码（gofpdf 无 TOC 内建，手写两遍渲染：先量页码再生成） |
| **分级标题** | H1（段标题，14pt+色条）/ H2（子标题 12pt）/ 正文 10.5pt |
| **数据表格** | 维度得分/兼容矩阵用 `pdf.Table` 或手绘 cell |
| **优势/盲点卡片** | 色块背景 + 图标（✓/⚠）区分 |
| **页眉页脚** | 页眉=类型名，页脚=页码 + site url |
| **分栏留白** | 段间留白 + 首行缩进（中文排版） |

gofpdf 能力足够（MultiCell/Table/Rect/SetFillColor/页眉页脚 via Header/Footer 回调）。目录需两遍渲染（先跑一遍数页码，再正式生成）——可接受。

---

## 8. 内容生产策略

### 8.1 维度级优先（投入产出比最高）

L1 维度级内容服务所有类型，**先写 L1 能立刻让全部类型报告深度翻倍**：

| L1 内容 | 份数 | 字数/份 | 总字数 | 服务范围 |
|---------|------|---------|--------|---------|
| MBTI 维度极性详解 | 8 | 800 | 6400 | 16 类型全用 |
| MBTI 子面解读 | 12面×2档 | 200 | 4800 | 16 类型全用 |
| Big Five 极性详解 | 5维×2档 | 800 | 8000 | 全用户 |
| Big Five 子面解读 | 15面×2档 | 250 | 7500 | 全用户 |
| DISC 极性详解 | 4维×2档 | 900 | 7200 | 全用户 |

> L1 共 ~34000 字中文，写完全部报告立刻从 ~700 字跃至 ~5000+ 字。

### 8.2 AI 批量生成 + 人工校审流水线

16 万字纯人工不现实。用 **Workflow 批量生成草稿**：

```
模板（含变量槽）+ 维度/类型规格表
    ↓ Workflow fan-out（每段一个 agent 按规格生成草稿）
草稿（中英双语）
    ↓ 人工校审（准确性 / 去模板感 / 双语一致 / 去伪科学）
    ↓ 回填 data.js
```

- **模板**：每段一个结构化 prompt（如"认知功能栈段：输入类型+功能顺序，输出 1000 字解读，覆盖每功能在日常的表现+失衡信号"）。
- **校审重点**：MBTI 功能栈顺序准确性（Ni/Te/Fi/Se 不可错）、Big Five 高低分方向正确、DISC blend 主+次归因正确；去"鸡汤化"与伪科学断言。
- **双语**：先写中文定稿，再译英文（或英中并行，人工对齐术语）。

### 8.3 诚实标注

报告须含**局限声明段**（L3）：MBTI/Big Five/DISC 为自我报告量表，非临床诊断；类型是认识入口非标签；分数为量表相对位置非人群常模百分位。与既有"诚实量表带位"立场一致。

---

## 9. 工作量估算与分期路线图

### 9.1 字数与工时估算

| 期 | 范围 | 新增原创中文 | 累计报告字数 | 工时（AI辅助+人工校审） |
|----|------|------------|------------|---------------------|
| **P0** | L1 全部 + L2 核心画像(深度画像+功能栈+优势盲点) | ~65000 | ~6000 | 3-4 人天 |
| **P1** | L2 拓展(人际+职业+压力+沟通+领导) | ~38000 | ~8500 | 2-3 人天 |
| **P2** | L2 个性化(学习+成长+实践+兼容矩阵) + PDF 排版增强 | ~22000 | ~10000+ | 2-3 人天 |
| | **合计** | ~125000 | | **7-10 人天** |

> 双语翻倍约 14-20 人天。可先上中文版，英文版滞后一期。

### 9.2 分期路线

```
P0（6000 字，可付费上线）
├─ L1 维度级内容全部写完（三工具）
├─ MBTI: deep + cogStack + strengths + blindspots（16 类型）
├─ Big Five: domProfile 核心（15 份）
├─ DISC: blend.deep + interplay（12 份）
├─ buildFullReport 段落注册表重构
└─ 验收：三工具报告 ≥ 6000 字，PDF 渲染无错

P1（8500 字）
├─ L2: 人际兼容 + 职业深度 + 压力倦怠 + 沟通 + 领导
├─ PDF: 分级标题 + 数据表格 + 页眉页脚
└─ 验收：≥ 8500 字，排版有结构感

P2（万字 + 精装）
├─ L2: 学习风格 + 成长路径 + 每日实践 + 兼容矩阵
├─ PDF: 封面页 + 目录页 + 优势盲点卡片
├─ 英文版补齐
└─ 验收：≥ 8000 正文中文，PDF 10-12 页，双语完整
```

### 9.3 每期交付物

每期结束须：`node --check` 全改 JS → `go build` → 交叉编译 → scp+restart → 远程 localhost 抽测三工具 buildFullReport 字数达标 → commit。

---

## 10. 验收标准

1. **字数**：三工具 `buildFullReport` 输出 ≥ 8000 中文字符（`s.match(/[一-鿿]/g).length`）。
2. **完整性**：无"TODO/占位"未填字段；所有 L2 字段对 16 MBTI 类型 / 15 Big Five 组合 / 12 DISC blends 均有内容。
3. **准确性**：MBTI 认知功能栈顺序全对；Big Five 高低分方向全对；DISC 主+次归因全对。
4. **诚实性**：含局限声明段；band 标注为量表相对位置非人群百分位。
5. **双语**：中英双语均达标（英文可滞后一期）。
6. **PDF**：10-12 页，封面+目录+分级标题+数据表格+页眉页脚；中文无乱码（gofpdf + 已嵌入微米黑）。
7. **回归**：免费结果页可视化（雷达/条/分享卡）不受影响；付费落盘 `report` 字段含全文。

---

## 11. 风险与对策

| 风险 | 对策 |
|------|------|
| AI 草稿"模板感"重、千篇一律 | 校审阶段强制每类型举 1 个差异化场景；段落注册表加随机变体槽 |
| 认知功能栈写错（伪科学风险） | 用固定权威顺序表（Myers-Briggs 原始 8 功能顺序），AI 生成时附顺序约束 |
| 双语术语不一致 | 建 i18n 术语表（如"主导功能/dominant"），校审对齐 |
| 报告过长用户读不完 | 目录页 + 段落分级 + "每日实践"段作行动收尾，引导跳读 |
| data.js 膨胀影响加载 | data.js 仅完整版加载（免费版不引入全量）；或拆 `data-deep.js` 按需 import |

---

## 附：实施第一步（P0 启动）

1. 建 `core/report-sections.js` 段落注册表（§6），重构三工具 `buildFullReport`。
2. 先写 MBTI L1 维度级（8 极 × 800 字详解 + 12 面 × 2 档 × 200 字），填 `dims.poleDeep` + `facets.high/low`。
3. 抽测：INTJ 报告字数应从 677 → ~4000。
4. 再写 MBTI L2 核心（`deep` + `cogStack` + `strengths` + `blindspots`，16 类型），达 ~6000。
5. Big Five / DISC 同步推进 L1 + L2 核心。
6. 交叉编译部署，远程抽测三工具字数达标。
