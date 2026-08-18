export default {
  id: 'game_2048',
  name: { zh: '2048', en: '2048' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🎯',
  keywords: ['2048', 'game', 'puzzle', '游戏', '益智', '合并', '数字', '休闲'],
  desc: '经典 2048 小游戏，方向键或滑动合并相同数字，冲分通关可获纪念卡，纯前端运行。',
  guide: {
    zh: `## 功能

4x4 网格上通过方向键或屏幕滑动移动所有方块，相同数字合并并相加，每次移动随机生成一个新方块，目标是拼出 2048。

## 使用场景

- 休闲碎片时间玩两把数字合并益智
- 挑战最高分，刷新本地记录
- 通关后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：键盘方向键移动，移动端可滑动屏幕或使用屏上方向键
- **最高分保存**：最高分存储在浏览器本地，清除站点数据会重置
- **无法移动**：当所有方向都无法合并且无空格时游戏结束`,
    en: `## Features

On a 4x4 grid, move all tiles with arrow keys or swipes; equal numbers merge and add up, a new tile spawns each move, and the goal is to reach 2048.

## Use cases

- Kill time with a number-merging puzzle
- Chase a higher score and beat your local best
- Earn an exclusive memorial card on completion to collect or share

## FAQ

- **Controls**: arrow keys on desktop, swipe or on-screen D-pad on touch devices
- **Best score**: stored locally in the browser; clearing site data resets it
- **No moves left**: the game ends when no direction can merge and no empty cell remains`,
  },
  component: () => import('./component.js'),
};
