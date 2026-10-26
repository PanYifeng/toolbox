export default {
  id: 'game_splendor',
  name: { zh: '璀璨宝石', en: 'Splendor' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '💎',
  keywords: ['splendor', '璀璨宝石', 'board game', '桌游', 'engine building', '宝石', '贵族', '卡牌', 'strategy', '热座', 'hot seat'],
  desc: '经典引擎构筑桌游《璀璨宝石》完整复刻：官方 90 张发展卡 + 10 贵族三源交叉核对、拿宝石/预留/购卡三选一、产出色永久折扣、贵族来访、15 分触发终局。2-4 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《璀璨宝石》规则复刻（2-4 人）：每回合三选一——拿 3 颗不同色宝石（拿 2 颗同色需该色供应 ≥4）、预留 1 张牌（明牌或牌堆顶盲留）并得 1 金（金为万能色）、或支付宝石购买明牌/预留牌。发展卡购入后永久提供产出色折扣，形成滚雪球引擎；满足在场贵族需求者回合末强制来访 +3 分（同时满足多位择一）。有人 ≥15 分后各补一回合（机会均等），VP 最高者胜，平分看购卡数少者。

## 使用场景

- 和朋友同屏热座来一局经典卡牌引擎构筑（支持混合 AI 机器人补位，单人也能开局）
- 学习《璀璨宝石》规则：宝石经济、预留节奏、贵族竞速等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-4 个座位（可切换人类/AI），每阶翻 4 张明牌、场上有 4 位贵族，按人数配宝石（2 人 4 颗/3 人 5 颗/4 人 7 颗，金恒 5）
- **买卡支付**：先扣本色宝石，缺口用金补；已购卡的产出色计入永久折扣（成本直接减）
- **预留**：手上至多 3 张；预留立即得 1 金（金色无法用拿宝石动作获得，只能预留获得）
- **10 颗上限**：手牌宝石（含金）超过 10 颗须弃至 10（界面点击要弃的宝石）
- **贵族**：回合末结算（先弃宝石再看贵族）；同回合至多来访 1 位
- **终局**：有人 ≥15 分当回合结束后，其余玩家各补一回合即结算
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：90 张发展卡与 10 位贵族为三源交叉核对誊录（anicolao/splendor 照片验证表为主源，与 splendor-ai、NicolasVero/splendor 双源比对；二阶 2 分卡组 splendor-ai 存在 5 张转写错误，已按双源一致数据修正），卡池结构与官方完全一致（每原型 5 张旋转对称、各色成本总量 117 均等、各色产出 18 张均等）`,
    en: `## Features

A Splendor rules implementation (2-4 players): each turn pick one of three actions — take 3 gems of different colours (2 of a kind requires ≥4 in supply), reserve a card (face-up or blind from the deck) and gain 1 gold (wildcard), or pay gems to buy a face-up or reserved card. Bought cards grant permanent discounts on their produced colour, snowballing your engine; qualifying nobles visit at end of turn for +3 VP (choose one if several). Once someone reaches 15 VP everyone else gets one more turn, then highest VP wins (ties: fewest purchased cards).

## Use cases

- Play this classic card-drafting engine builder with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Splendor's rules: gem economy, reservation timing and the noble race are fully implemented
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-4 seats (human or AI); 4 face-up cards per tier, 4 nobles in play, gems scaled by player count (4/5/7 per colour for 2/3/4 players, 5 gold)
- **Paying for cards**: own-colour gems first, gold covers the shortfall; purchased cards count as permanent discounts on their colour
- **Reserving**: max 3 in hand; reserving immediately grants 1 gold (gold can only be obtained by reserving)
- **10-gem cap**: if your gems (incl. gold) exceed 10, discard down to 10 by clicking them
- **Nobles**: resolved at end of turn (discard first, then nobles); at most one visit per turn
- **Game end**: after the turn where someone reaches 15 VP, each other player gets one more turn, then scoring
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: the 90 development cards and 10 nobles are cross-verified transcriptions from three independent sources (anicolao/splendor's photo-verified table as primary, checked against splendor-ai and NicolasVero/splendor; splendor-ai's 5-card tier-2 transcription error corrected per the two agreeing sources); the pool structure matches the official game exactly (5 rotation-symmetric copies per archetype, 117 total cost symbols per colour, 18 cards produced per colour)`,
  },
  component: () => import('./component.js'),
};
