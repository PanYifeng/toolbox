export default {
  id: 'game-suika',
  name: { zh: '合成水果', en: 'Suika Fruit Merge' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🍉',
  keywords: ['suika', '合成大西瓜', '合成水果', 'watermelon game', 'merge game', '合并游戏', '水果合成'],
  desc: '合成水果（Suika）简化版：无物理引擎，点按列让水果下落，相邻同种水果自动合并升级（🍒→🍓→🍇→🍊→🍎→🍉），两个西瓜合并得高分并消除。计分、最高分、通关纪念卡与排行榜。',
  guide: {
    zh: `## 玩法

点按画布的某一列，下一颗水果落到该列顶部。上下左右相邻的同种水果会自动合并为下一级并加分：🍒→🍓→🍇→🍊→🍎→🍉。两个🍉合并得高分并双双消除。分数越高越好；所有列都填满即结束。

## 说明

- 简化版：无物理引擎，采用网格列下落 + 相邻合并模型，与原版 Suika 的物理堆叠体验不同
- 下一颗水果随机为🍒/🍓/🍇/🍊之一；🍉只能由合并产生
- 纯前端实现，最高分记录在本地浏览器；通关可生成纪念卡并可上排行榜`,
    en: `## How to play

Tap a column to drop the next fruit onto its top. Same fruits touching (up/down/left/right) auto-merge into the next tier and score: 🍒→🍓→🍇→🍊→🍎→🍉. Two 🍉 merge for a big bonus and both vanish. Higher is better; the game ends when every column is full.

## Notes

- Simplified version: no physics engine — uses a grid drop + adjacent-merge model, unlike the original Suika's physics stacking
- The next fruit is randomly 🍒/🍓/🍇/🍊; 🍉 only appears via merging
- Pure front-end; best score stored locally; clearing a run generates a memorial card and may enter the leaderboard`,
  },
  component: () => import('./component.js'),
};
