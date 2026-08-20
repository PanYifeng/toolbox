import { registry } from '/tools/registry.js';
import { t, tr, getLang, setLang } from '/core/i18n.js';
import { enhanceLined } from '/core/lined.js';
import { renderMarkdown } from '/core/md.js';
import { aboutPageHTML } from '/core/about.js';

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
  window.BOOT = BOOT; // 暴露给 pro.js 等核心模块读取 plans
  track();
  shell();
  route();
  // 注册 service worker（PWA：离线可用、可安装到桌面）
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
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
      <a href="/about" id="footer-about" class="footer-about">${t('footer.about')}</a>
      ${showSignature ? `<span class="footer-love">${t('footer.love')}</span>` : ''}
      ${featureEnabled('ads') ? `<span class="footer-disclosure" title="${t('footer.adDisclosureTip')}">${t('footer.adDisclosure')}</span>` : ''}
    </footer>`;
  app.querySelector('#search').oninput = onSearch;
  app.querySelector('#lang-toggle').onclick = toggleLang;
  const sp = app.querySelector('#sponsor-btn');
  if (sp) sp.onclick = () => openDonation();
  const fs = app.querySelector('#footer-sponsor');
  if (fs) fs.onclick = (e) => { e.preventDefault(); openDonation(); };
  const fa = app.querySelector('#footer-about');
  if (fa) fa.onclick = (e) => { e.preventDefault(); history.pushState({}, '', '/about'); route(); window.scrollTo(0, 0); };
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
  if (currentId === '__about__') renderAbout();
  else if (currentId) renderTool();
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

// donateCardHTML 赞助卡片（可折叠，不可关闭——关闭后顶栏/底栏入口无法再展开）
function donateCardHTML() {
  const d = BOOT.donation;
  const methods = (d.methods || [])
    .map((m) => {
      const label = tr(m.label);
      if (m.type === 'image') {
        return `<figure class="dm-item"><img src="${m.src}" alt="${label}" loading="lazy"><figcaption>${label}</figcaption></figure>`;
      }
      if (m.type === 'link') {
        return `<a class="dm-link" href="${m.url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
      }
      return '';
    })
    .join('');
  // links 免费支持外链（推广购买 / star），与打赏二维码分组渲染
  const links = (d.links || [])
    .map((l) => {
      const label = tr(l.label);
      const hint = tr(l.hint);
      const rel = l.sponsored ? 'nofollow sponsored noopener noreferrer' : 'noopener noreferrer';
      return `<a class="dm-link" href="${l.url}" target="_blank" rel="${rel}">${label}${hint ? ` <span class="dm-hint">${hint}</span>` : ''} ↗</a>`;
    })
    .join('');
  const linksHtml = links ? `<div class="dc-section-title">${t('donate.freeTitle')}</div><div class="donate-links">${links}</div>` : '';
  return `
    <section class="donate-card collapsed" id="donate-card">
      <div class="dc-head" id="dc-head" role="button" tabindex="0" aria-expanded="false" aria-controls="dc-body">
        <div class="dc-title-wrap">
          <span class="dc-title">${tr(d.title) || t('footer.sponsor')}</span>
          <span class="dc-subtitle">${t('donate.subtitle')}</span>
        </div>
        <button class="dc-toggle" id="dc-toggle" aria-label="collapse">▸</button>
      </div>
      <div class="dc-body" id="dc-body">
        <div class="dc-desc">${tr(d.desc) || ''}</div>
        ${linksHtml}
        <div class="dc-section-title">${t('donate.donateTitle')}</div>
        <div class="donate-methods">${methods}</div>
      </div>
    </section>`;
}

// picksSample 从 affiliate 单品池按平台分组洗牌、各取 2 件（"不选死"，均匀曝光 + 新鲜感）
function picksSample() {
  const pool = (BOOT.donation && BOOT.donation.picks) || [];
  if (!pool.length) return [];
  // 按平台分组：保证淘宝 / 京东都有曝光，避免某次全是单一平台
  const taobao = pool.filter((p) => p.platform === 'taobao');
  const jd = pool.filter((p) => p.platform === 'jd');
  const sample = (arr, n) => {
    const a = arr.slice();
    // Fisher–Yates 洗牌后取前 n 件
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  };
  return [...sample(taobao, 2), ...sample(jd, 2)];
}

// picksItemsHTML 渲染随机抽取的好物网格项
// 链接用 pick.url —— 即带 PID 的导购推广短链（淘宝 s.click / 京东 u.jd），不可替换为裸商品页，否则佣金不计入
function picksItemsHTML() {
  return picksSample().map((p) => {
    const tag = p.platform === 'taobao' ? t('picks.taobao') : t('picks.jd');
    return `<a class="pick-item" href="${p.url}" target="_blank" rel="nofollow sponsored noopener noreferrer">
      <span class="pick-platform ${p.platform}">${tag}</span>
      <img class="pick-img" src="${p.image}" alt="${escapeAttr(p.name)}" loading="lazy">
      <span class="pick-name">${p.name}</span>
      <span class="pick-price">¥${escapeAttr(p.price)} <em>${t('picks.dealPrice')}</em></span>
      <span class="pick-cta">${t('picks.view')} →</span>
    </a>`;
  }).join('');
}

// picksCardHTML 工具页底部"好物"展示卡：每次进工具页随机抽 4 件，可折叠 + 换一批刷新
function picksCardHTML() {
  if (!featureEnabled('donation') || !BOOT.donation || !BOOT.donation.enabled) return '';
  const pool = (BOOT.donation && BOOT.donation.picks) || [];
  if (!pool.length) return '';
  const items = picksItemsHTML();
  if (!items) return '';
  return `
    <section class="picks-card" id="picks-card">
      <div class="pc-head" id="pc-head" role="button" tabindex="0" aria-expanded="true" aria-controls="pc-body">
        <div class="pc-title-wrap">
          <span class="pc-title">${t('picks.title')}</span>
          <span class="pc-subtitle">${t('picks.subtitle')}</span>
        </div>
        <button class="pc-refresh" id="pc-refresh" title="${t('picks.refresh')}">↻ ${t('picks.refresh')}</button>
        <button class="pc-toggle" id="pc-toggle" aria-label="collapse">▾</button>
      </div>
      <div class="pc-body" id="pc-body">
        <div class="picks-grid">${items}</div>
        <div class="pc-foot">${t('picks.foot')}</div>
      </div>
    </section>`;
}

// bindPicksCard 绑定好物卡折叠切换 + 换一批（重新随机抽取网格项）
function bindPicksCard() {
  const card = app.querySelector('#picks-card');
  if (!card) return;
  const head = card.querySelector('#pc-head');
  const toggle = card.querySelector('#pc-toggle');
  const grid = card.querySelector('.picks-grid');
  const refresh = card.querySelector('#pc-refresh');
  const flip = () => {
    const collapsed = card.classList.toggle('collapsed');
    if (toggle) toggle.textContent = collapsed ? '▸' : '▾';
    head.setAttribute('aria-expanded', String(!collapsed));
  };
  if (head) {
    head.onclick = flip;
    head.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  }
  if (toggle) toggle.onclick = (e) => { e.stopPropagation(); flip(); };
  // 换一批：只重渲染网格项（新随机选择），不整卡重建
  if (refresh && grid) refresh.onclick = (e) => { e.stopPropagation(); grid.innerHTML = picksItemsHTML(); };
}

// bindDonateCard 绑定赞助卡折叠切换（整个头部可点击）
function bindDonateCard() {
  const card = app.querySelector('#donate-card');
  if (!card) return;
  const head = card.querySelector('#dc-head');
  const toggle = card.querySelector('#dc-toggle');
  if (!head) return;
  const flip = () => {
    const collapsed = card.classList.toggle('collapsed');
    if (toggle) { toggle.textContent = collapsed ? '▸' : '▾'; }
    head.setAttribute('aria-expanded', String(!collapsed));
  };
  head.onclick = flip;
  head.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  // toggle 在 head 内，单独点击会冒泡双触发，故阻止冒泡由自身处理
  if (toggle) toggle.onclick = (e) => { e.stopPropagation(); flip(); };
}

// openDonation 展开赞助卡并滚动定位（首页）或跳回首页并定位
function openDonation() {
  const show = (card) => {
    if (!card) return;
    card.classList.remove('collapsed');
    const t = card.querySelector('#dc-toggle');
    const h = card.querySelector('#dc-head');
    if (t) { t.textContent = '▾'; }
    if (h) { h.setAttribute('aria-expanded', 'true'); }
    card.scrollIntoView({ behavior: 'smooth' });
  };
  if (!currentId) { show(app.querySelector('#donate-card')); return; }
  currentId = null;
  query = '';
  history.pushState({}, '', '/');
  render();
  setTimeout(() => show(app.querySelector('#donate-card')), 50);
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

// groupByCategory 按分类分组并按预设顺序排列；纪念卡分类始终置底（不受未知分类追加影响）
function groupByCategory(list) {
  const order = CAT_ORDER.map(tr);
  const memorialCat = tr({ zh: '纪念卡', en: 'Memorial' }); // 纪念卡：始终放最下面
  const buckets = {};
  list.forEach((m) => {
    const c = tr(m.category);
    (buckets[c] = buckets[c] || []).push(m);
  });
  // 预设顺序分组（排除纪念卡，其单独置底）
  const groups = order
    .filter((c) => c !== memorialCat && buckets[c])
    .map((c) => ({ name: c, items: buckets[c] }));
  // 未在预设顺序中的分类追加到末尾（纪念卡之前）
  Object.keys(buckets)
    .filter((c) => c !== memorialCat && !order.includes(c))
    .forEach((c) => groups.push({ name: c, items: buckets[c] }));
  // 纪念卡始终放在最下面
  if (buckets[memorialCat]) {
    groups.push({ name: memorialCat, items: buckets[memorialCat] });
  }
  return groups;
}

// matches 名称或关键词是否命中搜索词
function matches(m, ql) {
  if (!ql) return true;
  const name = tr(m.name).toLowerCase();
  return name.includes(ql) || (m.keywords || []).some((k) => k.toLowerCase().includes(ql));
}

// renderAbout 关于页：返回按钮 + 双语关于/隐私政策内容
function renderAbout() {
  const view = app.querySelector('#view');
  view.innerHTML = aboutPageHTML();
  const back = view.querySelector('.back');
  if (back) back.onclick = (e) => { e.preventDefault(); navigate(null); };
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
  const guideMd = tr(m.guide);
  const guideHtml = guideMd ? `<div class="tool-guide">${renderMarkdown(guideMd)}</div>` : '';
  view.innerHTML = `
    <div class="tool">
      <a class="back" href="/">&larr; ${t('app.back')}</a>
      <div class="tool-head">
        <h2>${m.icon || ''} ${tr(m.name)}</h2>
        <button id="tool-share" class="tool-share-btn" title="${t('share.title')}">🔗 ${t('share.title')}</button>
      </div>
      ${guideHtml}
      <div id="tool-body"></div>
      ${picksCardHTML()}
    </div>`;
  view.querySelector('.back').onclick = (e) => {
    e.preventDefault();
    navigate(null);
  };
  const shareBtn = view.querySelector('#tool-share');
  if (shareBtn) shareBtn.onclick = onShare;
  bindPicksCard();
  loadComponent(m, view.querySelector('#tool-body'));
}

// onShare 分享当前工具：移动端调原生分享面板，桌面端复制链接
function onShare() {
  const url = location.href;
  const title = document.title;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
    return;
  }
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(url).then(() => {
    const btn = app.querySelector('#tool-share');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ ' + t('share.copied');
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
  });
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
        if (e) e.innerHTML += tr(s.html);
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
  if (path === '/about') {
    currentId = '__about__';
    render();
    return;
  }
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
