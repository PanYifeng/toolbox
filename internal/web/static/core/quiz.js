// renderQuiz 通用测验引擎：从题库随机抽题、倒计时、计分、双语。
// bank: [{ q:{zh,en}, options:[{zh,en}×4], answer:0..3, subject?, explanation?:{zh,en}, myth? }]
// opts: { count, minutes, passScore, tPrefix? }  tPrefix 默认 'rel'，用于切换 i18n 键前缀（知识问答用 'kq'）
// onFinish(score, total, passed, review) 完成回调；review 为全题作答明细供错题解析使用

import { t, getLang } from '/core/i18n.js';

// TOTOP_SHOW_Y 竖向滚动超过该像素才显示"回到顶部"按钮（短卷不误显）
const TOTOP_SHOW_Y = 500;

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
  const pfx = opts.tPrefix || 'rel';
  // 抽题后对每题选项单独洗牌，并重定位正确答案索引，
  // 避免题库中正确答案恒为某一位（如恒为首位）导致可被猜测。
  // picked 顺带保留 subject/explanation，供错题解析回传。
  const raw = shuffle(bank).slice(0, Math.min(opts.count, bank.length));
  const picked = raw.map((item) => {
    const correct = item.options[item.answer];
    const options = shuffle(item.options);
    return { q: item.q, options, answer: options.indexOf(correct), subject: item.subject || null, explanation: item.explanation || null };
  });
  const answers = new Array(picked.length).fill(-1);
  let submitted = false;
  let timeLeft = opts.minutes * 60;

  drawForm(el, picked, answers, lang, pfx);
  const $timer = el.querySelector('#q-timer');

  const tick = () => {
    $timer.textContent = fmtTime(timeLeft);
    if (timeLeft <= 0) { clearInterval(timerId); if (!submitted) submit(); return; }
    timeLeft--;
  };
  tick();
  const timerId = setInterval(tick, 1000);

  // 顶部与底部两处交卷按钮共用同一处理
  el.querySelectorAll('.js-submit').forEach((b) => {
    b.onclick = () => { if (submitted) return; if (confirm(t(`${pfx}.confirmSubmit`))) submit(); };
  });

  // 回到顶部：滚动超阈值显示，点击平滑回顶；按钮脱离 DOM（交卷/切走工具）后监听自清理
  const $totop = el.querySelector('.q-totop');
  const onScroll = () => {
    if (!document.body.contains($totop)) { window.removeEventListener('scroll', onScroll); return; }
    $totop.style.display = (window.scrollY > TOTOP_SHOW_Y) ? 'flex' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  $totop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // submit 计分并锁定，组装 review 回传（全题作答明细，调用方筛错题）
  function submit() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerId);
    let correct = 0;
    picked.forEach((item, i) => { if (answers[i] === item.answer) correct++; });
    const total = picked.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= opts.passScore;
    const review = picked.map((p, i) => ({
      q: p.q, options: p.options, userPick: answers[i], correctIndex: p.answer,
      subject: p.subject, explanation: p.explanation,
    }));
    drawResult(el, correct, total, score, passed, pfx);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (onFinish) onFinish(score, total, passed, review);
  }
}

// drawForm 渲染题目表单 + 顶部计时条
function drawForm(el, picked, answers, lang, pfx) {
  el.innerHTML = `
    <div class="quiz-bar">
      <span id="q-progress" class="js-progress">0 / ${picked.length}</span>
      <span id="q-timer"></span>
      <button class="btn js-submit">${t(`${pfx}.submit`)}</button>
    </div>
    <p class="muted">${t(`${pfx}.quizTip`)}</p>
    <div id="q-list"></div>
    <div class="quiz-bar-bottom">
      <span class="js-progress">0 / ${picked.length}</span>
      <button class="btn js-submit">${t(`${pfx}.submit`)}</button>
    </div>
    <button class="q-totop" aria-label="${t('quiz.backToTop')}" title="${t('quiz.backToTop')}">↑</button>`;
  const $list = el.querySelector('#q-list');

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
        el.querySelectorAll('.js-progress').forEach((p) => { p.textContent = `${done} / ${picked.length}`; });
      };
      $opts.appendChild(b);
    });
    $list.appendChild(card);
  });
}

// drawResult 渲染结果（导出供 knowledge-quiz 语言切换后恢复结果态用）
export function drawResult(el, correct, total, score, passed, pfx) {
  const msg = passed ? t(`${pfx}.passed`) : t(`${pfx}.failed`);
  const tone = passed ? 'ok' : 'warn';
  el.innerHTML = `
    <div class="quiz-result ${tone}">
      <h3>${msg}</h3>
      <p class="quiz-score">${t(`${pfx}.score`)}: <b>${score}</b> / 100</p>
      <p class="muted">${t(`${pfx}.correct`)}: ${correct} / ${total}</p>
      <p class="muted">${t(`${pfx}.respectNote`)}</p>
    </div>`;
}
