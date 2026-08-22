// 纪念卡验真：用户输入卡面四要素（姓名/主题/分数/完成时间）+ 防伪码 + 接收邮箱，
// 前端用与生成相同的算法复算并比对（破纪录金版卡走服务端 HMAC 验签）。通过后直接把原卡 PNG 发到用户邮箱，
// 不再在页面下载（找回卡 = 邮箱收卡）。防伪码是内容指纹而非秘密，纯前端复算即可验真。
// 邮箱发送失败时回退到页面下载，避免用户白跑一趟。

import { t, getLang } from '/core/i18n.js';
import { THEMES, THEME_CATEGORIES, computeAntiFake, normalizeCode, renderMemorialCard, downloadPng } from '/core/cert.js';

// esc 转义 HTML（项目惯例就地复制）
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// buildThemeOpts 按一级分类分组渲染主题下拉项（optgroup），避免长列表难选
function buildThemeOpts(lang) {
  return THEME_CATEGORIES
    .map((cat) => {
      const label = cat.title[lang] || cat.title.zh;
      const opts = cat.themes
        .filter((k) => THEMES[k])
        .map((k) => `<option value="${k}">${THEMES[k].title[lang] || THEMES[k].title.zh}</option>`)
        .join('');
      return `<optgroup label="${label}">${opts}</optgroup>`;
    })
    .join('');
}

// isPersonalityTheme 判断是否为人格卡主题（无分数，改用类型代号验真）
function isPersonalityTheme(k) {
  return typeof k === 'string' && k.indexOf('personality-') === 0;
}

// adaptScoreField 人格卡主题下把"分数"输入框切换为"类型代号"文本框，反之恢复数字分数框
function adaptScoreField(el) {
  const themeKey = el.querySelector('#cv-theme').value;
  const $label = el.querySelector('#cv-score-label');
  const $score = el.querySelector('#cv-score');
  const $hint = el.querySelector('#cv-hint');
  if (isPersonalityTheme(themeKey)) {
    $label.textContent = t('cv.typeCode');
    $score.type = 'text';
    $score.removeAttribute('min');
    $score.removeAttribute('max');
    $score.placeholder = 'INTJ / D / O';
    $hint.textContent = t('cv.typeCodeHint');
  } else {
    $label.textContent = t('cv.score');
    $score.type = 'number';
    $score.setAttribute('min', '0');
    $score.setAttribute('max', '999999');
    $score.placeholder = '';
    $hint.textContent = t('cv.timeHint');
  }
}

// render 验真表单 + 结果区
export default function (el) {
  const lang = getLang();
  const themeOpts = buildThemeOpts(lang);

  el.innerHTML = `
    <p class="muted">${t('cv.desc')}</p>
    <div class="cv-form">
      <label>${t('cv.name')} <input id="cv-name" type="text" maxlength="30"></label>
      <label>${t('cv.theme')}
        <select id="cv-theme">${themeOpts}</select>
      </label>
      <label><span id="cv-score-label">${t('cv.score')}</span> <input id="cv-score" type="number" min="0" max="999999"></label>
      <label>${t('cv.completed')} <input id="cv-time" type="datetime-local"></label>
      <label>${t('cv.code')} <input id="cv-code" type="text" placeholder="TB-XXXX-XXXX-XXXX"></label>
      <label>${t('cv.email')} <input id="cv-email" type="email" placeholder="your@email.com"></label>
      <p class="muted cv-hint" id="cv-hint">${t('cv.timeHint')}</p>
      <button id="cv-go" class="btn">${t('cv.verify')}</button>
    </div>
    <div id="cv-out"></div>`;

  // 主题切换时，人格卡把"分数"字段切换为"类型代号"文本框（人格卡无分数）
  el.querySelector('#cv-theme').addEventListener('change', () => adaptScoreField(el));
  adaptScoreField(el);
  el.querySelector('#cv-go').onclick = () => onVerify(el);
}

// onVerify 复算防伪码并比对，通过则把原卡 PNG 发到用户邮箱
async function onVerify(el) {
  const name = el.querySelector('#cv-name').value.trim();
  const themeKey = el.querySelector('#cv-theme').value;
  let score = el.querySelector('#cv-score').value.trim();
  // 人格卡的"分数"实为类型代号（如 INTJ/D/O），卡面恒为大写；统一大写以容错用户输入
  if (isPersonalityTheme(themeKey)) score = score.toUpperCase();
  // datetime-local 控件值为 YYYY-MM-DDTHH:MM，转换为卡面/哈希所用的 YYYY-MM-DD HH:MM 格式
  const displayTime = el.querySelector('#cv-time').value.trim().replace('T', ' ');
  const userCode = el.querySelector('#cv-code').value.trim();
  const email = el.querySelector('#cv-email').value.trim();
  const $out = el.querySelector('#cv-out');

  if (!name || !score || !displayTime || !userCode || !email) {
    $out.innerHTML = `<p class="err">${t('cv.needAll')}</p>`;
    return;
  }

  // 破纪录卡（TB-R- 前缀，服务端 HMAC 签发）走服务端验签；普通 TB- 卡走前端复算
  if (/^TB-?R/i.test(userCode)) {
    await verifyRecordCard(el, { game: themeKey, name, score, displayTime, code: userCode, email });
    return;
  }

  $out.innerHTML = `<p class="muted">${t('cv.verifying')}</p>`;
  try {
    const expected = await computeAntiFake(name, themeKey, score, displayTime);
    const match = normalizeCode(expected) === normalizeCode(userCode);
    if (!match) {
      $out.innerHTML = `<p class="err">${t('cv.fail')}</p>`;
      return;
    }
    // 验证通过：用相同输入重新渲染原卡（displayTime 直接传入，保证与原卡一致）
    // 人格卡无分数，重渲染传 minimal personality 走 drawPersonalityBody（无原始维度数据，省略雷达图）
    const isPerson = isPersonalityTheme(themeKey);
    const personality = isPerson ? { typeCode: score, typeLabel: score, dims: [] } : null;
    const { dataUrl, code } = await renderMemorialCard({
      themeKey, name, score, displayTime, showDonate: true, personality,
    });
    await deliverCard($out, {
      dataUrl, code, themeKey, name,
      score: isPerson ? 0 : (Number(score) || 0),
      scoreText: isPerson ? score : '',
      email,
      subject: isPerson ? `Toolbox 人格纪念卡 / Personality Card — ${name}` : '',
    });
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}

// verifyRecordCard 破纪录金版卡走服务端 HMAC 验签：通过则把金版卡 PNG 发到用户邮箱。
// 与 onVerify 的前端复算路径互补——破纪录卡防伪码由服务端 secret 签发，前端无法复算，须回服务端复验。
async function verifyRecordCard(el, { game, name, score, displayTime, code, email }) {
  const $out = el.querySelector('#cv-out');
  $out.innerHTML = `<p class="muted">${t('cv.verifying')}</p>`;
  try {
    const r = await fetch('/api/leaderboard/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, name, score: Number(score), time: displayTime, code }),
    });
    const d = await r.json();
    if (!d.valid) {
      $out.innerHTML = `<p class="err">${t('lb.verifyFail')}</p>`;
      return;
    }
    // 验签通过：用服务端签发码重渲染金版破纪录卡，直接发邮箱
    const { dataUrl } = await renderMemorialCard({
      themeKey: game, name, score, displayTime, recordCode: code, showDonate: true,
    });
    await deliverCard($out, {
      dataUrl, code, themeKey: game, name,
      score: Number(score) || 0,
      scoreText: '',
      email,
      subject: `Toolbox 破纪录金版卡 / Gold Record Card — ${name}`,
    });
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}

// deliverCard 把渲染好的卡片 PNG 经 /api/cert/send 发到用户邮箱。
// 成功只提示已发送（不在页面下载）；失败回退到页面下载，避免用户白跑一趟。
async function deliverCard($out, { dataUrl, code, themeKey, name, score, scoreText, email, subject }) {
  if (!email) {
    $out.innerHTML = `<p class="err">${t('cv.needEmail')}</p>`;
    return;
  }
  $out.innerHTML = `<p class="muted">${t('cv.sending')}</p>`;
  try {
    const r = await fetch('/api/cert/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, score, scoreText, code, png: dataUrl, subject }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ok) {
      $out.innerHTML = `<p class="ok">${t('cv.sent').replace('{email}', esc(email))}</p>`;
      return;
    }
    renderFallback($out, dataUrl, code, themeKey);
  } catch (err) {
    renderFallback($out, dataUrl, code, themeKey);
  }
}

// renderFallback 发送失败时的回退：展示卡片预览 + 下载按钮，不让用户白跑一趟
function renderFallback($out, dataUrl, code, themeKey) {
  $out.innerHTML = `
    <p class="err">${t('cv.sendFail')}</p>
    <img class="rc-preview" src="${dataUrl}" alt="memorial card">
    <p class="muted">${t('card.antiFake')}: <code>${code}</code></p>
    <button id="cv-dl" class="btn">${t('cv.download')}</button>`;
  $out.querySelector('#cv-dl').onclick = () => downloadPng(dataUrl, `${themeKey}-memorial.png`);
}
