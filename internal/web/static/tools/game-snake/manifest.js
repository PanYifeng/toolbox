export default {
  id: 'game_snake',
  name: { zh: '贪吃蛇', en: 'Snake' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🐍',
  keywords: ['snake', 'game', '游戏', '贪吃蛇', '经典', '休闲', '街机'],
  desc: '经典贪吃蛇小游戏，方向键或滑动控制蛇身吃食物，撞墙或自身即结束，纯前端运行。',
  guide: {
    zh: `## 功能

在 18x18 网格上控制蛇移动吃食物，每吃一个食物蛇身加长一节并得分，撞墙或撞到自身即游戏结束。

## 使用场景

- 碎片时间玩一局经典贪吃蛇
- 挑战最长蛇身和最高分，刷新本地记录
- 通关后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：键盘方向键控制方向，移动端可滑动屏幕或使用屏上方向键
- **反向限制**：不能 180 度反向掉头，按反向键会被忽略
- **最高分保存**：最高分存储在浏览器本地，清除站点数据会重置`,
    en: `## Features

Steer the snake on an 18x18 grid to eat food; each food lengthens the snake by one and scores a point; hitting a wall or yourself ends the game.

## Use cases

- Play a quick round of classic snake in spare moments
- Chase the longest body and highest score, beating your local best
- Earn an exclusive memorial card on completion to collect or share

## FAQ

- **Controls**: arrow keys on desktop, swipe or on-screen D-pad on touch devices
- **No reverse**: 180-degree turns are ignored to prevent instant self-collision
- **Best score**: stored locally in the browser; clearing site data resets it`,
  },
  component: () => import('./component.js'),
};
