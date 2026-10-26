// 神秘大地派系表：11 派系（官方 14 派系中记忆可靠的部分，明确缩减并声明）。
// 家园地形已按 jsnell/terra-mystica 官方派系色核对（2026-10-26）；
// 专长实现仍为记忆重建（官方获取途径如「开放行动」在此简化为主行动），存疑项标「? 待核对」。

// special 钩子名（engine.js 分发）：
//   digCoin    每挖 1 铲得 1 金币（innate）
//   digDouble  每 1 铲推进 2 步地形轮（innate）
//   coinSpade  铲可按 1 金币/铲支付替代工人（innate）
//   homeWorker 在家园地形上免挖建民居得 1 工人（innate）
//   range3     民居建造距离 3（飞毯，innate）
//   shipTown   船运计入建镇连接（innate）
//   witchDwelling   升级后可免费在任意空森林格放 1 民居（需 SH）
//   cultBuild       每次建/升级后邪教推进 1（需 SH）
//   leechWorker     他人从你的建筑吸能时你得 1 工人（需 SH）
//   cheapBridge     造桥费用改为 2 工人（innate，官方 ACTE 开放行动的简化）
//   chaosCult       动作：付 1 祭司任一轨迹推进 2，每轮 1 次（需 SH）

export const FACTIONS = [
  {
    id: 'halflings', terrain: 'plains', special: 'digCoin', shAbility: false,
    name: { zh: '半身人', en: 'Halflings' },
    desc: { zh: '每挖 1 铲获得 1 金币', en: 'Gain 1 coin per spade dug' },
  },
  {
    id: 'engineers', terrain: 'mountain', special: 'cheapBridge', shAbility: false,
    name: { zh: '工程师', en: 'Engineers' },
    desc: { zh: '造桥仅费 2 工人', en: 'Bridges cost only 2 workers' },
  },
  {
    id: 'cultists', terrain: 'plains', special: 'cultBuild', shAbility: true,
    name: { zh: '邪教徒', en: 'Cultists' },
    desc: { zh: '要塞后：每次建造/升级邪教推进 1', en: 'After SH: +1 cult on each build' },
  },
  {
    id: 'alchemists', terrain: 'swamp', special: 'coinSpade', shAbility: false,
    name: { zh: '炼金术士', en: 'Alchemists' },
    desc: { zh: '铲可按 1 金币/铲支付', en: 'Pay 1 coin per spade instead of workers' },
  },
  {
    id: 'mermaids', terrain: 'lakes', special: 'shipTown', shAbility: false,
    name: { zh: '美人鱼', en: 'Mermaids' },
    desc: { zh: '船运计入建镇连接', en: 'Shipping counts for town connection' },
  },
  {
    id: 'swarmlings', terrain: 'lakes', special: 'leechWorker', shAbility: true,
    name: { zh: '蜂灵', en: 'Swarmlings' },
    desc: { zh: '要塞后：他人吸你建筑能量时你得 1 工人', en: 'After SH: +1 worker when leeched' },
  },
  {
    id: 'witches', terrain: 'forest', special: 'witchDwelling', shAbility: true,
    name: { zh: '女巫', en: 'Witches' },
    desc: { zh: '要塞后：升级后可免费在空森林格放民居', en: 'After SH: free dwelling on forest after upgrade' },
  },
  {
    id: 'giants', terrain: 'wasteland', special: 'digDouble', shAbility: false,
    name: { zh: '巨人', en: 'Giants' },
    desc: { zh: '每 1 铲推进 2 步地形轮', en: 'Each spade moves 2 steps on terrain wheel' },
  },
  {
    id: 'nomads', terrain: 'desert', special: 'homeWorker', shAbility: false,
    name: { zh: '游牧民', en: 'Nomads' },
    desc: { zh: '免挖建民居于家园地形得 1 工人', en: '+1 worker when building without digging' },
  },
  {
    id: 'fakirs', terrain: 'desert', special: 'range3', shAbility: false,
    name: { zh: '苦行僧', en: 'Fakirs' },
    desc: { zh: '民居建造距离 3（飞毯）', en: 'Dwelling range 3 (carpet flight)' },
  },
  {
    id: 'chaosmagicians', terrain: 'wasteland', special: 'chaosCult', shAbility: true,
    name: { zh: '混沌法师', en: 'Chaos Magicians' },
    desc: { zh: '要塞后：付 1 祭司任一轨迹推进 2（每轮 1 次）', en: 'After SH: 1 priest = +2 cult, once per round' },
  },
];

// FACTION_ICON 派系图标（选派系卡与玩家面板视觉锚点）
export const FACTION_ICON = {
  halflings: '🧝', engineers: '⚙️', cultists: '🕯️', alchemists: '⚗️', mermaids: '🧜',
  swarmlings: '🐝', witches: '🧙', giants: '🗿', nomads: '🐪', fakirs: '🪄',
  chaosmagicians: '🔮',
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
