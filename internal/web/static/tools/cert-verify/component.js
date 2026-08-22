// 纪念卡验真：用户输入卡面四要素（姓名/主题/分数/完成时间）+ 防伪码，
// 前端用与生成相同的算法复算并比对。通过后用相同输入重新渲染原卡供下载（平台"找回"纪念卡）。
// 防伪码是内容指纹而非秘密，纯前端复算即可验真，无需服务端存储。

import { t, getLang } from '/core/i18n.js';
import { THEMES, THEME_CATEGORIES, computeAntiFake, normalizeCode, renderMemorialCard, downloadPng } from '/core/cert.js';

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
      <p class="muted cv-hint" id="cv-hint">${t('cv.timeHint')}</p>
      <button id="cv-go" class="btn">${t('cv.verify')}</button>
    </div>
    <div id="cv-out"></div>`;

  // 主题切换时，人格卡把"分数"字段切换为"类型代号"文本框（人格卡无分数）
  el.querySelector('#cv-theme').addEventListener('change', () => adaptScoreField(el));
  adaptScoreField(el);
  el.querySelector('#cv-go').onclick = () => onVerify(el);
}

// onVerify 复算防伪码并比对，通过则重新渲染原卡供下载
async function onVerify(el) {
  const name = el.querySelector('#cv-name').value.trim();
  const themeKey = el.querySelector('#cv-theme').value;
  let score = el.querySelector('#cv-score').value.trim();
  // 人格卡的"分数"实为类型代号（如 INTJ/D/O），卡面恒为大写；统一大写以容错用户输入
  if (isPersonalityTheme(themeKey)) score = score.toUpperCase();
  // datetime-local 控件值为 YYYY-MM-DDTHH:MM，转换为卡面/哈希所用的 YYYY-MM-DD HH:MM 格式
  const displayTime = el.querySelector('#cv-time').value.trim().replace('T', ' ');
  const userCode = el.querySelector('#cv-code').value.trim();
  const $out = el.querySelector('#cv-out');

  if (!name || !score || !displayTime || !userCode) {
    $out.innerHTML = `<p class="err">${t('cv.needAll')}</p>`;
    return;
  }

  // 破纪录卡（TB-R- 前缀，服务端 HMAC 签发）走服务端验签；普通 TB- 卡走前端复算
  if (/^TB-?R/i.test(userCode)) {
    await verifyRecordCard(el, { game: themeKey, name, score, displayTime, code: userCode });
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
    const personality = isPersonalityTheme(themeKey)
      ? { typeCode: score, typeLabel: score, dims: [] }
      : null;
    const { dataUrl, code } = await renderMemorialCard({
      themeKey, name, score, displayTime, showDonate: true, personality,
    });
    $out.innerHTML = `
      <p class="ok">${t('cv.pass')}</p>
      <img class="rc-preview" src="${dataUrl}" alt="memorial card">
      <p class="muted">${t('rel.antiFake')}: <code>${code}</code></p>
      <button id="cv-dl" class="btn">${t('cv.download')}</button>`;
    $out.querySelector('#cv-dl').onclick = () => downloadPng(dataUrl, `${themeKey}-memorial.png`);
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}

// verifyRecordCard 破纪录卡走服务端 HMAC 验签：通过则用 recordCode 重渲染金版卡。
// 与 onVerify 的前端复算路径互补——破纪录卡防伪码由服务端 secret 签发，前端无法复算，须回服务端复验。
async function verifyRecordCard(el, { game, name, score, displayTime, code }) {
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
    // 验签通过：用服务端签发码重渲染金版破纪录卡（drawRecordBanner 自动启用）
    const { dataUrl } = await renderMemorialCard({
      themeKey: game, name, score, displayTime, recordCode: code, showDonate: true,
    });
    $out.innerHTML = `
      <p class="ok">${t('lb.verifyRecord')}</p>
      <img class="rc-preview" src="${dataUrl}" alt="record memorial card">
      <p class="muted">${t('rel.antiFake')}: <code>${code}</code></p>
      <button id="cv-dl" class="btn">${t('cv.download')}</button>`;
    $out.querySelector('#cv-dl').onclick = () => downloadPng(dataUrl, `${game}-record.png`);
  } catch (err) {
    console.error(err);
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}
