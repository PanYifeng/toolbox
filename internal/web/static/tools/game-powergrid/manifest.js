export default {
  id: 'game_powergrid',
  name: { zh: '电力公司', en: 'Power Grid' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '⚡',
  keywords: ['power grid', '电力公司', 'board game', '桌游', '德式桌游', 'auction', '拍卖', 'strategy', '热座', 'hot seat'],
  desc: '德式经典《电力公司》完整规则复刻：电厂拍卖、动态资源价格梯、德国地图城市扩张、三阶段节奏与结算。2-6 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《电力公司》完整规则复刻（2-6 人）：每轮五个阶段——按顺位拍卖电厂（现货 4 张+期货、起拍价=面值）、购买资源（市场越空越贵，铀第 9 档起跳 10/12/14/16）、建设城市（首城免连接费，Dijkstra 最短连接）、 bureaucracy 结算发电收入，随后补给资源、移除市场最高厂。Step 1/2/3 节奏切换（第 7 城触发 Step2、抽到 Step3 卡进入 Step3）、终局城市数按人数（21/17/15/17/14）全部实现。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《电力公司》规则：拍卖轮转、资源价格梯、市场重排等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-6 个座位（可切换人类/AI），开局轮流选择相邻地图区域
- **拍卖规则**：起拍者按面值起拍（未被人加价前不可退出）；他人可加价或退出；全退则起拍者以底价成交
- **资源价格**：资源占最贵端区块、从最便宜格买 → 市场越空越贵；煤/油/垃圾满 24 件时 1 块钱，铀剩 1 件 16 块
- **存储容量**：每种燃料可存该类电厂需求量 ×2；混燃（煤/油）容量煤油共享
- **终局条件**：任一玩家城市数达标（按人数 21/17/15/17/14），本轮打完结算：供电城市数 → 电厂容量 → 余额
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **地图与数据**：地图为官方德国版图誊录（42 城、6 区各 7 城、83 条连接边逐边费用，经三个独立开源实现交叉验证）；数值表来自对官方规则的记忆整理，存疑项已在代码中标注「待核对」`,
    en: `## Features

A full-rules implementation of Power Grid (2-6 players): five phases each round — plant auction in turn order (4 current + future market, opening bid = face value), resource buying (the emptier the market the higher the price; uranium jumps 10/12/14/16 from slot 9), city building (first city free of connection cost, Dijkstra shortest path), and bureaucracy income settlement, followed by resource refill and removing the highest plant. Step 1/2/3 progression (7th city triggers Step 2, drawing the Step 3 card enters Step 3) and player-count endgame city targets (21/17/15/17/14) are all implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Power Grid's rules: auction rotation, the resource price track, market rebalancing and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-6 seats (human or AI), then take turns picking adjacent map regions
- **Auction**: the opener starts at face value and cannot leave until outbid; others raise or drop; if everyone drops the opener wins at the opening bid
- **Resource prices**: resources occupy the most expensive block and are bought from its cheapest slot; coal/oil/garbage cost 1 at a full market of 24, uranium reaches 16 at the last piece
- **Storage**: each fuel type stores 2× its plants' demand; hybrid (coal/oil) capacity is shared between the two
- **Game end**: when any player reaches the city target (21/17/15/17/14 by player count), finish the round and score: powered cities → plant capacity → cash
- **Undo**: paid undo rolls back to your latest decision point
- **Map & data**: the map is a faithful transcription of the official Germany board (42 cities, 6 regions of 7, all 83 connection costs cross-validated against three independent open-source implementations); numeric tables are from memory of the official rules; uncertain items are flagged "to verify" in code`,
  },
  component: () => import('./component.js'),
};
