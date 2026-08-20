export default {
  id: 'disc',
  name: { zh: 'DISC 行为风格测试', en: 'DISC Behavior Style Test' },
  category: { zh: '知识 · 趣味', en: 'Knowledge & Fun' },
  icon: '🎯',
  keywords: ['disc', '行为风格', 'behavior style', '性格', '人格', 'dominance', 'influence', 'steadiness', 'conscientiousness', '支配', '影响', '稳健', '服从'],
  desc: 'DISC 行为风格测试，16 道李克特题定位你在支配 D、影响 I、稳健 S、严谨 C 四个维度上的风格，找出你的主导风格；免费看简版解读，完整版详细报告 ¥5 经站主确认后邮件送达。',
  guide: {
    zh: `## 功能

通过 16 道李克特题（1-5 分，每维度 4 题）测量 DISC 四维度风格（D 支配 / I 影响 / S 稳健 / C 严谨）的强度，找出你的主导风格。免费查看主导风格与四维度简版解读；完整版报告（四维度深度解析 + 主导风格应用建议）为付费项，¥5 一次，经站主确认收款后邮件送达。

## 使用场景

- 了解自己在团队中的行为倾向
- 改善沟通、减少协作摩擦
- 招聘与岗位匹配参考

## 常见问题

- **计分方式**：每题 1（很不符合）到 5（很符合），含反向计分题；每维度换算为 0-100 百分比，最高者为主导风格
- **免费 vs 完整版**：免费给主导风格 + 四维度百分比简版解读；完整版给每维度深度解析与沟通建议
- **完整版送达**：提交邮箱+交易号后，站主确认收款即把完整报告邮件发给你
- **数据安全**：作答仅在浏览器本地计分，不上传服务器（完整版报告文本随申请提交以邮件送达）`,
    en: `## Features

Answer 16 Likert items (1-5, 4 per dimension) to measure your DISC profile (D Dominance / I Influence / S Steadiness / C Conscientiousness) and find your primary style. View the free brief read of your primary style and four-dimension scores; a detailed full report (deep-dive per dimension + application tips) is a paid item, ¥5 one-time, emailed after the site owner confirms payment.

## Use cases

- Understanding your behavioral tendencies in teams
- Improving communication, reducing friction
- Reference for hiring and role-fit

## FAQ

- **Scoring**: each item 1 (strongly disagree) to 5 (strongly agree), some reverse-scored; each dimension becomes a 0-100 percentage; the highest is your primary style
- **Free vs full**: free gives the primary style + brief per-dimension read; the full report gives deep analysis and communication tips per dimension
- **Full delivery**: submit email + TXID; once the site owner confirms payment, the full report is emailed to you
- **Privacy**: scoring runs locally in your browser (the full-report text is submitted with the claim so it can be emailed)`,
  },
  component: () => import('./component.js'),
};
