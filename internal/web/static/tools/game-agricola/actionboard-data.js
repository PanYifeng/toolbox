// 农场主行动板数据：常驻空间 + 阶段空间（第 1-6 阶段 = 轮次 1/5/8/10/12/14 起）。
// ⚠ 记忆重建数据，标「待核对」处均为近似：官方 2 人板更小（本实现 2-5 人共用 20 格全开）；
// 官方资源格是否累积与累积速率以实体板为准（本实现：木固定 3，黏土/芦苇/石头/食物/动物累积 +1/轮）。

// RES_KEYS 资源键（食物/谷物/蔬菜/木/黏土/芦苇/石 + 三牲畜）
export const RES_KEYS = ['food', 'grain', 'veg', 'wood', 'clay', 'reed', 'stone', 'sheep', 'boar', 'cattle'];

// RES_INFO 资源显示信息（emoji + 双语名），引擎日志与 UI 共用
export const RES_INFO = {
  food: { zh: '食物', en: 'Food', emoji: '🍞' },
  grain: { zh: '谷物', en: 'Grain', emoji: '🌾' },
  veg: { zh: '蔬菜', en: 'Vegetable', emoji: '🥬' },
  wood: { zh: '木材', en: 'Wood', emoji: '🪵' },
  clay: { zh: '黏土', en: 'Clay', emoji: '🧱' },
  reed: { zh: '芦苇', en: 'Reed', emoji: '🎋' },
  stone: { zh: '石头', en: 'Stone', emoji: '🪨' },
  sheep: { zh: '羊', en: 'Sheep', emoji: '🐑' },
  boar: { zh: '野猪', en: 'Boar', emoji: '🐗' },
  cattle: { zh: '牛', en: 'Cattle', emoji: '🐄' },
};

// ANIMAL_KEYS 牲畜键（烹食/繁殖/栏位语义专用）
export const ANIMAL_KEYS = ['sheep', 'boar', 'cattle'];

// MAT_NAMES 房屋材质显示名与翻新链（wood→clay→stone）
export const MAT_NAMES = {
  wood: { zh: '木', en: 'wood' },
  clay: { zh: '黏土', en: 'clay' },
  stone: { zh: '石', en: 'stone' },
};
export const RENOV_CHAIN = { wood: 'clay', clay: 'stone' };

// HARVEST_ROUNDS 收获轮（阶段边界后）
export const HARVEST_ROUNDS = [4, 7, 9, 11, 13, 14];
export const TOTAL_ROUNDS = 14;

// SPACES 行动板：id / stage(0=常驻) / zh,en 名称 / kind / fixed 或 acc（累积初始量）
// kind 语义：
//   takeResource — 拿取（fixed 每轮重置；acc 未被拿则 +1/轮）
//   build / plow / sow / fence / growth / growth2 / renov / start / occ / minor — 专长动作（子阶段展开）
export const SPACES = [
  { id: 'build', stage: 0, kind: 'build', name: { zh: '建房与马厩', en: 'Build Rooms / Stables' } },
  { id: 'start', stage: 0, kind: 'start', name: { zh: '抢先手', en: 'Starting Player' }, acc: { food: 1 } },
  { id: 'grain', stage: 0, kind: 'takeResource', name: { zh: '拿 1 谷物', en: 'Take 1 Grain' }, fixed: { grain: 1 } },
  { id: 'laborer', stage: 0, kind: 'takeResource', name: { zh: '雇工', en: 'Day Laborer' }, fixed: { food: 2 } },
  { id: 'fishing', stage: 0, kind: 'takeResource', name: { zh: '钓鱼', en: 'Fishing' }, acc: { food: 1 } },
  { id: 'plow', stage: 0, kind: 'plow', name: { zh: '犁 1 田', en: 'Plow 1 Field' } },
  { id: 'wood', stage: 0, kind: 'takeResource', name: { zh: '拿 3 木', en: 'Take 3 Wood' }, fixed: { wood: 3 } },
  { id: 'clay', stage: 0, kind: 'takeResource', name: { zh: '采黏土', en: 'Take Clay' }, acc: { clay: 1 } },
  { id: 'reed', stage: 0, kind: 'takeResource', name: { zh: '割芦苇', en: 'Take Reed' }, acc: { reed: 1 } },
  { id: 'occ', stage: 0, kind: 'occ', name: { zh: '打出职业', en: 'Play Occupation' } },
  { id: 'minor', stage: 0, kind: 'minor', name: { zh: '打出小改进', en: 'Play Minor Improvement' } },
  { id: 'sow', stage: 1, kind: 'sow', name: { zh: '播种 / 烤面包', en: 'Sow / Bake Bread' } },
  { id: 'sheep', stage: 1, kind: 'takeResource', name: { zh: '绵羊', en: 'Sheep' }, acc: { sheep: 1 } },
  { id: 'growth', stage: 2, kind: 'growth', name: { zh: '家庭成长', en: 'Family Growth' } },
  { id: 'renov', stage: 2, kind: 'renov', name: { zh: '翻新（可购大设施）', en: 'Renovation (± Major)' } },
  { id: 'stone', stage: 2, kind: 'takeResource', name: { zh: '石场', en: 'Stone Pit' }, acc: { stone: 1 } },
  { id: 'boar', stage: 3, kind: 'takeResource', name: { zh: '野猪', en: 'Wild Boar' }, acc: { boar: 1 } },
  { id: 'veg', stage: 3, kind: 'takeResource', name: { zh: '拿 1 蔬菜', en: 'Take 1 Vegetable' }, fixed: { veg: 1 } },
  { id: 'fence', stage: 3, kind: 'fence', name: { zh: '围栏', en: 'Fencing' } },
  { id: 'cattle', stage: 4, kind: 'takeResource', name: { zh: '牛', en: 'Cattle' }, acc: { cattle: 1 } },
  { id: 'stone2', stage: 4, kind: 'takeResource', name: { zh: '采石场', en: 'Quarry' }, acc: { stone: 1 } },
  { id: 'plowsow', stage: 5, kind: 'plowsow', name: { zh: '犁田并播种', en: 'Plow and Sow' } },
  { id: 'growth2', stage: 6, kind: 'growth2', name: { zh: '家庭成长（无需空房）', en: 'Family Growth (no room)' } },
  // 多人追加格（官方多人板更大，本实现以追加格近似）：4+ 人第二雇工、5 人第二伐木
  { id: 'laborer2', stage: 0, kind: 'takeResource', name: { zh: '雇工（二）', en: 'Day Laborer II' }, fixed: { food: 2 }, minPlayers: 4 },
  { id: 'wood2', stage: 0, kind: 'takeResource', name: { zh: '拿 3 木（二）', en: 'Take 3 Wood II' }, fixed: { wood: 3 }, minPlayers: 5 },
];

// spaceById 空间反查
export const SPACE_BY_ID = Object.fromEntries(SPACES.map((x) => [x.id, x]));

// STAGE_ROUND 阶段起始轮次
export const STAGE_ROUND = [1, 1, 5, 8, 10, 12, 14];

// spaceUnlocked 空间在某轮是否已开放
export function spaceUnlocked(sp, round) {
  return STAGE_ROUND[sp.stage] <= round;
}

// playerOk 空间是否对当前人数开放（多人追加格）
export function playerOk(sp, playerCount) {
  return !sp.minPlayers || playerCount >= sp.minPlayers;
}

// visibleSpaces 某轮对给定人数可见的空间列表（缺省按 2 人板）
export function visibleSpaces(round, playerCount = 2) {
  return SPACES.filter((sp) => spaceUnlocked(sp, round) && playerOk(sp, playerCount));
}

// —— 建造费用表（待核对：房 5 材料 + 2 芦苇；翻新 1 芦苇 + 1 新材料/房；马厩 1 木；围栏 1 木/段）——
export const COST = {
  roomWood: { wood: 5, reed: 2 },
  roomClay: { clay: 5, reed: 2 },
  roomStone: { stone: 5, reed: 2 },
  renov: { reed: 1 }, // + 1×新材料/房（wood→clay→stone 链）
  stable: { wood: 1 },
  fence: { wood: 1 },
};

// —— 终局计分表（家族版口径，待核对）——
// 表长 6/7：索引 = 拥有量（超出取末位）
export const SCORE_FIELDS = [-1, 1, 1, 2, 3, 4];        // 田
export const SCORE_PASTURES = [-1, 1, 1, 2, 3, 4];     // 牧场（独立围栏区数）
export const SCORE_GRAIN = [-1, 1, 1, 2, 3, 4, 4];     // 谷物（收获后存量）
export const SCORE_VEG = [-1, 1, 2, 3, 4, 4];          // 蔬菜
export const SCORE_ANIMAL = [-1, 1, 2, 3, 4];          // 每种牲畜
export const SCORE_FAMILY = 3;                         // 每家庭成员 3 分
export const SCORE_ROOM_CLAY = 1;                      // 黏土房 1 分/间
export const SCORE_ROOM_STONE = 2;                     // 石房 2 分/间
export const SCORE_STABLE_FENCED = 1;                  // 牧场内马厩 1 分/个
export const SCORE_UNUSED = -1;                        // 未用空地 -1/格
export const SCORE_BEGGAR = -3;                        // 乞讨卡 -3/张
export const FARM_COLS = 5;                            // 农场 5×3 = 15 格
export const FARM_ROWS = 3;
export const FARM_SPACES = 15;
export const START_ROOMS = [5, 6];                     // 初始 2 间木房（第 2 行前两格）
