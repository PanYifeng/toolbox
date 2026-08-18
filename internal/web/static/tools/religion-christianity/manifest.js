export default {
  id: 'religion-christianity',
  name: { zh: '基督文化', en: 'Christian Culture' },
  category: { zh: '宗教文化', en: 'Religion & Culture' },
  icon: '✝',
  keywords: ['christianity', '基督', 'jesus', 'bible', 'religion', '宗教', '基督教', '圣经', '天主教', '新教'],
  desc: '基督教文化知识介绍与测验工具，含历史、教义、节庆等知识卡片与趣味问答，纯前端展示。',
  guide: {
    zh: `## 功能

以知识卡片形式介绍基督教的起源、核心教义、主要节日（如圣诞节、复活节）与象征符号，并附趣味测验。

## 使用场景

- 了解基督教基本概念，如三位一体、救赎、教会等
- 区分 天主教、东正教、新教 的历史脉络
- 通过测验加深对节日与象征意义的理解

## 常见问题

- **内容立场**：仅作文化与历史介绍，不宣扬信仰或评判教派
- **测验用途**：用于知识自测，不作为信仰评价标准
- **信息来源**：以通识材料为基础，深入研究请参阅专门典籍`,
    en: `## Features

Presents Christian origin, core teachings, major festivals (e.g. Christmas, Easter) and symbols as knowledge cards, with a quiz.

## Use cases

- Learn basic concepts such as the Trinity, salvation and the Church
- Trace the historical split among Catholicism, Orthodoxy and Protestantism
- Deepen understanding of festivals and symbols through a quiz

## FAQ

- **Stance**: introduces culture and history only; it does not preach or judge denominations
- **Quiz purpose**: for self-testing, not an evaluation of faith
- **Sources**: based on general references; consult specialist texts for deeper study`,
  },
  component: () => import('./component.js'),
};
