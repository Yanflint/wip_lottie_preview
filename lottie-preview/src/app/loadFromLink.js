// Загружаем состояние по /s/:id. Если id нет (или мы в standalone без параметров),
// пробуем поднять локально закреплённый макет.
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
  const id = getShareIdFromLocation();

  if (id) {
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
      if (!r.ok) return; // не найдено — оставим плейсхолдер
      const data = await r.json().catch(() => null);
      await applyPayload(refs, data);
      return;
    } catch (e) {
      console.error('share GET error', e);
    }
  }

  // Нет id → если установлено на дом. экран (или просто всегда как fallback),
  // пробуем поднять локально закреплённый макет:
  const pinned = loadPinned();
  if (pinned) {
    await applyPayload(refs, pinned);
  }
}
