// 神秘大地数值表：建筑/能量动作/奖励/恩惠/回合计分板块/邪教轨/费用。
// 数据来源：github.com/jsnell/terra-mystica（官方规则参照实现）逐文件核对，2026-10-31。
// Constants.pm %actions/%tiles/%final_scoring/%vp_setups、buildings.pm、cults.pm、
// commands.pm（conversions/dig/shipping）、income.pm、scoring.pm、towns.pm。

// —— 地形轮盘（挖地距离 = 环上双向最短步数，1-3 步）——
// jsnell @colors = yellow brown black blue green gray red
//   → 沙漠→平原→沼泽→湖泊→森林→山地→荒地（与本表同环，已核对）
export const WHEEL = ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert'];

// wheelDist 地形轮盘距离（挖到家园地形所需步数）
export function wheelDist(a, b) {
  const ia = WHEEL.indexOf(a);
  const ib = WHEEL.indexOf(b);
  const d = Math.abs(ia - ib);
  return Math.min(d, WHEEL.length - d);
}

// —— 铲子费用（按挖掘等级，jsnell dig track advance_cost）——
// 官方：1 级 3 工人/铲，升级 1 级后 2 工人/铲，2 级后 1 工人/铲
// 挖掘升级行动：cost {W:2, C:5, P:1} → 下一级 +6VP，最多 2 次升级
// 半身人（Halflings）：升级费用 {W:2, C:1, P:1}
// 苦行僧（Fakirs）：费率 [W3, W2]（无船运，升级仅 1 次格 = 0 次升级则简化为不适用）
export const SPADE_COST = [3, 2, 1];
export const DIG_UPGRADE_COST = { coins: 5, workers: 2, priests: 1 };
export const DIG_UPGRADE_VP = 6;
export const DIG_UPGRADE_MAX = 2;

// —— 建筑强度（jsnell %building_strength：D1/TP2/TE2/SH3/SA3，吸能与建镇同值）——
export const BUILDING_STRENGTH = { D: 1, TP: 2, TE: 2, SH: 3, SA: 3 };
// —— 建筑上限（jsnell max_level：D8/TP4/TE3/SH1/SA1）——
export const BLD_CAP = { D: 8, TP: 4, TE: 3, SH: 1, SA: 1 };
// —— 建筑名（日志/渲染用）——
export const BUILDING_NAMES = {
  D: { zh: '民居', en: 'Dwelling' },
  TP: { zh: '交易站', en: 'Trading Post' },
  TE: { zh: '神殿', en: 'Temple' },
  SH: { zh: '要塞', en: 'Stronghold' },
  SA: { zh: '圣所', en: 'Sanctuary' },
};

// —— 建筑费用与收入（jsnell Factions.pm 标准派系模板 C15/W3/P1:5/P2:7，
//   标准费用 D{W1,C2} TP{W2,C3} TE{W2,C5} SH{W4,C6} SA{W4,C6}；
//   派系偏差在 data-factions.js per-faction 覆写；收入为按已建成数量的数组）——
export const BUILDING_COST = {
  D: { coins: 2, workers: 1 },
  TP: { coins: 3, workers: 2 },   // 邻接他人建筑时；远程 {C:6, W:2}（C2+4）
  TP_REMOTE_EXTRA: 4,
  TE: { coins: 5, workers: 2 },
  SH: { coins: 6, workers: 4 },
  SA: { coins: 6, workers: 4 },
};

// —— 能量行动（官方 6 槽 ACT1-6，每轮刷新，先占先得，一次性占用；jsnell %actions）——
export const POWER_ACTIONS = [
  { id: 'ACT1', power: 3, gain: { bridges: 1 } },
  { id: 'ACT2', power: 3, gain: { priests: 1 } },
  { id: 'ACT3', power: 4, gain: { workers: 2 } },
  { id: 'ACT4', power: 4, gain: { coins: 7 } },
  { id: 'ACT5', power: 4, gain: { spades: 1 } },
  { id: 'ACT6', power: 6, gain: { spades: 2 } },
];

// —— 奖励板块 BON1-10（jsnell %tiles；开局发 1 张，pass 后可换；每轮收入 + 过牌 VP）——
// passVP 为过牌时的 VP 奖励：SA/SH=4；TP 梯 [0,2,4,6,8]；D 梯 [0..8]；船梯 [0,3,6,9,12,15]
// BON10 为 shipping-bonus 选项扩展，默认不入池（jsnell 'shipping-bonus' option gate）
export const BONUS_TILES = [
  { id: 'BON1', income: { coins: 2 }, freeAction: 'spade' },
  { id: 'BON2', income: { coins: 4 }, freeAction: 'cult' },
  { id: 'BON3', income: { coins: 6 } },
  { id: 'BON4', income: { powerGain: 3 }, freeAction: 'ship' },
  { id: 'BON5', income: { powerGain: 3, workers: 1 } },
  { id: 'BON6', income: { workers: 2 }, passVP: { SH: 4, SA: 4 } },
  { id: 'BON7', income: { workers: 1 }, passVP: { TP: [0, 2, 4, 6, 8] } },
  { id: 'BON8', income: { priests: 1 } },
  { id: 'BON9', income: { coins: 2 }, passVP: { D: [0, 1, 2, 3, 4, 5, 6, 7, 8] } },
  { id: 'BON10', income: { powerGain: 3 }, passVP: { ship: [0, 3, 6, 9, 12, 15] }, optional: true },
];
// BONUS_TOWN_KEEP 开局奖励板块保留数 = 玩家数 + 3（官方规则，jsnell 随机移除至该数）
export function BONUS_TOWN_KEEP(n) { return n + 3; }

// —— 恩惠板块 FAV1-12（jsnell %tiles；建 TE/SA 时选 1 张；同名限 1 张）——
// advance: 即时邪教推进；income: 每轮收入；vp: 每建 1 座该建筑得 VP；passVP: 过牌 VP（FAV12 TP 梯）
// count: 池中张数（Constants.pm：FAV1-4 各 1 张、FAV5-12 各 3 张），每玩家同名限 1 张
export const FAVOR_TILES = [
  { id: 'FAV1', advance: { fire: 3 }, count: 1 },
  { id: 'FAV2', advance: { water: 3 }, count: 1 },
  { id: 'FAV3', advance: { earth: 3 }, count: 1 },
  { id: 'FAV4', advance: { air: 3 }, count: 1 },
  { id: 'FAV5', advance: { fire: 2 }, townSizeMinus: 1 },
  { id: 'FAV6', advance: { water: 2 }, freeAction: 'cult' },
  { id: 'FAV7', advance: { earth: 2 }, income: { workers: 1, powerGain: 1 } },
  { id: 'FAV8', advance: { air: 2 }, income: { powerGain: 4 } },
  { id: 'FAV9', advance: { fire: 1 }, income: { coins: 3 } },
  { id: 'FAV10', advance: { water: 1 }, vp: { TP: 3 } },
  { id: 'FAV11', advance: { earth: 1 }, vp: { D: 2 } },
  { id: 'FAV12', advance: { air: 1 }, passVP: { TP: [0, 2, 3, 3, 4] } },
];

// —— 回合计分板块 SCORE1-8（jsnell %tiles；每局从 8 张洗出 6 张按序使用）——
// 官方回合板块 = 计分板块：vp = 本轮满足条件得 VP（build 模式 = 本轮建/升级该建筑时；
//   gain 模式 = 本轮获得该资源时）；cult/req = 对应邪教轨每 req 格 → income 1 份
//   （收入 = income × int(cult/req)，jsnell income.pm）；第 6 轮无计分块收入
export const ROUND_TILES = [
  { id: 'SCORE1', vp: { spade: 2 }, vpMode: 'gain', cult: 'earth', req: 1, income: { coins: 1 } },
  { id: 'SCORE2', vp: { town: 5 }, vpMode: 'gain', cult: 'earth', req: 4, income: { spades: 1 } },
  { id: 'SCORE3', vp: { D: 2 }, vpMode: 'build', cult: 'water', req: 4, income: { priests: 1 } },
  { id: 'SCORE4', vp: { SH: 5, SA: 5 }, vpMode: 'build', cult: 'fire', req: 2, income: { workers: 1 } },
  { id: 'SCORE5', vp: { D: 2 }, vpMode: 'build', cult: 'fire', req: 4, income: { powerGain: 4 } },
  { id: 'SCORE6', vp: { TP: 3 }, vpMode: 'build', cult: 'water', req: 4, income: { spades: 1 } },
  { id: 'SCORE7', vp: { SH: 5, SA: 5 }, vpMode: 'build', cult: 'air', req: 2, income: { workers: 1 } },
  { id: 'SCORE8', vp: { TP: 3 }, vpMode: 'build', cult: 'air', req: 4, income: { spades: 1 } },
];
export const ROUNDS = 6;

// —— 邪教轨（4 条，各 10 格；jsnell cults.pm）——
// 发祭司：每轨 4 槽位 +3/+2/+2/+2（槽被占即从面板移除），祭司锁死到终局
// 跨格奖励（maybe_gain_power_from_cult）：跨 2 → +1魔；跨 4 → +2魔；跨 6 → +2魔；
//   跨 9 → 需 1 钥匙（KEY，建镇板块附赠）+3魔，且其他玩家 MAX 该轨 = 9（封锁 10 格）；
//   退回 9 以下时钥匙退还。第 10 格为最高格。
export const CULT_TRACKS = ['fire', 'water', 'earth', 'air'];
export const CULT_TOP = 10;
export const PRIEST_CULT_SPOTS = [3, 2, 2, 2]; // 每轨 4 槽位的推进量
export const PRIEST_SEND_CAP = 7;             // 祭司在场+锁定+上轨总上限
// cultCrossReward: 跨过 pos 格时获得的魔力数（0 = 无奖励格）
export const CULT_CROSS_REWARD = { 2: 1, 4: 2, 6: 2, 9: 3 };
// 终局轨迹名次分（jsnell final_scoring cults [8,4,2]）
export const CULT_RANK_VP = [8, 4, 2];
// 终局最大网络分（jsnell final_scoring network [18,12,6]）
export const NETWORK_RANK_VP = [18, 12, 6];

// —— 城镇板块 TW1-5（jsnell %tiles；建镇时选 1 张，先建先选）——
// 每张含 KEY（钥匙，过邪教 9 格必需）；townSizeMinus: FAV5 持有者建镇规模 -1
export const TOWN_TILES = [
  { id: 'TW1', vp: 5, gain: { coins: 6, keys: 1 } },
  { id: 'TW2', vp: 7, gain: { workers: 2, keys: 1 } },
  { id: 'TW3', vp: 9, gain: { priests: 1, keys: 1 } },
  { id: 'TW4', vp: 6, gain: { powerGain: 8, keys: 1 } },
  { id: 'TW5', vp: 8, gain: { fire: 1, water: 1, earth: 1, air: 1, keys: 1 } },
];
export const TOWN_THRESHOLD = 7;     // 相邻建筑群城镇值门槛（官方 TOWN_SIZE，已核对）
export const TOWN_MIN_BUILDINGS = 4; // 建镇最少建筑数，SA 双计（官方，已核对）

// —— 资源转换（jsnell Factions.pm base_exchange_rates；任意自己回合可做，不占行动）——
// PW→{C:1, W:3, P:5}；W→C 1:1；P→{C:1, W:1}；C→VP 3:1（炼金术士 2:1）。
// 语义：获得 1 单位 to 需付出 rate 单位 from。
export const CONVERT_RATES = {
  powerToCoin: 1,
  powerToWorker: 3,
  powerToPriest: 5,
  workerToCoin: 1,
  priestToCoin: 1,
  priestToWorker: 1,
  coinsToVp: 3,
  alchemistCoinsToVp: 2,
};

// —— 船运（jsnell：advance_cost {C:4, P:1}，+VP [2,3,4]，上限 3；
//   美人鱼开局 1 级，上限 5，收益 [0,2,3,4,5]；苦行僧无船运）——
export const SHIPPING_COST = { coins: 4, priests: 1 };
export const SHIPPING_MAX = 3;
export const SHIPPING_VP = [2, 3, 4];
export const BRIDGE_COST = { coins: 2, priests: 1 }; // 造桥（工程师 2 工人）
export const BRIDGE_MAX = 3;                         // 每派系桥上限（官方 BRIDGE_COUNT，已核对）

// —— 吸能（官方）：实际获得 = min(相邻他方建筑强度和, P1×2 + P2)；
//   接受付 VP = 获得量 − 1（可为 0）；可拒绝。邪教徒特例见 engine ——
export const LEECH_MIN_VP = 1;

// —— 起始 VP（jsnell %vp_setups original_2017；auren=27，缺漏已补）——
export const FACTION_START_VP = {
  darklings: 15, cultists: 16, engineers: 16, chaosmagicians: 19, mermaids: 19,
  nomads: 19, witches: 19, dwarves: 20, halflings: 20, swarmlings: 22, giants: 25,
  alchemists: 27, auren: 27, fakirs: 33,
};
// —— 标准起始资源（派系偏差在 data-factions.js 覆写）——
// 官方起始祭司：标准派系手牌 0、暗灵 1（Factions.pm P ||= 0 / Darklings P=1）
export const START = { coins: 15, workers: 3, priests: 0 };
// 祭司总上限（在场+锁定+上轨，jsnell MAX_P）
export const PRIEST_CAP = 7;

export const RES_ORDER = ['coins', 'workers', 'priests'];
