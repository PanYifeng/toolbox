export default {
  id: 'religion-buddhism',
  name: { zh: '佛教文化', en: 'Buddhist Culture' },
  category: { zh: '宗教文化', en: 'Religion & Culture' },
  icon: '☸',
  keywords: ['buddhism', '佛教', 'buddha', 'religion', '宗教', '佛陀', '佛法', '禅', '佛经'],
  desc: '佛教文化知识介绍与测验工具，含历史、教义、节庆等知识卡片与趣味问答，纯前端展示。',
  guide: {
    zh: `## 功能

以知识卡片形式介绍佛教的起源、核心教义、主要节日与象征符号，并提供趣味测验检验了解程度。

## 使用场景

- 了解佛教文化背景，如四圣谛、八正道等基本概念
- 比较 东南亚、汉传、藏传佛教的差别
- 通过测验巩固对佛教节日与象征的认识

## 常见问题

- **内容立场**：仅作文化与历史介绍，不宣扬信仰或评判教义
- **测验用途**：用于知识自测，不作为评价标准
- **信息来源**：以通识材料为基础，深入学习请参阅专门典籍`,
    en: `## Features

Presents Buddhist origin, core teachings, major festivals and symbols as knowledge cards, with a quiz to self-check.

## Use cases

- Learn basic concepts like the Four Noble Truths and the Eightfold Path
- Compare Theravada, Mahayana and Vajrayana traditions
- Reinforce knowledge of Buddhist festivals and symbols through a quiz

## FAQ

- **Stance**: introduces culture and history only; it does not preach or judge doctrine
- **Quiz purpose**: for self-testing, not an evaluation criterion
- **Sources**: based on general references; consult specialist texts for deeper study`,
  },
  component: () => import('./component.js'),
};
