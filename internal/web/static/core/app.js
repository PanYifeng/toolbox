import { registry } from '/tools/registry.js';
import { t, tr, getLang, setLang } from '/core/i18n.js';

const app = document.getElementById('app');
let currentId = null;

// shell 渲染主框架
function shell() {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <h1>${t('app.title')}</h1>
        <button id="lang-toggle" class="lang-toggle" title="Switch language"></button>
      </div>
      <input id="search" placeholder="${t('app.search')}" />
      <nav id="nav"></nav>
      <div class="ad" id="ad-side"></div>
    </aside>
    <main class="main">
      <div class="ad" id="ad-top"></div>
      <section id="tool" class="tool"></section>
      <div class="ad" id="ad-bottom"></div>
    </main>`;
  app.querySelector('#search').oninput = (e) => renderNav(e.target.value);
  app.querySelector('#lang-toggle').onclick = toggleLang;
  updateLangButton();
  renderNav('');
}

// updateLangButton 更新切换按钮文案
function updateLangButton() {
  const btn = app.querySelector('#lang-toggle');
  if (btn) btn.textContent = getLang() === 'zh' ? 'EN' : '中文';
}

// toggleLang 切换语言并重渲染
function toggleLang() {
  setLang(getLang() === 'zh' ? 'en' : 'zh');
  shell();
  if (currentId) select(currentId);
}

// renderNav 渲染过滤后的工具列表
function renderNav(q) {
  const ql = q.toLowerCase().trim();
  const list = registry.filter((m) => {
    const name = tr(m.name).toLowerCase();
    return name.includes(ql) || (m.keywords || []).some((k) => k.toLowerCase().includes(ql));
  });
  const nav = app.querySelector('#nav');
  nav.innerHTML = list
    .map((m) => `<a href="#${m.id}" data-id="${m.id}">${m.icon || '·'} ${tr(m.name)}</a>`)
    .join('');
  nav.querySelectorAll('a').forEach((a) => {
    a.onclick = (e) => { e.preventDefault(); select(a.dataset.id); };
  });
}

// select 加载并渲染指定工具
async function select(id) {
  currentId = id;
  const m = registry.find((x) => x.id === id);
  if (!m) return;
  const tool = app.querySelector('#tool');
  tool.innerHTML = `<h2>${m.icon || ''} ${tr(m.name)}</h2><div id="tool-body"></div>`;
  const mod = await m.component();
  mod.default(tool.querySelector('#tool-body'));
  loadAds();
}

// loadAds 拉取广告配置并按位置投放
function loadAds() {
  fetch('/api/ads')
    .then((r) => r.json())
    .then((cfg) => {
      if (!cfg.enabled || !cfg.slots || !cfg.slots.length) return;
      // 先清空广告位
      ['ad-top', 'ad-bottom', 'ad-side'].forEach((id) => {
        const e = app.querySelector('#' + id);
        if (e) e.innerHTML = '';
      });
      cfg.slots.forEach((s) => {
        const id = 'ad-' + (s.position || 'top');
        const e = app.querySelector('#' + id) || app.querySelector('#ad-top');
        if (e) e.innerHTML += s.html;
      });
    })
    .catch(() => {});
}

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id) select(id);
});

shell();
if (location.hash) select(location.hash.slice(1));
