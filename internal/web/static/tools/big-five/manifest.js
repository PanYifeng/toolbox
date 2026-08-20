export default {
  id: 'big-five',
  name: { zh: '大五人格测试', en: 'Big Five Personality Test' },
  category: { zh: '知识 · 趣味', en: 'Knowledge & Fun' },
  icon: '🧠',
  keywords: ['big five', '大五', 'ocean', '人格', '性格', '五因素', 'personality', 'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'],
  desc: '大五人格（OCEAN）测试，20 道李克特题定位你在开放性、尽责性、外向性、宜人性、神经质五个维度上的百分比；免费看简版画像，完整版详细报告 ¥5 经站主确认后邮件送达。',
  guide: {
    zh: `## 功能

通过 20 道李克特量表题（1-5 分，每维度 4 题）测量大五人格五维度（OCEAN）的百分比画像。免费查看五维度分数与简版解读；完整版报告（每维度深度解析 + 建议）为付费项，¥5 一次，经站主确认收款后邮件送达。

## 使用场景

- 想要基于科学模型的人格画像
- 自我成长、了解自己的情绪与社交倾向
- 团队建设中了解成员特质分布

## 常见问题

- **计分方式**：每题 1（很不符合）到 5（很符合），含反向计分题；每维度换算为 0-100 百分比
- **免费 vs 完整版**：免费给五维度百分比 + 简版高低解读；完整版给每维度深度解析与建议
- **完整版送达**：提交邮箱+交易号后，站主确认收款即把完整报告邮件发给你
- **数据安全**：作答仅在浏览器本地计分，不上传服务器（完整版报告文本随申请提交以邮件送达）`,
    en: `## Features

Answer 20 Likert-scale items (1-5, 4 per dimension) to get your Big Five (OCEAN) percentage profile. View the free brief profile with per-dimension scores; a detailed full report (deep-dive + tips per dimension) is a paid item, ¥5 one-time, emailed after the site owner confirms payment.

## Use cases

- A science-based personality profile
- Self-growth — understanding emotional and social tendencies
- Team building — seeing members' trait spread

## FAQ

- **Scoring**: each item 1 (strongly disagree) to 5 (strongly agree), some reverse-scored; each dimension becomes a 0-100 percentage
- **Free vs full**: free gives the five percentages + brief high/low read; the full report gives deep analysis and tips per dimension
- **Full delivery**: submit email + TXID; once the site owner confirms payment, the full report is emailed to you
- **Privacy**: scoring runs locally in your browser (the full-report text is submitted with the claim so it can be emailed)`,
  },
  component: () => import('./component.js'),
};
