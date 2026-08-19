export default {
  id: 'game_tetris',
  name: { zh: '俄罗斯方块', en: 'Tetris' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🟦',
  keywords: ['tetris', 'game', '游戏', '俄罗斯方块', '方块', '消除', '经典', '休闲', '街机'],
  desc: '经典俄罗斯方块：移动旋转下落方块，填满整行消除得分，每消 10 行升级提速，堆到顶部即结束，纯前端运行。',
  guide: {
    zh: `## 功能

10 列 × 20 行棋盘，7 种四格方块随机下落。左右移动、旋转、软降 / 硬降，填满整行即消除并得分；每消除 10 行升一级、下落变快，方块堆到顶部则游戏结束。

## 使用场景

- 碎片时间来一局经典俄罗斯方块
- 追逐最高分与最高等级，刷新本地记录
- 通关后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：←→ 移动、↑ 旋转、↓ 软降、空格硬降、P 暂停；移动端可滑动或使用屏上方向键
- **计分**：单消 100、双消 300、三消 500、四消 800，乘以当前等级
- **最高分保存**：最高分存储在浏览器本地，清除站点数据会重置`,
    en: `## Features

A 10×20 board with 7 tetrominoes falling at random. Move left/right, rotate, soft/hard drop; fill a full row to clear and score. Every 10 cleared rows levels up and speeds the fall; stacking to the top ends the game.

## Use cases

- Play a quick round of classic Tetris in spare moments
- Chase the highest score and level, beating your local best
- Earn an exclusive memorial card on completion to collect or share

## FAQ

- **Controls**: ←→ move, ↑ rotate, ↓ soft drop, Space hard drop, P pause; swipe or on-screen D-pad on touch devices
- **Scoring**: 1 line = 100, 2 = 300, 3 = 500, 4 = 800, times current level
- **Best score**: stored locally in the browser; clearing site data resets it`,
  },
  component: () => import('./component.js'),
};
