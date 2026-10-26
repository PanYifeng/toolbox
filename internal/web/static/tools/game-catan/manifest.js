export default {
  id: 'game_catan',
  name: { zh: '卡坦岛', en: 'Catan' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🏝️',
  keywords: ['catan', '卡坦岛', 'board game', '桌游', 'settlers', '拓殖', '骰子', 'dice', '资源', 'trading', '交易', 'strategy', '热座', 'hot seat'],
  desc: '经典资源拓殖桌游《卡坦岛》基础版完整复刻：官方 19 格岛屿变体摆盘 + 数字 token + 9 港口、蛇形初始放置、双骰产出、村庄/城市/道路建造、银行与港口交易、国内贸易、强盗与骑士、最长路/最大军队、发展卡、10 分获胜。3-4 人热座同屏明牌对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《卡坦岛》基础版规则复刻（3-4 人）：变体摆盘（地形/数字/港口洗牌），蛇形初始放置——按 1→N→N→1 顺位连放两轮村庄 + 道路，第二轮村庄立即结算产出。之后每回合掷双骰：数字格产资源（村庄 1 张、城市 2 张，强盗压格不产，银行缺卡按余量截断）；掷 7 则超 7 张者弃一半 → 移动强盗 → 从强盗格旁任选一家抢 1 张（明牌自选资源种类）。

主阶段可任意次：建路（1 木 1 砖，15 条上限）、建村（1 木 1 砖 1 羊 1 麦，距离规则须距既有建筑 ≥2 且连己方路，5 座上限）、升城（2 麦 3 矿，4 座上限）、买发展卡（1 羊 1 麦 1 矿，25 张：14 骑士 / 2 修路 / 2 丰年 / 2 垄断 / 5 分卡）。发展卡当回合买不可当回合打；骑士打开即移强盗抢牌，3 骑士得最大军队 +2 分（可夺走）；5 段连续路得最长路 +2 分（可夺走，可被对手在中间建村截断）。交易：银行 4:1、通用港 3:1、专属港 2:1，或与任意对手按任意比率商量（提议 → 对方裁决）。自己回合达到 10 分即胜。

## 使用场景

- 和朋友同屏热座来一局经典资源管理与谈判桌游（支持混合 AI 机器人补位）
- 学习《卡坦岛》规则：距离规则、银行短缺、最长路截断等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 3-4 个座位（可切换人类/AI），地形与数字 token 随机摆盘，先按 1→N 放村庄 + 道路，再逆序 N→1 放第二轮，第二轮村庄立即得初始资源
- **建村限制**：距离规则——与任何村庄/城市至少隔一个顶点；还须连着己方道路网络
- **掷 7**：手上超 7 张资源先弃一半（点自己面板的资源芯片），再移动强盗（点格子），有相邻他家建筑则抢 1 张
- **交易**：主界面下方"银行交易"按你的港口比率自动换算；"国内交易"选对象与双向资源数量提出提议，对方点接受/拒绝
- **发展卡**：买来当回合不能打（分卡除外，分卡直接计入 VP 无需打出）；每回合至多打 1 张
- **最强路被截断**：对手在你路中间的合法空点建村会切断你的最长路
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：地形组成（森 4 / 丘 3 / 牧 4 / 田 4 / 山 3 / 沙 1）、数字 token 组（2-12 无 7）、发展卡构成（14/2/2/2/5）、建造费用与棋子上限均按官方基础版规则誊录；港口位置采用 9 个均匀分布的海岸位（与官方海框架的 9 港口位分布一致），专属/通用标记洗牌落位（官方变体开局）；数字 token 按官方螺旋序摆放（变体开局 token 面朝下洗牌，起点与旋向仅影响摆盘结构）
- **明牌设计**：本作按官方"全家公开资源"变体实现——所有玩家资源与发展卡在面板全公开，国内交易直接在主屏裁决，因此放弃了对局中的隐藏信息博弈`,
    en: `## Features

A Catan base-game rules implementation (3-4 players): variable board setup (shuffled terrain, number tokens and harbours), snake initial placement — two rounds of settlement + road in 1→N→N→1 order with immediate income on the second settlement. Each turn roll two dice: matching hexes produce (settlement 1, city 2; robber blocks; bank shortages pay what remains). Rolling a 7 forces everyone above 7 cards to discard half, then you move the robber and steal 1 card of a chosen type from an adjacent opponent (open hands).

In the main phase you may build any number of: roads (1 wood 1 brick, cap 15), settlements (1 wood 1 brick 1 sheep 1 wheat, distance rule + connected to your road network, cap 5), cities (2 wheat 3 ore, cap 4), and development cards (1 sheep 1 wheat 1 ore; 25 total: 14 knights / 2 road building / 2 year of plenty / 2 monopoly / 5 VP). A dev card bought this turn cannot be played this turn; knights move the robber and steal, 3 knights earn Largest Army +2 VP (stealable); a 5-segment road earns Longest Road +2 VP (stealable, breakable by an opponent's settlement). Trade: bank 4:1, generic harbour 3:1, specialty harbour 2:1, or negotiate any ratio with opponents (offer → accept/decline). Reach 10 VP on your turn to win.

## Use cases

- Play this classic resource-management and negotiation game with friends on one screen (hot seat, with AI bots filling seats)
- Learn Catan's rules: distance rule, bank shortage, longest-road breaking and other details are fully implemented
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 3-4 seats (human or AI); terrain and tokens are shuffled; place settlement + road in 1→N order, then N→1 for the second round with immediate income
- **Settlement limits**: distance rule — at least one empty vertex from any building; must also touch your road network
- **Rolling a 7**: hands above 7 cards discard half (click the resource chips on your panel), then move the robber (click a hex) and steal from an adjacent opponent
- **Trading**: the bank-trade form applies your harbour ratio automatically; the domestic-trade form picks a partner and both sides' resources for an offer they accept or decline
- **Development cards**: cannot be played the turn they are bought (VP cards count directly and are never played); at most one per turn
- **Broken roads**: an opponent's settlement placed inside your path cuts your longest road
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: terrain composition (forest 4 / hills 3 / pasture 4 / fields 4 / mountains 3 / desert 1), the number-token set (2-12 without 7), dev-card composition (14/2/2/2/5), build costs and piece caps follow the official base game; harbours sit on 9 evenly spread coastal spots (matching the official sea frame's 9 harbour positions) with shuffled specialty/generic markers (official variable setup); number tokens follow the official spiral placement (tokens are shuffled face-down in the variable setup, so the start point and direction only shape the board)
- **Open hands**: this implementation uses the official "all resources public" variant — every player's resources and dev cards are visible on their panel and domestic trades resolve on the main screen, deliberately trading away hidden-information play`,
  },
  component: () => import('./component.js'),
};
