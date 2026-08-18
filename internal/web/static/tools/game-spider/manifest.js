export default {
  id: 'game-spider',
  name: { zh: '蜘蛛纸牌', en: 'Spider Solitaire' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🕷',
  keywords: ['spider', 'solitaire', '纸牌', '蜘蛛', 'card', '扑克', '蜘蛛纸牌', 'single suit', '单花色', '在线纸牌'],
  desc: '在线蜘蛛纸牌（单花色 ♠）小游戏，浏览器直接玩无需登录，支持同色降序移动、自动收牌、累计胜场记录。',
  guide: {
    zh: `## 功能

经典蜘蛛纸牌的单花色版本：104 张全部为 ♠，10 列发牌加 5 次发牌堆，凑齐 8 组 K..A 降序序列即通关。

## 使用场景

- 上班摸鱼或午休解压，开一局轻松的纸牌
- 熟悉蜘蛛纸牌规则后再去挑战多花色版本
- 浏览器即开即玩，无需下载安装客户端

## 常见问题

- **怎么移动多张牌**：点击同色降序连续序列的起始牌选中，再点目标列顶牌需比选中顶牌大 1
- **什么时候能发牌**：发牌堆剩余时点击发牌，但所有列都不能为空
- **进度保存吗**：胜场数保存在浏览器本地，刷新不会丢失`,
    en: `## Features

The single-suit variant of Spider Solitaire: all 104 cards are ♠, dealt across 10 columns with 5 stock deals. Collect 8 complete K..A descending runs to win.

## Use cases

- A relaxing card game for breaks or downtime
- Learn Spider rules on the easier single-suit mode before trying multi-suit
- Play instantly in the browser, no download or login needed

## FAQ

- **Move multiple cards**: click the start of a same-suit descending run to select it, then click the target column whose top card must be one rank higher
- **When to deal stock**: click the stock while it has cards left, but no column may be empty
- **Is progress saved**: win count is stored locally in the browser and survives refresh`,
  },
  component: () => import('./component.js'),
};
