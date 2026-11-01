// 电力公司数值表：收入、资源补给、价格梯、终局门槛。
// ✅ 全表对照 boardgamers/powergrid（engine.ts / prices.ts，带单元测试的开源实现）核对，2026-11。

// INCOME 供电城数 → 收入（Elektro）。✅ 对照 engine.ts cityIncome 官方收入表
export const INCOME = {
  0: 10, 1: 22, 2: 33, 3: 44, 4: 54, 5: 64, 6: 73, 7: 82, 8: 90, 9: 98,
  10: 105, 11: 112, 12: 118, 13: 124, 14: 129, 15: 134, 16: 138, 17: 142, 18: 145, 19: 148, 20: 150,
};
// 20 城以上为 150（终局门槛最高 21 城，150 封顶）
export function incomeOf(n) { return n >= 20 ? 150 : INCOME[n]; }

// REFILL[人数][step] 每轮 bureaucracy 阶段向资源市场补充的量。
// ✅ 对照 engine.ts default resupply 表（index [playerCount-2][step-1]），原版变体官方补给
export const REFILL = {
  2: { 1: { coal: 3, oil: 2, garbage: 1, uranium: 1 }, 2: { coal: 4, oil: 5, garbage: 3, uranium: 1 }, 3: { coal: 3, oil: 4, garbage: 3, uranium: 1 } },
  3: { 1: { coal: 4, oil: 2, garbage: 1, uranium: 1 }, 2: { coal: 5, oil: 6, garbage: 4, uranium: 1 }, 3: { coal: 3, oil: 3, garbage: 2, uranium: 1 } },
  4: { 1: { coal: 5, oil: 3, garbage: 2, uranium: 1 }, 2: { coal: 6, oil: 4, garbage: 5, uranium: 2 }, 3: { coal: 4, oil: 5, garbage: 4, uranium: 1 } },
  5: { 1: { coal: 5, oil: 4, garbage: 3, uranium: 1 }, 2: { coal: 7, oil: 6, garbage: 5, uranium: 3 }, 3: { coal: 5, oil: 6, garbage: 5, uranium: 2 } },
  6: { 1: { coal: 7, oil: 5, garbage: 3, uranium: 1 }, 2: { coal: 9, oil: 7, garbage: 6, uranium: 2 }, 3: { coal: 6, oil: 6, garbage: 5, uranium: 2 } },
};

// 资源市场容量与初始摆放。煤/油/垃圾 24 格（价格 1-8 各 3 格）；铀 12 格（1-8 各 1 格 + 10/12/14/16）。
// 初始市场摆量与供应池（✅ 对照 engine.ts：market 煤 24/油 18/垃圾 6/铀 2；供应 = 总量 − 市场）
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

// CITY_COST 各 step 的连接房价（✅ 对照 moves.ts 建城费用公式 10 + othersCount×5：
// 第 1 格 10 / 第 2 格 15 / 第 3 格 20 —— 与本作按 step 开放产权槽的模型等价）
export const CITY_COST = { 1: 10, 2: 15, 3: 20 };

// SETUP 人数开局：区域数 / 每人起始 Elektro / step2 触发城数 / 终局城数 / 拍卖移除牌数。
// ✅ 对照 engine.ts：regionsInPlay=[3,3,4,5,5] / citiesToStep2=[10,7,7,7,6] / citiesToEndGame=[21,17,17,15,14]，
//   移除牌数 = 牌堆洗牌后从顶移除 8/8/4/0/0（与 plant-data.js REMOVE_PLANTS 一致，此处留同步副本供 UI 展示）
export const SETUP = {
  2: { regions: 3, electro: 50, step2Cities: 10, endCities: 21, removePlants: 8 },
  3: { regions: 3, electro: 50, step2Cities: 7, endCities: 17, removePlants: 8 },
  4: { regions: 4, electro: 50, step2Cities: 7, endCities: 17, removePlants: 4 },
  5: { regions: 5, electro: 50, step2Cities: 7, endCities: 15, removePlants: 0 },
  6: { regions: 5, electro: 50, step2Cities: 6, endCities: 14, removePlants: 0 },
};

export const RES_NAMES = {
  coal: { zh: '煤', en: 'Coal' }, oil: { zh: '油', en: 'Oil' },
  garbage: { zh: '垃圾', en: 'Garbage' }, uranium: { zh: '铀', en: 'Uranium' },
  hybrid: { zh: '混合', en: 'Hybrid' }, eco: { zh: '生态', en: 'Ecological' },
};
export const RES_ICON = { coal: '🪨', oil: '🛢️', garbage: '🗑️', uranium: '☢️' };
