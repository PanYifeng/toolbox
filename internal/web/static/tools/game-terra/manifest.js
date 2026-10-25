export default {
  id: 'game_terra',
  name: { zh: '神秘大地', en: 'Terra Mystica' },
  category: { zh: '游戏', en: 'Games' },
  icon: '⛰️',
  keywords: ['terra mystica', '神秘大地', 'board game', '桌游', '德式桌游', 'cult', '邪教', 'strategy', '热座', 'hot seat'],
  desc: '德式经典《神秘大地》规则复刻：11 派系地形改造、三碗能量流转、四条邪教轨、建镇连接与六轮经济引擎。2-5 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《神秘大地》规则复刻（2-5 人）：六轮轮流行动——改造地形建民居、升级交易站/神殿/要塞/圣所、发祭司上邪教轨（锁死换终局名次分 8/4/2）、能量动作槽（每轮刷新先到先得）、燃烧碗 II 换碗 III、船运跨湖、造桥连河。三碗能量流转（得能 I→II→III、支付 III→I）、对手邻建吸能、建镇（相连建筑城镇值 ≥7 即 +5VP）全部实现。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《神秘大地》规则：地形轮盘、能量经济、建镇连接等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-5 个座位（可切换人类/AI），依次选派系，蛇形各放 2 座初始民居
- **派系**：11 个派系各带专长（巨人 1 铲挖 2 步、炼金以币代工、苦行僧飞毯距离 3、女巫要塞后升级送森林民居等），地形归属见卡片
- **能量**：三只碗 I/II/III——获得能量从 I 挪到 II（I 空则 II→III）；支付从 III 挪回 I；燃烧是独立动作（II 每 2 枚换 III 1 枚）
- **建镇**：直接相邻（含自有桥、美人鱼船运跨湖）的建筑群城镇值 ≥7（民居 1/交易站 2/神殿 3/要塞 2/圣所 5）即成镇 +5VP
- **过牌**：过牌时换拿一张奖励板块；下轮按本轮过牌顺序行动
- **终局**：六轮打完，四条邪教轨按名次计 8/4/2 分（并列取高），锁定祭司每枚 +1VP
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：⚠ 派系缩至 11 个（官方 14）；地图为近似自制（55 格，官方约 91 格）；全部数值表为记忆重建并在代码中标注「待核对」，已知规则偏差见引擎顶部注释（吸能自动接受、燃烧独立动作化、恩惠不可换、奖励板块随机分配）`,
    en: `## Features

A Terra Mystica rules implementation (2-5 players): six rounds of turn actions — terraform and build dwellings, upgrade to trading posts / temples / strongholds / sanctuaries, send priests onto cult tracks (locked for endgame rank VP 8/4/2), power action slots (refreshed each round, first come first served), burning bowl II into bowl III, shipping across lakes, and bridges over rivers. The three-bowl power cycle (gain I→II→III, pay III→I), leeching from neighboring builds, and town founding (connected buildings worth ≥7 town value = +5VP) are all implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Terra Mystica's rules: the terrain wheel, power economy, town connectivity and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-5 seats (human or AI), pick factions in turn, then place 2 starting dwellings each in snake order
- **Factions**: 11 factions each with an ability (Giants dig 2 steps per spade, Alchemists pay coins per spade, Fakirs fly range 3, Witches get free forest dwellings after their stronghold, etc.); home terrain is on the card
- **Power**: three bowls I/II/III — gaining moves a token I→II (II→III when I is empty); paying moves III→I; burning is a standalone action (2×II → 1×III)
- **Towns**: a group of directly adjacent buildings (own bridges and Mermaid shipping across lakes count) with town value ≥7 (D1/TP2/TE3/SH2/SA5) founds a town for +5VP
- **Passing**: when passing you take a bonus tile; next round's turn order follows this round's pass order
- **Game end**: after six rounds, the four cult tracks pay 8/4/2 by rank (ties share the higher rank), plus 1VP per locked priest
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: ⚠ factions reduced to 11 (official 14); the map is an approximation (55 hexes vs ~91 official); all numeric tables are memory-reconstructed and flagged "to verify" in code; known rule deviations are documented at the top of the engine (leech auto-accepted, burn as a standalone action, favor tiles not exchangeable, bonus tiles randomly assigned)`,
  },
  component: () => import('./component.js'),
};
