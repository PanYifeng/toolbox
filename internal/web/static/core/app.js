import { registry } from '/tools/registry.js';
import { t, tr, getLang, setLang } from '/core/i18n.js';
import { enhanceLined } from '/core/lined.js';

const app = document.getElementById('app');
let currentId = null;
let query = '';

// 分类展示顺序（按 zh 键排序，未列出的追加到末尾）
const CAT_ORDER = [
  { zh: '编码', en: 'Encoding' },
  { zh: '时间', en: 'Time' },
  { zh: '文本', en: 'Text' },
  { zh: '生成', en: 'Generate' },
  { zh: '数学', en: 'Math' },
  { zh: '设计', en: 'Design' },
  { zh: '网络', en: 'Network' },
  { zh: '视频', en: 'Video' },
  { zh: '音频', en: 'Audio' },
  { zh: '文档', en: 'Document' },
  { zh: '游戏', en: 'Games' },
];

// shell 渲染主框架（顶部栏 + 内容区）
function shell() {
  app.innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <h1>${t('app.title')}</h1>
          <span class="tagline">${t('app.tagline')}</span>
        </div>
        <input id="search" class="search" placeholder="${t('app.search')}" value="${escapeAttr(query)}" />
        <button id="lang-toggle" class="lang-toggle" title="Switch language"></button>
      </header>
      <main class="main">
        <div class="ad" id="ad-top"></div>
        <section id="view"></section>
        <div class="ad" id="ad-bottom"></div>
      </main>
    </div>
    <footer class="footer">
      <span>${t('footer.coop')}:
        <a href="mailto:904379134@qq.com">904379134@qq.com</a>
      </span>
    </footer>`;
  app.querySelector('#search').oninput = onSearch;
  app.querySelector('#lang-toggle').onclick = toggleLang;
  updateLangButton();
  render();
}

// onSearch 输入搜索词，回到首页并过滤
function onSearch(e) {
  query = e.target.value;
  if (currentId) {
    currentId = null;
    history.replaceState(null, '', '#');
  }
  render();
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
}

// render 按当前状态渲染首页或工具页
function render() {
  if (currentId) renderTool();
  else renderHome();
  loadAds();
}

// renderHome 首页：按分类分组的卡片网格
function renderHome() {
  const view = app.querySelector('#view');
  const ql = query.toLowerCase().trim();
  const matched = registry.filter((m) => matches(m, ql));
  if (!matched.length) {
    view.innerHTML = `<p class="muted empty">${t('app.noResult')}</p>`;
    return;
  }
  const groups = groupByCategory(matched);
  view.innerHTML = groups
    .map(
      (g) => `
      <section class="cat">
        <h3 class="cat-title">${g.name}</h3>
        <div class="cards">
          ${g.items.map(cardHtml).join('')}
        </div>
      </section>`,
    )
    .join('');
  bindCards();
}

// cardHtml 单个工具卡片
function cardHtml(m) {
  return `<a class="card" href="#${m.id}" data-id="${m.id}">
    <span class="card-icon">${m.icon || '·'}</span>
    <span class="card-name">${tr(m.name)}</span>
    <span class="card-cat">${tr(m.category)}</span>
  </a>`;
}

// bindCards 绑定卡片点击
function bindCards() {
  app.querySelectorAll('.card').forEach((c) => {
    c.onclick = (e) => {
      e.preventDefault();
      location.hash = c.dataset.id;
    };
  });
}

// groupByCategory 按分类分组并按预设顺序排列
function groupByCategory(list) {
  const order = CAT_ORDER.map(tr);
  const buckets = {};
  list.forEach((m) => {
    const c = tr(m.category);
    (buckets[c] = buckets[c] || []).push(m);
  });
  const groups = order
    .filter((c) => buckets[c])
    .map((c) => ({ name: c, items: buckets[c] }));
  // 未在预设顺序中的分类追加到末尾
  Object.keys(buckets)
    .filter((c) => !order.includes(c))
    .forEach((c) => groups.push({ name: c, items: buckets[c] }));
  return groups;
}

// matches 名称或关键词是否命中搜索词
function matches(m, ql) {
  if (!ql) return true;
  const name = tr(m.name).toLowerCase();
  return name.includes(ql) || (m.keywords || []).some((k) => k.toLowerCase().includes(ql));
}

// renderTool 工具页：返回按钮 + 标题 + 工具组件
function renderTool() {
  const m = registry.find((x) => x.id === currentId);
  if (!m) {
    currentId = null;
    renderHome();
    return;
  }
  const view = app.querySelector('#view');
  view.innerHTML = `
    <div class="tool">
      <a class="back" href="#">&larr; ${t('app.back')}</a>
      <h2>${m.icon || ''} ${tr(m.name)}</h2>
      <div id="tool-body"></div>
    </div>`;
  view.querySelector('.back').onclick = (e) => {
    e.preventDefault();
    location.hash = '';
  };
  loadComponent(m, view.querySelector('#tool-body'));
}

// loadComponent 异步加载并渲染工具组件
async function loadComponent(m, body) {
  try {
    const mod = await m.component();
    mod.default(body);
    enhanceLined(body); // 为所有 textarea 自动加行号槽
  } catch (err) {
    body.innerHTML = `<p class="err">load failed: ${err.message}</p>`;
  }
}

// loadAds 拉取广告配置并按位置投放
function loadAds() {
  fetch('/api/ads')
    .then((r) => r.json())
    .then((cfg) => {
      if (!cfg.enabled || !cfg.slots || !cfg.slots.length) return;
      ['ad-top', 'ad-bottom'].forEach((id) => {
        const e = app.querySelector('#' + id);
        if (e) e.innerHTML = '';
      });
      cfg.slots.forEach((s) => {
        const id = 'ad-' + (s.position === 'bottom' ? 'bottom' : 'top');
        const e = app.querySelector('#' + id);
        if (e) e.innerHTML += s.html;
      });
    })
    .catch(() => {});
}

// escapeAttr 转义属性值，防注入
function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

// route 根据 hash 路由
function route() {
  const id = location.hash.slice(1);
  if (id && registry.some((m) => m.id === id)) {
    currentId = id;
  } else {
    currentId = null;
  }
  render();
}

window.addEventListener('hashchange', route);
shell();
route();
