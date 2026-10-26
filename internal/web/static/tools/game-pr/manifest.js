export default {
  id: 'game_pr',
  name: { zh: '波多黎各', en: 'Puerto Rico' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🚢',
  keywords: ['puerto rico', '波多黎各', 'board game', '桌游', '德式桌游', 'strategy', '热座', 'hot seat', 'role selection'],
  desc: '德式经典《波多黎各》完整规则复刻：角色选择+跟随、种植园经济、23 种建筑、货船装运。3-5 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《波多黎各》完整规则复刻（3-5 人）：每轮从总督开始轮流选角色，选角者享特权、全员跟随行动。开拓者拿地、建筑师盖楼、市长分移民、工匠生产、商人卖货、船长装船换 VP。建筑 23 种（生产/小型/大型）、货船装载与同种货锁定、交易所、仓库/码头/港口等紫建筑效果、五大建筑终局计分全部实现。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《波多黎各》规则：引擎完整实现角色特权、能装必装、移民船补给等细节
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 3-5 个座位（可切换人类/AI），开始后按横幅提示轮流行事
- **选角顺序**：本作按「选择顺序」结算角色（⚠ 存在按固定角色行顺序的版本差异）
- **船长阶段**：能装必装（至少装 1 件）；同种货一轮只能装一条船；装完可继续装其他货物或结束
- **弃货**：船长阶段结束后每种货只能留 1 件（货仓可加成），超限需弃
- **终局条件**：VP 筹码耗尽立即结束；移民不足或城市建满 12 格则本轮打完结束
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **规则数据**：数值表来自对官方规则的记忆整理，存疑项已在代码中标注「待核对」`,
    en: `## Features

A full-rules implementation of Puerto Rico (3-5 players): each round players take turns choosing roles; the chooser gets the privilege and everyone follows. Settler takes plantations, Builder constructs, Mayor distributes colonists, Craftsman produces, Trader sells, Captain ships for VP. All 23 buildings, cargo ships with same-good locking, the trading house, warehouses/wharf/harbor effects, and the five large buildings' endgame scoring are implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Puerto Rico's rules: privileges, forced shipping, colonist ship supply and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 3-5 seats (human or AI), then follow the banner prompts
- **Role order**: roles resolve in the order they were chosen (⚠ some editions use a fixed role-row order)
- **Captain phase**: you must ship at least one barrel if you can; each good type may only go on one ship per phase; after shipping you may continue or stop
- **Discard**: after the captain phase you keep only 1 barrel per good type (warehouses add capacity)
- **Game end**: VP chips running out ends the game immediately; colonist supply shortage or a full 12-slot city ends it after the current round
- **Undo**: paid undo rolls back to your latest decision point
- **Rule data**: numeric tables are from memory of the official rules; uncertain items are flagged "to verify" in code`,
  },
  component: () => import('./component.js'),
};
