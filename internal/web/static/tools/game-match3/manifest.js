export default {
  id: 'game_match3',
  name: { zh: '消消乐', en: 'Match-3' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🍬',
  keywords: ['match3', '消消乐', '三消', 'game', '游戏', '休闲', '消除'],
  desc: '经典交换三消：交换相邻两格凑 3+ 同色消除，下落连锁加成，30 步内冲分。纯前端运行。',
  guide: {
    zh: `## 功能

8x8 网格交换三消：交换相邻两格，连成 3 个及以上同色即消除并得分；上方棋子下落补齐，连锁额外加成。30 步内尽可能冲分，刷新本地最高。

## 使用场景

- 碎片时间来一局解压三消
- 挑战连锁高分，刷新本地纪录
- 通关后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：点击一格选中，再点相邻格交换；手机可直接点选。非法（不构成消除）的交换会自动弹回、不扣步数
- **连锁**：下落后产生的新消除会累加倍率，连锁越长得分越高
- **最高分**：存储在浏览器本地，清除站点数据会重置`,
    en: `## Features

Swap two adjacent tiles on an 8x8 grid to line up 3+ of the same color; they clear and score, tiles fall down, and cascades multiply the bonus. Score as high as you can in 30 moves; beat your local best.

## Use cases

- A relaxing match-3 round in spare moments
- Chase cascade combos and beat your local best
- Earn an exclusive memorial card on a high score

## FAQ

- **Controls**: tap a tile to select, tap an adjacent tile to swap; tap-select on mobile too. A swap that forms no match bounces back and costs no move
- **Cascades**: tiles dropping in may form new matches and chain a multiplier — longer chains score more
- **Best score**: stored locally; clearing site data resets it`,
  },
  component: () => import('./component.js'),
};
