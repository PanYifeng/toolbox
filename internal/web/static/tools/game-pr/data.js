// 波多黎各数据表：货物、建筑、各人数初始配置。
// ⚠ 待核对标记：本文件数值来自对官方规则（Rio Grande 版）的记忆整理，部署前建议对照实体规则书逐项复核，
// 重点复核项在各自条目注释中以「?」标出。

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
export const GOOD_ICON = { corn: '🌽', indigo: '🟦', sugar: '🍭', tobacco: '🍂', coffee: '☕' };

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

// BUILDINGS 建筑表：cost=价格（也是终局 VP），type=prod|violet|large，
// circles=移民圆圈数（生产建筑=产能），prod=生产货物种类，stock=供应份数
// ? 待核对：份数表（现按「小建筑 ×2、大建筑 ×1」记忆录入）
export const BUILDINGS = [
  // —— 生产建筑（蓝）——
  { id: 'small_indigo', cost: 1, type: 'prod', circles: 1, prod: 'indigo', stock: 2, name: { zh: '小靛蓝厂', en: 'Small Indigo Mill' } },
  { id: 'small_sugar', cost: 2, type: 'prod', circles: 1, prod: 'sugar', stock: 2, name: { zh: '小糖厂', en: 'Small Sugar Mill' } },
  { id: 'large_indigo', cost: 3, type: 'prod', circles: 2, prod: 'indigo', stock: 2, name: { zh: '大靛蓝厂', en: 'Indigo Mill' } },
  { id: 'sugar_mill', cost: 4, type: 'prod', circles: 2, prod: 'sugar', stock: 2, name: { zh: '大糖厂', en: 'Sugar Mill' } },
  { id: 'tobacco_storage', cost: 5, type: 'prod', circles: 2, prod: 'tobacco', stock: 2, name: { zh: '烟草仓库', en: 'Tobacco Storage' } },
  { id: 'coffee_roaster', cost: 6, type: 'prod', circles: 2, prod: 'coffee', stock: 2, name: { zh: '咖啡烘焙厂', en: 'Coffee Roaster' } },
  // —— 小型紫色建筑 ——
  { id: 'small_market', cost: 1, type: 'violet', circles: 1, stock: 2, name: { zh: '小市场', en: 'Small Market' }, effect: 'sellPlus1' },
  { id: 'hacienda', cost: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '庄园', en: 'Hacienda' }, effect: 'randomPlantation' },
  { id: 'construction_hut', cost: 2, type: 'violet', circles: 1, stock: 2, name: { zh: '工棚', en: 'Construction Hut' }, effect: 'settlerQuarry' },
  { id: 'small_warehouse', cost: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '小货仓', en: 'Small Warehouse' }, effect: 'keepPlus1' },
  { id: 'hospice', cost: 3, type: 'violet', circles: 1, stock: 2, name: { zh: '农舍', en: 'Hospice' }, effect: 'tileWithColonist' },
  { id: 'office', cost: 4, type: 'violet', circles: 1, stock: 2, name: { zh: '事务所', en: 'Office' }, effect: 'sellDuplicate' },
  { id: 'large_market', cost: 4, type: 'violet', circles: 1, stock: 2, name: { zh: '大市场', en: 'Large Market' }, effect: 'sellPlus2' },
  { id: 'large_warehouse', cost: 5, type: 'violet', circles: 1, stock: 2, name: { zh: '大货仓', en: 'Large Warehouse' }, effect: 'keepPlus2' },
  { id: 'factory', cost: 5, type: 'violet', circles: 1, stock: 2, name: { zh: '工厂', en: 'Factory' }, effect: 'factoryIncome' },
  { id: 'university', cost: 5, type: 'violet', circles: 1, stock: 2, name: { zh: '大学', en: 'University' }, effect: 'buildWithColonist' },
  { id: 'harbor', cost: 6, type: 'violet', circles: 1, stock: 2, name: { zh: '港口', en: 'Harbor' }, effect: 'shipPlus1' },
  { id: 'wharf', cost: 7, type: 'violet', circles: 1, stock: 2, name: { zh: '码头', en: 'Wharf' }, effect: 'ownShip' },
  // —— 大型紫色建筑（终局加成，须有移民才算分）——
  { id: 'guild_hall', cost: 10, type: 'large', circles: 1, stock: 1, name: { zh: '行会馆', en: 'Guild Hall' }, effect: 'guildHall' },
  { id: 'residence', cost: 10, type: 'large', circles: 1, stock: 1, name: { zh: '官邸', en: 'Residence' }, effect: 'residence' },
  { id: 'fortress', cost: 10, type: 'large', circles: 1, stock: 1, name: { zh: '要塞', en: 'Fortress' }, effect: 'fortress' },
  { id: 'customs_house', cost: 10, type: 'large', circles: 1, stock: 1, name: { zh: '海关', en: 'Customs House' }, effect: 'customsHouse' },
  { id: 'city_hall', cost: 10, type: 'large', circles: 1, stock: 1, name: { zh: '市政厅', en: 'City Hall' }, effect: 'cityHall' },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// SETUP 各人数配置表
// ? 待核对：起始金币（现按「每人 2/3/4」记忆录入，存在「按座位 3,3,2,2 / 4,4,3,3,2」的另一种记忆）、
//   移民总数 55/75/95、VP 总数 75/100/122、种植园供应配比
export const SETUP = {
  3: { doubloons: 2, plantations: ['indigo', 'indigo', 'corn'], colonists: 55, vp: 75, ships: [4, 5, 6], prospectors: 1 },
  4: { doubloons: 3, plantations: ['indigo', 'indigo', 'corn', 'corn'], colonists: 75, vp: 100, ships: [5, 6, 7], prospectors: 2 },
  5: { doubloons: 4, plantations: ['indigo', 'indigo', 'corn', 'corn', 'corn'], colonists: 95, vp: 122, ships: [6, 7, 8], prospectors: 2 },
};

// PLANTATION_SUPPLY 种植园供应袋配比（quarry 为开拓者可选项，独立供应）
// ? 待核对
export const PLANTATION_SUPPLY = { corn: 10, indigo: 8, sugar: 8, tobacco: 8, coffee: 8 };
export const QUARRY_SUPPLY = 8;

// FACTORY_INCOME 工厂收入：生产 2/3/4/5 种货物 → +1/+2/+3/+5 金币
export const FACTORY_INCOME = { 2: 1, 3: 2, 4: 3, 5: 5 };

// hasOccupied 玩家城市中某建筑是否满员（occ 为已安置移民数，达 circles 为占用）
export function hasOccupied(player, buildingId) {
  return player.city.some((s) => s.id === buildingId && s.occ >= BUILDING_BY_ID[buildingId].circles);
}
