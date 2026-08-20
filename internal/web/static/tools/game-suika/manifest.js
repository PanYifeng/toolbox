export default {
  id: 'game-suika',
  name: { zh: '合成水果', en: 'Suika Fruit Merge' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🍉',
  keywords: ['suika', '合成大西瓜', '合成水果', 'watermelon game', 'merge game', '合并游戏', '水果合成'],
  desc: '合成水果（Suika）：纯 canvas 自实现简易刚体物理（重力、圆-圆碰撞分离与反弹、堆叠），移动指针选定位置点按释放水果；同种水果接触即合并升级（🍒→🍓→🍇→🍊→🍎→🍉），两个西瓜合并得高分并消除。计分、最高分、通关纪念卡与排行榜。',
  guide: {
    zh: `## 玩法

移动指针选定水平位置，点按释放下一颗水果从顶部下落。水果受重力下坠、相互碰撞堆叠；同种水果接触即自动合并为下一级并加分：🍒→🍓→🍇→🍊→🍎→🍉。两个🍉合并得高分并双双消除。分数越高越好；当堆叠越过顶部警戒线（红色虚线）即结束。

## 说明

- 物理：纯 canvas 自实现简易刚体（位置修正 + 法向冲量），无第三方物理库，水果数有限、性能开销可忽略
- 下一颗水果随机为🍒/🍓/🍇/🍊之一；🍉只能由合并产生
- 落果有短暂冷却且需落点上方无果，避免连点穿透；最高分记录在本地浏览器；通关可生成纪念卡并可上排行榜`,
    en: `## How to play

Move the pointer to pick a horizontal position and tap to drop the next fruit from the top. Fruits fall under gravity, collide, and stack; same fruits touching auto-merge into the next tier and score: 🍒→🍓→🍇→🍊→🍎→🍉. Two 🍉 merge for a big bonus and both vanish. Higher is better; the game ends when the stack crosses the red dashed danger line at the top.

## Notes

- Physics: a lightweight rigid-body solver hand-written on canvas (positional correction + normal impulse), no third-party library; fruit count is bounded so performance cost is negligible
- The next fruit is randomly 🍒/🍓/🍇/🍊; 🍉 only appears via merging
- Drops have a short cooldown and require the spawn point to be clear to prevent clip-through; best score stored locally; clearing a run generates a memorial card and may enter the leaderboard`,
  },
  component: () => import('./component.js'),
};
