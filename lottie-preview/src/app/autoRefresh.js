// src/app/autoRefresh.js
// Авто-рефреш просмотра, когда открыта страница /s/last.
// При возврате в фокус/видимость сверяем текущий "last" с сервером и, если он изменился, перезагружаем страницу.

function isViewingLast() {
  try {
    const p = location.pathname;
    if (p.startsWith('/s/')) {
      const id = decodeURIComponent(p.split('/')[2] || '');
      if (id === 'last' || id === '__last__') return true;
    }
    const u = new URL(location.href);
    const qid = u.searchParams.get('id');
    if (qid && (qid === 'last' || qid === '__last__')) return true;
  } catch {}
  return false;
}

function hashString(s) {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function fetchLastHash() {
  try {
    const r = await fetch('/api/share?id=last', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return hashString(JSON.stringify(j));
  } catch {
    return null;
  }
}

export function initAutoRefreshIfViewingLast() {
  if (!isViewingLast()) return;

  let baseline = null;
  let ticking = false;

  async function checkAndMaybeReload() {
    if (ticking) return;
    ticking = true;
    try {
      const h = await fetchLastHash();
      if (h && baseline && h !== baseline) {
        // Перезагружаем текущий URL с сохранением ?fit=…
        location.replace(location.href);
        return;
      }
      if (h && !baseline) baseline = h; // зафиксировать базовую сигнатуру
    } finally {
      ticking = false;
    }
  }

  // Первичная фиксация
  checkAndMaybeReload();

  // Триггеры «возврата в фокус/видимость»
  const onVisible = () => {
    if (document.visibilityState === 'visible') checkAndMaybeReload();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', checkAndMaybeReload);
  window.addEventListener('pageshow', () => checkAndMaybeReload());
}
