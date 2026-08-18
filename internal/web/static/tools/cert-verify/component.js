// 纪念卡验真：用户输入卡面四要素（姓名/主题/分数/完成时间）+ 防伪码，
// 前端用与生成相同的算法复算并比对。通过后用相同输入重新渲染原卡供下载（平台"找回"纪念卡）。
// 防伪码是内容指纹而非秘密，纯前端复算即可验真，无需服务端存储。

import { t, getLang } from '/core/i18n.js';
import { THEMES, computeAntiFake, normalizeCode, renderMemorialCard, downloadPng } from '/core/cert.js';

// render 验真表单 + 结果区
export default function (el) {
  const lang = getLang();
  const themeOpts = Object.keys(THEMES)
    .map((k) => `<option value="${k}">${THEMES[k].title[lang] || THEMES[k].title.zh}</option>`)
    .join('');

  el.innerHTML = `
    <p class="muted">${t('cv.desc')}</p>
    <div class="cv-form">
      <label>${t('cv.name')} <input id="cv-name" type="text" maxlength="30"></label>
      <label>${t('cv.theme')}
        <select id="cv-theme">${themeOpts}</select>
      </label>
      <label>${t('cv.score')} <input id="cv-score" type="number" min="0" max="999999"></label>
      <label>${t('cv.completed')} <input id="cv-time" type="text" placeholder="2025-04-08 00:00"></label>
      <label>${t('cv.code')} <input id="cv-code" type="text" placeholder="TB-XXXX-XXXX-XXXX"></label>
      <p class="muted cv-hint">${t('cv.timeHint')}</p>
      <button id="cv-go" class="btn">${t('cv.verify')}</button>
    </div>
    <div id="cv-out"></div>`;

  el.querySelector('#cv-go').onclick = () => onVerify(el);
}

// onVerify 复算防伪码并比对，通过则重新渲染原卡供下载
async function onVerify(el) {
  const name = el.querySelector('#cv-name').value.trim();
  const themeKey = el.querySelector('#cv-theme').value;
  const score = el.querySelector('#cv-score').value.trim();
  const displayTime = el.querySelector('#cv-time').value.trim();
  const userCode = el.querySelector('#cv-code').value.trim();
  const $out = el.querySelector('#cv-out');

  if (!name || !score || !displayTime || !userCode) {
    $out.innerHTML = `<p class="err">${t('cv.needAll')}</p>`;
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
    const { dataUrl, code } = await renderMemorialCard({
      themeKey, name, score, displayTime, showDonate: true,
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
