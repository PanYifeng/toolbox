// 神秘大地数值表：建筑/能量动作/恩惠/奖励/回合板块/邪教轨/费用。
// ⚠ 诚实声明：除已注明官方核对的条目外，其余数值为对官方规则的记忆重建，
// 存疑项一律标注「? 待核对」。地图与派系地形见同目录其他文件。

// —— 地形轮盘（挖地距离 = 环上双向最短步数，1-3 步）——
// 已按官方核对（jsnell @colors = yellow brown black blue green gray red，
// 即沙漠→平原→沼泽→湖泊→森林→山地→荒地，与本表同环）：2026-10-26
export const WHEEL = ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert'];

// wheelDist 地形轮盘距离（挖到家园地形所需步数）
export function wheelDist(a, b) {
  const ia = WHEEL.indexOf(a);
  const ib = WHEEL.indexOf(b);
  const d = Math.abs(ia - ib);
  return Math.min(d, WHEEL.length - d);
}

// —— 建筑 ——
// power/town 已按官方核对（jsnell Constants.pm %building_strength：D1/TP2/TE2/SH3/SA3，
// 吸能与建镇同值；建镇另需 ≥4 座建筑、SA 双计，见 TOWN_MIN_BUILDINGS）：2026-10-26
// cost/income 仍为记忆重建（? 待核对）
// income: 每轮收入；power: 他人在旁建筑时可吸取的能量值；town: 建镇计分值
export const BUILDINGS = {
  D: { cost: { coins: 2, workers: 1 }, income: { workers: 1 }, power: 1, town: 1 },
  TP: { cost: { coins: 2, workers: 1 }, income: { coins: 2 }, power: 2, town: 2 },   // 本地（邻他人建筑）
  TP2: { cost: { coins: 6, workers: 1 }, income: { coins: 4 }, power: 2, town: 2 },  // 远程（无邻）
  TE: { cost: { coins: 6, workers: 2 }, income: { priests: 1 }, power: 2, town: 2 },
  SH: { cost: { coins: 6, workers: 4 }, income: {}, power: 3, town: 3 },
  SA: { cost: { coins: 8, workers: 4 }, income: { priests: 1 }, power: 3, town: 3 },
};
export const UPGRADE_CHAIN = { D: ['TP', 'SH'], TP: ['TE'], TE: ['SA'], SH: [], SA: [] };

// —— 能量动作（每轮刷新，先到先得；power = 支付的三碗能量数）——
// ? 待核对：8 槽内容与价格为记忆重建
export const POWER_ACTIONS = [
  { power: 4, gain: { priests: 1 } },
  { power: 4, gain: { priests: 1 } },
  { power: 4, gain: { workers: 2 } },
  { power: 5, gain: { spades: 1 } },
  { power: 5, gain: { spades: 1 } },
  { power: 6, gain: { coins: 3 } },
  { power: 6, gain: { workers: 1 } },
  { power: 7, gain: { coins: 4 } },
];

// —— 奖励板块（开局随机发 + pass 时可换；每轮收入）——
// ? 待核对：板块种类与收入为记忆重建
export const BONUS_TILES = [
  { id: 0, income: { workers: 1, coins: 4 } },
  { id: 1, income: { workers: 2, coins: 2 } },
  { id: 2, income: { priests: 1, coins: 1 } },
  { id: 3, income: { coins: 5 } },
  { id: 4, income: { workers: 1, powerGain: 2 } },
  { id: 5, income: { workers: 1, coins: 2 } },
];

// —— 恩惠板块（建 TE/SA 时选 1 张；建镇外主要 cult 来源）——
// 每张：即时 advance 步数 + 每轮收入；同名板块不可重复持有
// ? 待核对：12 张内容为记忆重建（结构近似：每轨迹 × 三档收入）
export const FAVOR_TILES = [];
for (const track of ['fire', 'water', 'earth', 'air']) {
  FAVOR_TILES.push({ id: `${track}w`, track, advance: 2, income: { workers: 1 } });
  FAVOR_TILES.push({ id: `${track}c`, track, advance: 2, income: { coins: 2 } });
  FAVOR_TILES.push({ id: `${track}p`, track, advance: 2, income: { powerGain: 1 } });
}

// —— 回合板块（每局从 8 张洗出 6 张按序使用）——
// income: 收入阶段全员补给；cultEnd: 回合末邪教推进（choice = 任选轨迹）
// ? 待核对：8 张内容为记忆重建
export const ROUND_TILES = [
  { id: 0, income: { workers: 1 }, cultEnd: 'fire' },
  { id: 1, income: { coins: 1 }, cultEnd: 'water' },
  { id: 2, income: { workers: 1 }, cultEnd: 'earth' },
  { id: 3, income: { coins: 1 }, cultEnd: 'air' },
  { id: 4, income: { powerGain: 1 }, cultEnd: 'choice' },
  { id: 5, income: { workers: 1, coins: 1 }, cultEnd: 'fire' },
  { id: 6, income: { powerGain: 1 }, cultEnd: 'choice' },
  { id: 7, income: { coins: 2 }, cultEnd: 'water' },
];
export const ROUNDS = 6;

// —— 邪教轨（4 条，各 10 格；发祭司 = 前进 1 格且祭司锁死到终局）——
// 空格奖励：奇数格 +1 金币 / 偶数格 +1 工人 / 第 10 格 +2 能量推进（? 待核对）
export const CULT_TRACKS = ['fire', 'water', 'earth', 'air'];
export const CULT_TOP = 10;
export function cultSpaceReward(pos) {
  if (pos === CULT_TOP) return { powerGain: 2 };
  return pos % 2 === 0 ? { workers: 1 } : { coins: 1 };
}
// 终局轨迹名次分（标准竞赛排名 1/1/3；? 待核对：8/4/2 为记忆值）
export const CULT_RANK_VP = [8, 4, 2];

// —— 通用费用 ——
export const SPADE_WORKERS = 2;      // 每 1 铲工人费用（? 待核对）
export const SHIPPING_COST = { coins: 4, priests: 1 }; // 船运 +1（上限 3）
export const SHIPPING_MAX = 3;
export const BRIDGE_COST = { coins: 2, priests: 1 };   // 造桥（工程师 2 工人）
export const BRIDGE_MAX = 3;         // 每派系桥上限（官方 BRIDGE_COUNT，已核对）
export const TOWN_VP = 5;            // 建镇即时 VP（? 待核对）
export const TOWN_THRESHOLD = 7;     // 相邻建筑群城镇值门槛（官方 TOWN_SIZE，已核对）
export const TOWN_MIN_BUILDINGS = 4; // 建镇最少建筑数，SA 双计（官方，已核对）
export const PRIEST_CAP = 5;         // 祭司总数上限（在场+锁定）
export const START = { coins: 20, workers: 3, priests: 5, vp: 20, power: { i: 4, ii: 8, iii: 0 } }; // ? 待核对

export const RES_ORDER = ['coins', 'workers', 'priests'];
