// 大富翁地产详情文本：租金档位与当前实际租金的说明串（渲染层与提示条共用，纯函数）。
import { getLang } from '/core/i18n.js';
import { SPACES, groupSpaces } from './data-board.js';
import { ownerOf, ownsAll, rentFor, ownedInGroup, RAIL_RENTS, UTIL_MULT } from './rules.js';

// rentalHint 该格当前租金说明：无主/抵押/成组/房屋档位
export function rentalHint(s, i) {
  const sp = SPACES[i];
  const lang = getLang();
  const owner = ownerOf(s, i);
  const L = {
    unowned: { zh: '无人持有 · 落地可购买', en: 'Unowned — may be purchased' },
    mortgaged: { zh: '已抵押 · 不收租', en: 'Mortgaged — no rent' },
    groupNote: { zh: '独占整组 · 无房租金加倍', en: 'Owns full group — doubled rent' },
    railNote: { zh: '铁路租金', en: 'Railroad rent' },
    utilNote: { zh: '公用事业租金 = 骰点 ×', en: 'Utility rent = dice ×' },
  };
  const pick = (o) => o[lang] || o.zh;
  if (owner < 0) return pick(L.unowned);
  if (s.mortgaged[i]) return pick(L.mortgaged);
  if (sp.type === 'rail') {
    const n = ownedInGroup(s, owner, 'rail');
    return `${pick(L.railNote)}: $${RAIL_RENTS[Math.max(0, n - 1)]}`;
  }
  if (sp.type === 'util') {
    const n = ownedInGroup(s, owner, 'util');
    return `${pick(L.utilNote)}${UTIL_MULT[Math.max(0, n - 1)]}`;
  }
  const h = s.houses[i] || 0;
  const full = ownsAll(s, owner, sp.group);
  const base = h > 0 ? sp.rent[h] : sp.rent[0] * (full ? 2 : 1);
  const note = h === 0 && full ? ` (${pick(L.groupNote)})` : '';
  const tier = h === 5 ? { zh: '旅馆', en: 'Hotel' } : h > 0
    ? { zh: `${h} 栋房屋`, en: `${h} house(s)` } : { zh: '无房', en: 'No houses' };
  return `${pick(tier)}: $${base}${note}`;
}

// groupRentTable 整组租金表（选中格时展示全组档位）
export function groupRentTable(s, i) {
  const sp = SPACES[i];
  if (sp.type !== 'prop') return [];
  const owner = ownerOf(s, i);
  return groupSpaces(sp.group).map((x) => ({
    i: x,
    name: SPACES[x].short,
    houses: s.houses[x] || 0,
    rent: owner >= 0 ? rentFor(s, x, 0) : 0,
  }));
}
