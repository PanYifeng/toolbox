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
- **船长阶段**：能装必装且必须装「装得最多」的船并全量装满；同种货一轮只能装一条船；持有码头者可全自愿使用（装该种货的全部），弃权保留轮位
- **弃货**：船长阶段结束后罗盘每种货保留 1 桶；小货仓整种保留 1 种、大货仓 2 种（可叠加 3 种），超出部分弃掉
- **终局条件**：VP 筹码耗尽 / 移民供应不足 / 城市建满 12 格，均在触发后打完本轮才终局；VP 超出供应照常记分
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **规则数据**：✅ 已对照权威开源实现（dae-hany/PuertoRico_AI_Competition，注释含规则书页码引用）逐项核对，2026-11 核对通过`,
    en: `## Features

A full-rules implementation of Puerto Rico (3-5 players): each round players take turns choosing roles; the chooser gets the privilege and everyone follows. Settler takes plantations, Builder constructs, Mayor distributes colonists, Craftsman produces, Trader sells, Captain ships for VP. All 23 buildings, cargo ships with same-good locking, the trading house, warehouses/wharf/harbor effects, and the five large buildings' endgame scoring are implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Puerto Rico's rules: privileges, forced shipping, colonist ship supply and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 3-5 seats (human or AI), then follow the banner prompts
- **Role order**: roles resolve in the order they were chosen (⚠ some editions use a fixed role-row order)
- **Captain phase**: you must load if you can — on the ship that takes the most, filling it to the max; each good type may only go on one ship per phase; a Wharf owner ships voluntarily (ALL barrels of one kind, once per phase) and keeps their place after passing
- **Discard**: after the captain phase the windrose keeps 1 barrel per good type; small warehouses keep ALL barrels of 1 kind, large warehouses of 2 (stackable to 3)
- **Game end**: VP chips running out, colonist supply shortage, or a full 12-slot city all finish the current round before the game ends; VP beyond the supply is still awarded
- **Undo**: paid undo rolls back to your latest decision point
- **Rule data**: ✅ verified against an authoritative open-source implementation (dae-hany/PuertoRico_AI_Competition, with rulebook page citations), Nov 2026`,
  },
  component: () => import('./component.js'),
};
