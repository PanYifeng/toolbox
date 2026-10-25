// 卡牌 DSL 解释器：统一解释职业/小改进/大设施的效果字段。
// 零副作用：所有查询函数接收玩家状态，返回聚合结果；写入只经引擎调用。

import { OCC_BY_ID, MINOR_BY_ID } from './cards-data.js';
import { MAJOR_BY_ID } from './majors.js';

// playedCards 玩家已打出的全部卡（职业 + 小改进 + 大设施），返回卡对象列表
export function playedCards(p) {
  return [
    ...p.occPlayed.map((id) => OCC_BY_ID[id]),
    ...p.minorsPlayed.map((id) => MINOR_BY_ID[id]),
    ...p.majors.map((id) => MAJOR_BY_ID[id]),
  ].filter(Boolean);
}

// effSum 聚合某数值效果（如 bakeBonus / extraPlow / harvestFood / vp 取和，capacity 取和）
function effSum(p, key) {
  return playedCards(p).reduce((a, c) => a + ((c.eff && c.eff[key]) || c[key] || 0), 0);
}

// roundIncome 每轮开始的被动收入（income 效果求和）
export function roundIncome(p) {
  const gain = {};
  for (const c of playedCards(p)) {
    const inc = c.eff && c.eff.income;
    if (!inc) continue;
    for (const [k, v] of Object.entries(inc)) gain[k] = (gain[k] || 0) + v;
  }
  return gain;
}

// takeBonus 拿取某空间时的额外获得（bonusOn：{空间id: {资源:n}}）
export function takeBonus(p, spaceId) {
  const gain = {};
  for (const c of playedCards(p)) {
    const table = c.eff && c.eff.bonusOn;
    const g = table && table[spaceId];
    if (!g) continue;
    for (const [k, v] of Object.entries(g)) gain[k] = (gain[k] || 0) + v;
  }
  return gain;
}

// cookRates 最优烹食汇率：sheep/boar/cattle/veg/grain 各键取已打卡中的最大值
export function cookRates(p) {
  const rates = {};
  for (const c of playedCards(p)) {
    const cook = c.cook || (c.eff && c.eff.cook);
    if (!cook) continue;
    for (const [k, v] of Object.entries(cook)) rates[k] = Math.max(rates[k] || 0, v);
  }
  return rates;
}

// bakeOptions 烤面包选项：[{rate, max}]——壁炉/灶台不限量，烤炉受 bakeMax 限制
export function bakeOptions(p) {
  const opts = [];
  for (const id of p.majors) {
    const m = MAJOR_BY_ID[id];
    if (!m || !m.cook || !m.cook.grain) continue;
    opts.push({ rate: m.cook.grain, max: m.bakeMax || 99, label: m.name });
  }
  const r = cookRates(p);
  if (r.grain && !opts.length) opts.push({ rate: r.grain, max: 99, label: null });
  return opts;
}

// bakeBonus 每次烤面包额外食物
export function bakeBonus(p) { return effSum(p, 'bakeBonus'); }

// discounts 费用减免聚合（各键取最大）
export function discounts(p) {
  const d = {};
  for (const c of playedCards(p)) {
    const disc = c.eff && c.eff.discount;
    if (!disc) continue;
    for (const [k, v] of Object.entries(disc)) d[k] = Math.max(d[k] || 0, v);
  }
  return d;
}

// cardCapacity 卡上牲畜栏位总数
export function cardCapacity(p) { return effSum(p, 'capacity'); }

// extraPlow 犁田额外块数
export function extraPlow(p) { return effSum(p, 'extraPlow'); }

// harvestFood 每次收获额外食物
export function harvestFood(p) { return effSum(p, 'harvestFood'); }

// endCardVp 终局卡牌分：固定 vp + perCard×已打职业数 + double 资源加成（每 2 个该资源 +1，至多 4）
export function endCardVp(p) {
  let vp = 0;
  const occCount = p.occPlayed.length;
  for (const c of playedCards(p)) {
    if (c.vp) vp += c.vp;
    if (c.eff && c.eff.vp) vp += c.eff.vp;
    if (c.eff && c.eff.perCard) vp += c.eff.perCard * occCount;
    if (c.double) vp += Math.min(4, Math.floor((p[c.double] || 0) / 2));
  }
  return vp;
}

// reqOk 打出前置检查（family / round / occPlayed）
export function reqOk(p, card, round) {
  const r = (card.eff && card.eff.req) || card.req;
  if (!r) return true;
  if (r.family && p.family < r.family) return false;
  if (r.round && round < r.round) return false;
  if (r.occPlayed !== undefined && p.occPlayed.length < r.occPlayed) return false;
  return true;
}

