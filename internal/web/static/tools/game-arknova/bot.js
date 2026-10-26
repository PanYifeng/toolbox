// 方舟动物园 AI：同步启发式（确定性，无 Math.random —— 联机重放可复现）。
// 策略：优先放高魅力动物 → 缺钱走赞助/协会资金 → 空间不足建造 → 手牌薄抽卡 →
// 项目可达即拿 → 声望 4 且保护点临近门槛时冲声望；break 区卡仅在低价值时借用。

import {
  animalOf, sponsorOf, projectOf, endgameOf, legalActions, apply,
  canPlaceAnimal, projFulfilled, effEffects, encUsed, encMeta,
} from './engine.js';
import { RULES } from './data-cards.js';

// jitter 确定性微扰（打破平手，随日志长度变化）
function jitter(s, i) {
  return ((s.log.length * 31 + i * 7) % 97) / 10000;
}

// cardValue 手牌/市场卡估值（动物按魅力+保护点，协会按效果数）
function cardValue(id) {
  const a = animalOf(id);
  if (a) return a.a * 2 + a.cp + (a.rep ? 3 : 0);
  const sp = sponsorOf(id);
  if (sp) return 4 + sp.eff.length + sp.ap + sp.cp;
  return 0;
}

// evalAnimals 动物行动估值：可放动物的总价值（近似：逐只独立判定）
function evalAnimals(s) {
  const p = s.players[s.turn];
  const c = p.cards.find((x) => x.cat === 'animals' && !x.broken);
  if (!c) return 0;
  let v = 0;
  const budget = 8 * c.str;
  let spent = 0;
  const cand = [...new Set(p.hand)].filter((id) => animalOf(id))
    .map((id) => ({ id, a: animalOf(id) }))
    .sort((x, y) => cardValue(y.id) - cardValue(x.id));
  for (const { id, a } of cand) {
    for (const e of Object.keys(p.enc)) {
      const r = canPlaceAnimal(p, id, e, spent, budget);
      if (r.ok) { v += cardValue(id); spent += r.price; break; }
    }
  }
  return v > 0 ? 6 + v : 0.5;
}

// evalAssoc 协会行动估值
function evalAssoc(s) {
  const p = s.players[s.turn];
  const c = p.cards.find((x) => x.cat === 'association' && !x.broken);
  if (!c) return 0;
  let v = 1;
  const legal = legalActions(s).length; // action 阶段拿不到子选项，这里按状态估算
  // 项目可达
  for (const pid of s.projects) {
    if (projectOf(pid) && projFulfilled(p, projectOf(pid)) >= 1) v += 6;
  }
  if (p.money < 12) v += 3 + c.str;
  // 保护点已达门槛 → 冲声望触发终局（防 bot 永不升声望、对局无限拖）
  const goal = RULES.cpGoal[s.players.length] || 10;
  if (p.cp >= goal && p.rep < 5) v += 12;
  if (p.rep === 4 && p.cp >= 6) v += 5;
  // 手牌对图标的需求
  const need = { Science: 0, Partner_Zoo: 0 };
  for (const id of p.hand) {
    for (const r of (animalOf(id) || sponsorOf(id) || { req: [] }).req) {
      if (need[r] !== undefined) need[r]++;
    }
  }
  if (need.Science > p.universities) v += 3;
  if (need.Partner_Zoo > p.partnerZoos) v += 3;
  return v + (legal ? 0 : 0);
}

// evalBuild 建造行动估值：空间不足时高价值
function evalBuild(s) {
  const p = s.players[s.turn];
  const c = p.cards.find((x) => x.cat === 'build' && !x.broken);
  if (!c) return 0;
  let v = 0;
  for (const id of p.hand) {
    const a = animalOf(id);
    if (!a) continue;
    let fits = false;
    for (const e of Object.keys(p.enc)) {
      if (canPlaceAnimal(p, id, e, 0, 999).ok) { fits = true; break; }
    }
    if (!fits) v += 4 + a.a;
  }
  if (p.money >= 15 && c.str >= 2 && p.kiosk < 3) v += 2;
  return v;
}

// animalBudgetNow 当前动物行动预算（按在岗动物卡档位估算）
function animalBudgetNow(p) {
  const c = p.cards.find((x) => x.cat === 'animals' && !x.broken);
  return 8 * (c ? c.str : 1);
}

// animalFits 动物在现有围栏 + 预算内可放置
function animalFits(p, id, budget) {
  for (const e of Object.keys(p.enc)) {
    if (p.enc[e].on && canPlaceAnimal(p, id, e, 0, budget).ok) return true;
  }
  return false;
}

// takeValue 拿牌估值：现有围栏/预算放不进的动物大幅降权（防囤积废牌、市场卡死）
function takeValue(p, id) {
  let v = cardValue(id);
  const an = animalOf(id);
  if (an && !animalFits(p, id, animalBudgetNow(p))) v -= 6;
  return v;
}

// evalCards 卡牌行动估值：手牌薄时抽卡
function evalCards(s) {
  const p = s.players[s.turn];
  const c = p.cards.find((x) => x.cat === 'cards' && !x.broken);
  if (!c) return 0;
  let v = 0;
  if (p.hand.length < 6) v += 5 + c.str;
  let good = 0;
  for (let i = 0; i < 5; i++) {
    if (s.market[i] && p.money >= i && takeValue(p, s.market[i]) >= 6) good++;
  }
  v += good * 2;
  // 市场空置且牌堆有牌 → 抽卡补市场（防止牌路淤死）
  if (good === 0 && !s.market[0] && s.deck.length) v += 6;
  // 手上无动物可放、无协会可打 → 抽卡找机会（防赞助收入死循环）
  if (good === 0) {
    const stuck = !p.hand.some((id) => {
      const an = animalOf(id);
      if (an) return Object.keys(p.enc).some((e) => canPlaceAnimal(p, id, e, 0, 999).ok);
      const sp = sponsorOf(id);
      return sp && p.money >= sp.c;
    });
    if (stuck) v += 4;
  }
  return v;
}

// evalSponsors 赞助行动估值：按最优单张（一次行动只打 1 张，按手牌总量估值会虚高卡死其它行动）
function evalSponsors(s) {
  const p = s.players[s.turn];
  const c = p.cards.find((x) => x.cat === 'sponsors' && !x.broken);
  if (!c) return 0;
  let v = 2;
  if (p.money < 12) v += 4 + c.str;
  let best = 0;
  for (const id of p.hand) {
    const sp = sponsorOf(id);
    if (sp && p.money >= sp.c) best = Math.max(best, 3 + sp.eff.length + sp.ap + sp.cp - sp.c * 0.3);
  }
  v += best;
  return v;
}

// botAction action 主阶段决策
function botAction(s, legal) {
  const p = s.players[s.turn];
  let best = null;
  let bestV = -1;
  legal.forEach((a, i) => {
    let v = 0;
    if (a.kind === 'act') {
      const cat = p.cards[a.card].cat;
      if (cat === 'animals') v = evalAnimals(s);
      else if (cat === 'association') v = evalAssoc(s);
      else if (cat === 'build') v = evalBuild(s);
      else if (cat === 'cards') v = evalCards(s);
      else v = evalSponsors(s);
    } else if (a.kind === 'useBreak') {
      v = a.owner === s.turn ? 1.5 : 0.8;
    }
    v += jitter(s, i);
    if (v > bestV) { bestV = v; best = a; }
  });
  return best || legal[0];
}

// botPlace 放置决策：按 魅力×2+保护点−价格 降序逐只放置
// 动物价格由行动预算（8×档位）承担、不动用现金 → 有合法放置就放（白得魅力/保护点）
function botPlace(s, legal) {
  const places = legal.filter((a) => a.kind === 'place');
  if (!places.length) return legal.find((a) => a.kind === 'finish');
  let best = null;
  let bestV = -Infinity;
  places.forEach((a, i) => {
    const an = animalOf(a.card);
    const r = canPlaceAnimal(s.players[s.turn], a.card, a.enc, s.sub.spent, s.sub.budget);
    const v = an.a * 2 + an.cp + (an.rep ? 3 : 0) - (r.price || 0) * 0.5 + jitter(s, i);
    if (v > bestV) { bestV = v; best = a; }
  });
  return best || legal.find((a) => a.kind === 'finish');
}

// botTake 拿牌决策：位置便宜且卡优的先拿
function botTake(s, legal) {
  const p = s.players[s.turn];
  const takes = legal.filter((a) => a.kind === 'take');
  let best = null;
  let bestV = p.money > 30 ? -1 : 0.5; // 门槛：不值得就结束；资金充裕时顺手拿便宜牌
  takes.forEach((a, i) => {
    const v = takeValue(p, s.market[a.pos]) - a.pos * 1.5 + jitter(s, i);
    if (v > bestV && p.money >= a.pos) { bestV = v; best = a; }
  });
  return best || legal.find((a) => a.kind === 'finish');
}

// botSponsor 打协会卡决策
function botSponsor(s, legal) {
  const plays = legal.filter((a) => a.kind === 'playSponsor');
  if (!plays.length) return legal.find((a) => a.kind === 'finish');
  let best = null;
  let bestV = -1;
  plays.forEach((a, i) => {
    const sp = sponsorOf(a.card);
    const v = 4 + sp.eff.length * 2 + sp.ap + sp.cp - sp.c * 0.3 + jitter(s, i);
    if (v > bestV) { bestV = v; best = a; }
  });
  return best || legal.find((a) => a.kind === 'finish');
}

// botAssoc 协会子决策
function botAssoc(s, legal) {
  const p = s.players[s.turn];
  const proj = legal.find((a) => a.opt === 'project');
  if (proj) return proj;
  // 保护点已达门槛 → 一路升声望到 5 触发终局（防死循环）
  const goal = RULES.cpGoal[s.players.length] || 10;
  if (p.cp >= goal && p.rep < 5) {
    const up = legal.find((a) => a.opt === 'rep');
    if (up) return up;
  }
  if (p.rep === 4 && legal.find((a) => a.opt === 'rep')) return legal.find((a) => a.opt === 'rep');
  if (p.money < 10) return legal.find((a) => a.opt === 'money');
  const uni = legal.find((a) => a.opt === 'uni');
  const pz = legal.find((a) => a.opt === 'pz');
  let needSci = 0; let needPz = 0;
  for (const id of p.hand) {
    for (const r of (animalOf(id) || sponsorOf(id) || { req: [] }).req) {
      if (r === 'Science') needSci++;
      if (r === 'Partner_Zoo') needPz++;
    }
  }
  if (needSci > p.universities && uni) return uni;
  if (needPz > p.partnerZoos && pz) return pz;
  return legal.find((a) => a.opt === 'money') || legal[0];
}

// botBuild 建造子决策：优先解锁被卡手牌的围栏
function botBuild(s, legal) {
  if (!legal.length) return null;
  const p = s.players[s.turn];
  const rank = ['std5', 'std3', 'rh0', 'av', 'std2', 'rh1', 'pz', 'kiosk', 'rest'];
  const blocked = [];
  for (const id of p.hand) {
    const a = animalOf(id);
    if (!a) continue;
    let fits = false;
    for (const e of Object.keys(p.enc)) if (canPlaceAnimal(p, id, e, 0, 999).ok) fits = true;
    if (!fits) blocked.push(a);
  }
  const wantBig = blocked.some((a) => a.s >= 4);
  let best = null;
  let bestV = -1;
  legal.forEach((a, i) => {
    let v = 5 - rank.indexOf(a.what) * 0.5 + jitter(s, i);
    if (wantBig && ['std5', 'rh0', 'av'].includes(a.what)) v += 4;
    if (blocked.some((x) => x.pz) && a.what === 'pz') v += 4;
    if (a.what === 'kiosk' && p.money > a.cost + 10) v += 1;
    if (v > bestV) { bestV = v; best = a; }
  });
  return best || legal[0];
}

// botDiscard 弃牌决策：弃估值最低的卡
function botDiscard(s, legal) {
  const p = s.players[s.sub.seat];
  const drops = legal.filter((a) => a.kind === 'discardCard');
  if (!drops.length) return legal.find((a) => a.kind === 'finish');
  let best = null;
  let bestV = Infinity;
  drops.forEach((a, i) => {
    let v = cardValue(a.card) + jitter(s, i);
    const an = animalOf(a.card);
    if (an && !animalFits(p, a.card, animalBudgetNow(p))) v -= 6;
    if (v < bestV) { bestV = v; best = a; }
  });
  return best;
}

// bot 主入口（框架协议）
export function bot(s, legal) {
  if (!legal || !legal.length) return null;
  if (s.phase === 'endgame') {
    const eg = (i) => (s.endgameOffer[i] ? endgameOf(s.endgameOffer[i]) : null);
    return { kind: 'pickEndgame', idx: eg(1) && (!eg(0) || jitter(s, 1) > 0.5) ? 1 : 0 };
  }
  if (s.phase === 'discard') return botDiscard(s, legal);
  if (s.phase === 'place') return botPlace(s, legal);
  if (s.phase === 'take') return botTake(s, legal);
  if (s.phase === 'sponsor') return botSponsor(s, legal);
  if (s.phase === 'assoc') return botAssoc(s, legal);
  if (s.phase === 'build') return botBuild(s, legal);
  return botAction(s, legal);
}
