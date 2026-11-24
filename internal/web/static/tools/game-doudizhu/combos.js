// 斗地主牌型解析与合法出牌枚举。纯数据 + 纯函数，零 DOM/i18n 依赖。
// 牌型（10 类）：单张 single｜对子 pair｜三张 trio｜三带一 trio1｜三带二 trio2
//   顺子 straight（≥5 张连续单牌）｜连对 pairs（≥3 对连续）
//   飞机 plane（≥2 组连续三张，可带单 plane1 / 带对 plane2）
//   四带二 four2（两单）/ 四带两对 four2p｜炸弹 bomb｜王炸 rocket
// 连牌（顺子/连对/飞机）最高只能到 A（2 与大小王不可入连）。

import { SMALL_JOKER, BIG_JOKER, MAX_STRAIGHT_RANK, rankOf } from './data-cards.js';

// WING_CAP 翅膀组合枚举上限（防御性；正常牌局远达不到）
const WING_CAP = 400;

// combo 构造牌型对象：rank 为比较用主点数，len 为连牌组数，size 为总张数
function combo(type, rank, len, size) {
  return { type, rank, len, size };
}

// tally 点数计数：rank → 张数
function tally(cards) {
  const m = new Map();
  for (const id of cards) {
    const r = rankOf(id);
    m.set(r, (m.get(r) || 0) + 1);
  }
  return m;
}

// ranksWithCount 指定张数的点数列表（升序）
function ranksWithCount(m, c) {
  const out = [];
  for (const [r, n] of m) if (n === c) out.push(r);
  return out.sort((a, b) => a - b);
}

// consecutive 点数连续且最高不超过 A
function consecutive(ranks) {
  if (!ranks.length) return false;
  if (ranks[ranks.length - 1] > MAX_STRAIGHT_RANK) return false;
  for (let i = 1; i < ranks.length; i++) if (ranks[i] !== ranks[i - 1] + 1) return false;
  return true;
}

// wingsOk 飞机翅膀合法性：per=1 每翅一张（同点至多两张）、per=2 每翅一对
function wingsOk(m, trios, per, n) {
  const used = new Set(trios);
  let total = 0;
  for (const [r, c] of m) {
    if (used.has(r)) continue;
    if (per === 1 && c > 2) return false; // 四张同点不能拆成翅膀
    if (per === 2 && c !== 2) return false;
    total += c;
  }
  return total === n * per;
}

// parseCombo 解析牌型；不构成任何合法牌型时返回 null
export function parseCombo(cards) {
  if (!Array.isArray(cards) || !cards.length) return null;
  if (new Set(cards).size !== cards.length) return null; // 同张牌重复
  const m = tally(cards);
  const size = cards.length;
  const ranks = [...m.keys()].sort((a, b) => a - b);

  if (size === 2 && m.has(SMALL_JOKER) && m.has(BIG_JOKER)) return combo('rocket', BIG_JOKER, 1, 2);
  if (size === 4 && ranks.length === 1) return combo('bomb', ranks[0], 1, 4);
  if (size === 1) return combo('single', ranks[0], 1, 1);
  if (size === 2 && ranks.length === 1) return combo('pair', ranks[0], 1, 2);
  if (size === 3 && ranks.length === 1) return combo('trio', ranks[0], 1, 3);

  const trios = ranksWithCount(m, 3);
  const quads = ranksWithCount(m, 4);
  const pairs = ranksWithCount(m, 2);

  if (size === 4 && trios.length === 1) return combo('trio1', trios[0], 1, 4);
  if (size === 5 && trios.length === 1 && pairs.length === 1) return combo('trio2', trios[0], 1, 5);
  if (size === 6 && quads.length === 1 && ranks.length >= 2) return combo('four2', quads[0], 1, 6);
  if (size === 8 && quads.length === 1 && pairs.length === 2 && ranks.length === 3) {
    return combo('four2p', quads[0], 1, 8);
  }
  if (size >= 5 && ranks.length === size && consecutive(ranks)) {
    return combo('straight', ranks[size - 1], size, size);
  }
  if (size >= 6 && size % 2 === 0 && pairs.length === ranks.length && pairs.length >= 3 && consecutive(pairs)) {
    return combo('pairs', pairs[pairs.length - 1], pairs.length, size);
  }
  if (trios.length >= 2 && consecutive(trios)) {
    const n = trios.length;
    if (size === n * 3) return combo('plane', trios[n - 1], n, size);
    if (size === n * 4 && wingsOk(m, trios, 1, n)) return combo('plane1', trios[n - 1], n, size);
    if (size === n * 5 && wingsOk(m, trios, 2, n)) return combo('plane2', trios[n - 1], n, size);
  }
  return null;
}

// CHAIN_TYPES 连牌型 → 每组张数（用于同型枚举）
const CHAIN_PER = { straight: 1, pairs: 2, plane: 3, plane1: 3, plane2: 3 };

// beats a 能否压过 b（同型同长比点数；炸弹压非炸弹；王炸通吃）
export function beats(a, b) {
  if (!a || !b) return false;
  if (a.type === 'rocket') return b.type !== 'rocket';
  if (b.type === 'rocket') return false;
  if (a.type === 'bomb' && b.type !== 'bomb') return true;
  if (b.type === 'bomb' && a.type !== 'bomb') return false;
  if (a.type !== b.type || a.len !== b.len) return false;
  return a.rank > b.rank;
}

// —— 枚举：全部合法出牌 ——

// rankGroups 按点数分组（rank → 升序牌 id 数组）
export function rankGroups(hand) {
  const m = new Map();
  for (const id of hand.slice().sort((a, b) => rankOf(a) - rankOf(b) || a - b)) {
    const r = rankOf(id);
    if (!m.has(r)) m.set(r, []);
    m.get(r).push(id);
  }
  return m;
}

// take 从某点数取前 n 张（规范取牌：低牌优先）
function take(g, r, n) {
  return g.get(r).slice(0, n);
}

// poolWithout 剩余牌池（去掉已用牌）
function poolWithout(g, used) {
  const usedSet = new Set(used);
  const pool = new Map();
  for (const [r, ids] of g) {
    const rest = ids.filter((id) => !usedSet.has(id));
    if (rest.length) pool.set(r, rest);
  }
  return pool;
}

// wingChoices 从剩余牌池枚举翅膀组合（每份 per 张，共 size 张）
function wingChoices(pool, size, per, cap) {
  const ranks = [...pool.keys()].sort((a, b) => a - b);
  const out = [];
  const cur = [];
  function rec(i, need) {
    if (out.length >= cap) return;
    if (need === 0) { out.push(cur.slice()); return; }
    if (i >= ranks.length) return;
    const maxTake = Math.min(Math.floor(pool.get(ranks[i]).length / per), need / per);
    for (let k = maxTake; k >= 0; k--) {
      const r = ranks[i];
      for (let j = 0; j < k * per; j++) cur.push(pool.get(r)[j]);
      rec(i + 1, need - k * per);
      for (let j = 0; j < k * per; j++) cur.pop();
      if (out.length >= cap) return;
    }
  }
  rec(0, size);
  return out;
}

// chainsOf 枚恰好 len 组连续、每组 per 张、主点 > minRank 的连牌
function chainsOf(g, per, len, minRank, cb) {
  const ranks = [...g.keys()].filter((r) => g.get(r).length >= per && r <= MAX_STRAIGHT_RANK)
    .sort((a, b) => a - b);
  for (let s = 0; s + len - 1 < ranks.length; s++) {
    const seg = ranks.slice(s, s + len);
    if (!consecutive(seg)) continue;
    if (seg[len - 1] <= minRank) continue;
    const cards = [];
    for (const r of seg) cards.push(...take(g, r, per));
    cb(cards, seg);
  }
}

// withWings 连牌加翅膀（三带 / 飞机带单带对）
function withWings(g, cards, n, per, out) {
  const pool = poolWithout(g, cards);
  for (const wings of wingChoices(pool, n * per, per, WING_CAP)) out.push([...cards, ...wings]);
}

// sameType 枚举与 last 同型同长且更大的出牌
function sameType(g, last, out) {
  const above = (r) => r > last.rank;
  const ranks = [...g.keys()].sort((a, b) => a - b);
  if (last.type === 'single') {
    for (const r of ranks) if (above(r)) out.push(take(g, r, 1));
  } else if (last.type === 'pair' || last.type === 'trio') {
    const need = last.type === 'pair' ? 2 : 3;
    for (const r of ranks) if (g.get(r).length >= need && above(r)) out.push(take(g, r, need));
  } else if (last.type === 'trio1' || last.type === 'trio2') {
    for (const r of ranks) {
      if (g.get(r).length < 3 || !above(r)) continue;
      withWings(g, take(g, r, 3), 1, last.type === 'trio1' ? 1 : 2, out);
    }
  } else if (last.type === 'four2' || last.type === 'four2p') {
    for (const r of ranks) {
      if (g.get(r).length < 4 || !above(r)) continue;
      const base = take(g, r, 4);
      withWings(g, base, 2, last.type === 'four2' ? 1 : 2, out);
    }
  } else if (CHAIN_PER[last.type]) {
    const per = CHAIN_PER[last.type];
    chainsOf(g, per, last.len, last.rank, (cards) => {
      if (last.type === 'plane') out.push(cards);
      else if (last.type === 'plane1') withWings(g, cards, last.len, 1, out);
      else if (last.type === 'plane2') withWings(g, cards, last.len, 2, out);
      else out.push(cards);
    });
  }
}

// addBombs 炸弹与王炸（压牌时需严格大于 last）
function addBombs(g, last, out) {
  const minRank = last && last.type === 'bomb' ? last.rank : -1;
  for (const r of [...g.keys()].sort((a, b) => a - b)) {
    if (g.get(r).length === 4 && r > minRank) out.push(take(g, r, 4));
  }
  // 王炸：必须推真实牌 id（52/53）。曾误推点数 16/17，parseCombo 会按 id 反解成 6、7
  // 两张杂牌而丢弃，导致王炸从不出现在合法动作里（提示、AI、联机校验全线失效）。
  if (g.has(SMALL_JOKER) && g.has(BIG_JOKER) && (!last || last.type !== 'rocket')) {
    out.push([g.get(SMALL_JOKER)[0], g.get(BIG_JOKER)[0]]);
  }
}

// allTypes 领出时枚举全部牌型
function allTypes(g, out) {
  const ranks = [...g.keys()].sort((a, b) => a - b);
  for (const r of ranks) {
    const c = g.get(r).length;
    out.push(take(g, r, 1));
    if (c >= 2) out.push(take(g, r, 2));
    if (c >= 3) {
      out.push(take(g, r, 3));
      withWings(g, take(g, r, 3), 1, 1, out);
      withWings(g, take(g, r, 3), 1, 2, out);
    }
    if (c >= 4) {
      withWings(g, take(g, r, 4), 2, 1, out);
      withWings(g, take(g, r, 4), 2, 2, out);
    }
  }
  chainsOf(g, 1, 5, -1, (cards) => out.push(cards));
  for (let len = 6; len <= 12; len++) chainsOf(g, 1, len, -1, (cards) => out.push(cards));
  for (let len = 3; len <= 10; len++) chainsOf(g, 2, len, -1, (cards) => out.push(cards));
  for (let len = 2; len <= 6; len++) {
    chainsOf(g, 3, len, -1, (cards) => {
      out.push(cards);
      withWings(g, cards, len, 1, out);
      withWings(g, cards, len, 2, out);
    });
  }
  addBombs(g, null, out);
}

// legalPlays 全部合法出牌（last 为 null 表示领出）；返回牌 id 数组列表
export function legalPlays(hand, last) {
  const g = rankGroups(hand);
  const out = [];
  if (!last) allTypes(g, out);
  else {
    sameType(g, last, out);
    addBombs(g, last, out);
  }
  // 去掉重复组合（不同枚举路径可能撞车）并校验每条都是合法牌型
  const seen = new Set();
  const uniq = [];
  for (const cards of out) {
    const key = cards.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    const cmb = parseCombo(cards);
    if (!cmb) continue;
    if (last && !beats(cmb, last)) continue;
    seen.add(key);
    uniq.push(cards);
  }
  return uniq;
}

// canPlayCards 校验一组具体出牌是否合法（apply 的唯一合法性复核入口）
export function canPlayCards(hand, cards, last) {
  if (!Array.isArray(cards) || !cards.length) return null;
  const have = new Set(hand);
  for (const id of cards) if (!have.has(id)) return null;
  const cmb = parseCombo(cards);
  if (!cmb) return null;
  if (last && !beats(cmb, last)) return null;
  return cmb;
}
