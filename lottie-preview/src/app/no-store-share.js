
// src/app/no-store-share.js
// Wrap fetch so that GET /api/share requests default to { cache: 'no-store' }.
// This reduces stale responses in WebViews/PWA shells without changing server code.
(function(){
  const _fetch = window.fetch;
  if (typeof _fetch !== 'function') return;
  window.fetch = function(input, init) {
    try {
      const url = (typeof input === 'string') ? input : (input && input.url) || '';
      if (/\/api\/share(\?|$)/.test(url)) {
        const method = (init && (init.method || init.method === '')) ? String(init.method || '').toUpperCase() : 'GET';
        if (method === 'GET') {
          init = Object.assign({ cache: 'no-store' }, init || {});
        }
      }
    } catch {}
    return _fetch.call(this, input, init);
  };
})();
