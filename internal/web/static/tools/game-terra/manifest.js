export default {
  id: 'game_terra',
  name: { zh: '神秘大地', en: 'Terra Mystica' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '⛰️',
  keywords: ['terra mystica', '神秘大地', 'board game', '桌游', '德式桌游', 'cult', '邪教', 'strategy', '热座', 'hot seat'],
  desc: '德式经典《神秘大地》规则复刻：官方 113 格棋盘誊录、11 派系地形改造、三碗能量流转、四条邪教轨、建镇连接与六轮经济引擎。2-5 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《神秘大地》规则复刻（2-5 人）：六轮轮流行动——改造地形建民居、升级交易站/神殿/要塞/圣所、发祭司上邪教轨（锁死换终局名次分 8/4/2）、能量动作槽（每轮刷新先到先得）、燃烧碗 II 换碗 III、船运跨河（河格为通道，连续 ≤船运等级格可穿越）、造桥连接被双河隔开的对岸（29 个官方桥位，每派系限 3 座）。三碗能量流转（得能 I→II→III、支付 III→I）、对手邻建吸能、建镇（相连建筑群城镇值 ≥7 且 ≥4 座建筑即 +5VP）全部实现。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《神秘大地》规则：地形轮盘、能量经济、建镇连接等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-5 个座位（可切换人类/AI），依次选派系，蛇形各放 2 座初始民居
- **派系**：11 个派系各带专长（巨人 1 铲挖 2 步、炼金以币代工、苦行僧飞毯距离 3、女巫要塞后升级送森林民居等），地形归属已按官方核对
- **能量**：三只碗 I/II/III——获得能量从 I 挪到 II（I 空则 II→III）；支付从 III 挪回 I；燃烧是独立动作（II 每 2 枚换 III 1 枚）
- **建镇**：相连建筑群（直接邻接 + 自有桥 + 美人鱼河格连接点）城镇值 ≥7（民居 1/交易站 2/神殿 2/要塞 3/圣所 3）且 ≥4 座建筑（圣所双计）即成镇 +5VP
- **过牌**：过牌时换拿一张奖励板块；下轮按本轮过牌顺序行动
- **终局**：六轮打完，四条邪教轨按名次计 8/4/2 分（并列取高），锁定祭司每枚 +1VP
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：⚠ 棋盘为官方誊录（jsnell/terra-mystica @base_map 逐 token 核对，113 格 = 7 地形 × 11 + 36 河格，桥位 29 对逐对一致）；地形轮盘、建筑强度（D1/TP2/TE2/SH3/SA3）、建镇门槛（≥7 值且 ≥4 座建筑）、船运跨河、美人鱼河格连接、桥规则（每派系 3 座、每对 1 座）、派系家园地形已按官方核对。其余为记忆重建并标注「待核对」：派系缩至 11 个（官方 14），数值表（费用/收入/能量动作槽/恩惠/回合板块）存疑，已知规则偏差见引擎顶部注释（吸能自动接受、燃烧独立动作化、恩惠不可换、奖励板块随机分配、工程师造桥简化为 innate、飞毯免费）`,
    en: `## Features

A Terra Mystica rules implementation (2-5 players): six rounds of turn actions — terraform and build dwellings, upgrade to trading posts / temples / strongholds / sanctuaries, send priests onto cult tracks (locked for endgame rank VP 8/4/2), power action slots (refreshed each round, first come first served), burning bowl II into bowl III, shipping across rivers (river hexes are channels crossable up to your shipping level), and bridges over the 29 official river pairs (max 3 per faction). The three-bowl power cycle (gain I→II→III, pay III→I), leeching from neighboring builds, and town founding (connected buildings worth ≥7 town value with ≥4 buildings = +5VP) are all implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Terra Mystica's rules: the terrain wheel, power economy, town connectivity and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-5 seats (human or AI), pick factions in turn, then place 2 starting dwellings each in snake order
- **Factions**: 11 factions each with an ability (Giants dig 2 steps per spade, Alchemists pay coins per spade, Fakirs fly range 3, Witches get free forest dwellings after their stronghold, etc.); home terrains verified against the official set
- **Power**: three bowls I/II/III — gaining moves a token I→II (II→III when I is empty); paying moves III→I; burning is a standalone action (2×II → 1×III)
- **Towns**: a connected group of buildings (direct adjacency + own bridges + Mermaid river-hex connection points) with town value ≥7 (D1/TP2/TE2/SH3/SA3) and ≥4 buildings (Sanctuary counts double) founds a town for +5VP
- **Passing**: when passing you take a bonus tile; next round's turn order follows this round's pass order
- **Game end**: after six rounds, the four cult tracks pay 8/4/2 by rank (ties share the higher rank), plus 1VP per locked priest
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: ⚠ the board is an official transcription (jsnell/terra-mystica @base_map, token by token: 113 hexes = 7 terrains × 11 + 36 rivers; all 29 bridge pairs verified); the terrain wheel, building strengths (D1/TP2/TE2/SH3/SA3), town threshold (value ≥7 with ≥4 buildings), river shipping, Mermaid river connections, bridge rules (3 per faction, 1 per pair) and faction home terrains are verified against the official game. The rest is memory-reconstructed and flagged "to verify": factions reduced to 11 (official 14), numeric tables (costs/incomes/power action slots/favors/round tiles) uncertain, and known rule deviations are documented at the top of the engine (leech auto-accepted, burn as a standalone action, favor tiles not exchangeable, bonus tiles randomly assigned, Engineer bridges simplified to innate, free carpet flight)`,
  },
  component: () => import('./component.js'),
};
