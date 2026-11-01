// 农场主 10 大设施。✅ 2026-11 对照官方 revised edition 规则书 p10 + 附录第 3 节核对：
//   壁炉 2 份（2 黏土 / 3 黏土）、灶台 2 份（4 黏土 / 5 黏土，可退还壁炉原价升级）；
//   烹食汇率：壁炉 羊2/猪2/牛3/菜2、灶台 羊2/猪3/牛4/菜3（灶台除羊外各 +1）；
//   烤面包：壁炉 1 谷→2 食、灶台 1 谷→3 食（任意时刻烤，烤炉仅 Grain Utilization/sow 格烤）；
//   黏土烤炉 3 黏土+1 石（1 谷→5 食，单次 1 谷，建成立即烤 1 次）；石烤炉 1 黏土+3 石（至多 2 谷、各 4 食，建成立即烤）；
//   手工作坊组：木工坊/陶坊 2 石+2 木/2 黏土、编篮坊 2 石+2 芦苇；每次收获 1 木/黏土→2 食、1 芦苇→3 食；
//   终局基础分 2 + 资源加成（木工坊/陶坊 3-4/5-6/7+ → 1/2/3；编篮坊 2-3/4/5+ 芦苇 → 1/2/3）；
//   水井 3 石+1 木，建成起 5 轮每轮 +1 食，终局 4 分。

// MAJORS 大设施列表（copies>1 = 全局多份；cook 键 = 1 单位 → N 食物）
export const MAJORS = [
  {
    id: 'fireplace1', name: { zh: '壁炉（2 黏土）', en: 'Fireplace (2 clay)' }, cost: { clay: 2 },
    cook: { sheep: 2, boar: 2, cattle: 3, veg: 2, grain: 2 }, vp: 1, copies: 2,
    desc: { zh: '烹食：羊2/猪2/牛3/菜2；烤面包 1 谷→2 食；终局 1 分', en: 'Cook: sheep 2 / boar 2 / cattle 3 / veg 2; bake 1 grain → 2 food; 1 VP' },
  },
  {
    id: 'fireplace2', name: { zh: '壁炉（3 黏土）', en: 'Fireplace (3 clay)' }, cost: { clay: 3 },
    cook: { sheep: 2, boar: 2, cattle: 3, veg: 2, grain: 2 }, vp: 1,
    desc: { zh: '烹食：羊2/猪2/牛3/菜2；烤面包 1 谷→2 食；终局 1 分', en: 'Cook: sheep 2 / boar 2 / cattle 3 / veg 2; bake 1 grain → 2 food; 1 VP' },
  },
  {
    id: 'hearth1', name: { zh: '灶台（4 黏土）', en: 'Cooking Hearth (4 clay)' }, cost: { clay: 4 },
    cook: { sheep: 2, boar: 3, cattle: 4, veg: 3, grain: 3 }, vp: 1, upgradeOf: 'fireplace',
    desc: { zh: '烹食：羊2/猪3/牛4/菜3；烤面包 1 谷→3 食；可退壁炉免费换购；终局 1 分', en: 'Cook: sheep 2 / boar 3 / cattle 4 / veg 3; bake 1 grain → 3 food; may trade in a Fireplace; 1 VP' },
  },
  {
    id: 'hearth2', name: { zh: '灶台（5 黏土）', en: 'Cooking Hearth (5 clay)' }, cost: { clay: 5 },
    cook: { sheep: 2, boar: 3, cattle: 4, veg: 3, grain: 3 }, vp: 1, upgradeOf: 'fireplace',
    desc: { zh: '烹食：羊2/猪3/牛4/菜3；烤面包 1 谷→3 食；可退壁炉免费换购；终局 1 分', en: 'Cook: sheep 2 / boar 3 / cattle 4 / veg 3; bake 1 grain → 3 food; may trade in a Fireplace; 1 VP' },
  },
  {
    id: 'clayOven', name: { zh: '黏土烤炉', en: 'Clay Oven' }, cost: { clay: 3, stone: 1 },
    cook: { grain: 5 }, bakeMax: 1, vp: 2, bakeOnBuild: 1,
    desc: { zh: '烤面包：1 谷→5 食（单次 1 谷）；建成立即烤 1 次；终局 2 分', en: 'Bake: 1 grain → 5 food (max 1); bake immediately on build; 2 VP' },
  },
  {
    id: 'stoneOven', name: { zh: '石烤炉', en: 'Stone Oven' }, cost: { clay: 1, stone: 3 },
    cook: { grain: 4 }, bakeMax: 2, vp: 3, bakeOnBuild: 2,
    desc: { zh: '烤面包：至多 2 谷、各 4 食；建成立即烤 1 次；终局 3 分', en: 'Bake: up to 2 grain at 4 food each; bake immediately on build; 3 VP' },
  },
  {
    id: 'well', name: { zh: '水井', en: 'Well' }, cost: { stone: 3, wood: 1 }, vp: 4, wellRounds: 5,
    desc: { zh: '建成起 5 轮每轮 +1 食；终局 4 分', en: '1 food at the start of each of the next 5 rounds; 4 VP' },
  },
  {
    id: 'joinery', name: { zh: '木工坊', en: 'Joinery' }, cost: { wood: 2, stone: 2 }, vp: 2, craft: 'wood',
    desc: { zh: '每次收获 1 木→2 食；终局 2 分 + 木加成（3-4/5-6/7+ 木 → 1/2/3 分）', en: 'Each harvest: 1 wood → 2 food; 2 VP + wood bonus (3-4/5-6/7+ → 1/2/3 VP)' },
  },
  {
    id: 'pottery', name: { zh: '陶坊', en: 'Pottery' }, cost: { clay: 2, stone: 2 }, vp: 2, craft: 'clay',
    desc: { zh: '每次收获 1 黏土→2 食；终局 2 分 + 黏土加成（3-4/5-6/7+ → 1/2/3 分）', en: 'Each harvest: 1 clay → 2 food; 2 VP + clay bonus (3-4/5-6/7+ → 1/2/3 VP)' },
  },
  {
    id: 'basket', name: { zh: '编篮坊', en: "Basketmaker's Workshop" }, cost: { reed: 2, stone: 2 }, vp: 2, craft: 'reed',
    desc: { zh: '每次收获 1 芦苇→3 食；终局 2 分 + 芦苇加成（2-3/4/5+ → 1/2/3 分）', en: 'Each harvest: 1 reed → 3 food; 2 VP + reed bonus (2-3/4/5+ → 1/2/3 VP)' },
  },
];

// MAJOR_ICON 大设施图标（视觉锚点，含义对应）
export const MAJOR_ICON = {
  fireplace1: '🔥', fireplace2: '🔥', hearth1: '🍳', hearth2: '🍳', clayOven: '🫓', stoneOven: '🍞',
  well: '🪣', joinery: '🪚', pottery: '🏺', basket: '🧺',
};

// MAJOR_BY_ID 大设施反查
export const MAJOR_BY_ID = Object.fromEntries(MAJORS.map((x) => [x.id, x]));
