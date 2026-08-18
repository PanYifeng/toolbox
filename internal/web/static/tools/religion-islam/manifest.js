export default {
  id: 'religion-islam',
  name: { zh: '伊斯兰文化', en: 'Islamic Culture' },
  category: { zh: '宗教文化', en: 'Religion & Culture' },
  icon: '☪',
  keywords: ['islam', '伊斯兰', 'muslim', 'quran', 'religion', '宗教', '穆斯林', '古兰经', '清真', '五功'],
  desc: '伊斯兰文化知识介绍与测验工具，含历史、教义、节庆等知识卡片与趣味问答，纯前端展示。',
  guide: {
    zh: `## 功能

以知识卡片形式介绍伊斯兰教的起源、五功、主要节日（如开斋节、古尔邦节）与象征符号，并附趣味测验。

## 使用场景

- 了解伊斯兰基本概念，如五功、清真、清真寺等
- 认识 逊尼派 与 什叶派 的历史渊源
- 通过测验加深对节日与日常礼仪的理解

## 常见问题

- **内容立场**：仅作文化与历史介绍，不宣扬信仰或评判教派
- **测验用途**：用于知识自测，不作为信仰评价标准
- **信息来源**：以通识材料为基础，深入研究请参阅专门典籍`,
    en: `## Features

Presents Islamic origin, the Five Pillars, major festivals (e.g. Eid al-Fitr, Eid al-Adha) and symbols as knowledge cards, with a quiz.

## Use cases

- Learn basic concepts such as the Five Pillars, halal and the mosque
- Understand the historical origins of Sunni and Shia traditions
- Deepen understanding of festivals and daily etiquette through a quiz

## FAQ

- **Stance**: introduces culture and history only; it does not preach or judge sects
- **Quiz purpose**: for self-testing, not an evaluation of faith
- **Sources**: based on general references; consult specialist texts for deeper study`,
  },
  component: () => import('./component.js'),
};
