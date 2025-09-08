/* v67-offline-sw-edge - root-scoped SW with offline-last */
const CORE = [
  '/', '/index.html', '/app.js', '/style.css', '/manifest.webmanifest', '/lib/lottie.min.js'
];
const APP_CACHE = 'app-cache-v67-offline-sw-edge';
const DATA_CACHE = 'data-cache-v67-offline-sw-edge';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>!k.endsWith('v67-offline-sw-edge')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

// message: save last snapshot as /offline-last
self.addEventListener('message', async (e) => {
  const msg = e.data || {};
  if (msg && msg.type === 'SAVE_LAST' && msg.snap) {
    const cache = await caches.open(DATA_CACHE);
    const body = JSON.stringify(msg.snap);
    const res = new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    await cache.put(new Request('/offline-last', {cache:'no-store'}), res);
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Offline data endpoint
  if (url.pathname === '/offline-last') {
    e.respondWith((async()=>{
      const cache = await caches.open(DATA_CACHE);
      const hit = await cache.match('/offline-last');
      if (hit) return hit;
      return new Response(JSON.stringify({}), {status: 404, headers:{'Content-Type':'application/json'}});
    })());
    return;
  }

  // App shell & local libs: cache-first
  if (CORE.includes(url.pathname)) {
    e.respondWith(caches.open(APP_CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
    return;
  }

  // Navigation: network-first -> cached index
  if (e.request.mode === 'navigate') {
    e.respondWith((async()=>{
      try { return await fetch(e.request); }
      catch(_ ){ const c = await caches.open(APP_CACHE); return (await c.match('/index.html')) || Response.error(); }
    })());
    return;
  }
});
