// DISC 行为风格组件：测试前选免费版/完整版 → 经典迫选（每组四选最像+最不像）→ 四维度 ipsative 计分 + 主导风格 + 免费简版解读。
// 完整版（全部 28 组）结果含 ¥5 详细解读（站主确认门邮件送达）；免费版（前 14 组）结果软推完整版。
// 语言切换重渲染时用模块级 snapshot 恢复结果与申请态；刷新清空回选择入口。

import { t, getLang } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import { renderChoice } from '/core/personality.js';
import data from './data.js';

const FULL = data.groups; // 完整版（全部 28 组迫选）
const FREE_GROUPS = 14; // 免费版取前 14 组
const AMOUNT = 5;
const DIMS = ['D', 'I', 'S', 'C'];

// snapshot { version:'free'|'full', mosts:number[], leasts:number[], tallyMost, tallyLeast, pcts, primary, fullStage, claimId?, email? }
let snapshot = null;

// render 入口：有快照恢复，否则渲染免费版/完整版选择卡
export function render(el) {
  const lang = getLang();
  if (snapshot) { renderResult(el, snapshot, lang); return; }
  renderChoice(el, {
    freeN: FREE_GROUPS,
    fullN: FULL.length,
    onFree: () => startTest(el, lang, 'free'),
    onFull: () => startTest(el, lang, 'full'),
  });
}

// renderOrder 第 i 组的维度渲染顺序（按 i 轮转，避免 D 永远排第一的位置偏差）
function renderOrder(i) {
  const out = [];
  for (let k = 0; k < DIMS.length; k++) out.push(DIMS[(i + k) % DIMS.length]);
  return out;
}

// startTest 按版本选题（免费版前 14 组 / 完整版全部）渲染迫选表单 + 进度 + 交卷按钮
function startTest(el, lang, version) {
  const groups = version === 'free' ? FULL.slice(0, FREE_GROUPS) : FULL;
  const total = groups.length;
  const mosts = new Array(total).fill(-1);
  const leasts = new Array(total).fill(-1);
  el.innerHTML = `
    <div class="quiz-bar">
      <span class="disc-progress">0 / ${total}</span>
      <button class="btn js-disc-submit">${t('disc.submit')}</button>
    </div>
    <p class="muted">${t('disc.qtip')}</p>
    <div id="disc-list"></div>
    <div class="quiz-bar-bottom">
      <button class="btn js-disc-submit">${t('disc.submit')}</button>
    </div>`;
  const $list = el.querySelector('#disc-list');
  const onProgress = () => {
    const done = groups.reduce((a, _, i) => a + (mosts[i] >= 0 && leasts[i] >= 0 ? 1 : 0), 0);
    el.querySelectorAll('.disc-progress').forEach((p) => { p.textContent = `${done} / ${total}`; });
  };
  groups.forEach((g, i) => appendGroup($list, g, i, lang, mosts, leasts, onProgress));
  el.querySelectorAll('.js-disc-submit').forEach((b) => { b.onclick = () => onSubmit(el, mosts, leasts, groups, version, lang); });
}

// appendGroup 构建并挂载一组迫选题：表头标"最像/最不像"两列，四行描述各配两个单选（经典 DISC 答卷布局）
function appendGroup($list, g, i, lang, mosts, leasts, onProgress) {
  const card = document.createElement('div');
  card.className = 'quiz-q disc-group';
  const $opts = document.createElement('div');
  $opts.className = 'disc-opts';
  $opts.innerHTML = `<span></span><span class="disc-hdr">${t('disc.mostLike')}</span><span class="disc-hdr">${t('disc.leastLike')}</span>`;
  renderOrder(i).forEach((d, j) => {
    const txt = esc(g[d][lang] || g[d].zh);
    const row = document.createElement('div');
    row.className = 'disc-opt';
    row.innerHTML = `<span class="disc-opt-text">${txt}</span>
      <label class="disc-radio"><input type="radio" name="g${i}-most" value="${j}" aria-label="${t('disc.mostLike')}：${txt}"></label>
      <label class="disc-radio"><input type="radio" name="g${i}-least" value="${j}" aria-label="${t('disc.leastLike')}：${txt}"></label>`;
    $opts.appendChild(row);
  });
  card.innerHTML = `<p class="quiz-stem"><b>${t('disc.groupLabel').replace('{n}', i + 1)}</b></p>`;
  card.appendChild($opts);
  bindGroup(card, i, mosts, leasts, onProgress);
  $list.appendChild(card);
}

// bindGroup 绑定一组的最像/最不像单选；二者不可相同（冲突时清掉另一项）
function bindGroup(card, i, mosts, leasts, onProgress) {
  const clearOther = (which, p) => {
    const sel = card.querySelector(`input[name="g${i}-${which}"][value="${p}"]`);
    if (sel) sel.checked = false;
  };
  card.querySelectorAll(`input[name="g${i}-most"]`).forEach((inp) => {
    inp.onchange = () => { const p = parseInt(inp.value, 10); mosts[i] = p; if (leasts[i] === p) { leasts[i] = -1; clearOther('least', p); } onProgress(); };
  });
  card.querySelectorAll(`input[name="g${i}-least"]`).forEach((inp) => {
    inp.onchange = () => { const p = parseInt(inp.value, 10); leasts[i] = p; if (mosts[i] === p) { mosts[i] = -1; clearOther('most', p); } onProgress(); };
  });
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// onSubmit 每组都选了最像+最不像 → 计分 → 快照（含版本）→ 结果
function onSubmit(el, mosts, leasts, groups, version, lang) {
  const incomplete = groups.some((_, i) => mosts[i] < 0 || leasts[i] < 0);
  if (incomplete) { alert(t('disc.needMostLeast')); return; }
  if (!confirm(t('disc.confirmSubmit'))) return;
  const tally = computeTally(mosts, leasts, groups);
  snapshot = { version, mosts: [...mosts], leasts: [...leasts], tallyMost: tally.most, tallyLeast: tally.least, pcts: tally.pcts, primary: tally.primary, fullStage: 'pending' };
  renderResult(el, snapshot, lang);
}

// computeTally 迫选计分：most 计入对应维度正向，least 计入负向；pct = most/total*100
function computeTally(mosts, leasts, groups) {
  const most = { D: 0, I: 0, S: 0, C: 0 };
  const least = { D: 0, I: 0, S: 0, C: 0 };
  groups.forEach((g, i) => {
    const order = renderOrder(i);
    if (mosts[i] >= 0) most[order[mosts[i]]]++;
    if (leasts[i] >= 0) least[order[leasts[i]]]++;
  });
  const total = groups.length;
  const pcts = {};
  DIMS.forEach((d) => { pcts[d] = Math.round((most[d] / total) * 100); });
  const primary = DIMS.reduce((a, b) => (most[b] > most[a] ? b : a), 'D');
  return { most, least, pcts, primary };
}

// renderResult 免费解读 + 主导风格 +（完整版）付费入口/已提交态 或（免费版）升级入口 + 重新测试
function renderResult(el, snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const dm = data.dims[snap.primary];
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${snap.version === 'full' ? t('disc.primary') : t('disc.primaryFree')}</p>
      <h3 class="disc-primary">${esc(L(dm.name))}</h3>
      <p>${esc(L(dm.high))}</p>
      ${DIMS.map((d) => {
        const x = data.dims[d];
        return `<p class="disc-row"><b>${esc(L(x.name))}</b> <span class="disc-pct">${snap.pcts[d]}%</span></p>`;
      }).join('')}
    </div>`;
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (snap.version === 'full') {
    if (snap.fullStage === 'submitted') {
      renderPaidReportSubmitted($actions, { claimId: snap.claimId, email: snap.email, amount: AMOUNT });
    } else {
      renderPaidReportEntry($actions, {
        feature: t('disc.fullFeature'), title: t('disc.fullTitle'), amount: AMOUNT,
        report: buildFullReport(snap, lang),
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
  retry.textContent = t('disc.retry');
  retry.onclick = () => { snapshot = null; render(el); };
  $actions.appendChild(retry);
  el.appendChild($actions);
}

// buildFullReport 客户端按当前语言生成完整版报告文本（随申请落盘，确认后原样邮件送达）
function buildFullReport(snap, lang) {
  const L = (o) => o[lang] || o.zh;
  const dm = data.dims[snap.primary];
  let s = `${t('disc.primary')}: ${L(dm.name)}\n${L(dm.full)}\n\n${t('disc.dimBreakdown')}\n`;
  DIMS.forEach((d) => {
    s += `${L(data.dims[d].name)}: 最像 ${snap.tallyMost[d]} / 最不像 ${snap.tallyLeast[d]}（${snap.pcts[d]}%）\n`;
  });
  return s.trim();
}

export default (el) => render(el);
