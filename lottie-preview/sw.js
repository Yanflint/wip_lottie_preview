const CACHE = 'preview-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});


// Runtime caching for shot API and lottie CDN
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isShot = url.pathname.startsWith('/api/shot');
  const isLottie = url.hostname.includes('cdnjs.cloudflare.com') && url.pathname.includes('lottie.min.js');
  if (!(isShot || isLottie)) return; // not our concern

  event.respondWith((async () => {
    try {
      const net = await fetch(event.request);
      const cache = await caches.open(CACHE);
      cache.put(event.request, net.clone());
      return net;
    } catch (e) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw e;
    }
  })());
});
