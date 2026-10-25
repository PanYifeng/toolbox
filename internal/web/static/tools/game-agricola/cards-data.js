// 农场主职业卡 40 张 + 小改进卡 40 张（首发版，全部 DSL 效果，无特例代码）。
// ⚠ 记忆重建 + 自创平衡混合：卡名取 E-deck 常见意象，数值非官方口径，均「待核对」。
// DSL 效果词汇（cards-interp.js 解释）：
//   once       打出时立即获得资源
//   income     每轮开始时获得资源
//   bonusOn    {空间id: {资源:n}} 拿取该空间时额外获得
//   cook       烹食/烤面包汇率提升（同键取最大）
//   bakeBonus  每次烤面包额外 +n 食物
//   discount   {roomMat,roomReed,stable,fence,renov,occFood} 各项费用减免
//   capacity   +n 牲畜栏位（卡上饲养，任一畜种）
//   extraPlow  犁田动作可多犁 n 块田
//   harvestFood 每次收获时 +n 食物（喂食前）
//   vp         终局固定分；perCard 每张已打职业 +n
//   req        打出前置 {family, round, occPlayed}

// OCCUPATIONS 职业卡（打出费用 = 已打职业数 × 1 食物，教师可减免）
export const OCCUPATIONS = [
  { id: 'lumberjack', name: { zh: '樵夫', en: 'Lumberjack' }, eff: { bonusOn: { wood: { wood: 1 } } }, desc: { zh: '拿「拿 3 木」时 +1 木', en: '+1 wood when taking the wood space' } },
  { id: 'miner', name: { zh: '矿工', en: 'Miner' }, eff: { bonusOn: { stone: { stone: 1 }, stone2: { stone: 1 } } }, desc: { zh: '拿石场/采石场时 +1 石', en: '+1 stone when taking stone spaces' } },
  { id: 'clayDigger', name: { zh: '采土工', en: 'Clay Digger' }, eff: { bonusOn: { clay: { clay: 1 } } }, desc: { zh: '拿采黏土时 +1 黏土', en: '+1 clay when taking the clay space' } },
  { id: 'reedCutter', name: { zh: '割苇人', en: 'Reed Cutter' }, eff: { bonusOn: { reed: { reed: 1 } } }, desc: { zh: '拿割芦苇时 +1 芦苇', en: '+1 reed when taking the reed space' } },
  { id: 'fisher', name: { zh: '渔夫', en: 'Fisherman' }, eff: { bonusOn: { fishing: { food: 1 }, laborer: { food: 1 } } }, desc: { zh: '拿钓鱼/雇工时 +1 食物', en: '+1 food when taking fishing / day laborer' } },
  { id: 'farmhand', name: { zh: '雇农', en: 'Farmhand' }, eff: { once: { grain: 1 } }, desc: { zh: '打出时获得 1 谷物', en: 'Gain 1 grain on play' } },
  { id: 'baker', name: { zh: '面包师', en: 'Baker' }, eff: { bakeBonus: 1 }, desc: { zh: '每次烤面包 +1 食物', en: '+1 food each time you bake' } },
  { id: 'plowman', name: { zh: '犁夫', en: 'Plowman' }, eff: { extraPlow: 1 }, desc: { zh: '犁田时可多犁 1 块田', en: 'Plow 1 extra field when plowing' } },
  { id: 'sower', name: { zh: '播种者', en: 'Sower' }, eff: { bonusOn: { sow: { grain: 1 } } }, desc: { zh: '使用播种格时 +1 谷物', en: '+1 grain when using the sow space' } },
  { id: 'harvestHelper', name: { zh: '收获帮工', en: 'Harvest Helper' }, eff: { harvestFood: 1 }, desc: { zh: '每次收获 +1 食物', en: '+1 food at each harvest' } },
  { id: 'shepherd', name: { zh: '牧羊人', en: 'Shepherd' }, eff: { bonusOn: { sheep: { sheep: 1 } } }, desc: { zh: '拿绵羊格时 +1 羊', en: '+1 sheep when taking the sheep space' } },
  { id: 'boarHunter', name: { zh: '猎野猪人', en: 'Boar Hunter' }, eff: { bonusOn: { boar: { boar: 1 } } }, desc: { zh: '拿野猪格时 +1 猪', en: '+1 boar when taking the boar space' } },
  { id: 'cattleHerder', name: { zh: '牧牛人', en: 'Cattle Herder' }, eff: { bonusOn: { cattle: { cattle: 1 } } }, desc: { zh: '拿牛格时 +1 牛', en: '+1 cattle when taking the cattle space' } },
  { id: 'vegFarmer', name: { zh: '菜农', en: 'Vegetable Farmer' }, eff: { once: { veg: 1 } }, desc: { zh: '打出时获得 1 蔬菜', en: 'Gain 1 vegetable on play' } },
  { id: 'carpenter', name: { zh: '木匠', en: 'Carpenter' }, eff: { discount: { roomMat: 1 } }, desc: { zh: '每间房材料费 -1', en: '-1 material per room' } },
  { id: 'masterBuilder', name: { zh: '建筑师', en: 'Master Builder' }, eff: { discount: { roomReed: 1 } }, desc: { zh: '每间房芦苇费 -1', en: '-1 reed per room' } },
  { id: 'stablehand', name: { zh: '马厩工', en: 'Stablehand' }, eff: { discount: { stable: 1 } }, desc: { zh: '马厩费用 -1 木（至 0）', en: '-1 wood per stable (min 0)' } },
  { id: 'fencer', name: { zh: '围栏工', en: 'Fencer' }, eff: { discount: { fence: 1 } }, desc: { zh: '围栏总价 -1 木', en: '-1 wood on fence total' } },
  { id: 'bricklayer', name: { zh: '泥瓦匠', en: 'Bricklayer' }, eff: { discount: { renov: 1 } }, desc: { zh: '翻新时每房新材料费 -1', en: '-1 material per room on renovation' } },
  { id: 'verger', name: { zh: '教堂司事', en: 'Verger' }, eff: { vp: 2 }, desc: { zh: '终局 +2 分', en: '+2 VP at game end' } },
  { id: 'teacher', name: { zh: '教师', en: 'Teacher' }, eff: { discount: { occFood: 1 } }, desc: { zh: '打出职业费用 -1 食物（至 0）', en: '-1 food to play occupations (min 0)' } },
  { id: 'scholar', name: { zh: '学者', en: 'Scholar' }, eff: { perCard: 1 }, desc: { zh: '终局每张已打职业 +1 分', en: '+1 VP per occupation played' } },
  { id: 'poet', name: { zh: '诗人', en: 'Poet' }, eff: { vp: 1, once: { food: 1 } }, desc: { zh: '打出时 +1 食物；终局 +1 分', en: '+1 food on play; +1 VP at end' } },
  { id: 'preacher', name: { zh: '传道者', en: 'Preacher' }, eff: { vp: 3 }, req: { family: 4 }, desc: { zh: '需 4+ 家庭成员；终局 +3 分', en: 'Requires 4+ family; +3 VP at end' } },
  { id: 'midwife', name: { zh: '接生婆', en: 'Midwife' }, eff: { once: { food: 2 } }, desc: { zh: '打出时获得 2 食物', en: 'Gain 2 food on play' } },
  { id: 'steward', name: { zh: '管家', en: 'Steward' }, eff: { once: { food: 3 } }, desc: { zh: '打出时获得 3 食物', en: 'Gain 3 food on play' } },
  { id: 'marketWoman', name: { zh: '集市女贩', en: 'Market Woman' }, eff: { once: { food: 2 } }, desc: { zh: '打出时获得 2 食物', en: 'Gain 2 food on play' } },
  { id: 'miller', name: { zh: '磨坊主', en: 'Miller' }, eff: { bonusOn: { sow: { food: 2 } } }, desc: { zh: '使用播种格时 +2 食物', en: '+2 food when using the sow space' } },
  { id: 'butcher', name: { zh: '屠夫', en: 'Butcher' }, eff: { cook: { sheep: 3 } }, desc: { zh: '烹羊汇率提升至 3 食物', en: 'Cook sheep at 3 food' } },
  { id: 'cook', name: { zh: '厨子', en: 'Cook' }, eff: { cook: { veg: 3 } }, desc: { zh: '烹蔬菜汇率提升至 3 食物', en: 'Cook vegetables at 3 food' } },
  { id: 'roaster', name: { zh: '烤肉师傅', en: 'Roaster' }, eff: { cook: { boar: 4 } }, desc: { zh: '烹猪汇率提升至 4 食物', en: 'Cook boar at 4 food' } },
  { id: 'herdsman', name: { zh: '牧人', en: 'Herdsman' }, eff: { capacity: 2 }, desc: { zh: '卡上可养 2 只牲畜', en: 'Keeps 2 animals on this card' } },
  { id: 'stockbreeder', name: { zh: '畜牧主', en: 'Stockbreeder' }, eff: { capacity: 2 }, desc: { zh: '卡上可养 2 只牲畜', en: 'Keeps 2 animals on this card' } },
  { id: 'peddler', name: { zh: '小贩', en: 'Peddler' }, eff: { once: { wood: 1, food: 1 } }, desc: { zh: '打出时 +1 木 +1 食物', en: '+1 wood +1 food on play' } },
  { id: 'carter', name: { zh: '车夫', en: 'Carter' }, eff: { once: { wood: 2 } }, desc: { zh: '打出时获得 2 木', en: 'Gain 2 wood on play' } },
  { id: 'gleaner', name: { zh: '拾穗人', en: 'Gleaner' }, eff: { income: { food: 1 } }, desc: { zh: '每轮开始 +1 食物', en: '+1 food each round' } },
  { id: 'chimneySweep', name: { zh: '扫烟囱工', en: 'Chimney Sweep' }, eff: { once: { food: 2 } }, desc: { zh: '打出时获得 2 食物', en: 'Gain 2 food on play' } },
  { id: 'weaver', name: { zh: '织工', en: 'Weaver' }, eff: { vp: 2 }, desc: { zh: '终局 +2 分', en: '+2 VP at game end' } },
  { id: 'watchman', name: { zh: '更夫', en: 'Night Watchman' }, eff: { vp: 1 }, desc: { zh: '终局 +1 分', en: '+1 VP at game end' } },
  { id: 'tenantFarmer', name: { zh: '佃农', en: 'Tenant Farmer' }, eff: { once: { grain: 1, veg: 1 } }, desc: { zh: '打出时 +1 谷物 +1 蔬菜', en: '+1 grain +1 vegetable on play' } },
];

// MINOR_IMPROVEMENTS 小改进卡（打出费用见 cost）
export const MINOR_IMPROVEMENTS = [
  { id: 'harrow', name: { zh: '耙子', en: 'Harrow' }, cost: { wood: 1 }, eff: { extraPlow: 1 }, desc: { zh: '犁田时可多犁 1 块田', en: 'Plow 1 extra field' } },
  { id: 'wheelbarrow', name: { zh: '独轮车', en: 'Wheelbarrow' }, cost: { wood: 1 }, eff: { capacity: 1 }, desc: { zh: '卡上可养 1 只牲畜', en: 'Keeps 1 animal' } },
  { id: 'woodpile', name: { zh: '柴堆', en: 'Woodpile' }, cost: { wood: 1 }, eff: { once: { wood: 2 } }, desc: { zh: '打出时获得 2 木', en: 'Gain 2 wood' } },
  { id: 'clayPit', name: { zh: '黏土坑', en: 'Clay Pit' }, cost: { food: 1 }, eff: { once: { clay: 2 } }, desc: { zh: '打出时获得 2 黏土', en: 'Gain 2 clay' } },
  { id: 'stonePick', name: { zh: '采石镐', en: 'Stone Pick' }, cost: { wood: 1 }, eff: { once: { stone: 1 } }, desc: { zh: '打出时获得 1 石', en: 'Gain 1 stone' } },
  { id: 'reedBoat', name: { zh: '芦苇船', en: 'Reed Boat' }, cost: { wood: 1 }, eff: { once: { reed: 2 } }, desc: { zh: '打出时获得 2 芦苇', en: 'Gain 2 reed' } },
  { id: 'vegBasket', name: { zh: '蔬菜篮', en: 'Vegetable Basket' }, cost: { food: 1 }, eff: { once: { veg: 1 } }, desc: { zh: '打出时获得 1 蔬菜', en: 'Gain 1 vegetable' } },
  { id: 'granary', name: { zh: '谷仓', en: 'Granary' }, cost: { wood: 2 }, eff: { once: { grain: 2 } }, desc: { zh: '打出时获得 2 谷物', en: 'Gain 2 grain' } },
  { id: 'bucket', name: { zh: '水桶', en: 'Bucket' }, cost: { wood: 1 }, eff: { once: { food: 2 } }, desc: { zh: '打出时获得 2 食物', en: 'Gain 2 food' } },
  { id: 'fencePosts', name: { zh: '篱笆桩', en: 'Fence Posts' }, cost: { wood: 1 }, eff: { discount: { fence: 1 } }, desc: { zh: '围栏总价 -1 木', en: '-1 wood on fences' } },
  { id: 'stablePlan', name: { zh: '马厩图纸', en: 'Stable Plan' }, cost: { wood: 1 }, eff: { discount: { stable: 1 } }, desc: { zh: '马厩费用 -1 木', en: '-1 wood per stable' } },
  { id: 'sawhorse', name: { zh: '锯木架', en: 'Sawhorse' }, cost: { wood: 1 }, eff: { discount: { roomMat: 1 } }, desc: { zh: '每间房材料费 -1', en: '-1 material per room' } },
  { id: 'scaffolding', name: { zh: '脚手架', en: 'Scaffolding' }, cost: { wood: 2 }, eff: { discount: { roomReed: 1 } }, desc: { zh: '每间房芦苇费 -1', en: '-1 reed per room' } },
  { id: 'trowel', name: { zh: '灰泥铲', en: 'Trowel' }, cost: { wood: 1 }, eff: { discount: { renov: 1 } }, desc: { zh: '翻新时每房材料费 -1', en: '-1 material per room on renovation' } },
  { id: 'compost', name: { zh: '肥料堆', en: 'Compost Heap' }, cost: { wood: 1 }, eff: { once: { grain: 1 } }, desc: { zh: '打出时获得 1 谷物', en: 'Gain 1 grain' } },
  { id: 'hayfork', name: { zh: '牧草叉', en: 'Hayfork' }, cost: { wood: 1 }, eff: { bonusOn: { sheep: { sheep: 1 } } }, desc: { zh: '拿绵羊格时 +1 羊', en: '+1 sheep from the sheep space' } },
  { id: 'huntingBow', name: { zh: '猎弓', en: 'Hunting Bow' }, cost: { wood: 2 }, eff: { bonusOn: { boar: { boar: 1 } } }, desc: { zh: '拿野猪格时 +1 猪', en: '+1 boar from the boar space' } },
  { id: 'cowbell', name: { zh: '牛铃', en: 'Cowbell' }, cost: { wood: 1 }, eff: { bonusOn: { cattle: { cattle: 1 } } }, desc: { zh: '拿牛格时 +1 牛', en: '+1 cattle from the cattle space' } },
  { id: 'trough', name: { zh: '饲料槽', en: 'Feeding Trough' }, cost: { wood: 2 }, eff: { capacity: 2 }, desc: { zh: '卡上可养 2 只牲畜', en: 'Keeps 2 animals' } },
  { id: 'butcherKnife', name: { zh: '屠刀', en: "Butcher's Knife" }, cost: { wood: 1 }, eff: { cook: { sheep: 3 } }, desc: { zh: '烹羊汇率提升至 3 食物', en: 'Cook sheep at 3 food' } },
  { id: 'grill', name: { zh: '烤架', en: 'Grill' }, cost: { wood: 2 }, eff: { cook: { boar: 4 } }, desc: { zh: '烹猪汇率提升至 4 食物', en: 'Cook boar at 4 food' } },
  { id: 'cookingPot', name: { zh: '炖锅', en: 'Cooking Pot' }, cost: { clay: 1 }, eff: { cook: { veg: 3 } }, desc: { zh: '烹蔬菜汇率提升至 3 食物', en: 'Cook vegetables at 3 food' } },
  { id: 'millstone', name: { zh: '磨石', en: 'Millstone' }, cost: { stone: 1 }, eff: { bakeBonus: 1 }, desc: { zh: '每次烤面包 +1 食物', en: '+1 food each bake' } },
  { id: 'flourSack', name: { zh: '面粉袋', en: 'Flour Sack' }, cost: { food: 1 }, eff: { once: { food: 3 } }, desc: { zh: '打出时获得 3 食物', en: 'Gain 3 food' } },
  { id: 'seedBag', name: { zh: '种子袋', en: 'Seed Bag' }, cost: { food: 1 }, eff: { once: { grain: 1 } }, desc: { zh: '打出时获得 1 谷物', en: 'Gain 1 grain' } },
  { id: 'doublePlow', name: { zh: '双手犁', en: 'Double Plow' }, cost: { wood: 3 }, eff: { extraPlow: 1 }, desc: { zh: '犁田时可多犁 1 块田', en: 'Plow 1 extra field' } },
  { id: 'cart', name: { zh: '马车', en: 'Cart' }, cost: { wood: 3 }, eff: { capacity: 3 }, desc: { zh: '卡上可养 3 只牲畜', en: 'Keeps 3 animals' } },
  { id: 'pen', name: { zh: '动物圈', en: 'Animal Pen' }, cost: { wood: 2 }, eff: { capacity: 2 }, desc: { zh: '卡上可养 2 只牲畜', en: 'Keeps 2 animals' } },
  { id: 'stoneWall', name: { zh: '石墙', en: 'Stone Wall' }, cost: { stone: 1 }, eff: { vp: 2 }, desc: { zh: '终局 +2 分', en: '+2 VP at game end' } },
  { id: 'gate', name: { zh: '门户', en: 'Gate' }, cost: { wood: 1 }, eff: { discount: { fence: 1 } }, desc: { zh: '围栏总价 -1 木', en: '-1 wood on fences' } },
  { id: 'fieldPath', name: { zh: '田埂', en: 'Field Path' }, cost: { wood: 1 }, eff: { vp: 1 }, desc: { zh: '终局 +1 分', en: '+1 VP at game end' } },
  { id: 'garden', name: { zh: '花园', en: 'Garden' }, cost: { food: 1 }, eff: { once: { veg: 1 } }, desc: { zh: '打出时获得 1 蔬菜', en: 'Gain 1 vegetable' } },
  { id: 'wineCellar', name: { zh: '葡萄酒窖', en: 'Wine Cellar' }, cost: { stone: 2 }, eff: { vp: 3 }, desc: { zh: '终局 +3 分', en: '+3 VP at game end' } },
  { id: 'basement', name: { zh: '地窖', en: 'Basement' }, cost: { clay: 2 }, eff: { vp: 2 }, desc: { zh: '终局 +2 分', en: '+2 VP at game end' } },
  { id: 'attic', name: { zh: '阁楼', en: 'Attic' }, cost: { wood: 2 }, eff: { vp: 2 }, desc: { zh: '终局 +2 分', en: '+2 VP at game end' } },
  { id: 'pulley', name: { zh: '滑轮', en: 'Pulley' }, cost: { wood: 1 }, eff: { once: { wood: 1 } }, desc: { zh: '打出时获得 1 木', en: 'Gain 1 wood' } },
  { id: 'repairShed', name: { zh: '修补棚', en: 'Repair Shed' }, cost: { wood: 1 }, eff: { once: { food: 1 } }, desc: { zh: '打出时获得 1 食物', en: 'Gain 1 food' } },
  { id: 'threshingFloor', name: { zh: '打谷场', en: 'Threshing Floor' }, cost: { clay: 2 }, eff: { harvestFood: 1 }, desc: { zh: '每次收获 +1 食物', en: '+1 food at each harvest' } },
  { id: 'shepherdCrook', name: { zh: '牧羊杖', en: "Shepherd's Crook" }, cost: { wood: 1 }, eff: { once: { sheep: 2 } }, desc: { zh: '打出时获得 2 羊（需栏位）', en: 'Gain 2 sheep (needs capacity)' } },
  { id: 'huntingDog', name: { zh: '猎犬', en: 'Hunting Dog' }, cost: { food: 2 }, eff: { once: { boar: 1 } }, desc: { zh: '打出时获得 1 猪（需栏位）', en: 'Gain 1 boar (needs capacity)' } },
];

// OCC_BY_ID / MINOR_BY_ID 反查表
export const OCC_BY_ID = Object.fromEntries(OCCUPATIONS.map((x) => [x.id, x]));
export const MINOR_BY_ID = Object.fromEntries(MINOR_IMPROVEMENTS.map((x) => [x.id, x]));
