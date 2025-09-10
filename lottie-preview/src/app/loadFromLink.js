// Загружаем по /s/:id. Если id нет и это standalone (ярлык),
 // пробуем получить "последний" снимок с сервера — /api/share?id=last.
// Локальный pinned оставляем вторым резервом.

import { setPlaceholderVisible } from './utils.js';
import { setLastLottie } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';
import { loadPinned } from './pinned.js';

function getShareIdFromLocation() {
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  const q = u.searchParams.get('id');
  return q || null;
}

async function applyPayload(refs, data) {
  if (!data || typeof data !== 'object') return false;

  if (data.bg) {
    const src = typeof data.bg === 'string' ? data.bg : data.bg.value;
    if (src) await setBackgroundFromSrc(refs, src);
  }
  if (data.lot) {
    setLastLottie(data.lot);
    await loadLottieFromData(refs, data.lot);
  }

  setPlaceholderVisible(refs, false);
  layoutLottie(refs);
  return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

  // 1) Пробуем id из URL
  const id = getShareIdFromLocation();
  if (id) {
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (await applyPayload(refs, data)) return;
      }
    } catch (e) { console.error('share GET error', e); }
  }

  // 2) Если ярлык — тянем "последний" снимок с сервера
  if (isStandalone) {
    try {
      const r = await fetch('/api/share?id=last', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (await applyPayload(refs, data)) return;
      }
    } catch (e) { console.error('last GET error', e); }
  }

  // 3) Резерв: локальный pinned (если вдруг нужен)
  if (isStandalone) {
    const pinned = loadPinned();
    if (pinned && await applyPayload(refs, pinned)) return;
  }

  // 4) Ничего не нашли — остаётся плейсхолдер
}
