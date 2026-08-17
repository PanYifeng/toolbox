// renderQuiz 通用测验引擎：从题库随机抽题、倒计时、计分、双语。
// bank: [{ q:{zh,en}, options:[{zh,en}×4], answer:0..3 }]
// opts: { count, minutes, passScore }
// onFinish(score, total, passed) 完成回调

import { t, getLang } from '/core/i18n.js';

// shuffle Fisher-Yates 洗牌
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// fmtTime 秒数转 MM:SS
function fmtTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// renderQuiz 渲染测验到 el
export function renderQuiz(el, bank, opts, onFinish) {
  const lang = getLang();
  const picked = shuffle(bank).slice(0, Math.min(opts.count, bank.length));
  const answers = new Array(picked.length).fill(-1);
  let submitted = false;
  let timeLeft = opts.minutes * 60;

  drawForm(el, picked, answers, lang);
  const $timer = el.querySelector('#q-timer');
  const $prog = el.querySelector('#q-progress');

  const tick = () => {
    $timer.textContent = fmtTime(timeLeft);
    if (timeLeft <= 0) { clearInterval(timerId); if (!submitted) submit(); return; }
    timeLeft--;
  };
  tick();
  const timerId = setInterval(tick, 1000);

  el.querySelector('#q-submit').onclick = () => {
    if (submitted) return;
    if (confirm(t('rel.confirmSubmit'))) submit();
  };

  function updateProgress() {
    const done = answers.filter((a) => a >= 0).length;
    $prog.textContent = `${done} / ${picked.length}`;
  }

  // submit 计分并锁定
  function submit() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerId);
    let correct = 0;
    picked.forEach((item, i) => { if (answers[i] === item.answer) correct++; });
    const total = picked.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= opts.passScore;
    drawResult(el, correct, total, score, passed);
    if (onFinish) onFinish(score, total, passed);
  }
}

// drawForm 渲染题目表单 + 顶部计时条
function drawForm(el, picked, answers, lang) {
  el.innerHTML = `
    <div class="quiz-bar">
      <span id="q-progress">0 / ${picked.length}</span>
      <span id="q-timer"></span>
      <button id="q-submit" class="btn">${t('rel.submit')}</button>
    </div>
    <p class="muted">${t('rel.quizTip')}</p>
    <div id="q-list"></div>`;
  const $list = el.querySelector('#q-list');
  const $prog = el.querySelector('#q-progress');

  picked.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'quiz-q';
    card.innerHTML = `
      <p class="quiz-stem"><b>${i + 1}.</b> ${esc(item.q[lang] || item.q.zh)}</p>
      <div class="quiz-opts"></div>`;
    const $opts = card.querySelector('.quiz-opts');
    item.options.forEach((op, j) => {
      const b = document.createElement('label');
      b.className = 'quiz-opt';
      b.innerHTML = `<input type="radio" name="q${i}" value="${j}"> <span>${esc(op[lang] || op.zh)}</span>`;
      b.querySelector('input').onchange = () => {
        answers[i] = j;
        const done = answers.filter((a) => a >= 0).length;
        $prog.textContent = `${done} / ${picked.length}`;
      };
      $opts.appendChild(b);
    });
    $list.appendChild(card);
  });
}

// drawResult 渲染结果
function drawResult(el, correct, total, score, passed) {
  const msg = passed ? t('rel.passed') : t('rel.failed');
  const tone = passed ? 'ok' : 'warn';
  el.innerHTML = `
    <div class="quiz-result ${tone}">
      <h3>${msg}</h3>
      <p class="quiz-score">${t('rel.score')}: <b>${score}</b> / 100</p>
      <p class="muted">${t('rel.correct')}: ${correct} / ${total}</p>
      <p class="muted">${t('rel.respectNote')}</p>
    </div>`;
}
