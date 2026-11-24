export default {
  id: 'game_monopoly',
  name: { zh: '大富翁', en: 'Monopoly' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🎩',
  keywords: ['monopoly', '大富翁', '强手棋', 'board game', '桌游', 'dice', '骰子', 'property', '地产', 'real estate', 'auction', '竞拍', 'trading', '交易', 'hot seat', '热座', 'online', '联机'],
  desc: '经典房地产桌游《大富翁》完整官方规则复刻：标准 40 格棋盘，22 块地产分属 8 个色组 + 4 条铁路 + 2 家公用事业；机会与命运各 16 张卡牌，所得税与奢侈税；监狱三种出狱方式（掷同点 / 缴 50 元 / 出狱卡）；无主地产可购买、拒买则公开竞拍；独占整组可加盖房屋与旅馆（均匀建造 + 4 房屋规则 + 银行库存限制），房屋使租金成倍上涨；抵押与赎回（赎回收 10% 利息）；玩家间地产与现金交易；资不抵债时先变卖资产，仍不足则破产，地产与现金移交债权人。2-6 人热座同屏明牌对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《大富翁》官方规则复刻（2-6 人）：

- **棋盘**：标准 40 格——起点、22 块地产（8 个色组：棕 2 / 浅蓝 3 / 粉 3 / 橙 3 / 红 3 / 黄 3 / 绿 3 / 深蓝 2）、4 条铁路、2 家公用事业、3 格机会、3 格命运、所得税 200 元、奢侈税 100 元、监狱、免费停车、入狱
- **回合**：掷两颗骰子前进；掷出同点可再掷一次，连续三次同点直接入狱。停在可购买且无主的格子上可选择购买；放弃则由全场公开竞拍（10 元起拍，最小加价 10 元，最高出价者得）
- **租金**：独占同色组全部地产则无房租金加倍；铁路按持有条数收 25/50/100/200；公用事业按骰点 ×4（持 1 家）或 ×10（持 2 家）
- **建造**：独占整组后方可加盖，须均匀建造（同一色组内房屋数差不超过 1），每块地产最多 4 栋房屋 + 1 座旅馆；银行房屋 32 栋、旅馆 12 座，库存耗尽即无法加盖（官方建筑短缺规则）
- **抵押**：无房屋的地产可抵押换现金；赎回须付抵押价 + 10% 利息。抵押期间不收租
- **交易**：可与任意玩家协商地产与现金的交换，对方接受即交割；有房屋的地产须先拆除房屋才能转让
- **监狱**：掷出同点出狱；缴 50 元罚金出狱；使用出狱卡出狱。第 3 次仍未掷出同点则必须缴罚金并照常移动
- **卡牌**：机会/命运各 16 张——前进到指定格、前往最近铁路/公用事业、后退 3 格、收付款项、向每位玩家收取/支付、房屋维修费、直接入狱、获得出狱卡
- **破产**：资不抵债时须先拆房、抵押变现；仍不足则宣告破产，全部地产与现金移交债权人（债权人为银行时地产回到无主）
- **终局**：只剩一名未破产玩家即获胜；若设置了回合上限，达到上限时净资产最高者获胜

## 使用场景

- 和朋友同屏热座来一局经典大富翁（支持 AI 机器人补位，单人可挑战多名 AI）
- 学习官方细则：均匀建造、4 房屋规则、建筑短缺、抵押利息、竞拍机制等引擎全部实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **为什么我不能建房**：必须先独占整个色组，且同组内不能有抵押地产；建造须均匀（不能某块先盖到 2 栋而其他还是 0）
- **为什么盖不了旅馆**：银行旅馆库存为 12 座，用完就没有了；同理房屋库存为 32 栋（官方建筑短缺规则，本作严格实现）
- **抵押后还能收租吗**：不能。抵押地产不收租，赎回须付 10% 利息
- **拒绝购买会怎样**：进入公开竞拍，起拍 10 元、最小加价 10 元；全场无人出价则流拍，地产保持无主
- **交易限制**：有房屋的地产不能直接交易（须先拆除房屋）；同色组内有房屋时也不能转让
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **联机**：可在开局界面「创建联机房间」，把链接发给朋友；房间状态由服务端按行动序号同步
- **数据声明**：40 格棋盘布局、22 块地产的地价/租金/房屋造价、4 条铁路与 2 家公用事业的租金规则、机会与命运各 16 张卡牌文本与效果，均按 Hasbro 标准版官方规则誊录`,
    en: `## Features

A faithful implementation of the official Monopoly rules (2-6 players):

- **Board**: the standard 40-space layout — GO, 22 properties in 8 colour groups (brown 2 / light blue 3 / pink 3 / orange 3 / red 3 / yellow 3 / green 3 / dark blue 2), 4 railroads, 2 utilities, 3 Chance and 3 Community Chest spaces, Income Tax $200, Luxury Tax $100, Jail, Free Parking and Go To Jail
- **Turns**: roll two dice; doubles earn another roll, but three doubles in a row send you straight to Jail. Landing on an unowned property lets you buy it; declining sends it to open auction (starting at $10, minimum raise $10, highest bidder wins)
- **Rent**: owning a whole colour group doubles the base rent; railroads rent for 25/50/100/200 depending on how many you own; utilities charge dice ×4 (one owned) or ×10 (both)
- **Building**: once you own a full group you may build evenly (house counts within a group may not differ by more than one), up to 4 houses and then a hotel. The bank holds 32 houses and 12 hotels — when they run out nobody may build (official building-shortage rule)
- **Mortgages**: unbuilt properties can be mortgaged for cash and redeemed at the mortgage value plus 10% interest. Mortgaged properties collect no rent
- **Trading**: negotiate property and cash swaps with any player; the trade settles when both sides accept. Properties with houses must have them sold before they can change hands
- **Jail**: escape by rolling doubles, paying the $50 fine, or using a Get Out of Jail Free card. On the third failed attempt you must pay the fine and move normally
- **Cards**: 16 Chance and 16 Community Chest cards — advance to a space, go to the nearest railroad or utility, go back 3 spaces, collect or pay money, pay every player, property repairs, go directly to Jail, Get Out of Jail Free
- **Bankruptcy**: when you cannot pay, you must first sell houses and mortgage properties; if still short you declare bankruptcy and hand everything to your creditor (or back to the bank if the bank is the creditor)
- **Ending**: the last player still solvent wins; with a round limit set, the highest net worth at the cap wins

## Use cases

- Play hot-seat Monopoly with friends (AI bots can fill seats, so solo play works too)
- Learn the official fine print: even building, the 4-house rule, building shortages, mortgage interest and auctions are all implemented
- The random seed reproduces the same game for review and discussion

## FAQ

- **Why can't I build**: you must own the entire colour group and no property in it may be mortgaged; building must also be even (you cannot raise one property to 2 houses while others stay at 0)
- **Why can't I build a hotel**: the bank only has 12 hotels (and 32 houses); once they are gone nobody may build — the official building-shortage rule is enforced strictly
- **Do mortgaged properties collect rent**: no. Redeem them by paying the mortgage value plus 10%
- **What if I decline to buy**: the property goes to open auction starting at $10 with $10 raises; if nobody bids it stays unowned
- **Trading limits**: properties with houses cannot be traded directly (sell the houses first), and neither can properties whose colour group still has houses
- **Undo**: paid undo rolls back to your latest decision point
- **Online**: use "Create online room" on the setup screen and send the link to friends; room state syncs by action sequence number
- **Data statement**: the 40-space layout, all property prices/rents/house costs, the railroad and utility rent rules, and all 32 card texts and effects are transcribed from the official Hasbro standard-edition rules`,
  },
  component: () => import('./component.js'),
};
