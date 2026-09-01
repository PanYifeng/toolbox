export default {
  id: 'game_xiangqi',
  name: { zh: '中国象棋', en: 'Xiangqi' },
  category: { zh: '游戏', en: 'Games' },
  icon: '帥',
  keywords: ['xiangqi', 'game', '游戏', '中国象棋', '象棋', 'chinese chess', '对弈', '单人象棋', 'minimax'],
  desc: '中国象棋小游戏，你执红方在下对弈深度 3 的 minimax AI（含蹩马腿、塞象眼、飞将、炮翻山完整规则），纯前端运行，累计胜场本地记录。',
  guide: {
    zh: `## 功能

9x10 交叉点中国象棋，你执红方在下，电脑执黑方使用 negamax + alpha-beta 搜索（深度 3）走子。规则完整：蹩马腿、塞象眼、飞将禁止、炮翻山吃子全部实现。

## 使用场景

- 碎片时间与电脑对弈一局象棋
- 体验中国象棋特殊规则（蹩马腿/塞象眼/飞将/炮翻山）
- 将死或困毙电脑后领取专属纪念卡收藏或分享

## 常见问题

- **操作方式**：点击己方棋子选中，再点击高亮交叉点落子；可吃子的目标显示红环
- **AI 有多强**：深度 3 + 吃子优先排序，会主动进攻，但有 15% 概率随机选步让人有机会获胜
- **困毙算输吗**：算。中国象棋规则下，无合法步（无论是否被将）即判负
- **悔棋**：点击「悔棋」回退一回合（你的+电脑的两步）
- **累计胜场在哪**：保存在浏览器本地存储，清缓存会丢失`,
    en: `## Features

9x10 intersection Xiangqi (Chinese chess). You play Red at the bottom; the computer plays Black with a depth-3 negamax + alpha-beta search. Full rules: horse-leg blocking, elephant-eye blocking, flying-general prohibition, and cannon-over-screen captures are all implemented.

## Use cases

- Play a quick game of Chinese chess against the computer
- Experience Xiangqi's special rules (horse leg, elephant eye, flying general, cannon screen)
- Earn an exclusive memorial card after checkmating or stalemating the computer

## FAQ

- **Controls**: click your piece to select, then click a highlighted intersection to move; captures show a red ring
- **How strong is the AI**: depth 3 with capture-first move ordering; it attacks actively but has a 15% chance of picking a random top move
- **Is stalemate a loss**: yes. Under Xiangqi rules, having no legal move (checkmated or stalemated) counts as a loss
- **Undo**: click "Undo" to roll back one full turn (your move + the computer's reply)
- **Where are wins saved**: stored in browser local storage and lost if you clear cache`,
  },
  component: () => import('./component.js'),
};
