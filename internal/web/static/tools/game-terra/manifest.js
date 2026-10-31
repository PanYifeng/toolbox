export default {
  id: 'game_terra',
  name: { zh: '神秘大地', en: 'Terra Mystica' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '⛰️',
  keywords: ['terra mystica', '神秘大地', 'board game', '桌游', '德式桌游', 'cult', '邪教', 'strategy', '热座', 'hot seat'],
  desc: '德式经典《神秘大地》规则复刻：官方 113 格棋盘誊录、14 派系地形改造、三碗能量流转、四条邪教轨、建镇连接与六轮经济引擎。2-5 人热座同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《神秘大地》规则复刻（2-5 人）：六轮轮流行动——改造地形建民居、升级交易站/神殿/要塞/圣所、发祭司上邪教轨（锁死换终局名次分 8/4/2）、能量动作槽（每轮刷新先到先得）、燃烧碗 II 换碗 III、船运跨河（河格为通道，连续 ≤船运等级格可穿越）、造桥连接被双河隔开的对岸（29 个官方桥位，每派系限 3 座）。三碗能量流转（得能 I→II→III、支付 III→I）、对手邻建吸能、建镇（相连建筑群城镇值 ≥7 且 ≥4 座建筑即 +5VP）全部实现。

## 使用场景

- 和朋友同屏热座来一局完整德策（支持混合 AI 机器人补位，单人也能开局）
- 学习《神秘大地》规则：地形轮盘、能量经济、建镇连接等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **怎么开局**：配置 2-5 个座位（可切换人类/AI），依次选派系，蛇形各放 2 座初始民居（游牧民 3 座），再逆序各选 1 张奖励板块
- **派系**：14 个派系各带专长（巨人非家园一律 2 铲、暗灵 1 祭司=1 铲+2VP、苦行僧/矮人无船运、女巫要塞后每轮免费森林民居等），全部数值已按官方 jsnell/terra-mystica 源码逐文件核对
- **行动**：主行动一次（建造/升级/发祭司/能量动作槽/要塞行动/船运/铲子升级/造桥/过牌），免费子行动任意次（资源转换 ⚡→💰👷🙏、燃烧 II×2→III、板块免费行动 BON1/BON2/FAV6）
- **回合计分**：每轮板块给两种奖励——邪教轨每满 N 格得一份收入 + 本轮建造/铲/建镇按板块给 VP；侧栏「规划提示」实时预估下轮收入、过牌分与终局投影
- **能量**：三只碗 I/II/III——获得能量从 I 挪到 II（I 空则 II→III）；支付从 III 挪回 I；燃烧是独立动作（II 每 2 枚换 III 1 枚）
- **邪教轨**：跨第 2/4/6 格立即得魔（+1/+2/+2），第 10 格需花钥匙（建镇板块附赠）+3 魔；发祭司锁死到终局，每轨名次分 8/4/2（并列均摊）
- **建镇**：相连建筑群（直接邻接 + 自有桥 + 美人鱼河格连接点）城镇值 ≥7（民居 1/交易站 2/神殿 2/要塞 3/圣所 3）且 ≥4 座建筑（圣所双计）即成镇，选 1 块城镇板块
- **过牌**：过牌时换拿一张奖励板块（无人领取的板块每轮 +1💰）；下轮按本轮过牌顺序行动
- **终局**：六轮打完，四条邪教轨按名次计 8/4/2 分（并列均摊），最大网络 18/12/6，资源折算分（碗 II 燃烧、碗 III/祭司/工人折金币，金币 3:1 折分）
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **数据声明**：棋盘为官方誊录（jsnell/terra-mystica @base_map 逐 token 核对，113 格 = 7 地形 × 11 + 36 河格，桥位 29 对逐对一致）；14 派系全部数值（起始资源/建筑费用收入/船运/铲子/专长）、地形轮、建筑强度、建镇门槛、邪教跨格奖励、能量动作/恩惠/奖励/回合/城镇板块均按官方源码逐文件核对（2026-10-31）`,
    en: `## Features

A Terra Mystica rules implementation (2-5 players): six rounds of turn actions — terraform and build dwellings, upgrade to trading posts / temples / strongholds / sanctuaries, send priests onto cult tracks (locked for endgame rank VP 8/4/2), power action slots (refreshed each round, first come first served), burning bowl II into bowl III, shipping across rivers (river hexes are channels crossable up to your shipping level), and bridges over the 29 official river pairs (max 3 per faction). The three-bowl power cycle (gain I→II→III, pay III→I), leeching from neighboring builds, and town founding (connected buildings worth ≥7 town value with ≥4 buildings = +5VP) are all implemented.

## Use cases

- Play a full heavy Euro with friends on one screen (hot seat, with AI bots filling seats — solo works too)
- Learn Terra Mystica's rules: the terrain wheel, power economy, town connectivity and more are all in the engine
- The random seed reproduces the same game for review and discussion

## FAQ

- **Setup**: configure 2-5 seats (human or AI), pick factions in turn, place 2 starting dwellings each in snake order (Nomads get 3), then pick bonus tiles in reverse order
- **Factions**: 14 factions each with an ability (Giants always dig 2 spades, Darklings turn 1 priest into a spade +2 VP, Fakirs/Dwarves have no shipping, Witches get a free forest dwelling each round after their stronghold, etc.); all values verified file-by-file against the official jsnell/terra-mystica source
- **Actions**: one main action per turn (build/upgrade/send priest/power action/stronghold action/shipping/dig upgrade/bridge/pass) plus unlimited free sub-actions (conversions ⚡→💰👷🙏, burning II×2→III, tile actions BON1/BON2/FAV6)
- **Round scoring**: each round tile gives two rewards — income per N cult steps plus VP for buildings/spades/towns made this round; the "Planning" panel projects your next income, pass VP and endgame score live
- **Power**: three bowls I/II/III — gaining moves a token I→II (II→III when I is empty); paying moves III→I; burning is a standalone action (2×II → 1×III)
- **Cult tracks**: crossing spaces 2/4/6 grants power immediately (+1/+2/+2); space 10 needs a key (from town tiles) for +3 power; sent priests lock in until the endgame, each track pays 8/4/2 by rank (ties share)
- **Towns**: a connected group of buildings (direct adjacency + own bridges + Mermaid river-hex connection points) with town value ≥7 (D1/TP2/TE2/SH3/SA3) and ≥4 buildings (Sanctuary counts double) founds a town; pick a town tile
- **Passing**: when passing you take a bonus tile (untaken tiles gain +1💰 per round); next round's turn order follows this round's pass order
- **Game end**: after six rounds, the four cult tracks pay 8/4/2 by rank (ties share), largest network pays 18/12/6, and leftover resources convert to VP (bowl II burns to III, then III/priests/workers to coins at par, coins at 3:1)
- **Undo**: paid undo rolls back to your latest decision point
- **Data disclaimer**: the board is an official transcription (jsnell/terra-mystica @base_map, token by token: 113 hexes = 7 terrains × 11 + 36 rivers; all 29 bridge pairs verified); all values of the 14 factions (starting resources/building costs & incomes/shipping/digging/abilities), the terrain wheel, building strengths, town threshold, cult crossing rewards, and all tile tables (power actions/favors/bonus/round/town) were verified file-by-file against the official source (2026-10-31)`,
  },
  component: () => import('./component.js'),
};
