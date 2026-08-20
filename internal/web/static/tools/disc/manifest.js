export default {
  id: 'disc',
  name: { zh: 'DISC 行为风格测试', en: 'DISC Behavior Style Test' },
  category: { zh: '知识 · 趣味', en: 'Knowledge & Fun' },
  icon: '🎯',
  keywords: ['disc', '行为风格', 'behavior style', '性格', '人格', 'dominance', 'influence', 'steadiness', 'conscientiousness', '支配', '影响', '稳健', '服从'],
  desc: 'DISC 行为风格测试，经典迫选 28 组（每组 D/I/S/C 四个描述，各选一个最像与最不像）定位你在支配 D、影响 I、稳健 S、严谨 C 四个维度上的风格，找出主导风格；免费看简版解读，完整版详细报告 ¥5 经站主确认后邮件送达。',
  guide: {
    zh: `## 功能

经典迫选格式共 28 组，每组含 D / I / S / C 四个行为描述，你在每组各选一个『最像我』和『最不像我』，测量 DISC 四维度（D 支配 / I 影响 / S 稳健 / C 严谨）的风格强度，找出主导风格。免费查看主导风格与四维度简版解读（免费版取前 14 组）；完整版含全部 28 组，其报告（四维度深度解析 + 主导风格应用建议）为付费项，¥5 一次，经站主确认收款后邮件送达。

## 使用场景

- 了解自己在团队中的行为倾向
- 改善沟通、减少协作摩擦
- 招聘与岗位匹配参考

## 常见问题

- **计分方式**：每组四选最像 + 最不像；『最像』计入对应维度正向计数，『最不像』计入负向；每维度 pct = 该维度最像计数 / 组数 × 100，最高者为主导风格
- **免费 vs 完整版**：免费版取前 14 组，给主导风格 + 四维度百分比简版解读；完整版用全部 28 组，给每维度深度解析与应用建议
- **完整版送达**：提交邮箱+交易号后，站主确认收款即把完整报告邮件发给你
- **数据安全**：作答仅在浏览器本地计分，不上传服务器（完整版报告文本随申请提交以邮件送达）`,
    en: `## Features

Classic forced-choice format: 28 groups, each with four D / I / S / C behavioral descriptors; in each group you pick one "most like me" and one "least like me", measuring your DISC profile (D Dominance / I Influence / S Steadiness / C Conscientiousness) and finding your primary style. View the free brief read of your primary style and four-dimension scores (free edition uses the first 14 groups); the full edition has all 28 groups, and its detailed report (deep-dive per dimension + application tips) is a paid item, ¥5 one-time, emailed after the site owner confirms payment.

## Use cases

- Understanding your behavioral tendencies in teams
- Improving communication, reducing friction
- Reference for hiring and role-fit

## FAQ

- **Scoring**: each group, pick one "most like me" + one "least like me"; "most" adds to that dimension's positive count, "least" to its negative; each dimension's pct = its most-count / groups × 100; the highest is your primary style
- **Free vs full**: free uses the first 14 groups, giving the primary style + brief per-dimension read; the full edition uses all 28 groups, giving deep analysis and application tips per dimension
- **Full delivery**: submit email + TXID; once the site owner confirms payment, the full report is emailed to you
- **Privacy**: scoring runs locally in your browser (the full-report text is submitted with the claim so it can be emailed)`,
  },
  component: () => import('./component.js'),
};
