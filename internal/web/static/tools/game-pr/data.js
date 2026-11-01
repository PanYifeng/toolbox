// 波多黎各数据表：货物、建筑、各人数初始配置。
// ✅ 数值已对照两个权威开源实现核对（dae-hany/PuertoRico_AI_Competition constants.py —— 注释含规则书页码引用，
//   ultraboardgames.com/PuertoRico 规则页），2026-11 核对通过。

// GOODS 货物种类与交易价值（玉米 0 → 咖啡 4）
export const GOODS = ['corn', 'indigo', 'sugar', 'tobacco', 'coffee'];
export const GOOD_NAMES = {
  corn: { zh: '玉米', en: 'Corn' },
  indigo: { zh: '靛蓝', en: 'Indigo' },
  sugar: { zh: '甘蔗', en: 'Sugar' },
  tobacco: { zh: '烟草', en: 'Tobacco' },
  coffee: { zh: '咖啡', en: 'Coffee' },
};
export const GOOD_VALUE = { corn: 0, indigo: 1, sugar: 2, tobacco: 3, coffee: 4 };
export const GOOD_ICON = { corn: '🌽', indigo: '🪣', sugar: '🍬', tobacco: '🍂', coffee: '☕' };

// ROLE_ICON 角色图标（角色牌视觉锚点，纯文本场景可拼接）
export const ROLE_ICON = {
  settler: '🌱', builder: '🏗️', mayor: '🎩', craftsman: '🧑‍🏭', trader: '⚖️', captain: '⚓', prospector: '💎',
};

// BUILDING_ICON 建筑图标：生产建筑沿用产物图腾，紫建筑/大建筑各有区分度
export const BUILDING_ICON = {
  small_indigo: '🪣', large_indigo: '🪣', small_sugar: '🍬', sugar_mill: '🍬',
  tobacco_storage: '🍂', coffee_roaster: '☕',
  small_market: '🏪', hacienda: '🌴', construction_hut: '🧱', small_warehouse: '📦',
  hospice: '🏠', office: '🤝', large_market: '🏬', large_warehouse: '🗄️',
  factory: '🏭', university: '🎓', harbor: '🛳️', wharf: '⚓',
  guild_hall: '🏛️', residence: '🏯', fortress: '🏰', customs_house: '🛃', city_hall: '🏢',
};

// ROLES 角色定义（prospector 数量随人数，见 SETUP）
export const ROLE_IDS = ['settler', 'builder', 'mayor', 'craftsman', 'trader', 'captain', 'prospector'];
export const ROLE_NAMES = {
  settler: { zh: '开拓者', en: 'Settler' },
  builder: { zh: '建筑师', en: 'Builder' },
  mayor: { zh: '市长', en: 'Mayor' },
  craftsman: { zh: '工匠', en: 'Craftsman' },
  trader: { zh: '商人', en: 'Trader' },
  captain: { zh: '船长', en: 'Captain' },
  prospector: { zh: '淘金者', en: 'Prospector' },
};

// BUILDINGS 建筑表：cost=价格，vp=印刷 VP（终局计分 + 采石场折扣上限），type=prod|violet|large，
// circles=移民圆圈数（生产建筑=产能），prod=生产货物种类，stock=供应份数（3-5p：小生产 ×4、大生产 ×3、紫 ×2、大 ×1）
// ✅ cost/vp/circles/stock 全部对照 dae-hany constants.py BUILDING_DATA 核对
export const BUILDINGS = [
  // —— 生产建筑（蓝）——
  { id: 'small_indigo', cost: 1, vp: 1, type: 'prod', circles: 1, prod: 'indigo', stock: 4, name: { zh: '小靛蓝厂', en: 'Small Indigo Mill' } },
  { id: 'small_sugar', cost: 2, vp: 1, type: 'prod', circles: 1, prod: 'sugar', stock: 4, name: { zh: '小糖厂', en: 'Small Sugar Mill' } },
  { id: 'large_indigo', cost: 3, vp: 2, type: 'prod', circles: 3, prod: 'indigo', stock: 3, name: { zh: '大靛蓝厂', en: 'Indigo Mill' } },
  { id: 'sugar_mill', cost: 4, vp: 2, type: 'prod', circles: 3, prod: 'sugar', stock: 3, name: { zh: '大糖厂', en: 'Sugar Mill' } },
  { id: 'tobacco_storage', cost: 5, vp: 3, type: 'prod', circles: 3, prod: 'tobacco', stock: 3, name: { zh: '烟草仓库', en: 'Tobacco Storage' } },
  { id: 'coffee_roaster', cost: 6, vp: 3, type: 'prod', circles: 2, prod: 'coffee', stock: 3, name: { zh: '咖啡烘焙厂', en: 'Coffee Roaster' } },
  // —— 小型紫色建筑 ——
  { id: 'small_market', cost: 1, vp: 1, type: 'violet', circles: 1, stock: 2, name: { zh: '小市场', en: 'Small Market' }, effect: 'sellPlus1' },
  { id: 'hacienda', cost: 2, vp: 1, type: 'violet', circles: 1, stock: 2, name: { zh: '庄园', en: 'Hacienda' }, effect: 'randomPlantation' },
  { id: 'construction_hut', cost: 2, vp: 1, type: 'violet', circles: 1, stock: 2, name: { zh: '工棚', en: 'Construction Hut' }, effect: 'settlerQuarry' },
  { id: 'small_warehouse', cost: 3, vp: 1, type: 'violet', circles: 1, stock: 2, name: { zh: '小货仓', en: 'Small Warehouse' }, effect: 'keepPlus1' },
  { id: 'hospice', cost: 4, vp: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '农舍', en: 'Hospice' }, effect: 'tileWithColonist' },
  { id: 'office', cost: 5, vp: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '事务所', en: 'Office' }, effect: 'sellDuplicate' },
  { id: 'large_market', cost: 5, vp: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '大市场', en: 'Large Market' }, effect: 'sellPlus2' },
  { id: 'large_warehouse', cost: 6, vp: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '大货仓', en: 'Large Warehouse' }, effect: 'keepPlus2' },
  { id: 'factory', cost: 7, vp: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '工厂', en: 'Factory' }, effect: 'factoryIncome' },
  { id: 'university', cost: 8, vp: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '大学', en: 'University' }, effect: 'buildWithColonist' },
  { id: 'harbor', cost: 8, vp: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '港口', en: 'Harbor' }, effect: 'shipPlus1' },
  { id: 'wharf', cost: 9, vp: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '码头', en: 'Wharf' }, effect: 'ownShip' },
  // —— 大型紫色建筑（占 2 格城市空间，终局加成须有移民才算分）——
  { id: 'guild_hall', cost: 10, vp: 4, type: 'large', circles: 1, size: 2, stock: 1, name: { zh: '行会馆', en: 'Guild Hall' }, effect: 'guildHall' },
  { id: 'residence', cost: 10, vp: 4, type: 'large', circles: 1, size: 2, stock: 1, name: { zh: '官邸', en: 'Residence' }, effect: 'residence' },
  { id: 'fortress', cost: 10, vp: 4, type: 'large', circles: 1, size: 2, stock: 1, name: { zh: '要塞', en: 'Fortress' }, effect: 'fortress' },
  { id: 'customs_house', cost: 10, vp: 4, type: 'large', circles: 1, size: 2, stock: 1, name: { zh: '海关', en: 'Customs House' }, effect: 'customsHouse' },
  { id: 'city_hall', cost: 10, vp: 4, type: 'large', circles: 1, size: 2, stock: 1, name: { zh: '市政厅', en: 'City Hall' }, effect: 'cityHall' },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// SETUP 各人数配置表
// colonists = 移民总供应（含风 ros + 移民船；dae-hany COLONIST_SUPPLY_SETUP 55/75/95 为初始供应，
// 开局再各扣 n 人上移民船，故总数 58/79/100，与 mgrau/rico 及实体配件一致）
// ✅ 对照 dae-hany constants.py + ultraboardgames 核对：起始金币、初始种植园、VP、船容量
export const SETUP = {
  3: { doubloons: 2, plantations: ['indigo', 'indigo', 'corn'], colonists: 58, vp: 75, ships: [4, 5, 6], prospectors: 1 },
  4: { doubloons: 3, plantations: ['indigo', 'indigo', 'corn', 'corn'], colonists: 79, vp: 100, ships: [5, 6, 7], prospectors: 2 },
  5: { doubloons: 4, plantations: ['indigo', 'indigo', 'indigo', 'corn', 'corn'], colonists: 100, vp: 126, ships: [6, 7, 8], prospectors: 2 },
};

// PLANTATION_SUPPLY 种植园供应袋配比（quarry 为开拓者可选项，独立供应）
// ✅ 对照 dae-hany PLANTATION_COUNTS 核对：corn 10 / indigo 12 / sugar 11 / tobacco 9 / coffee 8
export const PLANTATION_SUPPLY = { corn: 10, indigo: 12, sugar: 11, tobacco: 9, coffee: 8 };
export const QUARRY_SUPPLY = 8;

// FACTORY_INCOME 工厂收入：生产 2/3/4/5 种货物 → +1/+2/+3/+5 金币
export const FACTORY_INCOME = { 2: 1, 3: 2, 4: 3, 5: 5 };

// hasOccupied 玩家城市中某建筑是否满员（occ 为已安置移民数，达 circles 为占用）
export function hasOccupied(player, buildingId) {
  return player.city.some((s) => s.id === buildingId && s.occ >= BUILDING_BY_ID[buildingId].circles);
}
