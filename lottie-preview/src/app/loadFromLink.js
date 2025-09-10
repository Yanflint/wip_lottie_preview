// Восстанавливаем состояние по короткой ссылке /s/:id
import { setPlaceholderVisible } from './utils.js';
import { setLastLottie } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';

function getShareIdFromLocation() {
  // поддержим и /s/:id, и ?id=… (на всякий)
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];

  const u = new URL(location.href);
  const q = u.searchParams.get('id');
  return q || null;
}

export async function initLoadFromLink({ refs }) {
  const id = getShareIdFromLocation();
  if (!id) return; // обычный режим, не по ссылке

  try {
    const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
    if (!r.ok) {
      console.warn('share GET failed', r.status);
      return; // не найдено — оставим плейсхолдер
    }
    const data = await r.json().catch(() => null);
    if (!data || typeof data !== 'object') return;

    // фон
    if (data.bg && typeof data.bg === 'object' && data.bg.value) {
      await setBackgroundFromSrc(refs, data.bg.value);
    } else if (typeof data.bg === 'string') {
      await setBackgroundFromSrc(refs, data.bg);
    }

    // лотти
    if (data.lot) {
      setLastLottie(data.lot);
      await loadLottieFromData(refs, data.lot);
    }

    setPlaceholderVisible(refs, false);
    layoutLottie(refs);
  } catch (e) {
    console.error('initLoadFromLink error', e);
  }
}
