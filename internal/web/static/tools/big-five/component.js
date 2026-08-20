// 大五人格（OCEAN）组件：测试前选免费版/完整版 → Likert 1-5 题计分 → 五维度百分比 + 免费画像。
// 完整版（全部题）结果含 ¥5 详细解读（站主确认门邮件送达）；免费版（每维度子集）结果软推完整版。
// 不用 quiz.js（正误计分型）；Likert 1-5 自建表单。无纪念卡（非分数型）。
// 语言切换重渲染时用模块级 snapshot 恢复结果与申请态；刷新清空回选择入口。

import { t, getLang } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import { renderChoice, subsetPerDim } from '/core/personality.js';
import data from './data.js';

const FULL = Object.entries(data).filter(([k]) => /^[OCENA]\d$/.test(k)).map(([k, v]) => ({ k, ...v })); // 完整版（全部 20 题）
const FREE_PER_DIM = 2; // 免费版每维度取 2 题（共 10）
const AMOUNT = 5;
const DIMS = ['O', 'C', 'E', 'A', 'N'];

// snapshot { version:'free'|'full', ratings:number[], pcts:object, fullStage, claimId?, email? }
let snapshot = null;

// render 入口：有快照恢复，否则渲染免费版/完整版选择卡
export function render(el) {
  const lang = getLang();
  if (snapshot) { renderResult(el, snapshot, lang); return; }
  renderChoice(el, {
    freeN: FREE_PER_DIM * DIMS.length,
    fullN: FULL.length,
    onFree: () => startTest(el, lang, 'free'),
    onFull: () => startTest(el, lang, 'full'),
  });
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
  renderResult(el, snapshot, lang);
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

// renderResult 免费画像 +（完整版）付费入口/已提交态 或（免费版）升级入口 + 重新测试
function renderResult(el, snap, lang) {
  const L = (o) => o[lang] || o.zh;
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${snap.version === 'full' ? t('bf.yourProfile') : t('bf.yourProfileFree')}</p>
      ${DIMS.map((d) => {
        const dm = data.dims[d];
        const pct = snap.pcts[d];
        return `<p class="bf-row"><b>${esc(L(dm.name))}</b> <span class="bf-pct">${pct}%</span> <span class="muted">${esc(L(dm[level(pct)]))}</span></p>`;
      }).join('')}
    </div>`;
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (snap.version === 'full') {
    if (snap.fullStage === 'submitted') {
      renderPaidReportSubmitted($actions, { claimId: snap.claimId, email: snap.email, amount: AMOUNT });
    } else {
      renderPaidReportEntry($actions, {
        feature: t('bf.fullFeature'), title: t('bf.fullTitle'), amount: AMOUNT,
        report: buildFullReport(snap.pcts, lang),
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

// buildFullReport 客户端按当前语言生成完整版报告文本（随申请落盘，确认后原样邮件送达）
function buildFullReport(pcts, lang) {
  const L = (o) => o[lang] || o.zh;
  let s = `${t('bf.yourProfile')}\n\n`;
  DIMS.forEach((d) => {
    const dm = data.dims[d];
    const pct = pcts[d];
    const lv = level(pct);
    s += `${L(dm.name)}: ${pct}%（${lv}）\n${L(dm.full)}\n\n`;
  });
  return s.trim();
}

export default (el) => render(el);
