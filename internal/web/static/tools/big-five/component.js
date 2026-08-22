// 大五人格（OCEAN）组件：测试前选免费版/完整版 → Likert 1-5 题计分 → 五维度百分比 + 免费画像。
// 完整版（全部题）结果含 ¥5 详细解读（站主确认门邮件送达）；免费版（每维度子集）结果软推完整版。
// 不用 quiz.js（正误计分型）；Likert 1-5 自建表单。无纪念卡（非分数型）。
// 语言切换重渲染时用模块级 snapshot 恢复结果与申请态；刷新清空回选择入口。

import { t, getLang, tFor } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import { renderChoice, subsetPerDim } from '/core/personality.js';
import { radarSVG, barHTML } from '/core/radar.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';
import { buildFromSections, BIG5_SECTIONS } from '/core/report-sections.js';
import data from './data.js';

const FULL = Object.entries(data).filter(([k]) => /^[OCENA]\d{1,2}$/.test(k)).map(([k, v]) => ({ k, ...v })); // 完整版（全部 60 题，每维度 12 题）
const FREE_PER_DIM = 4; // 免费版每维度取 4 题（共 20）
const AMOUNT = 5;
const DIMS = ['O', 'C', 'E', 'A', 'N'];
const ACCENT = '#0E7C86'; // 大五主题强调色（靑绿），用于条/雷达/分享卡
const KEY2IDX = Object.fromEntries(FULL.map((it, i) => [it.k, i])); // item 键 → FULL 索引，供子维度按面取分

// snapshot { version:'free'|'full', ratings:number[], pcts:object, fullStage, claimId?, email? }
let snapshot = null;

// render 入口：有快照恢复，否则渲染免费版/完整版选择卡
export function render(el) {
  const lang = getLang();
  if (snapshot) { renderByVersion(el, snapshot, lang); return; }
  renderChoice(el, {
    freeN: FREE_PER_DIM * DIMS.length,
    fullN: FULL.length,
    onFree: () => startTest(el, lang, 'free'),
    onFull: () => startTest(el, lang, 'full'),
  });
}

// renderByVersion 按版本走结果：完整版仅主导维度诱饵 + 付费墙；免费版全可视化
function renderByVersion(el, snap, lang) {
  if (snap.version === 'full') renderFullBait(el, snap, lang);
  else renderResult(el, snap, lang);
}

// renderFullBait 完整版结果：仅主导维度+档位作诱饵（画像/雷达/子维/金卡付费确认后邮件附件送达）
function renderFullBait(el, snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const OL = (o) => o[lang === 'en' ? 'zh' : 'en'] || o.en;
  const olang = lang === 'en' ? 'zh' : 'en';
  const top = [...DIMS].sort((a, b) => snap.pcts[b] - snap.pcts[a])[0];
  const main = `${L(data.dims[top].name)} · ${t('ps.band' + bandKey(snap.pcts[top]))}`;
  const sub = `${OL(data.dims[top].name)} · ${tFor('ps.band' + bandKey(snap.pcts[top]), olang)}`;
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${t('bf.yourProfile')}</p>
      <h3 class="ps-bait">${esc(main)}</h3>
      <p class="muted ps-bait-en">${esc(sub)}</p>
      <p class="muted">${t('ps.fullPaywallHint')}</p>
    </div>`;
  renderActions(el, snap, lang);
}

// startTest 按版本选题（免费版子集 / 完整版全部）渲染 Likert 表单
function startTest(el, lang, version) {
  const items = version === 'free' ? subsetPerDim(FULL, FREE_PER_DIM) : FULL;
  const total = items.length;
  const ratings = new Array(total).fill(0);
  el.innerHTML = `
    <div class="quiz-bar">
      <span class="bf-progress">0 / ${total}</span>
      <button class="btn js-bf-submit">${t('bf.submit')}</button>
    </div>
    <p class="muted">${t('bf.qtip')}</p>
    <div id="bf-list"></div>
    <div class="quiz-bar-bottom">
      <button class="btn js-bf-submit">${t('bf.submit')}</button>
    </div>`;
  const $list = el.querySelector('#bf-list');
  const scale = data.scale[lang] || data.scale.zh;
  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'quiz-q';
    card.innerHTML = `
      <p class="quiz-stem"><b>${i + 1}.</b> ${esc(item.text[lang] || item.text.zh)}</p>
      <div class="bf-scale"></div>`;
    const $sc = card.querySelector('.bf-scale');
    scale.forEach((lbl, j) => {
      const b = document.createElement('label');
      b.className = 'quiz-opt bf-opt';
      b.innerHTML = `<input type="radio" name="b${i}" value="${j + 1}"> <span>${esc(lbl)}</span>`;
      b.querySelector('input').onchange = () => {
        ratings[i] = j + 1;
        const done = ratings.filter((x) => x > 0).length;
        el.querySelectorAll('.bf-progress').forEach((p) => { p.textContent = `${done} / ${total}`; });
      };
      $sc.appendChild(b);
    });
    $list.appendChild(card);
  });
  el.querySelectorAll('.js-bf-submit').forEach((b) => { b.onclick = () => onSubmit(el, ratings, items, version, lang); });
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// onSubmit 全答 → 计分 → 快照（含版本）→ 结果
function onSubmit(el, ratings, items, version, lang) {
  if (ratings.some((x) => x <= 0)) { alert(t('bf.needAll')); return; }
  if (!confirm(t('bf.confirmSubmit'))) return;
  const pcts = computePcts(items, ratings);
  snapshot = { version, ratings: [...ratings], pcts, fullStage: 'pending' };
  renderByVersion(el, snapshot, lang);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// computePcts 每维度百分比：reverse 反向计分，pct=(sum-min)/(max-min)*100
function computePcts(items, ratings) {
  const pcts = {};
  DIMS.forEach((d) => {
    const idxs = items.map((it, i) => ({ it, i })).filter((x) => x.it.dim === d);
    let sum = 0;
    idxs.forEach(({ it, i }) => { const raw = ratings[i]; sum += it.reverse ? 6 - raw : raw; });
    const n = idxs.length;
    pcts[d] = Math.round(((sum - n) / (n * 4)) * 100); // min=n(全1), max=5n(全5)
  });
  return pcts;
}

// level 按 pct 取档：≥66 high, ≤33 low, 其余 mid
function level(pct) {
  return pct >= 66 ? 'high' : pct <= 33 ? 'low' : 'mid';
}

// renderResult 雷达 + 主维条+band +（完整版）子维条 + 分享卡按钮 + 付费/升级入口 + 重新测试
function renderResult(el, snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const $radar = document.createElement('div');
  radarSVG($radar, { axes: DIMS.map((d) => ({ label: L(data.dims[d].name), pct: snap.pcts[d] })), accent: ACCENT, size: 280 });
  const dimsHTML = DIMS.map((d) => {
    const dm = data.dims[d];
    const pct = snap.pcts[d];
    let row = `<div class="ps-bar"><span class="ps-bar-label">${esc(L(dm.name))} <span class="ps-band">${t('ps.band' + bandKey(pct))}</span><b>${pct}%</b></span><span class="ps-bar-track"><span class="ps-bar-fill" style="width:${pct}%;background:${ACCENT}"></span></span></div>`;
    if (snap.version === 'full' && data.facets) {
      row += computeSubPcts(data.facets[d], snap.ratings).map((sf, i) => barHTML(sf.pct, '· ' + L(data.facets[d][i].name), ACCENT)).join('');
    }
    return `<div class="ps-dim">${row}</div>`;
  }).join('');
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${snap.version === 'full' ? t('bf.yourProfile') : t('bf.yourProfileFree')}</p>
      <div id="bf-radar"></div>
      ${dimsHTML}
      <p class="ps-band-note">${t('ps.bandNote')}</p>
    </div>`;
  el.querySelector('#bf-radar').appendChild($radar);
  renderActions(el, snap, lang);
}

// renderActions（完整版）付费入口/已提交 或（免费版）分享卡+升级 + 重新测试
// 完整版画像付费后才邮件送达，不在结果页泄露分享卡；免费版保留分享卡作传播诱饵
function renderActions(el, snap, lang) {
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (snap.version !== 'full') {
    const share = document.createElement('button');
    share.className = 'btn-soft';
    share.textContent = t('ps.downloadCard');
    share.onclick = () => downloadShareCard(snap, lang);
    $actions.appendChild(share);
  }
  if (snap.version === 'full') {
    if (snap.fullStage === 'submitted') {
      renderPaidReportSubmitted($actions, { claimId: snap.claimId, email: snap.email, amount: AMOUNT });
    } else {
      renderPaidReportEntry($actions, {
        feature: t('bf.fullFeature'), title: t('bf.fullTitle'), amount: AMOUNT,
        report: buildFullReport(snap, lang),
        preview: buildFullReport(snap, lang).split('\n\n')[0],
        getPng: () => buildGoldPng(snap, lang),
        onSubmitted: (id, em) => { if (snapshot) { snapshot.fullStage = 'submitted'; snapshot.claimId = id; snapshot.email = em; } },
      });
    }
  } else {
    const up = document.createElement('button');
    up.className = 'btn';
    up.textContent = t('ps.upgrade');
    up.onclick = () => { snapshot = null; startTest(el, lang, 'full'); };
    $actions.appendChild(up);
  }
  const retry = document.createElement('button');
  retry.className = 'btn-soft';
  retry.textContent = t('bf.retry');
  retry.onclick = () => { snapshot = null; render(el); };
  $actions.appendChild(retry);
  el.appendChild($actions);
}

// buildFullReport 客户端按当前语言生成完整版报告文本（段落注册表驱动）
function buildFullReport(snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const dataWithKey = Object.assign({ KEY2IDX }, data);
  return buildFromSections(BIG5_SECTIONS, snap, dataWithKey, L, 0);
}

// bandKey 大五量表带位：≥75 很高 / 55-74 偏高 / 45-54 中等 / 26-44 偏低 / ≤25 很低
function bandKey(pct) {
  if (pct >= 75) return 'VeryHigh';
  if (pct >= 55) return 'High';
  if (pct >= 45) return 'Mid';
  if (pct >= 26) return 'Low';
  return 'VeryLow';
}

// computeSubPcts 某维度各子面百分比（按 facet.items 键取分，复用 (sum-min)/(4n) 反向计分）
function computeSubPcts(facets, ratings) {
  return facets.map((f) => {
    let sum = 0, n = 0;
    f.items.forEach((k) => {
      const idx = KEY2IDX[k];
      if (idx == null) return;
      const raw = ratings[idx];
      if (raw <= 0) return;
      sum += data[k].reverse ? 6 - raw : raw;
      n++;
    });
    return { pct: n === 0 ? 0 : Math.round(((sum - n) / (n * 4)) * 100) };
  });
}

// buildShareOpts 构造大五分享卡渲染参数（主导维度+band 为类型标签，五维雷达）
function buildShareOpts(snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const OL = (o) => o[lang === 'en' ? 'zh' : 'en'] || o.en;
  const olang = lang === 'en' ? 'zh' : 'en';
  const top = [...DIMS].sort((a, b) => snap.pcts[b] - snap.pcts[a])[0];
  return {
    themeKey: 'personality-bigfive',
    name: `${L(data.dims[top].name)} · ${t('ps.band' + bandKey(snap.pcts[top]))}`,
    personality: {
      typeLabel: `${L(data.dims[top].name)} · ${t('ps.band' + bandKey(snap.pcts[top]))}`,
      typeLabelEn: `${OL(data.dims[top].name)} · ${tFor('ps.band' + bandKey(snap.pcts[top]), olang)}`,
      typeCode: top,
      tagline: L(data.dims[top].high),
      dims: DIMS.map((d) => ({ name: L(data.dims[d].name), pct: snap.pcts[d] })),
      accent: ACCENT,
    },
    showDonate: false,
  };
}

// downloadShareCard 生成并下载 PNG 分享卡
async function downloadShareCard(snap, lang) {
  const name = prompt(t('ps.enterName')) || '';
  const { dataUrl } = await renderMemorialCard({ ...buildShareOpts(snap, lang), name });
  downloadPng(dataUrl, `bigfive-${Date.now()}.png`);
}

// buildGoldPng 生成完整版金纪念卡 PNG dataURL（复用分享卡参数 + gold 标记），付费后作邮件附件送达
async function buildGoldPng(snap, lang, userName) {
  const { dataUrl } = await renderMemorialCard({ ...buildShareOpts(snap, lang), name: userName || '', gold: true });
  return dataUrl;
}

export default (el) => render(el);
