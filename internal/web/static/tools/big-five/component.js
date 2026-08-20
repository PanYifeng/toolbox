// 大五人格（OCEAN）组件：20 道李克特题 → 五维度百分比 → 免费简版画像，完整版 ¥5 经站主确认门邮件送达。
// 不用 quiz.js（正误计分型）；Likert 1-5 自建表单。无纪念卡（非分数型）。
// 语言切换重渲染时用模块级 snapshot 恢复结果与申请态；刷新清空回测试入口。

import { t, getLang } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import data from './data.js';

const ITEMS = Object.entries(data).filter(([k]) => /^[OCENA]\d$/.test(k)).map(([k, v]) => ({ k, ...v }));
const AMOUNT = 5;
const DIMS = ['O', 'C', 'E', 'A', 'N'];

// snapshot { ratings:number[], pcts:object, fullStage, claimId?, email? }
let snapshot = null;

// render 入口：有快照恢复，否则说明 + 开始
export function render(el) {
  const lang = getLang();
  if (snapshot) { renderResult(el, snapshot, lang); return; }
  el.innerHTML = `
    <div class="rel-intro">
      <p class="muted">${t('bf.intro')}</p>
      <p class="muted">${t('bf.qtip')}</p>
      <button class="btn" id="bf-start">${t('bf.start')}</button>
    </div>`;
  el.querySelector('#bf-start').onclick = () => startTest(el, lang);
}

// startTest 渲染 20 题 Likert 表单
function startTest(el, lang) {
  const ratings = new Array(ITEMS.length).fill(0);
  el.innerHTML = `
    <div class="quiz-bar">
      <span class="bf-progress">0 / ${ITEMS.length}</span>
      <button class="btn js-bf-submit">${t('bf.submit')}</button>
    </div>
    <p class="muted">${t('bf.qtip')}</p>
    <div id="bf-list"></div>
    <div class="quiz-bar-bottom">
      <button class="btn js-bf-submit">${t('bf.submit')}</button>
    </div>`;
  const $list = el.querySelector('#bf-list');
  const scale = data.scale[lang] || data.scale.zh;
  ITEMS.forEach((item, i) => {
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
        el.querySelectorAll('.bf-progress').forEach((p) => { p.textContent = `${done} / ${ITEMS.length}`; });
      };
      $sc.appendChild(b);
    });
    $list.appendChild(card);
  });
  el.querySelectorAll('.js-bf-submit').forEach((b) => { b.onclick = () => onSubmit(el, ratings, lang); });
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// onSubmit 全答 → 计分 → 快照 → 结果
function onSubmit(el, ratings, lang) {
  if (ratings.some((x) => x <= 0)) { alert(t('bf.needAll')); return; }
  if (!confirm(t('bf.confirmSubmit'))) return;
  const pcts = computePcts(ratings);
  snapshot = { ratings: [...ratings], pcts, fullStage: 'pending' };
  renderResult(el, snapshot, lang);
}

// computePcts 每维度百分比：reverse 反向计分，pct=(sum-min)/(max-min)*100
function computePcts(ratings) {
  const pcts = {};
  DIMS.forEach((d) => {
    const idxs = ITEMS.map((it, i) => ({ it, i })).filter((x) => x.it.dim === d);
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

// renderResult 免费画像 + 完整版入口 + 重新测试
function renderResult(el, snap, lang) {
  const L = (o) => o[lang] || o.zh;
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${t('bf.yourProfile')}</p>
      ${DIMS.map((d) => {
        const dm = data.dims[d];
        const pct = snap.pcts[d];
        return `<p class="bf-row"><b>${esc(L(dm.name))}</b> <span class="bf-pct">${pct}%</span> <span class="muted">${esc(L(dm[level(pct)]))}</span></p>`;
      }).join('')}
    </div>`;
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (snap.fullStage === 'submitted') {
    renderPaidReportSubmitted($actions, { claimId: snap.claimId, email: snap.email, amount: AMOUNT });
  } else {
    renderPaidReportEntry($actions, {
      feature: t('bf.fullFeature'), title: t('bf.fullTitle'), amount: AMOUNT,
      report: buildFullReport(snap.pcts, lang),
      onSubmitted: (id, em) => { if (snapshot) { snapshot.fullStage = 'submitted'; snapshot.claimId = id; snapshot.email = em; } },
    });
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
