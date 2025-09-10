// src/app/loadFromLink.js
// Загружаем состояние по /s/:id. Если id нет, то используем pinned ТОЛЬКО в standalone.

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

  setPlaceholderVisible(refs, false); // контент есть — скрыть
  layoutLottie(refs);
  return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  // ПО УМОЛЧАНИЮ показываем placeholder — пока не загрузим данные
  setPlaceholderVisible(refs, true);

  const id = getShareIdFromLocation();
  if (id) {
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (await applyPayload(refs, data)) return;
      }
    } catch (e) {
      console.error('share GET error', e);
    }
  }

  // ВАЖНО: fallback на pinned — ТОЛЬКО в standalone (ярлык на Домой)
  if (isStandalone) {
    const pinned = loadPinned();
    if (pinned) {
      await applyPayload(refs, pinned);
      return;
    }
  }

  // если сюда дошли — контента нет, placeholder остаётся видимым
}
