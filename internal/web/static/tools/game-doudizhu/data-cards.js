// 斗地主牌库与静态数据：54 张（52 张标准牌 + 大小王）。
// 牌 id：0-51 为标准牌（点数 = id % 13 + 3，花色 = floor(id / 13)），52 = 小王，53 = 大王。
// 点数 rank：3..10 为 3..10，J = 11、Q = 12、K = 13、A = 14、2 = 15、小王 = 16、大王 = 17。
// 纯数据 + 纯函数，零 DOM/i18n 依赖（node 可直接 import 自测）。

export const SMALL_JOKER = 16;
export const BIG_JOKER = 17;
export const MAX_STRAIGHT_RANK = 14; // 顺子/连对/飞机最高只能到 A（2 与王不可入连）

// SUITS 花色符号（渲染角标用，无 i18n 依赖）
export const SUITS = ['♠', '♥', '♣', '♦'];
export const RED_SUITS = [1, 3]; // 红桃、方块用红字

// RANK_LABELS 点数显示串（下标 = 点数 − 3，覆盖 3..15 共 13 档）
const RANK_LABELS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// rankOf 牌 id → 点数
export function rankOf(id) {
  if (id === 52) return SMALL_JOKER;
  if (id === 53) return BIG_JOKER;
  return (id % 13) + 3;
}

// suitOf 牌 id → 花色索引（王返回 -1）
export function suitOf(id) {
  return id >= 52 ? -1 : Math.floor(id / 13);
}

// rankLabel 点数显示串（王返回双语名）
export function rankLabel(id) {
  const r = rankOf(id);
  if (r === SMALL_JOKER) return '🃏';
  if (r === BIG_JOKER) return '🃏';
  return RANK_LABELS[r - 3];
}

// cardName 日志/提示用双语牌名
export function cardName(id) {
  const r = rankOf(id);
  if (r === SMALL_JOKER) return { zh: '小王', en: 'Joker (small)' };
  if (r === BIG_JOKER) return { zh: '大王', en: 'Joker (big)' };
  const label = RANK_LABELS[r - 3];
  const suit = SUITS[suitOf(id)];
  return { zh: `${label}${suit}`, en: `${label}${suit}` };
}

// buildDeck 构造 54 张牌 id（0..53），id 即牌身份
export function buildDeck() {
  const out = [];
  for (let i = 0; i < 54; i++) out.push(i);
  return out;
}

// sortHand 手牌升序（点数优先，同点按花色），返回新数组
export function sortHand(hand) {
  return hand.slice().sort((a, b) => rankOf(a) - rankOf(b) || suitOf(a) - suitOf(b));
}

// isRed 该牌是否用红字渲染
export function isRed(id) {
  return RED_SUITS.includes(suitOf(id)) || rankOf(id) === BIG_JOKER;
}
