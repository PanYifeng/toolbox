// 农场主 10 大设施（翻新格购买）。⚠ 记忆重建数据，费用/效果均「待核对」。
// cook 键：sheep/boar/cattle/veg 为烹食汇率（1 只/棵 → N 食物）；grain 为烤面包汇率（1 谷 → N 食物）。
// bakeMax：单次烤面包最多谷数。double：终局该资源计分翻倍（木工坊/陶坊/编篮坊口径）。
// bonusOn：拿取指定空间时额外 +1 该资源。vp：固定终局分。

export const MAJORS = [
  {
    id: 'fireplace', name: { zh: '壁炉', en: 'Fireplace' }, cost: { clay: 3 },
    cook: { sheep: 2, boar: 3, cattle: 3, veg: 2, grain: 2 },
    desc: { zh: '烹食：羊2/猪3/牛3/菜2；烤面包 1 谷→2 食', en: 'Cook: sheep 2 / boar 3 / cattle 3 / veg 2; bake 1 grain → 2 food' },
  },
  {
    id: 'hearth', name: { zh: '灶台', en: 'Cooking Hearth' }, cost: { clay: 2, stone: 1 },
    cook: { sheep: 3, boar: 4, cattle: 5, veg: 3, grain: 3 },
    desc: { zh: '烹食：羊3/猪4/牛5/菜3；烤面包 1 谷→3 食', en: 'Cook: sheep 3 / boar 4 / cattle 5 / veg 3; bake 1 grain → 3 food' },
  },
  {
    id: 'clayOven', name: { zh: '黏土烤炉', en: 'Clay Oven' }, cost: { clay: 3, stone: 1 },
    cook: { grain: 5 }, bakeMax: 1,
    desc: { zh: '烤面包：1 谷→5 食（单次至多 1 谷）', en: 'Bake: 1 grain → 5 food (max 1 grain per bake)' },
  },
  {
    id: 'stoneOven', name: { zh: '石烤炉', en: 'Stone Oven' }, cost: { stone: 3, clay: 1 },
    cook: { grain: 4 }, bakeMax: 2,
    desc: { zh: '烤面包：1 谷→4 食（单次至多 2 谷）', en: 'Bake: 1 grain → 4 food (max 2 grain per bake)' },
  },
  {
    id: 'well', name: { zh: '水井', en: 'Well' }, cost: { stone: 1, wood: 1 }, vp: 4,
    desc: { zh: '终局 +4 分', en: '+4 VP at game end' },
  },
  {
    id: 'joinery', name: { zh: '木工坊', en: 'Joinery' }, cost: { wood: 2, stone: 2 }, double: 'wood',
    desc: { zh: '终局木材计分翻倍', en: 'Wood counts double at game end' },
  },
  {
    id: 'pottery', name: { zh: '陶坊', en: 'Pottery' }, cost: { clay: 2, stone: 2 }, double: 'clay',
    desc: { zh: '终局黏土计分翻倍', en: 'Clay counts double at game end' },
  },
  {
    id: 'basket', name: { zh: '编篮坊', en: "Basketmaker's Workshop" }, cost: { reed: 2, stone: 2 }, double: 'reed',
    desc: { zh: '终局芦苇计分翻倍', en: 'Reed counts double at game end' },
  },
  {
    id: 'woodcutter', name: { zh: '伐木场', en: "Woodcutter's Workshop" }, cost: { wood: 2, stone: 2 },
    bonusOn: { wood: 1 },
    desc: { zh: '拿取「拿 3 木」时额外 +1 木', en: '+1 wood when taking the wood space' },
  },
  {
    id: 'quarry', name: { zh: '采石场', en: 'Quarry' }, cost: { stone: 2 },
    bonusOn: { stone: 1 },
    desc: { zh: '拿取石场/采石场时额外 +1 石', en: '+1 stone when taking stone spaces' },
  },
];

// MAJOR_BY_ID 大设施反查
export const MAJOR_BY_ID = Object.fromEntries(MAJORS.map((x) => [x.id, x]));
