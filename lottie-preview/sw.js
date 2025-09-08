const CACHE = 'preview-v2';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest'
];

const LAST_URL = '/offline-last';

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
  );
});

// Save last snap via postMessage from the page
self.addEventListener('message', (e)=>{
  const data = e.data || {};
  if (data && data.type === 'SAVE_LAST' && data.snap) {
    e.waitUntil((async ()=>{
      const c = await caches.open(CACHE);
      await c.put(LAST_URL, new Response(JSON.stringify(data.snap), {
        headers: { 'content-type': 'application/json' }
      }));
    })());
  }
});

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);

  // Serve last saved snap
  if (url.pathname === LAST_URL) {
    event.respondWith((async ()=>{
      const c = await caches.open(CACHE);
      const r = await c.match(LAST_URL);
      return r || new Response('null', { status: 200, headers: { 'content-type': 'application/json' } });
    })());
    return;
  }

  // Runtime caching for /api/shot (network-first -> cache)
  if (url.pathname.startsWith('/api/shot')) {
    event.respondWith((async ()=>{
      try {
        const net = await fetch(event.request);
        const c = await caches.open(CACHE); c.put(event.request, net.clone());
        return net;
      } catch (e) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw e;
      }
    })());
    return;
  }

  // Default: try cache, then network
  event.respondWith((async ()=>{
    const cached = await caches.match(event.request);
    if (cached) return cached;
    return fetch(event.request);
  })());
});
