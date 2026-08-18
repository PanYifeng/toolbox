import { registry } from '/tools/registry.js';
import { t, tr, getLang, setLang } from '/core/i18n.js';
import { enhanceLined } from '/core/lined.js';

const app = document.getElementById('app');
let currentId = null;
let query = '';
let BOOT = null; // /api/bootstrap 返回的站点/功能/赞助配置

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
  { zh: '宗教文化', en: 'Religion & Culture' },
  { zh: '游戏', en: 'Games' },
  { zh: '纪念卡', en: 'Memorial' },
];

// init 启动：拉取 bootstrap 配置后再渲染
async function init() {
  try {
    const r = await fetch('/api/bootstrap');
    BOOT = await r.json();
  } catch (e) {
    BOOT = { features: {}, donation: { enabled: false }, ads: { enabled: false } };
  }
  track();
  shell();
  route();
}

// featureEnabled 取功能开关
function featureEnabled(key) {
  return !!(BOOT && BOOT.features && BOOT.features[key]);
}

// toolAllowed 工具是否在当前功能开关下可见（与服务端 toolAllowed 一致）
function toolAllowed(m) {
  const id = m.id;
  if (id.startsWith('religion-') && !featureEnabled('religion')) return false;
  if (id === 'cert-verify' && !featureEnabled('memorialCard')) return false;
  return true;
}

// visibleRegistry 过滤后的可见工具清单
function visibleRegistry() {
  return registry.filter(toolAllowed);
}

// navigate 切换工具页（history 路由），更新 URL 并滚动顶部
function navigate(id) {
  if (id) {
    history.pushState({ id }, '', `/t/${id}`);
  } else {
    history.pushState({}, '', '/');
  }
  route();
  window.scrollTo(0, 0);
}

// shell 渲染主框架（顶部栏 + 内容区）
function shell() {
  const showSignature = featureEnabled('signature');
  const showSponsor = featureEnabled('donation') && BOOT.donation && BOOT.donation.enabled;
  app.innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <h1>${t('app.title')}</h1>
          <span class="tagline">${t('app.tagline')}</span>
        </div>
        <input id="search" class="search" placeholder="${t('app.search')}" value="${escapeAttr(query)}" />
        <div class="topbar-actions">
          ${showSponsor ? `<button id="sponsor-btn" class="btn-soft sponsor-btn">${t('footer.sponsor')}</button>` : ''}
          <button id="lang-toggle" class="lang-toggle" title="Switch language"></button>
        </div>
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
      ${showSponsor ? `<a href="#" id="footer-sponsor" class="footer-sponsor">${t('footer.sponsor')}</a>` : ''}
      ${showSignature ? `<span class="footer-love">${t('footer.love')}</span>` : ''}
    </footer>`;
  app.querySelector('#search').oninput = onSearch;
  app.querySelector('#lang-toggle').onclick = toggleLang;
  const sp = app.querySelector('#sponsor-btn');
  if (sp) sp.onclick = () => openDonation();
  const fs = app.querySelector('#footer-sponsor');
  if (fs) fs.onclick = (e) => { e.preventDefault(); openDonation(); };
  updateLangButton();
  render();
}

// onSearch 输入搜索词，回到首页并过滤
function onSearch(e) {
  query = e.target.value;
  if (currentId) {
    currentId = null;
    history.replaceState({}, '', '/');
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

// renderHome 首页：赞助卡 + 分类分组的卡片网格
function renderHome() {
  const view = app.querySelector('#view');
  const ql = query.toLowerCase().trim();
  const matched = visibleRegistry().filter((m) => matches(m, ql));
  const parts = [];
  if (featureEnabled('donation') && BOOT.donation && BOOT.donation.enabled) {
    parts.push(donateCardHTML());
  }
  if (!matched.length) {
    parts.push(`<p class="muted empty">${t('app.noResult')}</p>`);
  } else {
    groupByCategory(matched).forEach((g) =>
      parts.push(`
      <section class="cat">
        <h3 class="cat-title">${g.name}</h3>
        <div class="cards">
          ${g.items.map(cardHtml).join('')}
        </div>
      </section>`),
    );
  }
  view.innerHTML = parts.join('');
  bindCards();
  bindDonateCard();
}

// donateCardHTML 赞助卡片（可关闭）
function donateCardHTML() {
  const d = BOOT.donation;
  const lang = getLang();
  const methods = (d.methods || [])
    .map((m) => {
      if (m.type === 'image') {
        return `<figure class="dm-item"><img src="${m.src}" alt="${m.label}" loading="lazy"><figcaption>${m.label}</figcaption></figure>`;
      }
      if (m.type === 'link') {
        return `<a class="dm-link" href="${m.url}" target="_blank" rel="noopener">${m.label} ↗</a>`;
      }
      return '';
    })
    .join('');
  return `
    <section class="donate-card" id="donate-card">
      <button class="dc-close" id="dc-close" aria-label="close">✕</button>
      <div class="dc-title">${d.title || t('footer.sponsor')}</div>
      <div class="dc-desc">${d.desc || ''}</div>
      <div class="donate-methods">${methods}</div>
      ${d.proHint ? `<p class="dc-prohint">${d.proHint}</p>` : ''}
    </section>`;
}

// bindDonateCard 绑定赞助卡关闭
function bindDonateCard() {
  const card = app.querySelector('#donate-card');
  if (!card) return;
  const close = card.querySelector('#dc-close');
  if (close) close.onclick = () => (card.style.display = 'none');
}

// openDonation 滚动到赞助卡（首页）或跳回首页并定位
function openDonation() {
  if (!currentId) {
    const card = app.querySelector('#donate-card');
    if (card) card.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  currentId = null;
  query = '';
  history.pushState({}, '', '/');
  render();
  setTimeout(() => {
    const card = app.querySelector('#donate-card');
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  }, 50);
}

// cardHtml 单个工具卡片
function cardHtml(m) {
  return `<a class="card" href="/t/${m.id}" data-id="${m.id}">
    <span class="card-icon">${m.icon || '·'}</span>
    <span class="card-name">${tr(m.name)}</span>
    <span class="card-cat">${tr(m.category)}</span>
  </a>`;
}

// bindCards 绑定卡片点击（history 路由）
function bindCards() {
  app.querySelectorAll('.card').forEach((c) => {
    c.onclick = (e) => {
      e.preventDefault();
      navigate(c.dataset.id);
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
  if (!m || !toolAllowed(m)) {
    // 被功能开关关闭的工具：回首页
    currentId = null;
    history.replaceState({}, '', '/');
    renderHome();
    return;
  }
  const view = app.querySelector('#view');
  view.innerHTML = `
    <div class="tool">
      <a class="back" href="/">&larr; ${t('app.back')}</a>
      <h2>${m.icon || ''} ${tr(m.name)}</h2>
      <div id="tool-body"></div>
    </div>`;
  view.querySelector('.back').onclick = (e) => {
    e.preventDefault();
    navigate(null);
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
  if (!featureEnabled('ads')) {
    ['ad-top', 'ad-bottom'].forEach((id) => {
      const e = app.querySelector('#' + id);
      if (e) e.innerHTML = '';
    });
    return;
  }
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

// track 匿名埋点上报（仅 features.analytics 开启时）
function track() {
  if (!featureEnabled('analytics')) return;
  const path = location.pathname || '/';
  const ref = document.referrer || '';
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, ref }),
    keepalive: true,
  }).catch(() => {});
}

// escapeAttr 转义属性值，防注入
function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

// route 根据当前 URL 解析要展示的工具
function route() {
  const path = location.pathname;
  let id = null;
  if (path.startsWith('/t/')) {
    id = path.slice(3).replace(/\/$/, '');
  } else if (location.hash && location.hash.length > 1) {
    // 兼容旧 hash 链接：#json-format → 重定向到 /t/json-format
    const old = location.hash.slice(1);
    if (registry.some((m) => m.id === old)) {
      history.replaceState({ id: old }, '', `/t/${old}`);
      id = old;
    }
  }
  if (id && registry.some((m) => m.id === id)) {
    currentId = id;
  } else {
    currentId = null;
  }
  render();
}

window.addEventListener('popstate', route);
init();
