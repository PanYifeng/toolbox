// mountGameCard 为小游戏挂载"通关纪念卡"入口：按钮 + 内联表单（姓名 + 生成 + 下载）。
// container: 挂载点；getScore: 返回当前成绩的函数；gameName: 文件名标识。

import { t } from '/core/i18n.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';

// mountGameCard 挂载通关纪念卡入口
export function mountGameCard(container, getScore, gameName) {
  const wrap = document.createElement('div');
  wrap.className = 'game-card-wrap';
  wrap.innerHTML = `
    <button id="gc-toggle" class="btn-soft">${t('game.genCard')}</button>
    <div id="gc-form" class="gc-form" style="display:none">
      <p class="muted">${t('game.cardDesc')}</p>
      <label>${t('rel.name')} <input id="gc-name" type="text" maxlength="30"></label>
      <button id="gc-gen" class="btn">${t('rel.genCard')}</button>
      <div id="gc-out"></div>
    </div>`;
  container.appendChild(wrap);

  const $form = wrap.querySelector('#gc-form');
  wrap.querySelector('#gc-toggle').onclick = () => {
    $form.style.display = $form.style.display === 'none' ? 'block' : 'none';
  };
  wrap.querySelector('#gc-gen').onclick = async () => {
    const name = wrap.querySelector('#gc-name').value.trim();
    if (!name) { alert(t('rel.needName')); return; }
    const score = getScore();
    const $out = wrap.querySelector('#gc-out');
    $out.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
    // 游戏纪念卡同样展示支付码；寄语由主题（game-${gameName}）提供，契合各游戏风格。
    const { dataUrl } = await renderMemorialCard({
      themeKey: `game-${gameName}`, name, score, showDonate: true,
    });
    $out.innerHTML = `
      <img class="rc-preview" src="${dataUrl}" alt="memorial card">
      <button id="gc-dl" class="btn">${t('rel.download')}</button>`;
    $out.querySelector('#gc-dl').onclick = () => downloadPng(dataUrl, `${gameName}-memorial.png`);
  };
}
