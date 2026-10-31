// 神秘大地派系表：14 派系（含暗灵、矮人），全部数值按官方 jsnell/terra-mystica
// src/Game/Factions/*.pm 逐文件核对（2026-10-31），不再有记忆重建条目。
//
// color 官方派系棋子色（jsnell color 字段）：半身人/邪教徒=棕、工程师/矮人=灰、
// 炼金/暗灵=黑、美人鱼/蜂灵=蓝、女巫/奥灵=绿、巨人/混沌=红、游牧/苦行=黄。
// 同色对取深浅两档以便棋盘区分。
//
// 字段说明（engine.js 消费）：
//   start        起始资源 { C, W, P(手牌祭司，官方标准 0), P1, P2, cults:{...} }
//   dig          { cost:[每铲工人费用按等级], upgrades:[可升级次数], upgradeCost }
//   ship         { start:起始级, max, vp:[每级 VP] }（无船运派系省略或 null）
//   teleport     苦行僧飞毯/矮人隧道 { maxRange, costPerLevel:[..], vpPerLevel:[..] }
//   buildings    费用与收入数组（income 按已建成数量索引；PW 即 powerGain）
//   shGain       SH 建成时一次性获得（含特殊行动解锁，见 shAction）
//   shAction     SH 解锁的特别行动 id（engine 分发）：ACTW/ACTG/ACTC/ACTN/ACTS/ACTA/ACTE
//   shGainFavor  奥灵 SH 建成时额外获得 1 张恩惠（GAIN_FAVOR 1）
//   special      派系特例钩子（engine.js dispatch）：
//     halflingSpadeVp  每获得 1 铲得 1VP（innate）
//     alchemistSpadePw 每获得 1 铲得 2魔（需 SH）
//     giantDigDouble   非家园地形一律 2 铲、目标必为家园色（innate）
//     cultistLeech     对手吸你建筑能量：接受→你+1邪教 / 全拒→你+1魔
//     witchesTownVp    建镇板块额外 +5VP（innate）
//     swarmlingTownW   建镇板块额外 +3工人（innate）
//     engineerBridge   造桥费 2 工人（innate ACTE，可重复）
//     alchemistVpRate  金币→VP 2:1（innate exchange_rates）
//     darklingDig      铲子来源：1 祭司=1铲+2VP（无铲升级，dig max_level 0）
//     fakirCarpet      民居飞毯：1 祭司 → 4VP，乌鸦距离 1→2（SH 后）
//     dwarfTunnel      隧道：W2（SH 后 W1）→ 4VP，乌鸦距离 1

export const FACTIONS = [
  {
    id: 'halflings', terrain: 'plains', color: '#a06a35',
    name: { zh: '半身人', en: 'Halflings' },
    desc: { zh: '每获得 1 铲 +1VP；铲子升级便宜', en: '+1 VP per spade; cheap dig upgrades' },
    start: { coins: 15, workers: 3, p1: 3, p2: 9, cults: { earth: 1, air: 1 } },
    special: 'halflingSpadeVp',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 8, workers: 4 }, shGain: { spades: 3 }, incPW: [0, 2] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
    digUpgradeCost: { coins: 1, workers: 2, priests: 1 },
  },
  {
    id: 'engineers', terrain: 'mountain', color: '#6e7b8b',
    name: { zh: '工程师', en: 'Engineers' },
    desc: { zh: '造桥费 2 工人；建筑费低', en: 'Bridges cost 2 workers; cheap buildings' },
    start: { coins: 10, workers: 2, p1: 3, p2: 9, cults: {} },
    special: 'engineerBridge',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 1, workers: 1 }, incW: [0, 1, 2, 2, 3, 4, 4, 5, 6] },
      TP: { cost: { coins: 2, workers: 1 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 4, workers: 1 }, incP: [0, 1, 1, 2], incPW: [0, 0, 5, 5] },
      SH: { cost: { coins: 6, workers: 3 }, shAction: 'ACTE', incPW: [0, 2] },
      SA: { cost: { coins: 6, workers: 3 }, incP: [0, 1] },
    },
  },
  {
    id: 'cultists', terrain: 'plains', color: '#7a4a21',
    name: { zh: '邪教徒', en: 'Cultists' },
    desc: { zh: '对手吸你能量：接受你+1邪教，拒绝你+1魔', en: 'Leech from you: +1 cult (taken) / +1 PW (declined)' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { earth: 1, fire: 1 } },
    special: 'cultistLeech',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 8, workers: 4 }, shGain: { vp: 7 }, incPW: [0, 2] },
      SA: { cost: { coins: 8, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'alchemists', terrain: 'swamp', color: '#4a4a52',
    name: { zh: '炼金术士', en: 'Alchemists' },
    desc: { zh: '金币换 VP 2:1；SH 后每获得 1 铲 +2魔', en: 'Coins→VP 2:1; +2 PW per spade after SH' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { water: 1, fire: 1 } },
    special: 'alchemistVpRate',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 7, 11], incPW: [0, 1, 2, 3, 4] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shGain: { powerGain: 12 }, incC: [0, 6] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'darklings', terrain: 'swamp', color: '#2b2b33',
    name: { zh: '暗灵', en: 'Darklings' },
    desc: { zh: '1 祭司 = 1 铲 + 2VP', en: '1 priest = 1 spade + 2 VP' },
    start: { coins: 15, workers: 1, priests: 1, p1: 5, p2: 7, cults: { water: 1, earth: 1 } },
    special: 'darklingDig',
    noDigUpgrade: true, // 暗灵无铲子升级（jsnell dig max_level 0）
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shGain: { wToPriest: 3 }, incPW: [0, 2] },
      SA: { cost: { coins: 10, workers: 4 }, incP: [0, 2] },
    },
  },
  {
    id: 'mermaids', terrain: 'lakes', color: '#2f6fd4',
    name: { zh: '美人鱼', en: 'Mermaids' },
    desc: { zh: '船运开局 1 级；船运计入建镇连接', en: 'Start at shipping 1; shipping counts for towns' },
    start: { coins: 15, workers: 3, p1: 3, p2: 9, cults: { water: 2 } },
    special: 'shipTown',
    ship: { start: 1, max: 5, vp: [0, 2, 3, 4, 5] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shGain: { ship: 1 }, incPW: [0, 4] },
      SA: { cost: { coins: 8, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'swarmlings', terrain: 'lakes', color: '#5fa8dd',
    name: { zh: '蜂灵', en: 'Swarmlings' },
    desc: { zh: '建镇板块额外 +3 工人；SH 后免费升级 1 座建筑', en: '+3 workers per town; free upgrade after SH' },
    start: { coins: 20, workers: 8, p1: 3, p2: 9, cults: { fire: 1, earth: 1, water: 1, air: 1 } },
    special: 'swarmlingTownW',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 3, workers: 2 }, incW: [2, 3, 4, 5, 6, 7, 8, 9, 9] },
      TP: { cost: { coins: 4, workers: 3 }, incC: [0, 2, 4, 6, 9], incPW: [0, 2, 4, 6, 8] },
      TE: { cost: { coins: 6, workers: 3 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 8, workers: 5 }, shAction: 'ACTS', incPW: [0, 4] },
      SA: { cost: { coins: 8, workers: 5 }, incP: [0, 2] },
    },
  },
  {
    id: 'witches', terrain: 'forest', color: '#2e7d32',
    name: { zh: '女巫', en: 'Witches' },
    desc: { zh: '建镇板块额外 +5VP；SH 后可免费在森林放 1 民居', en: '+5 VP per town; free forest dwelling after SH' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { air: 2 } },
    special: 'witchesTownVp',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shAction: 'ACTW', incPW: [0, 2] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'auren', terrain: 'forest', color: '#4c9a4e',
    name: { zh: '奥灵', en: 'Auren' },
    desc: { zh: 'SH 后每轮可推进 2 格邪教并得 1 恩惠', en: 'After SH: 2 cult + favor each round' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { water: 1, air: 1 } },
    special: 'aurenCult',
    shGainFavor: true, // SH 建成时额外选 1 张恩惠（advance_gain GAIN_FAVOR 1）
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shAction: 'ACTA', incPW: [0, 2] },
      SA: { cost: { coins: 8, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'giants', terrain: 'wasteland', color: '#c62828',
    name: { zh: '巨人', en: 'Giants' },
    desc: { zh: '每 1 铲推进 2 步地形轮；SH 后免费 2 铲', en: 'Each spade moves 2 wheel steps; 2 free spades after SH' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { fire: 1, air: 1 } },
    special: 'giantDigDouble',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, shAction: 'ACTG', incPW: [0, 4] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'nomads', terrain: 'desert', color: '#d4a017',
    name: { zh: '游牧民', en: 'Nomads' },
    desc: { zh: 'SH 后免费挖 1 格并建民居（须邻接）', en: 'Free transform+build adjacent after SH' },
    start: { coins: 15, workers: 2, p1: 5, p2: 7, cults: { fire: 1, earth: 1 } },
    special: 'nomadSand',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 7, 11], incPW: [0, 1, 2, 3, 4] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 8, workers: 4 }, shAction: 'ACTN', incPW: [0, 2] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
  },
  {
    id: 'fakirs', terrain: 'desert', color: '#dcb43c',
    name: { zh: '苦行僧', en: 'Fakirs' },
    desc: { zh: '无船运；飞毯 1 祭司/级 → 4VP；SH 后距离 +1', en: 'No shipping; carpet flight 1 priest/level → 4 VP' },
    start: { coins: 15, workers: 3, p1: 7, p2: 5, cults: { fire: 1, air: 1 } },
    special: 'fakirCarpet',
    ship: null, // 无船运
    carpet: { cost: [1, 1], vp: [4, 4] }, // 每级 1 祭司 → 4VP；SH 后 range 1→2
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 10, workers: 4 }, shGain: { carpet: 1 }, incP: [0, 1] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
    digLevels: 1, // 仅 1 级费率可升级 1 次 [W3,W2]
  },
  {
    id: 'chaosmagicians', terrain: 'wasteland', color: '#e05680',
    name: { zh: '混沌法师', en: 'Chaos Magicians' },
    desc: { zh: '开局火 2；SH 后每轮可执行 2 个行动', en: 'Start fire 2; 2 actions per turn after SH' },
    start: { coins: 15, workers: 4, p1: 5, p2: 7, cults: { fire: 2 } },
    special: 'chaosDoubleAction',
    ship: { start: 0, max: 3, vp: [0, 2, 3, 4] },
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 2, 4, 6, 8], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3], teFavor: 2 },
      SH: { cost: { coins: 4, workers: 4 }, shAction: 'ACTC', incW: [0, 2] },
      SA: { cost: { coins: 8, workers: 4 }, incP: [0, 1], saFavor: 2 },
    },
  },
  {
    id: 'dwarves', terrain: 'mountain', color: '#8a8f98',
    name: { zh: '矮人', en: 'Dwarves' },
    desc: { zh: '无船运；隧道 W2（SH 后 W1）传送达 4VP', en: 'No shipping; tunnel W2 (W1 after SH) for 4 VP' },
    start: { coins: 15, workers: 3, p1: 5, p2: 7, cults: { earth: 2 } },
    special: 'dwarfTunnel',
    ship: null, // 无船运（jsnell ship max_level 0）
    buildings: {
      D: { cost: { coins: 2, workers: 1 }, incW: [1, 2, 3, 4, 5, 6, 7, 8, 8] },
      TP: { cost: { coins: 3, workers: 2 }, incC: [0, 3, 5, 7, 10], incPW: [0, 1, 2, 4, 6] },
      TE: { cost: { coins: 5, workers: 2 }, incP: [0, 1, 2, 3] },
      SH: { cost: { coins: 6, workers: 4 }, incPW: [0, 2] },
      SA: { cost: { coins: 6, workers: 4 }, incP: [0, 1] },
    },
  },
];

// FACTION_ICON 派系图标（选派系卡与玩家面板视觉锚点）
export const FACTION_ICON = {
  halflings: '🧝', engineers: '⚙️', cultists: '🕯️', alchemists: '⚗️', mermaids: '🧜',
  swarmlings: '🐝', witches: '🧙', auren: '🌿', giants: '🗿', nomads: '🐪', fakirs: '🪄',
  darklings: '🌑', chaosmagicians: '🔮', dwarves: '⛏️',
};

// factionById 按 id 取派系
export function factionById(id) {
  return FACTIONS.find((f) => f.id === id) || null;
}

// TERRAIN_NAMES 地形名（渲染用）
export const TERRAIN_NAMES = {
  plains: { zh: '平原', en: 'Plains' },
  swamp: { zh: '沼泽', en: 'Swamp' },
  lakes: { zh: '湖泊', en: 'Lakes' },
  forest: { zh: '森林', en: 'Forest' },
  mountain: { zh: '山地', en: 'Mountain' },
  wasteland: { zh: '荒地', en: 'Wasteland' },
  desert: { zh: '沙漠', en: 'Desert' },
  river: { zh: '河流', en: 'River' },
};
