// 电力公司数值表：收入、资源补给、价格梯、终局门槛。
// 全表凭对官方规则（德国原版）的记忆整理，均「? 待核对」——WebSearch/WebFetch 在本环境被阻断，无法在线核对。

// INCOME 供电城数 → 收入（Elektro）。? 待核对：0 城供电 = 10，1-20 城按表
export const INCOME = {
  0: 10, 1: 22, 2: 33, 3: 44, 4: 54, 5: 62, 6: 68, 7: 73, 8: 77, 9: 80,
  10: 82, 11: 84, 12: 86, 13: 88, 14: 90, 15: 92, 16: 94, 17: 96, 18: 98, 19: 100, 20: 102,
};
// 20 城以上每多 1 城 +2（终局门槛最高 21 城）
export function incomeOf(n) { return n <= 20 ? INCOME[n] : 102 + (n - 20) * 2; }

// REFILL[人数][step] 每轮 bureaucracy 阶段向资源市场补充的量。? 待核对
export const REFILL = {
  2: { 1: { coal: 3, oil: 2, garbage: 1, uranium: 1 }, 2: { coal: 4, oil: 3, garbage: 2, uranium: 1 }, 3: { coal: 3, oil: 2, garbage: 1, uranium: 1 } },
  3: { 1: { coal: 4, oil: 3, garbage: 1, uranium: 1 }, 2: { coal: 5, oil: 4, garbage: 3, uranium: 1 }, 3: { coal: 3, oil: 3, garbage: 2, uranium: 1 } },
  4: { 1: { coal: 5, oil: 4, garbage: 2, uranium: 1 }, 2: { coal: 6, oil: 5, garbage: 3, uranium: 1 }, 3: { coal: 4, oil: 4, garbage: 3, uranium: 1 } },
  5: { 1: { coal: 5, oil: 4, garbage: 3, uranium: 1 }, 2: { coal: 7, oil: 5, garbage: 3, uranium: 1 }, 3: { coal: 5, oil: 4, garbage: 3, uranium: 1 } },
  6: { 1: { coal: 7, oil: 5, garbage: 3, uranium: 1 }, 2: { coal: 9, oil: 6, garbage: 4, uranium: 1 }, 3: { coal: 6, oil: 5, garbage: 4, uranium: 1 } },
};

// 资源市场容量与初始摆放。煤/油/垃圾 24 格（价格 1-8 各 3 格）；铀 12 格（1-8 各 1 格 + 10/12/14/16）。
// 初始市场摆量：煤 24（满）、油 18、垃圾 6、铀 2；其余为「供应」（梯子外，待补充入市场）。? 待核对
export const RES_CAPACITY = { coal: 24, oil: 24, garbage: 24, uranium: 12 };
export const RES_INITIAL = { coal: 24, oil: 18, garbage: 6, uranium: 2 };

// resPrice 购买某件的单价：该件买完后市场剩余 remainAfter 件。
// 官方模型：资源占据价格梯「最贵端」的连续区块，购买从区块最便宜一格取——
// 市场越空越贵（开局煤 24 满 → 1 块；铀仅 2 件 → 14 块）。
// 煤/油/垃圾：24 格（价格 1-8 各 3 格）；铀：12 格（1-8 各 1 格 + 10/12/14/16）。
export function resPrice(kind, remainAfter) {
  if (kind === 'uranium') {
    // 12 格自便宜向贵：remainAfter=11（满）→ 1，remainAfter=1 → 14，remainAfter=0 → 16
    const slots = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16];
    return slots[Math.max(0, 11 - remainAfter)];
  }
  // 24 格自便宜向贵：remainAfter=23（满）→ 1，remainAfter=0 → 8
  return Math.max(1, Math.ceil((24 - remainAfter) / 3));
}

// resCostTotal 从市场买 count 件的总价（逐件计价，越买越贵）
export function resCostTotal(kind, remain, count) {
  let cost = 0;
  for (let i = 0; i < count; i++) {
    cost += resPrice(kind, remain - 1 - i); // remain-1-i = 该件买完后剩余
  }
  return cost;
}

// CITY_COST 各 step 的连接房价。? 待核对：step1=10 / step2=15 / step3=20
export const CITY_COST = { 1: 10, 2: 15, 3: 20 };

// SETUP 人数开局：区域数 / 每人起始 Elektro / step2 触发城数 / 终局城数 / 拍卖移除牌数。? 待核对
export const SETUP = {
  2: { regions: 3, electro: 50, step2Cities: 10, endCities: 21, removePlants: 8 },
  3: { regions: 3, electro: 50, step2Cities: 7, endCities: 17, removePlants: 4 },
  4: { regions: 4, electro: 50, step2Cities: 7, endCities: 17, removePlants: 0 },
  5: { regions: 4, electro: 50, step2Cities: 7, endCities: 15, removePlants: 0 },
  6: { regions: 5, electro: 50, step2Cities: 6, endCities: 14, removePlants: 0 },
};

export const RES_NAMES = {
  coal: { zh: '煤', en: 'Coal' }, oil: { zh: '油', en: 'Oil' },
  garbage: { zh: '垃圾', en: 'Garbage' }, uranium: { zh: '铀', en: 'Uranium' },
  hybrid: { zh: '混合', en: 'Hybrid' }, eco: { zh: '生态', en: 'Ecological' },
};
export const RES_ICON = { coal: '🪨', oil: '🛢️', garbage: '🗑️', uranium: '☢️' };
