// MBTI 人格测试组件：测试前先选免费版/完整版 → 二选一题计分定四字母型态 → 免费简版画像。
// 完整版（全部题）结果含 ¥5 详细解读（站主确认门邮件送达）；免费版（每维度子集）结果软推完整版。
// 不用 quiz.js 引擎（那是正误计分型测验）；MBTI 无对错，故自建二选一表单。无纪念卡（非分数型）。
// 语言切换触发 app.js 重渲染 render(el)，交卷后用模块级 snapshot 恢复结果与申请态；
// 页面刷新（模块重载）清空 snapshot 回选择入口——符合"刷新即重置"预期。

import { t, getLang } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import { renderChoice, subsetPerDim } from '/core/personality.js';
import data from './data.js';

const FULL = data.questions; // 完整版题集（全部，20 题）
const FREE_PER_DIM = 3; // 免费版每维度取 3 题（共 12）
const AMOUNT = 5; // 完整版详细解读定价 ¥5
const DIMS = ['EI', 'SN', 'TF', 'JP'];

// snapshot 交卷后快照：跨语言切换恢复结果与申请态；刷新清空
// { version:'free'|'full', answers:number[], code:string, tally:object, fullStage:'pending'|'submitted', claimId?, email? }
let snapshot = null;

// render 入口：有快照则恢复结果，否则渲染免费版/完整版选择卡
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

// startTest 按版本选题（免费版子集 / 完整版全部）渲染二选一表单 + 进度 + 交卷按钮
function startTest(el, lang, version) {
  const items = version === 'free' ? subsetPerDim(FULL, FREE_PER_DIM) : FULL;
  const total = items.length;
  const answers = new Array(total).fill(-1);
  el.innerHTML = `
    <div class="quiz-bar">
      <span class="mbti-progress">0 / ${total}</span>
      <button class="btn js-mbti-submit">${t('mbti.submit')}</button>
    </div>
    <p class="muted">${t('mbti.qtip')}</p>
    <div id="mbti-list"></div>
    <div class="quiz-bar-bottom">
      <button class="btn js-mbti-submit">${t('mbti.submit')}</button>
    </div>`;
  const $list = el.querySelector('#mbti-list');
  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'quiz-q';
    const a = optLabel(item.a, lang);
    const b = optLabel(item.b, lang);
    card.innerHTML = `
      <p class="quiz-stem"><b>${i + 1}.</b></p>
      <div class="quiz-opts">
        <label class="quiz-opt"><input type="radio" name="m${i}" value="0"> <span>${a}</span></label>
        <label class="quiz-opt"><input type="radio" name="m${i}" value="1"> <span>${b}</span></label>
      </div>`;
    card.querySelectorAll('input').forEach((inp) => {
      inp.onchange = () => {
        answers[i] = parseInt(inp.value, 10);
        const done = answers.filter((x) => x >= 0).length;
        el.querySelectorAll('.mbti-progress').forEach((p) => { p.textContent = `${done} / ${total}`; });
      };
    });
    $list.appendChild(card);
  });
  el.querySelectorAll('.js-mbti-submit').forEach((b) => {
    b.onclick = () => onSubmit(el, answers, items, version, lang);
  });
}

// optLabel 取当前语言文案（缺则回退中文）
function optLabel(o, lang) {
  return esc(o[lang] || o.zh);
}

// esc 转义 HTML（项目惯例就地复制）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// onSubmit 校验全答 → 计分 → 记快照（含版本）→ 渲染结果
function onSubmit(el, answers, items, version, lang) {
  if (answers.some((x) => x < 0)) { alert(t('mbti.needAll')); return; }
  if (!confirm(t('mbti.confirmSubmit'))) return;
  const tally = computeTally(items, answers);
  const code = DIMS.map((d) => (tally[d][0] >= tally[d][1] ? data.dims[d].first : data.dims[d].second)).join('');
  snapshot = { version, answers: [...answers], code, tally, fullStage: 'pending' };
  renderResult(el, snapshot, lang);
}

// computeTally 每维度 [第一极票数, 第二极票数]；选 a 计第一极，选 b 计第二极
function computeTally(items, answers) {
  const tally = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };
  items.forEach((q, i) => {
    if (answers[i] === 0) tally[q.dim][0]++;
    else if (answers[i] === 1) tally[q.dim][1]++;
  });
  return tally;
}

// renderResult 免费简版结果 + 维度倾向 +（完整版）付费入口/已提交态 或（免费版）升级入口 + 重新测试
function renderResult(el, snap, lang) {
  const tp = data.types[snap.code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${snap.version === 'full' ? t('mbti.yourType') : t('mbti.yourTypeFree')}</p>
      <h3 class="mbti-type">${snap.code} · ${esc(L(tp.nick))}</h3>
      <p>${esc(L(tp.brief))}</p>
      <p class="muted mbti-dim">${t('mbti.dimBreakdown')}</p>
      ${dimRows(snap.tally, lang)}
    </div>`;
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (snap.version === 'full') {
    // 完整版：付费详细解读入口（或已提交态）
    if (snap.fullStage === 'submitted') {
      renderPaidReportSubmitted($actions, { claimId: snap.claimId, email: snap.email, amount: AMOUNT });
    } else {
      renderPaidReportEntry($actions, {
        feature: t('mbti.fullFeature'),
        title: t('mbti.fullTitle'),
        amount: AMOUNT,
        report: buildFullReport(snap.code, snap.tally, lang),
        onSubmitted: (id, em) => { if (snapshot) { snapshot.fullStage = 'submitted'; snapshot.claimId = id; snapshot.email = em; } },
      });
    }
  } else {
    // 免费版：软推完整版（重测取全部题，更准确，完成后可付费看详解）
    const up = document.createElement('button');
    up.className = 'btn';
    up.textContent = t('ps.upgrade');
    up.onclick = () => { snapshot = null; startTest(el, lang, 'full'); };
    $actions.appendChild(up);
  }
  const retry = document.createElement('button');
  retry.className = 'btn-soft';
  retry.textContent = t('mbti.retry');
  retry.onclick = () => { snapshot = null; render(el); };
  $actions.appendChild(retry);
  el.appendChild($actions);
}

// dimRows 维度倾向条：E 3 / I 2 之类
function dimRows(tally, lang) {
  const L = (o) => o[lang] || o.zh;
  return DIMS.map((d) => {
    const dm = data.dims[d];
    return `<p class="muted">${esc(L(dm.name))}: <b>${dm.first} ${tally[d][0]}</b> / <b>${dm.second} ${tally[d][1]}</b></p>`;
  }).join('');
}

// buildFullReport 客户端按当前语言生成完整版报告文本（随申请落盘，确认后原样邮件送达）
function buildFullReport(code, tally, lang) {
  const tp = data.types[code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  let s = `${code} ${L(tp.nick)}\n\n${L(tp.full)}\n\n${t('mbti.dimBreakdown')}\n`;
  DIMS.forEach((d) => {
    const dm = data.dims[d];
    s += `${L(dm.name)}: ${dm.first} ${tally[d][0]} / ${dm.second} ${tally[d][1]}\n`;
  });
  return s;
}

// 默认导出：app.js loadComponent 通过 mod.default(body) 挂载，入口即 render
export default (el) => render(el);
