// [ANCHOR:SW] минимальный service worker
const CACHE = 'lottie-preview-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// простая стратегия: сначала сеть, затем кэш (fallback)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
