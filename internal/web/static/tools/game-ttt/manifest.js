export default {
  id: 'game_ttt',
  name: { zh: '井字棋', en: 'Tic-Tac-Toe' },
  category: { zh: '游戏', en: 'Games' },
  icon: '⭕',
  keywords: ['tictactoe', 'game', '游戏', '井字棋', 'oxo', '圈叉棋', '井字游戏', '三连棋'],
  desc: '在线井字棋（Tic-Tac-Toe）小游戏，玩家对战 minimax AI，浏览器直接玩，胜负与累计胜场本地记录。',
  guide: {
    zh: `## 功能

3x3 棋盘的井字棋，玩家执 X，电脑执 O 并使用 minimax 算法走最佳一步，几乎无法被击败，最多只能逼平。

## 使用场景

- 碎片时间杀时间的经典小游戏
- 体验 minimax 博弈算法的实际效果
- 给小朋友讲解棋类 AI 的入门示例

## 常见问题

- **能赢电脑吗**：minimax 永远选最优解，你最多只能平局
- **怎么重开**：点击「重新开始」按钮即可清空棋盘
- **胜场记录在哪**：保存在浏览器本地存储，清缓存会丢失`,
    en: `## Features

Classic 3x3 Tic-Tac-Toe. You play X and the computer plays O using the minimax algorithm to always pick the optimal move, making it nearly unbeatable — at best you force a draw.

## Use cases

- A quick classic game for spare moments
- See the minimax game-playing algorithm in action
- A simple demo for teaching board-game AI to kids

## FAQ

- **Can I beat the AI**: minimax always plays optimally, so the best you can do is draw
- **How to restart**: click the reset button to clear the board
- **Where are wins saved**: stored in browser local storage and lost if you clear cache`,
  },
  component: () => import('./component.js'),
};
