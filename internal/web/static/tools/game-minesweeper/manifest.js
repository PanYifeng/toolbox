export default {
  id: 'game-minesweeper',
  name: { zh: '扫雷', en: 'Minesweeper' },
  category: { zh: '游戏', en: 'Games' },
  icon: '💣',
  keywords: ['minesweeper', 'mine', '扫雷', 'puzzle', 'logic', '益智', '逻辑', '排雷'],
  desc: '经典扫雷小游戏，9x9 网格 10 颗雷，左键揭开右键插旗，首点击安全，纯前端运行。',
  guide: {
    zh: `## 功能

9x9 网格、10 颗雷的经典扫雷。左键揭开格子，右键或手机长按插旗；揭开 0 时自动展开相邻空格，揭开全部非雷格即获胜。

## 使用场景

- 碎片时间玩一局经典逻辑推理
- 通过数字提示推断雷的位置锻炼推理能力
- 通关后累计胜场解锁纪念卡

## 常见问题

- **首点击安全**：第一次点击后才布雷，保证起手不会踩雷
- **插旗方式**：桌面端右键插旗，移动端长按格子约 0.4 秒插旗
- **胜场保存**：累计胜场存储在浏览器本地，清除站点数据会重置`,
    en: `## Features

Classic minesweeper on a 9x9 grid with 10 mines. Left-click to reveal, right-click or long-press to flag; revealing a 0 auto-expands connected empty cells, and revealing every non-mine cell wins.

## Use cases

- Squeeze in a round of classic logic deduction
- Train reasoning by inferring mine locations from number hints
- Stack wins to unlock a memorial card

## FAQ

- **First click is safe**: mines are placed only after the first click, so you never start on a mine
- **Flagging**: right-click on desktop, long-press (~0.4s) on touch devices
- **Win count**: stored locally in the browser; clearing site data resets it`,
  },
  component: () => import('./component.js'),
};
