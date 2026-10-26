export default {
  id: 'game_agricola',
  name: { zh: '农场主', en: 'Agricola' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🌾',
  keywords: ['agricola', '农场主', 'board game', '桌游', '德式桌游', 'worker placement', '工人放置', 'strategy', '热座', 'hot seat'],
  desc: '德式经典《农场主》规则复刻：14 轮 6 阶段工人放置、5×3 农场经营（建房/犁田/播种/围栏牧场）、收获喂食压力、40 职业 + 40 小改进 + 10 大设施。1-5 人热座同屏对局（手牌隐私交接），支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《农场主》规则复刻（1-5 人）：14 轮轮流放工——拿资源（累积格越晚拿越多）、建房与马厩、犁田播种烤面包、围栏圈牧场养羊/猪/牛、翻新房屋、家庭成长、打出职业与小改进、购买大设施。收获轮（4/7/9/11/13/14）田间收获 → 喂食（每家庭成员 2 食，缺口每 1 食 = 1 乞讨卡 −3 分）→ 牲畜繁殖（≥2 只且有栏位 +1）。终局按田/牧场/谷/菜/畜/家庭/房/马厩/空地/乞讨/卡牌计分。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《农场主》规则：工人放置、食物经济、牧场容量等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 1-5 个座位（可切换人类/AI），每人发 7 职业 + 7 小改进；每轮依次放工
- **放工**：点击行动板高亮的格子；累积格（黏土/芦苇/石头/食物/动物）没人拿会每轮 +1；专长格（建/犁/播/围栏/翻新/打牌）进入子阶段，按面板提示点农场格或按钮完成
- **围栏**：子阶段里点空地圈选（再点撤销），围栏总花费实时显示；牧场容量 = 2×(格数 + 马厩数)，马厩在牧场里翻倍容量
- **喂食**：收获时每家庭成员 2 食（新生儿 1 食）；谷物/蔬菜 1:1 直食，牲畜须有烹饪设备转化；缺口每 1 食 = 1 乞讨卡（终局 −3 分/张）
- **家庭成长**：需有空房；第 14 轮的成长格无需空房
- **悔棋**：付费悔棋回退到最近一次人类决策状态
- **隐私**：多人人类对局换手时有交接遮罩，手牌只显示当前玩家
- **数据声明**：⚠ 行动板为 2-5 人共用（官方分人数不同规格，本实现 4+ 人追加第二雇工格、5 人追加第二伐木格）；40 职业 + 40 小改进为记忆重建 + 自创平衡混合（官方 E-deck 139+139），全部数值「待核对」；已知规则偏差：子阶段可零操作取消、翻新可不翻只购大设施、动物溢出自动烹煮/丢弃、卡上栏位为单一共享池、播种留 1 棵计分的口径（谷 1→田 2）`,
    en: `## Features

An Agricola rules implementation (1-5 players): 14 rounds of worker placement — accumulating resource spaces, building rooms and stables, plowing and sowing (and baking bread), fencing pastures for sheep/boar/cattle, renovating rooms, family growth, playing occupations and minor improvements, buying major improvements. Harvest rounds (4/7/9/11/13/14): field harvest → feeding (2 food per family member, each missing food = 1 begging card, −3VP) → breeding (2+ animals with capacity → +1). Final scoring covers fields / pastures / grain / vegetables / animals / family / rooms / stables / unused spaces / begging / cards.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat with AI bots filling seats — solo works too)
- Learn Agricola's rules: worker placement, the food economy, pasture capacity and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 1-5 seats (human or AI); each player gets 7 occupations + 7 minor improvements; place workers in turn each round
- **Placing**: click a highlighted space on the action board; accumulating spaces (clay/reed/stone/food/animals) grow +1 per round when untaken; special spaces (build/plow/sow/fence/renovate/play cards) enter a sub-phase — follow the panel and click farm cells or buttons
- **Fences**: in the sub-phase click empty cells to select (click again to undo), with live total cost; pasture capacity = 2×(cells + stables), stables inside a pasture double its capacity
- **Feeding**: at harvest each family member eats 2 food (newborns 1); grain/vegetables convert 1:1, animals need a cooking device; each missing food = 1 begging card (−3VP each at the end)
- **Family growth**: needs a free room; the round-14 growth space needs no room
- **Undo**: paid undo rolls back to your latest decision point
- **Privacy**: with multiple humans a handoff mask appears between turns; hands are only shown for the current player
- **Data disclaimer**: ⚠ one shared action board for 2-5 players (official boards scale by count; this build adds a second day-laborer space at 4+ and a second wood space at 5); the 40 occupations + 40 minor improvements are a memory-reconstruction with original balancing (official E-deck is 139+139), all values "to verify"; known deviations: sub-phases can be cancelled with zero actions, renovation can be skipped in favor of buying a major, animal overflow auto-cooks/discards, the card stable is a single shared pool, sowing keeps 1 grain for scoring (1 grain → 2 on the field)`,
  },
  component: () => import('./component.js'),
};
