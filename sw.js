// [ANCHOR:SW] минимальный service worker с кэшем для standalone
const CACHE = 'lottie-preview-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js?v=60',
  './manifest.webmanifest',
  // lottie-web: кешируем, чтобы работало в standalone
  'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// сеть -> кэш (fallback)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    fetch(req).catch(async () => {
      // пробуем точное совпадение
      let match = await caches.match(req);
      if (match) return match;
      // пробуем игнорируя query (для app.js?v=…)
      match = await caches.match(new Request(req.url.split('?')[0]));
      return match || caches.match('./');
    })
  );
});
