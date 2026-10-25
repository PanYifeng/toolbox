// 电力公司电厂表（德国原版编号 03-60 + Step3 卡）。? 待核对：全表凭记忆整理。
// type: coal/oil/garbage/uranium/hybrid（煤或油任意组合）/eco（免燃料）
// fuel: 每次发电消耗件数；cap: 供电城数；s3: 是否为 Step3 牌（Step3 后才进市场）
export const PLANTS = [
  { id: 3, type: 'oil', fuel: 2, cap: 1 },
  { id: 4, type: 'coal', fuel: 2, cap: 1 },
  { id: 5, type: 'hybrid', fuel: 2, cap: 1 },
  { id: 6, type: 'garbage', fuel: 1, cap: 1 },
  { id: 7, type: 'coal', fuel: 2, cap: 2 },
  { id: 8, type: 'coal', fuel: 3, cap: 2 },
  { id: 9, type: 'oil', fuel: 1, cap: 1 },
  { id: 10, type: 'oil', fuel: 2, cap: 2 },
  { id: 11, type: 'hybrid', fuel: 1, cap: 2 },
  { id: 12, type: 'garbage', fuel: 2, cap: 2 },
  { id: 13, type: 'eco', fuel: 0, cap: 1 },
  { id: 14, type: 'garbage', fuel: 2, cap: 2 },
  { id: 15, type: 'coal', fuel: 2, cap: 3 },
  { id: 16, type: 'coal', fuel: 2, cap: 3 },
  { id: 17, type: 'uranium', fuel: 1, cap: 1 },
  { id: 18, type: 'eco', fuel: 0, cap: 2 },
  { id: 19, type: 'garbage', fuel: 2, cap: 3 },
  { id: 20, type: 'coal', fuel: 3, cap: 5 },
  { id: 21, type: 'hybrid', fuel: 2, cap: 4 },
  { id: 22, type: 'eco', fuel: 0, cap: 2 },
  { id: 23, type: 'uranium', fuel: 1, cap: 3 },
  { id: 24, type: 'garbage', fuel: 2, cap: 4 },
  { id: 25, type: 'coal', fuel: 2, cap: 5 },
  { id: 26, type: 'oil', fuel: 2, cap: 5 },
  { id: 27, type: 'eco', fuel: 0, cap: 3 },
  { id: 28, type: 'uranium', fuel: 1, cap: 4 },
  { id: 29, type: 'hybrid', fuel: 1, cap: 4 },
  { id: 30, type: 'garbage', fuel: 3, cap: 6 },
  { id: 31, type: 'coal', fuel: 3, cap: 6 },
  { id: 32, type: 'oil', fuel: 3, cap: 6 },
  { id: 33, type: 'eco', fuel: 0, cap: 4 },
  { id: 34, type: 'uranium', fuel: 1, cap: 5 },
  { id: 35, type: 'uranium', fuel: 1, cap: 5 },
  { id: 36, type: 'coal', fuel: 3, cap: 7 },
  { id: 37, type: 'oil', fuel: 3, cap: 7 },
  { id: 38, type: 'garbage', fuel: 3, cap: 7 },
  { id: 39, type: 'uranium', fuel: 1, cap: 6 },
  { id: 40, type: 'oil', fuel: 2, cap: 6 },
  { id: 42, type: 'coal', fuel: 2, cap: 6 },
  { id: 44, type: 'garbage', fuel: 2, cap: 5 },
  { id: 46, type: 'hybrid', fuel: 3, cap: 7 },
  { id: 50, type: 'hybrid', fuel: 3, cap: 6, s3: true },
  { id: 52, type: 'uranium', fuel: 2, cap: 7, s3: true },
  { id: 54, type: 'uranium', fuel: 1, cap: 6, s3: true },
  { id: 55, type: 'eco', fuel: 0, cap: 5, s3: true },
  { id: 60, type: 'eco', fuel: 0, cap: 7, s3: true },
];

export const PLANT_BY_ID = Object.fromEntries(PLANTS.map((p) => [p.id, p]));

// STARTER_MARKET 开局市场（current + future 各半）：#03-#06 现货、#07-#10 期货
export const STARTER_MARKET = [3, 4, 5, 6, 7, 8, 9, 10];

// STEP3_CARD Step3 触发卡的哨兵 id（洗入抽牌堆，抽到即触发 Step3）。? 待核对：新版规则为洗入，旧版置于牌堆底
export const STEP3_CARD = -1;

// makeDeck 组建抽牌堆：非首发非 Step3 厂洗牌 → 按人数随机移除 → Step3 卡洗入。
// rand() 为引擎的确定性随机（入 state 保证悔棋/重放一致）。
export function makeDeck(removeN, rand) {
  const pool = PLANTS.filter((p) => p.id > 10 && !p.s3).map((p) => p.id);
  // 洗牌（Fisher-Yates 用引擎 rng）
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // 人数移除（从牌堆随机移除，移出的牌移出本局）
  const deck = pool.slice(removeN);
  // Step3 卡洗入（插入随机位置，保证不会在最顶 3 张内过早出现）
  const pos = 3 + Math.floor(rand() * Math.max(1, deck.length - 2));
  deck.splice(pos, 0, STEP3_CARD);
  return deck;
}
