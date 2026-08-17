// renderReligion 宗教文化工具的共享渲染：知识 / 测验 / 纪念卡 三个标签页。
// data: { meta, sections, quiz }

import { t, getLang } from '/core/i18n.js';
import { renderQuiz } from '/core/quiz.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';

// renderReligion 渲染三标签页
export function renderReligion(el, data) {
  const lang = getLang();
  let lastScore = null;
  let lastPassed = false;

  el.innerHTML = `
    <div class="rel-tabs">
      <button class="rel-tab active" data-tab="know">${t('rel.tabKnow')}</button>
      <button class="rel-tab" data-tab="quiz">${t('rel.tabQuiz')}</button>
      <button class="rel-tab" data-tab="card">${t('rel.tabCard')}</button>
    </div>
    <p class="muted rel-source">${data.meta.source[lang]}</p>
    <div id="rel-panel"></div>`;

  const $panel = el.querySelector('#rel-panel');
  el.querySelectorAll('.rel-tab').forEach((b) => {
    b.onclick = () => {
      el.querySelectorAll('.rel-tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const tab = b.dataset.tab;
      if (tab === 'know') renderKnow($panel, data, lang);
      else if (tab === 'quiz') renderQuizTab($panel, data, lang, onQuizFinish);
      else renderCardTab($panel, data, lang, () => ({ score: lastScore, passed: lastPassed }));
    };
  });
  renderKnow($panel, data, lang);

  // onQuizFinish 记录成绩，控制纪念卡申请
  function onQuizFinish(score, total, passed) {
    lastScore = score;
    lastPassed = passed;
  }
}

// renderKnow 知识阅读
function renderKnow(el, data, lang) {
  el.innerHTML = data.sections
    .map(
      (s) => `
      <div class="rel-section">
        <h3>${esc(s.title[lang] || s.title.zh)}</h3>
        <p>${esc(s.body[lang] || s.body.zh).replace(/\n/g, '<br>')}</p>
      </div>`,
    )
    .join('');
}

// renderQuizTab 测验入口
function renderQuizTab(el, data, lang, onFinish) {
  el.innerHTML = `
    <p class="muted">${t('rel.quizDesc').replace('{n}', data.quiz.length).replace('{pick}', 50).replace('{min}', 60)}</p>
    <button id="rel-start" class="btn">${t('rel.startQuiz')}</button>
    <div id="rel-quiz"></div>`;
  el.querySelector('#rel-start').onclick = () => {
    const $q = el.querySelector('#rel-quiz');
    renderQuiz($q, data.quiz, { count: 50, minutes: 60, passScore: 60 }, onFinish);
    el.querySelector('#rel-start').style.display = 'none';
  };
}

// renderCardTab 纪念卡申请
function renderCardTab(el, data, lang, getState) {
  el.innerHTML = `
    <p class="muted">${t('rel.cardDesc')}</p>
    <div class="rel-form">
      <label>${t('rel.name')} <input id="rc-name" type="text" maxlength="30"></label>
      <label>${t('rel.email')} <input id="rc-email" type="email"></label>
      <label>${t('rel.score')} <input id="rc-score" type="number" min="0" max="100"></label>
      <button id="rc-gen" class="btn">${t('rel.genCard')}</button>
    </div>
    <div id="rc-out"></div>`;
  const $name = el.querySelector('#rc-name');
  const $email = el.querySelector('#rc-email');
  const $score = el.querySelector('#rc-score');
  const st = getState();
  if (st.score != null) $score.value = st.score;

  el.querySelector('#rc-gen').onclick = async () => {
    const name = $name.value.trim();
    const score = Number($score.value);
    if (!name) { alert(t('rel.needName')); return; }
    if (isNaN(score) || score < 0 || score > 100) { alert(t('rel.needScore')); return; }
    const $out = el.querySelector('#rc-out');
    $out.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
    const { dataUrl, code } = await renderMemorialCard({
      themeKey: data.meta.themeKey,
      name, score, showDonate: true,
    });
    $out.innerHTML = `
      <img class="rc-preview" src="${dataUrl}" alt="memorial card">
      <p class="muted">${t('rel.antiFake')}: <code>${code}</code></p>
      <div class="row">
        <button id="rc-dl" class="btn">${t('rel.download')}</button>
        <button id="rc-mail" class="btn-soft">${t('rel.sendMail')}</button>
      </div>`;
    $out.querySelector('#rc-dl').onclick = () => downloadPng(dataUrl, `${data.meta.themeKey}-memorial.png`);
    $out.querySelector('#rc-mail').onclick = () => sendMail(data.meta.themeKey, $email.value, name, score, code, dataUrl, $out);
  };
}

// sendMail 调服务端发送纪念卡到邮箱（需配置 SMTP）
function sendMail(themeKey, email, name, score, code, dataUrl, $out) {
  if (!email) { alert(t('rel.needEmail')); return; }
  const $btn = $out.querySelector('#rc-mail');
  $btn.disabled = true;
  $btn.textContent = '...';
  fetch('/api/cert/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, score, code, png: dataUrl, religion: themeKey }),
  })
    .then((r) => r.json())
    .then((res) => {
      $btn.textContent = res.ok ? t('rel.mailOk') : (res.message || t('rel.mailFail'));
    })
    .catch(() => { $btn.textContent = t('rel.mailFail'); })
    .finally(() => { $btn.disabled = false; });
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
