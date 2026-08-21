// service worker：app shell cache-first + 导航 network-first。
// 发布时 bump VER 触发自更新与旧缓存清理。
const VER = 'toolbox-v21';
const SHELL = [
  '/',
  '/core/app.js',
  '/core/style.css',
  '/core/i18n.js',
  '/core/pro.js',
  '/core/cert.js',
  '/core/characters.js',
  '/core/radar.js',
  '/core/lined.js',
  '/core/personality.js',
  '/manifest.webmanifest',
  '/img/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 不拦截跨域

  // 导航请求：network-first，离线回退缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { caches.open(VER).then((c) => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req).then((c) => c || caches.match('/'))),
    );
    return;
  }

  // 静态资源：network-first 且强制再校验（cache:'no-cache'），避免浏览器 HTTP 缓存
  // 在部署后仍返回旧版（CF 会把静态 max-age 覆盖到 4h，默认 fetch 会命中旧缓存）
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((r) => { if (r.ok) caches.open(VER).then((c) => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then((c) => c || new Response('', { status: 504 }))),
  );
});
