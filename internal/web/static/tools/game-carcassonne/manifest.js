export default {
  id: 'game_carcassonne',
  name: { zh: '卡卡颂', en: 'Carcassonne' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🏰',
  keywords: ['carcassonne', '卡卡颂', 'board game', '桌游', 'tile placement', '拼块', 'meeple', '随从', '农夫', 'city building', '策略', '热座', 'hot seat'],
  desc: '经典拼块桌游《卡卡颂》基础版完整复刻：72 块地形块（起始块 + 71 抽牌堆）、四类地形（城市/道路/草地/修道院）、边三段槽位农田连接模型、随从驻守与多数方计分、完成城市/道路/修道院即时结算、终局未完成减半 + 农夫 3 分/完成城市（C1 规则）。2-5 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《卡卡颂》基础版规则复刻（2-5 人）：起始块（城市一头 + 横穿道路）居中，每回合从 71 块牌堆抽 1 块，旋转后放进与既有块边地形匹配的空格（城市对城市、道路对道路、草地对草地）；抽出的块无处可放则弃掉重抽（官方规则）。放块后可派 1 个随从（共 7 个）驻守该块上的一个地形区：城市、道路、草地（农夫）或修道院——前提是该连通区上尚无随从。

完成即结算：城市被围死（所有城市边封闭）得 2 分/块 + 2 分/纹章，道路两端到头得 1 分/块，修道院被 3×3 围满得 9 分；同一区多个随从按人数多数方得分，并列多方均得全额，结算后随从归还。放在落块瞬间即已完成的特征上的随从立即结算归还（官方裁决）。牌堆放尽进入终局：未完成城市 1 分/块 + 1 分/纹章、未完成道路 1 分/块、修道院按 3×3 已占格数、农夫按每块农田相邻的完成城市数 × 3 分（多数方得）。

## 使用场景

- 和朋友同屏热座来一局经典拼块版图桌游（支持混合 AI 机器人补位）
- 学习《卡卡颂》规则：农田"边三段"连接、多数并列均得、终局减半等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-5 个座位（可切换人类/AI），起始块已摆好，先手直接抽块放置
- **放块规则**：点击高亮格落块，↺↻ 旋转当前块；高亮只显示当前朝向可放的位置，旋转后高亮随之变化
- **派随从**：放块后点击块上的圆点驻守对应地形；圆点不出现说明该区已有随从或无随从可用，可点"不放随从"跳过
- **农田连接**：草地按"边三段"模型连通——整边草地对接整边草地，道路两侧的草地带跨块相连（模型与 carcassonne-api 一致）
- **农夫**：终局才结算，每个相邻完成城市 3 分；采用流传最广的 C1 经典规则（不做 C2 的三块城市 5 分细分）
- **多数并列**：同区并列最多的多方各得全额分数
- **无处可放**：抽到的块全盘无合法位置时自动弃掉换下一块（日志可见）
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：24 种地形块构成与数量（起始 D×1，牌堆 A2、B4、C1、D3、E5、F2、G1、H3、I2、J3、K3、L3、M2、N3、O2、P3、Q1、R3、S2、T1、U8、V9、W4、X1 共 71 块）、纹章分布（C/F/M/O/Q/S 共 10 块）、边地形与农田连接关系，誊录自 carcassonne-api allPlayTileTypes.json（wikicarpedia C2 官方瓦片命名），并与 bacher、carcassonne 两个独立实现三源交叉验证；计分规则按基础版官方规则（农夫采用 C1 3 分制并在此注明）`,
    en: `## Features

A Carcassonne base-game rules implementation (2-5 players): the start tile (one city edge + a crossing road) sits in the middle; each turn draw from the 71-tile deck and place it rotated into any empty cell whose touching edges match (city to city, road to road, grass to grass); a drawn tile with no legal spot is discarded and redrawn (official rule). After placing you may deploy one of your 7 followers onto a feature of that tile — city, road, field (farmer) or monastery — provided no follower sits on that connected feature yet.

Completed features score immediately: a walled-in city earns 2 points per tile + 2 per pennant, a road with both ends terminated earns 1 per tile, a monastery surrounded by its 3×3 neighbourhood earns 9; when several followers share a feature the majority side scores, ties all score full points, and followers return after scoring. A follower placed on a feature that was already completed by the tile placement scores and returns immediately (official ruling). When the deck runs out the game ends: incomplete cities 1 per tile + 1 per pennant, incomplete roads 1 per tile, monasteries 1 per occupied cell in the 3×3, and farmers 3 points per completed city adjacent to their field (majority side).

## Use cases

- Play this classic tile-laying game with friends on one screen (hot seat, with AI bots filling seats)
- Learn Carcassonne's rules: the edge-thirds field connectivity, tied majorities, endgame half scoring and other details are fully implemented
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-5 seats (human or AI); the start tile is pre-placed and the first player draws right away
- **Placing tiles**: click a highlighted cell to place, rotate with ↺↻; highlights show only spots legal for the current orientation and refresh as you rotate
- **Followers**: after placing, click a dot on the tile to deploy onto that feature; missing dots mean the feature already has a follower or you have none left, and you can click "Skip follower"
- **Field connectivity**: grass connects via the edge-thirds model — full grass edges join, and the grass strips flanking a road continue across tiles (same model as carcassonne-api)
- **Farmers**: score only at game end, 3 points per adjacent completed city; the widely accepted classic C1 rule is used (not the C2 5-points-for-3-tile-cities variant)
- **Tied majorities**: every side tied for most followers on a feature scores full points
- **Dead draws**: a tile with no legal spot anywhere is auto-discarded and another is drawn (visible in the log)
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: the 24 tile types and quantities (start D×1 plus deck A2, B4, C1, D3, E5, F2, G1, H3, I2, J3, K3, L3, M2, N3, O2, P3, Q1, R3, S2, T1, U8, V9, W4, X1 = 71 tiles), pennant distribution (10 tiles across C/F/M/O/Q/S), edge terrains and field connectivity are transcribed from carcassonne-api's allPlayTileTypes.json (wikicarpedia C2 naming) and cross-validated against the bacher and carcassonne implementations; scoring follows the official base rules (farmers use the classic C1 3-point rule, noted here)`,
  },
  component: () => import('./component.js'),
};
