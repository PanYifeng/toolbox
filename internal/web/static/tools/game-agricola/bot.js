// 农场主启发式 AI：同步、无状态、只依赖 legalActions + state。
// 策略骨架：喂食缺口 > 家庭成长 > 房间/翻新 > 关键资源 > 动物 > 卡牌；
// 子阶段（建/犁/播/围栏/翻新/打牌）按当前 pending 贪心推进。
// 确定性：抖动用 seed+日志长度的哈希派生（不污染 state.rng）。

import * as E from './engine.js';
import * as I from './cards-interp.js';
import { HARVEST_ROUNDS } from './actionboard-data.js';

// jitter 非侵入式伪随机（避免 Math.random 破坏复现）
function jitter(s) {
  const x = Math.imul((s.rng.seed ^ (s.log.length * 2654435761)) >>> 0, 40503) >>> 0;
  return (x % 1000) / 1000;
}

// nextHarvestGap 距下一次收获还有几轮（当前轮结束时算 0）
function nextHarvestGap(round) {
  for (const r of HARVEST_ROUNDS) if (r >= round) return r - round;
  return 99;
}

// bot 入口：按阶段分派（兜底返回首个合法动作，框架要求必有返回）
export function bot(s, legal) {
  if (!legal.length) return null;
  const p = s.players[E.currentPlayer(s)];
  let act = null;
  if (s.phase.kind === 'feed') act = feedBot(p, legal);
  else if (s.phase.kind === 'sub') act = subBot(s, p, legal);
  else act = placeBot(s, p, legal);
  return act || legal[0];
}

// feedBot 喂食：缺口内按价值从低到高烹煮（菜 > 羊 > 猪 > 谷 > 牛），够即确认
function feedBot(p, legal) {
  if (p.food >= E.feedNeedOf(p)) return legal.find((a) => a.kind === 'feedConfirm');
  const prio = ['veg', 'sheep', 'boar', 'grain', 'cattle'];
  for (const res of prio) {
    const opts = legal.filter((a) => a.kind === 'feedCook' && a.res === res);
    if (opts.length) return opts[opts.length - 1]; // 取 n 最大的那个
  }
  return legal.find((a) => a.kind === 'feedConfirm');
}

// subBot 子阶段推进：按 pending 类型贪心
function subBot(s, p, legal) {
  const pd = s.pending;
  const has = (kind) => legal.find((a) => a.kind === kind);
  switch (pd.type) {
    case 'build': return buildStep(p, pd, legal, has);
    case 'plow': return plowStep(s, p, pd, legal);
    case 'plowsow': return plowsowStep(s, p, pd, legal);
    case 'sow': return sowStep(s, p, pd, legal);
    case 'fence': return fenceStep(p, pd, legal);
    case 'renov': return renovStep(s, p, pd, legal);
    case 'occ': return cardStep(s, p, legal, 'subOcc', has);
    case 'minor': return cardStep(s, p, legal, 'subMinor', has);
    default: return has('subDone') || has('subCancel');
  }
}

// buildStep 建房优先（支撑家庭成长），至多补 1 个马厩；合法即取，防 place↔cancel 死循环
function buildStep(p, pd, legal, has) {
  if (has('subRoom')) return legal.find((a) => a.kind === 'subRoom');
  if (has('subStable') && pd.stables.length === 0) {
    return legal.find((a) => a.kind === 'subStable');
  }
  return has('subDone') || has('subCancel');
}

// plowStep 犁田：犁满上限即收尾
function plowStep(s, p, pd, legal) {
  void s;
  if (pd.plowed.length < 1 + I.extraPlow(p)) {
    const act = legal.find((a) => a.kind === 'subPlow');
    if (act) return act;
  }
  return legal.find((a) => a.kind === 'subDone');
}

// plowsowStep 犁并播：先犁，再播谷，食物紧则烤面包
function plowsowStep(s, p, pd, legal) {
  if (pd.plowed.length < 1 + I.extraPlow(p)) {
    const act = legal.find((a) => a.kind === 'subPlow');
    if (act) return act;
  }
  return sowStep(s, p, pd, legal);
}

// sowStep 播种：优先谷（留 1 棵计分），菜后播；食物缺口大先烤面包；
// 无田可播时仍烤面包换进度（place sow 合法即保证有非取消动作，防 place↔cancel 死循环）
function sowStep(s, p, pd, legal) {
  const gap = nextHarvestGap(s.round);
  const need = E.feedNeedOf(p) + (gap > 0 ? 2 * p.family : 0);
  if (!pd.baked && p.food < need) {
    const bakes = legal.filter((a) => a.kind === 'subBake');
    if (bakes.length) return bakes[bakes.length - 1]; // 烤最多
  }
  const grainSown = pd.sown.filter((x) => x.crop === 'grain').length;
  if (p.grain - grainSown > 1) {
    const act = legal.find((a) => a.kind === 'subSow' && a.crop === 'grain');
    if (act) return act;
  }
  const anySow = legal.find((a) => a.kind === 'subSow');
  if (anySow) return anySow;
  if (!pd.baked) {
    const bakes = legal.filter((a) => a.kind === 'subBake');
    if (bakes.length) return bakes[bakes.length - 1];
  }
  return legal.find((a) => a.kind === 'subDone') || legal.find((a) => a.kind === 'subCancel');
}

// fenceStep 围栏：选「单格即可负担」的最便宜格，再贴邻扩一格；付不起则收尾/撤选兜底
function fenceStep(p, pd, legal) {
  const done = legal.find((a) => a.kind === 'subDone');
  if (pd.sel.length === 0) {
    let bestAct = null;
    let bestCost = Infinity;
    for (const a of legal.filter((x) => x.kind === 'subFenceSel')) {
      const c = E.fenceCostOf(p, [a.idx]);
      if (c <= p.wood && c < bestCost) { bestCost = c; bestAct = a; }
    }
    return bestAct || legal.find((a) => a.kind === 'subCancel') || legal[0];
  }
  if (pd.sel.length === 1) {
    const [first] = pd.sel;
    for (const nb of [first - 5, first + 5, first - 1, first + 1]) {
      const act = legal.find((a) => a.kind === 'subFenceSel' && a.idx === nb);
      if (act && E.fenceCostOf(p, [...pd.sel, nb]) <= p.wood) return act;
    }
    if (done) return done;
    return unselectOrCancel(p, pd, legal);
  }
  return done || unselectOrCancel(p, pd, legal);
}

// unselectOrCancel 卡死兜底：先撤掉已选格（下轮可取消），再取消
function unselectOrCancel(p, pd, legal) {
  void p;
  const undo = legal.find((a) => a.kind === 'subFenceSel' && a.idx === pd.sel[0]);
  return undo || legal.find((a) => a.kind === 'subCancel') || legal[0];
}

// renovStep 翻新/购大设施：没烹饪设备先壁炉/灶台，后期翻新；否则购任意可负担大设施
// （place renov 合法 ⇔ 可翻新或可购，二者必有其一，保证进度防死循环）
function renovStep(s, p, pd, legal) {
  if (pd.didRenov || pd.major) return legal.find((a) => a.kind === 'subDone');
  const hasCook = p.majors.some((id) => ['fireplace', 'hearth'].includes(id));
  if (!hasCook) {
    const buy = legal.find((a) => a.kind === 'subMajor' && (a.id === 'hearth' || a.id === 'fireplace'));
    if (buy) return buy;
  }
  if (s.round >= 9 && legal.some((a) => a.kind === 'subRenovate')) {
    return legal.find((a) => a.kind === 'subRenovate');
  }
  const anyMajor = legal.find((a) => a.kind === 'subMajor');
  if (anyMajor) return anyMajor;
  if (legal.some((a) => a.kind === 'subRenovate')) {
    return legal.find((a) => a.kind === 'subRenovate');
  }
  return legal.find((a) => a.kind === 'subCancel');
}

// cardStep 打牌：优先栏位/收入/加成类效果，其次任意可打，否则取消
function cardStep(s, p, legal, kind, has) {
  void s; void p;
  const plays = legal.filter((a) => a.kind === kind);
  if (plays.length) return plays[0];
  return has('subCancel');
}

// placeBot 放工：启发式打分 + 抖动取最大
function placeBot(s, p, legal) {
  let best = null;
  let bestScore = -Infinity;
  for (const a of legal) {
    const v = spaceScore(s, p, a.space) + jitter(s) * 0.6;
    if (v > bestScore) { bestScore = v; best = a; }
  }
  return best;
}

// growthScore 家庭成长/建房分值：口粮富余（够现有家庭 + 新成员 + 缓冲）才给满速，
// 否则降档——先去攒粮，别让乞讨卡滚雪球
function growthScore(s, p, base) {
  const gap = nextHarvestGap(s.round);
  const need = 2 * (p.family + 1) + (gap <= 1 ? 0 : 2);
  return p.food >= need ? base : base - 6;
}

// spaceScore 各空间启发式分值
function spaceScore(s, p, id) {
  const gap = nextHarvestGap(s.round);
  const foodShort = p.food < 2 * p.family + (gap === 0 ? 0 : 2);
  const rooms = E.roomCountOf(p);
  switch (id) {
    // 家庭成长是最大分差来源，但先看口粮：新增成员每轮多吃 2 食，
    // 粮仓见底还硬grow会滚出十几张乞讨卡（-3/张）直接崩盘
    case 'growth': return growthScore(s, p, 9);
    case 'growth2': return growthScore(s, p, 10);
    // 建房/芦苇是家庭成长的前置瓶颈：没空房时成长位永远拿不到，实测 14 轮 2 人不增
    case 'build': {
      if (E.canPay(p, E.roomCostOf(p)) && rooms < 5) return rooms <= p.family ? growthScore(s, p, 8) : 6.5;
      return 1;
    }
    case 'start': return 2 + (s.round <= 3 ? 1 : 0);
    case 'wood': return 4 - s.round * 0.12;
    case 'clay': return s.round <= 8 ? 3.6 : 1.5;
    case 'stone': case 'stone2': return s.round >= 8 ? 3.4 : 1.2;
    case 'reed': return rooms <= p.family && rooms < 5 ? 5 : (E.freeRooms(p) >= 0 && rooms < 5 ? 3 : 1.5);
    case 'grain': return p.grain === 0 ? 4 : 0.8;
    case 'veg': return p.veg === 0 && s.round >= 6 ? 3 : 0.8;
    case 'laborer': case 'fishing': return foodShort ? 5 : 0.4;
    case 'sheep': return 3.2;
    case 'boar': return 3.6;
    case 'cattle': return 4;
    case 'sow': case 'plowsow': return p.grain > 0 ? 5 : 1.5;
    case 'plow': return p.farm.filter((f) => f.t === 'field').length < 3 ? 3 : 1.2;
    case 'fence': return Object.keys(p.groups).length === 0 && p.wood >= 6 ? 4.5 : 0.8;
    case 'renov': {
      const wantCook = !p.majors.some((m) => ['fireplace', 'hearth'].includes(m));
      if (wantCook && E.affordMajors(s, p).length) return 5;
      return E.canRenovate(p) && s.round >= 10 ? 5 : 0.5;
    }
    // 卡牌亲和带抖动：基分低但偶发冲高，让 AI 时不时打牌（否则轨迹与 seed 无关）
    case 'occ': return s.round <= 6 ? 2.4 + jitter(s) * 2.2 : 1;
    case 'minor': return s.round <= 8 ? 2.0 + jitter(s) * 2.2 : 0.8;
    default: return 1;
  }
}
