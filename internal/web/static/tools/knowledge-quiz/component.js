// 趣味知识问答组件（component.js）：学科选择 → 筛题 → 考试 → 及格发卡 / 满分选卡 / 有错题付费解析。
// 题库来自 ./data.js（策展静态双语，含 explanation/subject/myth）。考试数 = min(50, 该科题量)。
// 卡面主题 'knowledge-quiz'；卡功能门控复用 memorialCard（发证资质风险），错题解析门控 features.errata。
// 满分（100）可选普通免费卡或满分特别版金卡（¥1，自觉解锁）；非满分/有错题可付费看解析（0.2 元/题）。
// 错题解析为站主确认门：访客提交申请（邮箱+交易号+review 快照）→ 站主邮件确认收款 → 解析邮件发访客。
// 语言切换会触发 app.js 全量重渲染（render(el) 重跑）；交卷后用模块级 snapshot 恢复结果与申请态，
// 页面刷新（重载）自动清空 snapshot 回学科选择——符合"刷新即重置"的预期。

import { t, getLang } from '/core/i18n.js';
import { renderQuiz, drawResult } from '/core/quiz.js';
import { renderCardForm, openPerfectUpgrade } from '/core/card-form.js';
import { renderErrataEntry, renderErrataSubmitted } from '/core/errata.js';
import bank from './data.js';

const THEME_KEY = 'knowledge-quiz';
const PASS_SCORE = 60;
const MINUTES = 30;
const PRICE_PER_Q = 0.2;

// snapshot 交卷后结果快照：跨语言切换重渲染时恢复结果与错题申请态；页面刷新（模块重载）自动清空
// errataStage: 'pending'（未提交，显示入口按钮）/ 'submitted'（已提交，显示待确认态）
let snapshot = null; // { review, score, passed, errataStage, claimId?, email? }

// SUBJECTS 学科选项：key 对应 data.js 中 subject 字段；'all' 综合；'myth' 辟谣专场（myth:true 池）
const SUBJECTS = [
  { key: 'nature', icon: '🌿' },
  { key: 'physics', icon: '⚛️' },
  { key: 'chemistry', icon: '🧪' },
  { key: 'biology', icon: '🧬' },
  { key: 'geography', icon: '🌍' },
  { key: 'history', icon: '📜' },
  { key: 'law', icon: '⚖️' },
  { key: 'myth', icon: '🔍' },
  { key: 'all', icon: '🧠' },
];

// render 渲染学科选择入口；若有交卷快照则直接恢复结果（语言切换重渲染场景）
export function render(el) {
  const lang = getLang();
  if (snapshot) { restoreResult(el, snapshot, lang); return; }
  el.innerHTML = `
    <p class="muted">${t('kq.examDesc').replace('{n}', 50).replace('{pts}', 2)}</p>
    <p class="muted">${t('kq.respectNote')}</p>
    <p class="muted">${t('kq.pickSubject')}</p>
    <div class="kq-subjects">${SUBJECTS.map(subjectButton).join('')}</div>
    <div id="kq-out"></div>`;
  el.querySelectorAll('.kq-subj').forEach((b) => {
    b.onclick = () => startExam(el, b.dataset.key, lang);
  });
}

// subjectLabel 学科按钮文案：'all' 用综合键，其余用 kq.<key>
function subjectLabel(key) {
  return key === 'all' ? t('kq.comprehensive') : t('kq.' + key);
}

// subjectButton 单个学科按钮
function subjectButton(s) {
  return `<button class="kq-subj" data-key="${s.key}">${s.icon} ${subjectLabel(s.key)}</button>`;
}

// startExam 按科筛题后开考；题数取 min(50, 该科题量)，引擎自适应
function startExam(el, key, lang) {
  const filtered = filterBank(key);
  const $out = el.querySelector('#kq-out');
  if (filtered.length === 0) {
    $out.innerHTML = `<p class="err">${t('kq.noQuestions')}</p>`;
    return;
  }
  const count = Math.min(50, filtered.length);
  $out.innerHTML = '';
  const $q = document.createElement('div');
  $out.appendChild($q);
  renderQuiz($q, filtered, { count, minutes: MINUTES, passScore: PASS_SCORE, tPrefix: 'kq' }, (score, total, passed, review) => {
    snapshot = { review, score, passed, errataStage: 'pending' };
    onExamFinish($q, { score, passed, review, lang, root: el });
  });
}

// restoreResult 语言切换后恢复：按当前语言重画结果块 + 动作按钮（含错题申请态）
function restoreResult(el, snap, lang) {
  el.innerHTML = '';
  const $q = document.createElement('div');
  el.appendChild($q);
  const total = snap.review.length;
  const correct = snap.review.filter((r) => r.userPick === r.correctIndex).length;
  drawResult($q, correct, total, snap.score, snap.passed, 'kq');
  onExamFinish($q, { score: snap.score, passed: snap.passed, review: snap.review, lang, root: el, errataStage: snap.errataStage, claimId: snap.claimId, email: snap.email });
}

// filterBank 按学科过滤题库：'all' 全科，'myth' 辟谣专场（myth:true），其余按 subject 字段
export function filterBank(key) {
  if (key === 'all') return bank;
  if (key === 'myth') return bank.filter((q) => q.myth);
  return bank.filter((q) => q.subject === key);
}

// onExamFinish 交卷后处理：仅展示分数（quiz.js drawResult 已渲染），纪念卡与错题解析均改为按需按钮入口
// errataStage='submitted' 时直接渲染"已提交待确认"态（语言切换恢复），否则渲染按钮入口并监听提交回调记入快照
function onExamFinish($q, { score, passed, review, lang, root, errataStage, claimId, email }) {
  const $actions = document.createElement('div');
  $actions.className = 'kq-actions';
  if (passed) {
    const card = document.createElement('button');
    card.className = 'btn';
    card.textContent = t('kq.claimCard');
    card.onclick = () => { $actions.remove(); startCard($q, score, lang); };
    $actions.appendChild(card);
  }
  if (errataStage === 'submitted') {
    renderErrataSubmitted($actions, { claimId, email });
  } else {
    renderErrataEntry($actions, review, {
      pricePerQ: PRICE_PER_Q,
      feature: t('kq.errataFeature'),
      onSubmitted: (id, em) => { if (snapshot) { snapshot.errataStage = 'submitted'; snapshot.claimId = id; snapshot.email = em; } },
    });
  }
  // 重新开始：清快照回学科选择（页面刷新也会清，此处供交卷后主动重考）
  const retry = document.createElement('button');
  retry.className = 'btn-soft';
  retry.textContent = t('kq.retry');
  retry.onclick = () => { snapshot = null; render(root); };
  $actions.appendChild(retry);
  $q.appendChild($actions);
}

// startCard 按分数走满分特别版选择或普通纪念卡表单
function startCard($q, score, lang) {
  if (score === 100) renderPerfectChoice($q, lang);
  else renderCardForm($q, { themeKey: THEME_KEY, score });
}

// renderPerfectChoice 满分选择：普通卡（免费）或满分特别版金卡（¥1，自觉解锁）
function renderPerfectChoice($q, lang) {
  const box = document.createElement('div');
  box.className = 'rel-card-form kq-perfect-choice';
  box.innerHTML = `
    <p class="ok">${t('card.perfectChoice')}</p>
    <div class="row">
      <button id="kq-normal" class="btn-soft">${t('card.normalCard')}</button>
      <button id="kq-perfect" class="btn">${t('card.perfectCard')}</button>
    </div>
    <p class="muted lb-upgrade-foot">${t('card.foot')}</p>`;
  $q.appendChild(box);
  box.querySelector('#kq-normal').onclick = () => {
    box.remove();
    renderCardForm($q, { themeKey: THEME_KEY, score: 100 });
  };
  box.querySelector('#kq-perfect').onclick = () => {
    box.remove();
    openPerfectUpgrade($q, { themeKey: THEME_KEY, score: 100 });
  };
}

// 默认导出：app.js loadComponent 通过 mod.default(body) 挂载，入口即 render
export default (el) => render(el);
