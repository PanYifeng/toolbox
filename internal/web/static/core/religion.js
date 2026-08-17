// renderReligion 宗教文化工具的共享渲染：知识 / 测验 两个标签页。
// 纪念卡不再单独成页：仅在测验及格后，基于真实测验成绩内联生成（分数不可手填）。
// data: { meta, sections, quiz }

import { t, getLang } from '/core/i18n.js';
import { renderQuiz } from '/core/quiz.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';

// renderReligion 渲染两标签页
export function renderReligion(el, data) {
  const lang = getLang();

  el.innerHTML = `
    <div class="rel-tabs">
      <button class="rel-tab active" data-tab="know">${t('rel.tabKnow')}</button>
      <button class="rel-tab" data-tab="quiz">${t('rel.tabQuiz')}</button>
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
      else renderQuizTab($panel, data, lang);
    };
  });
  renderKnow($panel, data, lang);
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

// renderQuizTab 测验入口；及格后内联生成纪念卡（分数取自真实成绩）
function renderQuizTab(el, data, lang) {
  el.innerHTML = `
    <p class="muted">${t('rel.quizDesc')}</p>
    <p class="rel-reward">${t('rel.quizReward')}</p>
    <div class="row">
      <button id="rel-start" class="btn">${t('rel.startQuiz')}</button>
      <button id="rel-preview" class="btn-soft">${t('rel.preview')}</button>
    </div>
    <div id="rel-quiz"></div>`;
  el.querySelector('#rel-start').onclick = () => {
    const $q = el.querySelector('#rel-quiz');
    renderQuiz($q, data.quiz, { count: 50, minutes: 60, passScore: 60 }, (score, total, passed) => {
      if (passed) renderCardForm($q, data, lang, score);
    });
    el.querySelector('#rel-start').style.display = 'none';
    el.querySelector('#rel-preview').style.display = 'none';
  };
  el.querySelector('#rel-preview').onclick = () => renderPreview(el, data, lang);
}

// renderPreview 渲染带水印的样例纪念卡，仅供预览设计
async function renderPreview(el, data, lang) {
  const $q = el.querySelector('#rel-quiz');
  $q.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
  const { dataUrl } = await renderMemorialCard({
    themeKey: data.meta.themeKey,
    name: lang === 'en' ? 'Sample' : '样例',
    score: 88,
    showDonate: true,
    preview: true,
  });
  $q.innerHTML = `
    <p class="muted">${t('rel.previewNote')}</p>
    <img class="rc-preview" src="${dataUrl}" alt="sample memorial card">`;
}

// renderCardForm 纪念卡表单：仅在测验及格后调用，score 为真实成绩且只读
function renderCardForm(el, data, lang, score) {
  const box = document.createElement('div');
  box.className = 'rel-card-form';
  box.innerHTML = `
    <p class="muted">${t('rel.cardUnlocked').replace('{score}', score)}</p>
    <div class="rel-form">
      <label>${t('rel.name')} <input id="rc-name" type="text" maxlength="30"></label>
      <label>${t('rel.email')} <input id="rc-email" type="email"></label>
      <button id="rc-gen" class="btn">${t('rel.genCard')}</button>
    </div>
    <div id="rc-out"></div>`;
  el.appendChild(box);

  const $name = box.querySelector('#rc-name');
  const $email = box.querySelector('#rc-email');
  box.querySelector('#rc-gen').onclick = async () => {
    const name = $name.value.trim();
    if (!name) { alert(t('rel.needName')); return; }
    const $out = box.querySelector('#rc-out');
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
