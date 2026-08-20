// MBTI 人格测试组件：测试前先选免费版/完整版 → 二选一题计分定四字母型态 → 免费简版画像。
// 完整版（全部题）结果含 ¥5 详细解读（站主确认门邮件送达）；免费版（每维度子集）结果软推完整版。
// 不用 quiz.js 引擎（那是正误计分型测验）；MBTI 无对错，故自建二选一表单。无纪念卡（非分数型）。
// 语言切换触发 app.js 重渲染 render(el)，交卷后用模块级 snapshot 恢复结果与申请态；
// 页面刷新（模块重载）清空 snapshot 回选择入口——符合"刷新即重置"预期。

import { t, getLang } from '/core/i18n.js';
import { renderPaidReportEntry, renderPaidReportSubmitted } from '/core/paid-report.js';
import { renderChoice, subsetPerDim } from '/core/personality.js';
import { dichotomyHTML, barHTML } from '/core/radar.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';
import data from './data.js';

const FULL = data.questions; // 完整版题集（全部，60 题，每维度 15 题）
const FREE_PER_DIM = 5; // 免费版每维度取 5 题（共 20）
const AMOUNT = 5; // 完整版详细解读定价 ¥5
const DIMS = ['EI', 'SN', 'TF', 'JP'];
const ACCENT = '#5B4B9A'; // MBTI 主题强调色（靛紫），用于滑块/分享卡

// snapshot 交卷后快照：跨语言切换恢复结果与申请态；刷新清空
// { version:'free'|'full', answers:number[], code:string, tally:object, fullStage:'pending'|'submitted', claimId?, email? }
let snapshot = null;

// render 入口：有快照则恢复结果，否则渲染免费版/完整版选择卡
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

// renderByVersion 按版本走结果：完整版仅类型代号诱饵 + 付费墙；免费版全可视化
function renderByVersion(el, snap, lang) {
  if (snap.version === 'full') renderFullBait(el, snap, lang);
  else renderResult(el, snap, lang);
}

// renderFullBait 完整版结果：仅类型代号作诱饵（画像/雷达/子维/金卡付费确认后邮件附件送达）
function renderFullBait(el, snap, lang) {
  const tp = data.types[snap.code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  const OL = (o) => o[lang === 'en' ? 'zh' : 'en'] || o.en;
  const main = `${snap.code} · ${L(tp.nick)}`;
  const sub = `${snap.code} · ${OL(tp.nick)}`;
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${t('mbti.yourType')}</p>
      <h3 class="ps-bait">${esc(main)}</h3>
      <p class="muted ps-bait-en">${esc(sub)}</p>
      <p class="muted">${t('ps.fullPaywallHint')}</p>
    </div>`;
  renderActions(el, snap, lang);
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
  renderByVersion(el, snapshot, lang);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// renderResult 类型+昵称+简版 + 四 dichotomy 滑块+清晰度band +（完整版）子维条 + 分享卡 + 付费/升级
function renderResult(el, snap, lang) {
  const tp = data.types[snap.code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  const dichosHTML = DIMS.map((d) => {
    const dm = data.dims[d];
    const [a, b] = snap.tally[d];
    const total = a + b || 1;
    const pctA = Math.round((a / total) * 100);
    const winPct = Math.round((Math.max(a, b) / total) * 100);
    let row = dichotomyHTML(pctA, dm.first, dm.second, ACCENT) + `<span class="ps-band">${t('ps.clar' + clarKey(winPct))}</span>`;
    if (snap.version === 'full' && data.facets) {
      row += computeSubPcts(data.facets[d], snap.answers).map((sf, i) => barHTML(sf.pct, '· ' + L(data.facets[d][i].name), ACCENT)).join('');
    }
    return `<div class="ps-dim">${row}</div>`;
  }).join('');
  el.innerHTML = `
    <div class="quiz-result ok">
      <p class="muted">${snap.version === 'full' ? t('mbti.yourType') : t('mbti.yourTypeFree')}</p>
      <h3 class="mbti-type">${snap.code} · ${esc(L(tp.nick))}</h3>
      <p>${esc(L(tp.brief))}</p>
      <p class="muted">${t('ps.clarLabel')}</p>
      ${dichosHTML}
      <p class="ps-band-note">${t('ps.bandNote')}</p>
    </div>`;
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
        feature: t('mbti.fullFeature'), title: t('mbti.fullTitle'), amount: AMOUNT,
        report: buildFullReport(snap, lang),
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
  retry.textContent = t('mbti.retry');
  retry.onclick = () => { snapshot = null; render(el); };
  $actions.appendChild(retry);
  el.appendChild($actions);
}

// buildFullReport 客户端按当前语言生成完整版报告文本（分段：画像/维度详解/子维度/人际/压力/成长）
function buildFullReport(snap, lang) {
  const tp = data.types[snap.code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  let s = `== ${t('ps.secProfile')} ==\n${snap.code} ${L(tp.nick)}\n${L(tp.full)}\n\n`;
  s += `== ${t('ps.secDim')} ==\n`;
  DIMS.forEach((d) => {
    const dm = data.dims[d];
    const [a, b] = snap.tally[d];
    const total = a + b || 1;
    const winPct = Math.round((Math.max(a, b) / total) * 100);
    s += `${L(dm.name)}: ${dm.first} ${a} / ${dm.second} ${b} [${t('ps.clar' + clarKey(winPct))}]\n`;
  });
  s += `\n== ${t('ps.secSub')} ==\n`;
  DIMS.forEach((d) => {
    const dm = data.dims[d];
    const subs = computeSubPcts(data.facets[d], snap.answers);
    s += `${L(dm.name)}: ${subs.map((sf, i) => `${L(data.facets[d][i].name)} ${dm.first}${sf.pct}/${dm.second}${100 - sf.pct}`).join(' / ')}\n`;
  });
  s += `\n== ${t('ps.secRelation')} ==\n`;
  DIMS.forEach((d) => { s += `${L(data.dims[d].name)}: ${L(data.dims[d].relationship)}\n`; });
  s += `\n== ${t('ps.secStress')} ==\n`;
  DIMS.forEach((d) => { s += `${L(data.dims[d].name)}: ${L(data.dims[d].stress)}\n`; });
  s += `\n== ${t('ps.secGrowth')} ==\n`;
  DIMS.forEach((d) => { s += `${L(data.dims[d].name)}: ${L(data.dims[d].growth)}\n`; });
  return s.trim();
}

// clarKey MBTI 偏好清晰度带位（胜出极占比）：≥80 清晰 / 60-79 中等 / 53-59 轻微 / ≤52 几乎居中
function clarKey(pct) {
  if (pct >= 80) return 'VeryHigh';
  if (pct >= 60) return 'High';
  if (pct >= 53) return 'Mid';
  return 'Low';
}

// computeSubPcts 某 dichotomy 各子面 a 票占比（按 facet.items 绝对索引取 answers）
function computeSubPcts(facets, answers) {
  return facets.map((f) => {
    let a = 0;
    f.items.forEach((idx) => { if (answers[idx] === 0) a++; });
    return { pct: Math.round((a / f.items.length) * 100) };
  });
}

// buildShareOpts 构造 MBTI 分享卡渲染参数（类型+昵称为标签，四极清晰度雷达）
function buildShareOpts(snap, lang) {
  const tp = data.types[snap.code] || data.types.INTJ;
  const L = (o) => o[lang] || o.zh;
  const OL = (o) => o[lang === 'en' ? 'zh' : 'en'] || o.en;
  return {
    themeKey: 'personality-mbti',
    name: snap.code,
    personality: {
      typeLabel: `${snap.code} · ${L(tp.nick)}`,
      typeLabelEn: `${snap.code} · ${OL(tp.nick)}`,
      typeCode: snap.code,
      dims: DIMS.map((d) => {
        const dm = data.dims[d];
        const [a, b] = snap.tally[d];
        const total = a + b || 1;
        return { name: a >= b ? dm.first : dm.second, pct: Math.round((Math.max(a, b) / total) * 100) };
      }),
      accent: ACCENT,
    },
    showDonate: false,
  };
}

// downloadShareCard 生成并下载 PNG 分享卡
async function downloadShareCard(snap, lang) {
  const { dataUrl } = await renderMemorialCard(buildShareOpts(snap, lang));
  downloadPng(dataUrl, `mbti-${Date.now()}.png`);
}

// buildGoldPng 生成完整版金纪念卡 PNG dataURL（复用分享卡参数 + gold 标记），付费后作邮件附件送达
async function buildGoldPng(snap, lang) {
  const { dataUrl } = await renderMemorialCard({ ...buildShareOpts(snap, lang), gold: true });
  return dataUrl;
}

// 默认导出：app.js loadComponent 通过 mod.default(body) 挂载，入口即 render
export default (el) => render(el);
