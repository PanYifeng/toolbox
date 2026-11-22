// 巫诺（UNO）牌库与静态数据：108 张 = 4 色 × 25 张（0 一张、1-9 各两张、
// 跳过/反转/+2 各两张）+ 4 张变色 + 4 张 +4。纯数据 + 纯函数，零 DOM/i18n 依赖
// （node 可直接 import 自测）。牌 id = DECK 下标，state 里只存数字保证 JSON-safe。

export const RED = 0;
export const YELLOW = 1;
export const GREEN = 2;
export const BLUE = 3;
export const WILD = 4;

// 牌面值：0-9 为数字牌，10 起为功能牌（数字段与功能段分离，便于区间判断）
export const V_SKIP = 10;
export const V_REV = 11;
export const V_DRAW2 = 12;
export const V_WILD = 13;
export const V_WILD4 = 14;

export const HAND_SIZE = 7; // 每人起手 7 张（官方）
export const DEFAULT_TARGET = 500; // 累计到 500 分结束整场（官方建议）
export const TARGET_CHOICES = [200, 500, 1000]; // 开局可选目标分

// 四色牌底与字色（黄色底用深色字保证对比度）
export const CARD_BG = ['#d9534f', '#e8b923', '#3aa757', '#3b7dd8'];
export const CARD_FG = ['#ffffff', '#3a2f00', '#ffffff', '#ffffff'];

export const COLOR_NAMES = [
  { zh: '红', en: 'red' },
  { zh: '黄', en: 'yellow' },
  { zh: '绿', en: 'green' },
  { zh: '蓝', en: 'blue' },
];

// SYMBOLS 牌面短符号（渲染大字与日志共用）
export const SYMBOLS = [
  { zh: '0', en: '0' }, { zh: '1', en: '1' }, { zh: '2', en: '2' }, { zh: '3', en: '3' },
  { zh: '4', en: '4' }, { zh: '5', en: '5' }, { zh: '6', en: '6' }, { zh: '7', en: '7' },
  { zh: '8', en: '8' }, { zh: '9', en: '9' },
  { zh: '跳过', en: 'Skip' },
  { zh: '反转', en: 'Reverse' },
  { zh: '+2', en: '+2' },
  { zh: '变色', en: 'Wild' },
  { zh: '+4', en: '+4' },
];

// buildDeck 构造 108 张牌（下标即牌 id）
function buildDeck() {
  const out = [];
  for (let c = RED; c <= BLUE; c++) {
    out.push({ c, v: 0 });
    for (let v = 1; v <= 9; v++) { out.push({ c, v }); out.push({ c, v }); }
    for (const v of [V_SKIP, V_REV, V_DRAW2]) { out.push({ c, v }); out.push({ c, v }); }
  }
  for (let i = 0; i < 4; i++) out.push({ c: WILD, v: V_WILD });
  for (let i = 0; i < 4; i++) out.push({ c: WILD, v: V_WILD4 });
  return out;
}

export const DECK = buildDeck();

// cardValue 计分面值：数字牌按面值，功能牌 20，万能牌 50（官方赛末计分）
export function cardValue(id) {
  const v = DECK[id].v;
  if (v <= 9) return v;
  return v <= V_DRAW2 ? 20 : 50;
}

// cardSym 渲染用短符号（数字直接用数字，功能牌用图标）
export function cardSym(id) {
  const v = DECK[id].v;
  if (v <= 9) return String(v);
  return ['', '', '', '', '', '', '', '', '', '', '⊘', '⇄', '+2', '★', '+4'][v];
}

// cardName 日志用双语牌名（万能牌本身无色，所选颜色由状态另记）
export function cardName(id) {
  const card = DECK[id];
  const sym = SYMBOLS[card.v];
  if (card.c === WILD) return { zh: sym.zh, en: sym.en };
  const col = COLOR_NAMES[card.c];
  return { zh: `${col.zh}${sym.zh}`, en: `${sym.en} ${col.en}` };
}
