export default {
  id: 'game_chess',
  name: { zh: '国际象棋', en: 'Chess' },
  category: { zh: '游戏', en: 'Games' },
  icon: '♚',
  keywords: ['chess', 'game', '游戏', '国际象棋', 'chess AI', '对弈', '单人象棋', 'minimax'],
  desc: '国际象棋小游戏，你执白方对弈深度 3 的 minimax AI（含易位、过路兵、升变完整规则），纯前端运行，累计胜场本地记录。',
  guide: {
    zh: `## 功能

8x8 国际象棋，你执白方在下，电脑执黑方使用 negamax + alpha-beta 搜索（深度 3）走子。规则完整：王车易位、过路兵、兵的升变全部实现。

## 使用场景

- 碎片时间与电脑对弈一局国际象棋
- 学习完整国际象棋规则（含易位/过路兵/升变等特殊走法）
- 通关将死电脑后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：点击己方棋子选中，再点击高亮目标格落子；可被吃子的目标格显示红环
- **AI 有多强**：深度 3 + 吃子优先排序，会主动进攻，但有 15% 概率随机选步让人有机会获胜
- **升变怎么选**：兵走到底线时弹出选择框，可选后/车/象/马
- **悔棋**：点击「悔棋」回退一回合（你的+电脑的两步）
- **累计胜场在哪**：保存在浏览器本地存储，清缓存会丢失`,
    en: `## Features

8x8 chess. You play White at the bottom; the computer plays Black with a depth-3 negamax + alpha-beta search. Full rules: castling, en passant, and pawn promotion are all implemented.

## Use cases

- Play a quick game of chess against the computer in spare moments
- Learn the complete rules of chess (castling, en passant, promotion)
- Earn an exclusive memorial card after checkmating the computer

## FAQ

- **Controls**: click your piece to select, then click a highlighted target square to move; captures show a red ring
- **How strong is the AI**: depth 3 with capture-first move ordering; it attacks actively but has a 15% chance of picking a random top move, giving you a chance to win
- **Promotion**: when a pawn reaches the last rank, a picker appears to choose queen/rook/bishop/knight
- **Undo**: click "Undo" to roll back one full turn (your move + the computer's reply)
- **Where are wins saved**: stored in browser local storage and lost if you clear cache`,
  },
  component: () => import('./component.js'),
};
