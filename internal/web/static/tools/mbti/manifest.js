export default {
  id: 'mbti',
  name: { zh: 'MBTI 人格测试', en: 'MBTI Personality Test' },
  category: { zh: '知识 · 趣味', en: 'Knowledge & Fun' },
  icon: '🎭',
  keywords: ['mbti', 'personality', '人格', '性格测试', '十六型', '迈尔斯', '十六型人格', '16 personalities', 'myers briggs'],
  desc: 'MBTI 十六型人格测试，免费版 20 题、完整版 60 题二选一得出你的四字母型态；免费看简版结果，完整版详细报告 ¥5 经站主确认后邮件送达。',
  guide: {
    zh: `## 功能

通过 20 道二选一题（每个维度 5 题）快速定位你的 MBTI 四字母型态（如 INTJ、ENFP），免费查看简版结果。完整版含全部 60 题（每维度 15 题，题量更足、结果更稳），其详细报告（型态深度解析 + 优势 / 盲点 / 职场 / 关系建议）为付费项，¥5 一次，经站主确认收款后邮件送达。

## 使用场景

- 好奇自己属于哪一型，快速自测
- 团队破冰、了解同事风格差异
- 为完整版深度报告做入门

## 常见问题

- **计分方式**：每个维度免费版 5 题、完整版 15 题，你选的那一极计 1 票，多者胜出决定该维度字母（完整版 15 题为奇数，无平票）
- **免费 vs 完整版**：免费版给四字母型态 + 一句简述；完整版给多段深度解析
- **完整版送达**：提交邮箱+交易号后，站主确认收款即把完整报告邮件发给你
- **数据安全**：作答仅在浏览器本地计分，不上传服务器（完整版报告文本随申请提交以邮件送达）`,
    en: `## Features

Answer 20 forced-choice questions (5 per dichotomy) to find your four-letter MBTI type (e.g. INTJ, ENFP) and view a free brief result. The full edition has all 60 questions (15 per dichotomy—more items, more stable results); its detailed report (type deep-dive + strengths / blind spots / career / relationship tips) is a paid item, ¥5 one-time, emailed after the site owner confirms payment.

## Use cases

- Curious which type you are — take a quick self-test
- Team icebreakers, understanding colleagues' styles
- An entry point before buying the full deep-dive report

## FAQ

- **Scoring**: free 5 questions per dichotomy, full 15; the pole you pick earns one vote; the majority wins that letter (full edition uses 15—an odd number, so no ties)
- **Free vs full**: free gives the four-letter type + a one-line summary; the full report gives multi-paragraph analysis
- **Full delivery**: submit email + TXID; once the site owner confirms payment, the full report is emailed to you
- **Privacy**: scoring runs locally in your browser (the full-report text is submitted with the claim so it can be emailed)`,
  },
  component: () => import('./component.js'),
};
