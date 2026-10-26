// 方舟动物园 renderBoard：自绘全部面板（框架契约 renderBoard(el, state, legal, pick)）。
// 新手引导：每阶段白话提示（an.ui.p*）+ 概念小面板（行动卡档位/声望/魅力vs保护点/打烊）+
// 非法操作白话反馈（canPlaceAnimal reason → an.ui.noSpace 等，行内提示不静默）。
// 移动优先：竖向堆叠（地图板 → 市场 → 行动卡 → 玩家面板），clamp() 字号，≥44px 触达。
import { t, tr, getLang } from '/core/i18n.js';
import { fmt } from '/core/boardgame.js';
import {
  animalOf, sponsorOf, projectOf, endgameOf, encUsed, encMeta, effTerrain,
  canPlaceAnimal, catName, encShow, egBonusCP, projFulfilled, effEffects,
} from './engine.js';
import { TAGS, VARIANTS, RULES, ABILITIES } from './data-cards.js';
import { aEmoji, spEmoji, projEmoji, habitatOf, ENC_ICON, CAT_ICON, EG_ICON } from './data-visual.js';

// —— 小工具 ——

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const nm = (x) => esc(tr(x));
function has(arr, a) { return arr.some((x) => JSON.stringify(x) === JSON.stringify(a)); }

// animalMeta 动物卡摘要行：emoji 锚点 + 体型/价格/需求/岩石水域/魅力/保护点（符号全局统一：💰🌟🛡️⛰️🌊）
function animalMeta(a) {
  const bits = [`${a.s}${t('an.ui.sizeSlot')}${a.p ? ` · 💰${a.p}` : ''}`];
  if (a.rk) bits.push(`⛰️${a.rk}`);
  if (a.wt) bits.push(`🌊${a.wt}`);
  if (a.a) bits.push(`🌟+${a.a}`);
  if (a.cp) bits.push(`🛡️+${a.cp}`);
  for (const r of a.req) bits.push(`「${nm(TAGS[r] || { zh: r, en: r })}」`);
  return bits.join(' ');
}
function sponsorMeta(sp) {
  const bits = [`💰${sp.c}`];
  if (sp.ap) bits.push(`🌟+${sp.ap}`);
  if (sp.cp) bits.push(`🛡️+${sp.cp}`);
  for (const r of sp.req) bits.push(`「${nm(TAGS[r] || { zh: r, en: r })}」`);
  return bits.join(' ')
}

// cardBand 卡面左侧色带：动物按类群栖息色，协会卡统一金色
function cardBand(id) {
  const a = animalOf(id);
  const sp = a ? null : sponsorOf(id);
  const color = a ? habitatOf(a).color : (sp ? '#d6a94e' : 'var(--border)');
  return `style="border-left:4px solid ${color}"`;
}

// animalHead 动物卡头行（emoji 小角标锚点 + 名称 + 性别），市场/手牌/弹窗共用
function animalHead(id, a) {
  return `<span class="an-cemoji">${aEmoji(id)}</span><span class="an-card-name">${nm(a.n)}${a.g === 'M' ? '♂' : '♀'}</span>`;
}
// sponsorHead 协会卡头行
function sponsorHead(id, sp) {
  return `<span class="an-cemoji">${spEmoji(id)}</span><span class="an-card-name">${nm(sp.n)}</span>`;
}

// photoUrl 动物真实照片（Wikimedia Commons，img/animals/<id>.jpg；缺图由绑定 onerror 回退移除，emoji 角标仍在）
const photoUrl = (id) => `/tools/game-arknova/img/animals/${id}.jpg`;
// animalPhoto 置顶照片条（object-fit:cover 固定高）；加载失败由 bindPhotoFallback 移除
function animalPhoto(id) {
  return `<img class="an-photo" loading="lazy" src="${photoUrl(id)}" alt="">`;
}
// bindPhotoFallback CSP 兼容：不能用内联 onerror，改事件绑定
function bindPhotoFallback($div) {
  $div.querySelectorAll('img.an-photo').forEach(($img) => {
    $img.addEventListener('error', () => $img.remove(), { once: true });
  });
}

// whyBlock 非法放置的白话解释（reason 码 → 提示文案）
function whyBlock(r) {
  const map = {
    noSpace: ['noSpace', { n: r.need || '?', m: r.have ?? '?' }],
    needRock: ['needRock', { n: r.need, m: r.have }],
    needWater: ['needWater', { n: r.need, m: r.have }],
    dupSpecies: ['dupSpecies', {}],
    petOnly: ['petOnly', {}],
    pzPetsOnly: ['pzPetsOnly', {}],
    specialMismatch: ['specialMismatch', {}],
    noBudget: ['noBudget', { n: r.need, m: r.left }],
    req: ['req', { m: (r.missing || []).map((x) => nm(TAGS[x.key] || { zh: x.key, en: x.key })).join('、') }],
    notBuilt: ['notBuilt', {}],
  };
  const e = map[r.reason];
  if (!e) return '';
  return `<div class="an-why"><b>${t('an.ui.whyTitle')}</b>${esc(fmt(t(`an.ui.${e[0]}`), e[1]))}</div>`;
}

// —— 卡牌放大弹窗（小屏可读性：🔍 点卡查看完整信息） ——

// EFF_DESC 协会卡效果白话（{zh,en} 模板，{v}=数值 {t}=标签名）
const EFF_DESC = {
  income: { zh: '每次打烊额外收入 💰{v}', en: 'Extra 💰{v} income at each break' },
  aMoney: { zh: '协会资金行动额外 +💰{v}', en: 'Association money action +💰{v}' },
  anDisc: { zh: '购买动物立减 💰{v}', en: '💰{v} off animal purchases' },
  bDisc: { zh: '建造立减 💰{v}', en: '💰{v} off builds' },
  cDraw: { zh: '卡牌行动多抽 {v} 张', en: 'Draw {v} extra card(s) in Cards action' },
  cTake: { zh: '卡牌行动多拿 {v} 张', en: 'Take {v} extra card(s) in Cards action' },
  endA: { zh: '终局魅力 +{v}', en: '+{v} appeal at game end' },
  endAUni: { zh: '每所大学终局魅力 +{v}', en: '+{v} appeal per university at game end' },
  ignT: { zh: '放置动物可无视 1 个「{t}」需求', en: 'Ignore 1 "{t}" requirement when placing' },
  endATag: { zh: '每种「{t}」动物终局魅力 +{v}', en: '+{v} appeal per {t} species at game end' },
  money: { zh: '打出立即获得 💰{v}', en: 'Gain 💰{v} when played' },
  appeal: { zh: '打出立即 🌟+{v}', en: '+{v} appeal when played' },
  draw: { zh: '打出立即抽 {v} 张牌', en: 'Draw {v} cards when played' },
  pz: { zh: '合作动物园 +{v}', en: '+{v} partner zoo(s)' },
  uni: { zh: '大学 +{v}', en: '+{v} university' },
  staff: { zh: '协会员工 +{v}', en: '+{v} worker(s)' },
  rep: { zh: '声望 +{v}', en: '+{v} reputation' },
  cp: { zh: '保护点 +{v}', en: '+{v} conservation points' },
  terr: { zh: '为一座围栏加装岩石/水域', en: 'Add rock/water to one enclosure' },
};

// effLines 协会卡效果行（数值/标签代入模板）
function effLines(sp) {
  return sp.eff.map((e) => {
    const d = EFF_DESC[e.k];
    if (!d) return '';
    const tagName = TAGS[e.v] ? nm(TAGS[e.v]) : e.v;
    return esc(fmt(tr(d), { v: e.v, t: tagName }));
  }).filter(Boolean);
}

// abilLines 动物能力行（zh 用 ABILITIES 名，en 按 key 还原）
function abilLines(a) {
  return a.ab.map((k) => (getLang() === 'zh'
    ? (ABILITIES[k] || k) : k.replace(/_/g, ' ').toLowerCase()));
}

// closeModal / openCardModal 弹窗生命周期（mask 点击 / ✕ / Esc 关闭）
function closeModal() { document.querySelectorAll('.an-modal-mask').forEach(($m) => $m.remove()); }
export function openCardModal(id) {
  closeModal();
  const a = animalOf(id);
  const sp = a ? null : sponsorOf(id);
  if (!a && !sp) return;
  const rows = [];
  if (a) {
    rows.push(`${a.s} ${t('an.ui.sizeSlot')} · ${a.p ? `💰${a.p} · ` : ''}${nm(habitatOf(a))}`);
    if (a.a) rows.push(`🌟 ${t('an.ui.appeal')} +${a.a}`);
    if (a.cp) rows.push(`🛡️ ${t('an.ui.cp')} +${a.cp}`);
    if (a.rk || a.wt) rows.push(`⛰️ ×${a.rk} · 🌊 ×${a.wt}`);
    if (a.req.length) rows.push(`${t('an.ui.reqField')}: ${a.req.map((r) => nm(TAGS[r] || { zh: r, en: r })).join('、')}`);
    if (a.tg.length) rows.push(`${t('an.ui.tagsField')}: ${[...new Set(a.tg)].map((r) => nm(TAGS[r] || { zh: r, en: r })).join('、')}`);
    if (a.se) rows.push(`🏛️ ${t('an.ui.specialEnc')}`);
    if (a.pz) rows.push(`🐾 ${t('an.ui.petOnlyField')}`);
    const ab = abilLines(a);
    if (ab.length) rows.push(`✨ ${t('an.ui.abilityField')}: ${ab.join('、')}`);
  } else {
    rows.push(`💰 ${t('an.ui.costField')}: ${sp.c}`);
    if (sp.ap) rows.push(`🌟 ${t('an.ui.appeal')} +${sp.ap}`);
    if (sp.cp) rows.push(`🛡️ ${t('an.ui.cp')} +${sp.cp}`);
    if (sp.req.length) rows.push(`${t('an.ui.reqField')}: ${sp.req.map((r) => nm(TAGS[r] || { zh: r, en: r })).join('、')}`);
    for (const line of effLines(sp)) rows.push(`➡️ ${line}`);
  }
  const $mask = document.createElement('div');
  $mask.className = 'an-modal-mask';
  const head = a ? animalHead(id, a) : sponsorHead(id, sp);
  $mask.innerHTML = `<div class="an-modal" role="dialog" aria-modal="true">
    ${a ? animalPhoto(id) : ''}
    <div class="an-modal-head">${head}<button type="button" class="an-modal-x" aria-label="${t('an.ui.close')}">✕</button></div>
    <div class="an-modal-rows">${rows.map((r) => `<div class="an-modal-row">${r}</div>`).join('')}</div>
  </div>`;
  bindPhotoFallback($mask);
  $mask.addEventListener('click', (ev) => { if (ev.target === $mask) closeModal(); });
  $mask.querySelector('.an-modal-x').onclick = closeModal;
  document.body.append($mask);
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

// —— 面板片段 ——

// pips 档位强度点
function pips(str) {
  let h = '<span class="an-pips">';
  for (let i = 1; i <= 5; i++) h += `<span class="an-pip${i <= str ? ' an-pip-on' : ''}"></span>`;
  return h + '</span>';
}

// repTrack 声望轨 1-5
function repTrack(p) {
  let h = '<span class="an-rep" title="' + t('an.ui.rep') + '">';
  for (let i = 1; i <= 5; i++) h += `<span class="an-rep-pip${i <= p.rep ? ' an-rep-pip-on' : ''}"></span>`;
  return h + '</span>';
}

// boardPanel 动物园地图：围栏网格 + 商店
function boardPanel(s, legal, pick, sel) {
  const p = s.players[s.turn];
  const legalEncs = new Set(legal.filter((a) => a.kind === 'place').map((a) => a.enc));
  let h = `<div class="an-board-title">${t('an.ui.board')} · <em>${esc(p.name)}</em></div><div class="an-encs">`;
  for (const id of Object.keys(p.enc)) {
    const e = p.enc[id];
    const meta = encMeta(id);
    const ter = effTerrain(id, e);
    const used = encUsed(id, e);
    const legalCls = legalEncs.has(id) ? ' an-enc-legal' : '';
    h += `<div class="an-enc${legalCls}" data-enc="${id}">
      <span class="an-enc-name"><span class="an-enc-icon">${ENC_ICON[id] || '🏞️'}</span><b>${nm(encShow(id))}</b>
        <span class="an-card-meta">${used}/${meta.cap} · ⛰️${ter.rk} 🌊${ter.wt}${e.on ? '' : ' · ' + esc(t('an.ui.notBuilt'))}</span>
      </span>
      <span class="an-enc-animals">${e.animals.map((cid) => {
        const a = animalOf(cid);
        if (!a) return '';
        return `<span class="an-animal-chip" title="${esc(tr(a.n))}">${aEmoji(cid)}${nm(a.n)}${a.g === 'M' ? '♂' : '♀'}</span>`;
      }).join('')}</span>
    </div>`;
  }
  h += '</div><div class="an-shops">';
  h += `<span class="an-shop">🛒 ${t('an.ui.kiosk')} ×${p.kiosk}/3</span>`;
  h += `<span class="an-shop">🍽️ ${t('an.ui.rest')} ×${p.rest}/2</span>`;
  h += `<span class="an-shop">🎒 ${t('an.ui.deck')} ${s.deck.length}</span>`;
  h += `<span class="an-shop">✖️ X ${s.breakX}/5</span>`;
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  $div.querySelectorAll('.an-enc-legal').forEach(($e) => {
    $e.onclick = () => {
      const a = legal.find((x) => x.kind === 'place' && x.enc === $e.dataset.enc
        && (!sel || x.card === sel));
      if (a) pick(a);
    };
  });
  return $div;
}

// marketPanel 市场：5 明位（位置费）+ 3 暗位
function marketPanel(s, legal, pick) {
  const takes = new Map(legal.filter((a) => a.kind === 'take').map((a) => [a.pos, a]));
  let h = `<div class="an-board-title">${t('an.ui.market')} <em class="an-card-meta">${t('an.ui.marketHint')}</em></div><div class="an-market">`;
  for (let i = 0; i < RULES.marketOpen; i++) {
    const id = s.market[i];
    if (!id) { h += `<div class="an-mcard"><span class="an-card-meta">—</span></div>`; continue; }
    const a = animalOf(id);
    const sp = sponsorOf(id);
    const legalHere = takes.has(i);
    h += `<div class="an-mcard${legalHere ? ' an-mcard-legal' : ''}" data-pos="${i}" ${cardBand(id)}>
      <span class="an-mcard-cost">💰${i}</span>
      ${a ? animalPhoto(id) : ''}
      ${a ? animalHead(id, a) : sponsorHead(id, sp)}
      <span class="an-card-meta">${a ? animalMeta(a) : sponsorMeta(sp)}</span>
      <span class="an-zoom" data-zoom="${id}" role="button" aria-label="${esc(t('an.ui.zoom'))}" title="${esc(t('an.ui.zoom'))}">🔍</span>
    </div>`;
  }
  h += `</div><div class="an-hidden"><span>${t('an.ui.hidden')}:</span>`;
  for (let i = RULES.marketOpen; i < 8; i++) h += `<span class="an-mcard"><span class="an-card-meta">🂠</span></span>`;
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  // 🔍 放大（阻止冒泡，避免误拿牌）
  $div.querySelectorAll('.an-zoom').forEach(($z) => {
    $z.onclick = (ev) => { ev.stopPropagation(); openCardModal($z.dataset.zoom); };
  });
  bindPhotoFallback($div);
  $div.querySelectorAll('.an-mcard-legal').forEach(($c) => {
    $c.onclick = () => pick(takes.get(Number($c.dataset.pos)));
  });
  return $div;
}

// cardsPanel 行动卡（含 break 区借用入口）
function cardsPanel(s, legal, pick) {
  const p = s.players[s.turn];
  const canUse = (ci) => has(legal, { kind: 'act', card: ci });
  let h = `<div class="an-board-title">${t('an.ui.cards')}</div><div class="an-cards">`;
  p.cards.forEach((c, ci) => {
    const usable = canUse(ci);
    const cls = c.broken ? 'an-acard-broken' : (usable ? 'an-acard-legal' : '');
    const varr = c.variant ? (VARIANTS[c.cat] || []).find((v) => v.id === c.variant) : null;
    h += `<button type="button" class="an-acard an-acard-c-${c.cat} ${cls}" data-ci="${ci}" ${c.broken ? 'disabled' : ''}>
      <span class="an-acard-name"><span class="an-cemoji">${CAT_ICON[c.cat] || ''}</span>${nm(catName(c.cat))}${c.broken ? ' ☕' : ''}</span>
      ${pips(c.str)}
      <span class="an-variant">${c.broken ? t('an.ui.inBreak') : (varr ? nm(varr.n) : '')}</span>
    </button>`;
  });
  // break 区借用：其他玩家（含自己）的休息区卡
  const borrows = legal.filter((a) => a.kind === 'useBreak');
  if (borrows.length) {
    h += `</div><div class="an-board-title" style="margin-top:8px">${t('an.ui.borrowTitle')} <em class="an-card-meta">${t('an.ui.borrowHint')}</em></div><div class="an-cards">`;
    for (const b of borrows) {
      const owner = s.players[b.owner];
      const c = owner.cards[b.card];
      h += `<button type="button" class="an-acard an-acard-c-${c.cat} an-acard-legal" data-bo="${b.owner}" data-bc="${b.card}">
        <span class="an-acard-name"><span class="an-cemoji">☕</span>${nm(catName(c.cat))}</span>
        <span class="an-variant">${esc(owner.name)} · ${b.owner === s.turn ? t('an.ui.borrowSelf') : t('an.ui.borrowFee')}</span>
      </button>`;
    }
  }
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  $div.querySelectorAll('.an-acard[data-ci]').forEach(($b) => {
    $b.onclick = () => {
      const ci = Number($b.dataset.ci);
      if (canUse(ci)) pick({ kind: 'act', card: ci });
    };
  });
  $div.querySelectorAll('.an-acard[data-bo]').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'useBreak', owner: Number($b.dataset.bo), card: Number($b.dataset.bc) });
  });
  return $div;
}

// playersPanel 玩家面板（资源/声望轨/终局卡/项目）
function playersPanel(s, legal) {
  let h = `<div class="an-side-title">${t('an.ui.players')}</div><div class="an-players">`;
  for (const p of s.players) {
    const goal = RULES.cpGoal[s.players.length] || 10;
    h += `<div class="an-player${p.seat === s.turn ? ' an-player-active' : ''}">
      <div class="an-player-head"><span class="bg-dot" style="background:${p.color}"></span><b>${esc(p.name)}</b>${p.isAI ? ' 🤖' : ''}</div>
      <div class="an-stats">
        <span class="an-stat">💰 <b>${p.money}</b></span>
        <span class="an-stat">🌟 <b>${p.appeal}</b></span>
        <span class="an-stat">🛡️ <b>${p.cp}/${goal}</b>${egBonusCP(p) ? `+${egBonusCP(p)}` : ''}</span>
        <span class="an-stat">🎓 <b>${p.universities}</b></span>
        <span class="an-stat">🤝 <b>${p.partnerZoos}</b></span>
      </div>
      ${repTrack(p)}
      ${p.endgame ? `<div class="an-card-meta" style="margin-top:6px">🏁 ${t('an.ui.endgame')}: ${nm(endgameOf(p.endgame).n)}</div>` : ''}
      ${p.projects.length ? `<div class="an-card-meta" style="margin-top:4px">📋 ${p.projects.map((x) => projEmoji(x) + ' ' + nm(projectOf(x).n)).join('、')}</div>` : ''}
    </div>`;
  }
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  return $div;
}

// handPanel 手牌（place/sponsor/discard 阶段可点；place 阶段选中后点围栏）
function handPanel(s, legal, pick, ui) {
  const p = s.players[s.turn];
  const placeable = new Set(legal.filter((a) => a.kind === 'place').map((a) => a.card));
  const playable = new Set(legal.filter((a) => a.kind === 'playSponsor').map((a) => a.card));
  const discardable = new Set(legal.filter((a) => a.kind === 'discardCard').map((a) => a.card));
  const over = p.hand.length - RULES.handMax;
  let h = `<div class="an-side-title">${t('an.ui.hand')} (${p.hand.length}${over > 0 ? ` · ${t('an.ui.needDrop')} ${over}` : ''})</div><div class="an-hand">`;
  for (const id of [...new Set(p.hand)]) {
    const a = animalOf(id);
    const sp = sponsorOf(id);
    const cnt = p.hand.filter((x) => x === id).length;
    const legalCls = placeable.has(id) || playable.has(id) || discardable.has(id) ? ' an-hcard-legal' : '';
    h += `<button type="button" class="an-hcard${legalCls}${ui.sel === id ? ' an-hcard-legal an-hcard-sel' : ''}" data-id="${id}" ${cardBand(id)}>
      ${a ? animalPhoto(id) : ''}
      ${a ? animalHead(id, a) : sponsorHead(id, sp)}${cnt > 1 ? ` <span class="an-hcard-cnt">×${cnt}</span>` : ''}
      <span class="an-card-meta">${a ? animalMeta(a) : sponsorMeta(sp)}</span>
      <span class="an-zoom" data-zoom="${id}" role="button" aria-label="${esc(t('an.ui.zoom'))}" title="${esc(t('an.ui.zoom'))}">🔍</span>
    </button>`;
  }
  if (!p.hand.length) h += `<span class="an-card-meta">—</span>`;
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  // 🔍 放大按钮（阻止冒泡，不触发选牌）
  $div.querySelectorAll('.an-zoom').forEach(($z) => {
    $z.onclick = (ev) => { ev.stopPropagation(); openCardModal($z.dataset.zoom); };
  });
  bindPhotoFallback($div);
  $div.querySelectorAll('.an-hcard').forEach(($c) => {
    const id = $c.dataset.id;
    const isPlace = placeable.has(id);
    const isPlay = playable.has(id);
    const isDrop = discardable.has(id);
    if (isPlace && s.phase === 'place') {
      // 选中动物 → 地图板上高亮围栏再点
      $c.onclick = () => ui.rerender(ui.sel === id ? null : id, ui.why);
    } else if (isPlay) {
      $c.onclick = () => pick({ kind: 'playSponsor', card: id });
    } else if (isDrop) {
      $c.onclick = () => pick({ kind: 'discardCard', card: id });
    } else {
      $c.onclick = () => {
        // 非法点按白话反馈（不静默）：place 阶段点放不进的动物 → 展示原因
        if (s.phase === 'place' && animalOf(id)) {
          const p0 = s.players[s.turn];
          const c = p0.cards.find((x) => x.cat === 'animals' && !x.broken);
          const budget = 8 * (c ? c.str : 1);
          let worst = null;
          for (const e of Object.keys(p0.enc)) {
            const r = canPlaceAnimal(p0, id, e, 0, budget);
            if (!r.ok && (!worst || r.reason === 'noBudget' || r.reason === 'req')) worst = { ...r, enc: e };
          }
          ui.rerender(ui.sel, worst ? whyBlock(worst) : '');
        } else if (s.phase === 'take' && s.market.some(Boolean)) {
          ui.rerender(ui.sel, `<div class="an-why"><b>${t('an.ui.whyTitle')}</b>${t('an.ui.takeHint')}</div>`);
        }
      };
    }
  });
  return $div;
}

// assocPanel 协会子行动按钮
function assocPanel(s, legal, pick) {
  const opts = legal.filter((a) => a.kind === 'assoc');
  const label = {
    money: '💰 ' + t('an.ui.aMoney'), pz: '🤝 ' + t('an.ui.aPz'), uni: '🎓 ' + t('an.ui.aUni'),
    worker: '🧑‍💼 ' + t('an.ui.aWorker'), rep: '⭐ ' + t('an.ui.aRep'),
  };
  let h = `<div class="an-side-title">${t('an.ui.assocTitle')}</div><div class="an-actions">`;
  for (const o of opts) {
    if (o.opt !== 'project') h += `<button type="button" class="an-btn an-btn-primary" data-opt="${o.opt}">${label[o.opt] || o.opt}</button>`;
  }
  h += '</div>';
  const projs = opts.filter((o) => o.opt === 'project');
  if (projs.length) {
    h += `<div class="an-side-title" style="margin-top:8px">${t('an.ui.projects')}</div><div class="an-projects">`;
    for (const o of projs) {
      const pr = projectOf(s.projects[o.proj]);
      const n = projFulfilled(s.players[s.turn], pr);
      const best = pr.slots.filter((x) => x.n <= n).sort((a, b) => b.n - a.n)[0];
      h += `<button type="button" class="an-proj an-proj-legal" data-proj="${o.proj}">
        <b><span class="an-cemoji">${projEmoji(s.projects[o.proj])}</span>${nm(pr.n)}</b>${t('an.ui.projNow')}: ${n}${best ? ` · 🛡️+${best.cp}` : ''}
      </button>`;
    }
    h += '</div>';
  }
  const $div = document.createElement('div');
  $div.innerHTML = h;
  $div.querySelectorAll('[data-opt]').forEach(($b) => {
    $b.onclick = () => pick(opts.find((o) => o.opt === $b.dataset.opt));
  });
  $div.querySelectorAll('[data-proj]').forEach(($b) => {
    $b.onclick = () => pick(projs.find((o) => String(o.proj) === $b.dataset.proj));
  });
  return $div;
}

// buildPanel 建造子行动
function buildPanel(s, legal, pick) {
  const builds = legal.filter((a) => a.kind === 'build');
  const names = {
    std5: '🏞️ 大围栏(5)', std3: '🏞️ 中围栏(3)', std2: '🏞️ 小围栏(2)', pz: '🐾 宠物角',
    rh0: '🦎 爬行馆一', rh1: '🦎 爬行馆二', av: '🦜 大鸟舍', kiosk: '🛒 小卖部', rest: '🍽️ 餐厅',
  };
  const enNames = {
    std5: '🏞️ Enclosure 5', std3: '🏞️ Enclosure 3', std2: '🏞️ Enclosure 2', pz: '🐾 Petting zoo',
    rh0: '🦎 Reptile house 1', rh1: '🦎 Reptile house 2', av: '🦜 Aviary', kiosk: '🛒 Kiosk', rest: '🍽️ Restaurant',
  };
  let h = `<div class="an-side-title">${t('an.ui.buildTitle')}</div><div class="an-actions">`;
  for (const b of builds) {
    h += `<button type="button" class="an-btn" data-what="${b.what}">${getLang() === 'zh' ? names[b.what] : enNames[b.what]} · 💰${b.cost}</button>`;
  }
  if (!builds.length) h += `<span class="an-card-meta">${t('an.ui.noBuild')}</span>`;
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  $div.querySelectorAll('[data-what]').forEach(($b) => {
    $b.onclick = () => pick(builds.find((x) => x.what === $b.dataset.what));
  });
  return $div;
}

// endgamePanel 终局卡二选一
function endgamePanel(s, legal, pick) {
  let h = `<div class="an-side-title">${t('an.ui.pE')}</div><div class="an-endgame">`;
  s.endgameOffer.forEach((id, i) => {
    if (!id) return;
    const eg = endgameOf(id);
    const slots = eg.slots.map(([n, cp]) => `${n}→+${cp}`).join(' / ');
    h += `<button type="button" class="an-eg an-eg-legal" data-idx="${i}">
      <b>🏁 <span class="an-cemoji">${EG_ICON[eg.metric] || '🏆'}</span>${nm(eg.n)}</b>
      <span class="an-card-meta">${t('an.ui.egMetric')}: ${nm({ zh: EG_ZH[eg.metric], en: eg.metric })} · ${slots}</span>
    </button>`;
  });
  h += '</div>';
  const $div = document.createElement('div');
  $div.innerHTML = h;
  $div.querySelectorAll('.an-eg').forEach(($b) => {
    $b.onclick = () => pick({ kind: 'pickEndgame', idx: Number($b.dataset.idx) });
  });
  return $div;
}
const EG_ZH = {
  size4: '体型≥4 动物数', size2: '体型≤2 动物数', universities: '大学数', buildings: '建筑数',
  projects: '项目数', continents: '大洲数', appeal10: '魅力≥10 的动物数', sponsors: '协会卡数',
  rocks: '岩石格数', waters: '水域格数',
};

// conceptsPanel 概念小面板（新手白话，常驻但紧凑）
function conceptsPanel() {
  return `<div class="an-concepts">
    <div class="an-concept"><b>🎴 ${t('an.ui.conceptCards')}</b>${t('an.ui.conceptCardsBody')}</div>
    <div class="an-concept"><b>⭐ ${t('an.ui.conceptRep')}</b>${t('an.ui.conceptRepBody')}</div>
    <div class="an-concept"><b>🦁 ${t('an.ui.conceptScore')}</b>${t('an.ui.conceptScoreBody')}</div>
    <div class="an-concept"><b>☕ ${t('an.ui.conceptBreak')}</b>${t('an.ui.conceptBreakBody')}</div>
    <div class="an-concept"><b>🛒 ${t('an.ui.conceptMarket')}</b>${t('an.ui.conceptMarketBody')}</div>
  </div>`;
}

// phasePrompt 各阶段引导提示
function phasePrompt(s) {
  const k = { action: 'an.ui.pAct', place: 'an.ui.p0', assoc: 'an.ui.p1', build: 'an.ui.p2', take: 'an.ui.p3', sponsor: 'an.ui.p4', discard: 'an.ui.p5', endgame: 'an.ui.pE' }[s.phase];
  let extra = '';
  if (s.phase === 'place' && s.sub) {
    extra = ` — ${t('an.ui.budget')} <b>${s.sub.budget - s.sub.spent}</b>`;
  }
  if (s.finalRound) extra += ` · 🏁 ${t('an.ui.finalRound')}`;
  return k ? `<div class="an-prompt">💡 <b>${t(k)}</b>${extra}</div>` : '';
}

// —— 主入口 ——

export function renderBoard(el, state, legal, pick, selArg, whyArg) {
  const s = state;
  // keepUi 携带上次选中的动物与非法提示；rerender 保持选择重新渲染
  const keepUi = {
    sel: selArg || null,
    why: whyArg || '',
    rerender: (sel, why) => renderBoard(el, s, legal, pick, sel, why),
  };

  const $wrap = document.createElement('div');
  $wrap.className = 'an-wrap';
  // 提示 + 概念
  let h = phasePrompt(s) + conceptsPanel();
  $wrap.innerHTML = h;

  const $board = document.createElement('div');
  $board.className = 'an-board';
  if (s.phase === 'place') {
    const legalPlaces = legal.filter((a) => a.kind === 'place');
    const selPlaces = keepUi.sel ? legalPlaces.filter((a) => a.card === keepUi.sel) : [];
    const $b = boardPanel(s, selPlaces.length ? selPlaces : [], pick, keepUi.sel);
    // 未选中动物时提示先选手牌
    if (!keepUi.sel && legalPlaces.length) {
      const $tip = document.createElement('div');
      $tip.className = 'an-why';
      $tip.innerHTML = `<b>${t('an.ui.selHandFirst')}</b>`;
      $b.prepend($tip);
    }
    $board.append($b);
  } else $board.append(boardPanel(s, [], pick, null));
  $board.append(marketPanel(s, legal, pick));
  $board.append(cardsPanel(s, legal, pick));

  const $side = document.createElement('div');
  $side.className = 'an-side';
  $side.innerHTML = playersPanel(s, legal).innerHTML;
  if (s.phase === 'place' || s.phase === 'sponsor' || s.phase === 'discard' || s.phase === 'take') {
    $side.append(handPanel(s, legal, pick, keepUi));
  }
  if (s.phase === 'assoc') $side.append(assocPanel(s, legal, pick));
  if (s.phase === 'build') $side.append(buildPanel(s, legal, pick));
  if (s.phase === 'endgame') $side.append(endgamePanel(s, legal, pick));
  if (keepUi.why) {
    const $w = document.createElement('div');
    $w.innerHTML = keepUi.why;
    $side.append($w);
  }
  // finish/skip 按钮
  if (legal.some((a) => a.kind === 'finish')) {
    const $f = document.createElement('div');
    $f.className = 'an-actions';
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.className = 'an-btn';
    $btn.textContent = t('an.ui.finish');
    $btn.onclick = () => pick({ kind: 'finish' });
    $f.append($btn);
    $side.append($f);
  }

  const $row = document.createElement('div');
  $row.className = 'an-row';
  $row.append($board, $side);
  $wrap.append($row);
  el.innerHTML = '';
  el.append($wrap);
};
