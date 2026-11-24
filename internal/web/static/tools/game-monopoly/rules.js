// 大富翁规则辅助：租金、成组判定、房屋与抵押的合法性、净资产。
// 纯函数，只读 state（不改），供 engine / resolve / bot 共用。
import { SPACES, groupOf, groupSpaces, isOwnable } from './data-board.js';

// RAIL_RENTS 铁路持 1/2/3/4 条的租金
export const RAIL_RENTS = [25, 50, 100, 200];
// UTIL_MULT 公用事业持 1/2 家的租金骰点倍数
export const UTIL_MULT = [4, 10];
export const MORTGAGE_INTEREST = 0.1; // 抵押赎回 / 转手时的利息

// ownerOf 该格持有者座位；无主返回 -1
export function ownerOf(s, i) {
  const v = s.owner[i];
  return v === undefined || v === null ? -1 : v;
}

// propCount 某座位在某色组/类型持有的格数
export function ownedInGroup(s, seat, group) {
  return groupSpaces(group).filter((i) => ownerOf(s, i) === seat).length;
}

// ownsAll 是否独占整个色组（地产 8 组 + 铁路 + 公用事业）
export function ownsAll(s, seat, group) {
  if (seat < 0) return false;
  const all = groupSpaces(group);
  return all.length > 0 && all.every((i) => ownerOf(s, i) === seat);
}

// groupHasHouses 该色组内是否有房屋（抵押前置条件）
export function groupHasHouses(s, group) {
  return groupSpaces(group).some((i) => (s.houses[i] || 0) > 0);
}

// rentFor 落地租金：i 格，diceSum = 本次骰点（公用事业用），boost = 卡牌加倍系数
export function rentFor(s, i, diceSum, boost) {
  const sp = SPACES[i];
  if (!isOwnable(i) || s.mortgaged[i]) return 0;
  const seat = ownerOf(s, i);
  if (seat < 0) return 0;
  if (sp.type === 'prop') {
    const h = s.houses[i] || 0;
    if (h > 0) return sp.rent[h];
    return ownsAll(s, seat, sp.group) ? sp.rent[0] * 2 : sp.rent[0];
  }
  if (sp.type === 'rail') {
    const n = ownedInGroup(s, seat, 'rail');
    return RAIL_RENTS[Math.max(0, n - 1)];
  }
  const n = ownedInGroup(s, seat, 'util');
  return UTIL_MULT[Math.max(0, n - 1)] * (diceSum || 0);
}

// groupMinMax 色组内房屋数的最小/最大值（均按未抵押地产计）
function groupMinMax(s, group) {
  const counts = groupSpaces(group).map((i) => s.houses[i] || 0);
  return { min: Math.min(...counts), max: Math.max(...counts) };
}

// canBuild 能否在该地产加盖一栋房屋或旅馆（官方均匀建造规则）
export function canBuild(s, seat, i) {
  const sp = SPACES[i];
  if (!sp || sp.type !== 'prop') return false;
  if (ownerOf(s, i) !== seat || s.mortgaged[i]) return false;
  if (!ownsAll(s, seat, sp.group)) return false;
  if (groupSpaces(sp.group).some((x) => s.mortgaged[x])) return false;
  const h = s.houses[i] || 0;
  if (h >= 5) return false;
  // 均匀建造：房屋数必须为该色组最少者才能加盖
  if (h > groupMinMax(s, sp.group).min) return false;
  // 加盖到 5（旅馆）需要旅馆库存，否则需要房屋库存
  return h >= 4 ? s.hotelsLeft > 0 : s.housesLeft > 0;
}

// canSellHouse 能否拆除一栋房屋/旅馆（自高向低，均匀拆除；旅馆先换回 4 栋房屋）
export function canSellHouse(s, seat, i) {
  const sp = SPACES[i];
  if (!sp || sp.type !== 'prop') return false;
  if (ownerOf(s, i) !== seat) return false;
  const h = s.houses[i] || 0;
  if (h === 0) return false;
  if (h < groupMinMax(s, sp.group).max) return false;
  // 旅馆降为 4 栋房屋需要房屋库存
  return h !== 5 || s.housesLeft >= 4;
}

// canMortgage 能否抵押（该组内不得有任何房屋）
export function canMortgage(s, seat, i) {
  if (!isOwnable(i) || ownerOf(s, i) !== seat || s.mortgaged[i]) return false;
  const g = groupOf(i);
  return !(g && g !== 'rail' && g !== 'util' && groupHasHouses(s, g));
}

// unmortgageCost 赎回价（抵押价 × 1.1，向上取整到元）
export function unmortgageCost(i) {
  return Math.ceil(SPACES[i].mortgage * (1 + MORTGAGE_INTEREST));
}

// canUnmortgage 能否赎回（现金充足）
export function canUnmortgage(s, seat, i, cash) {
  if (!isOwnable(i) || ownerOf(s, i) !== seat || !s.mortgaged[i]) return false;
  return cash >= unmortgageCost(i);
}

// buildCost 加盖一栋房屋/旅馆的价格
export function buildCost(i) {
  return SPACES[i].house || 0;
}

// netWorth 净资产：现金 + 地价 + 房屋价值 − 抵押欠款（破产裁定与 AI 估值用）
export function netWorth(s, seat) {
  const p = s.players[seat];
  if (!p || p.bankrupt) return 0;
  let total = p.cash;
  for (const i of ownableOf(s, seat)) {
    const sp = SPACES[i];
    total += s.mortgaged[i] ? 0 : sp.price;
    total += (s.houses[i] || 0) * (sp.house || 0);
  }
  return total;
}

// ownableOf 该座位持有的全部可购买格（升序）
export function ownableOf(s, seat) {
  const out = [];
  for (const i in s.owner) {
    if (s.owner[i] === seat) out.push(Number(i));
  }
  return out.sort((a, b) => a - b);
}

// liquidatable 可变现资产（抵押 + 拆屋），用于判断是否真的破产
export function liquidatable(s, seat) {
  let total = 0;
  for (const i of ownableOf(s, seat)) {
    if (!s.mortgaged[i]) total += Math.floor(SPACES[i].mortgage);
    const h = s.houses[i] || 0;
    if (h === 5) total += Math.floor((SPACES[i].house || 0) * 2.5);
    else total += h * Math.floor((SPACES[i].house || 0) / 2);
  }
  return total;
}
