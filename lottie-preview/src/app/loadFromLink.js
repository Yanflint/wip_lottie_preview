// Загружаем по /s/:id. Если id нет и это standalone, пробуем "последний" снимок.
// Флаг цикла (opts.loop) применяем до создания анимации.
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';
import { setLotOffset } from './state.js';
import { setLastLottie, state } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';
import { loadPinned } from './pinned.js';

function getShareIdFromLocation() {
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  const q = u.searchParams.get('id');
  return q || null;
}

function applyLoopFromPayload(refs, data) {
  if (data && data.opts && typeof data.opts.loop === 'boolean') {
    state.loopOn = !!data.opts.loop;
    if (refs?.loopChk) refs.loopChk.checked = state.loopOn;
  }
}

async function applyPayload(refs, data) {
  if (!data || typeof data !== 'object') return false;

  // ВАЖНО: сначала применяем флаг цикла
  applyLoopFromPayload(refs, data);

  if (data.bg) {
    const src = typeof data.bg === 'string' ? data.bg : data.bg.value;
    const meta = (typeof data.bg === 'object') ? { fileName: data.bg.name, assetScale: data.bg.assetScale } : {};
    if (!meta.fileName && data.lot && data.lot.meta && data.lot.meta._lpBgMeta) { meta.fileName = data.lot.meta._lpBgMeta.fileName; meta.assetScale = data.lot.meta._lpBgMeta.assetScale; }
    if (src) await setBackgroundFromSrc(refs, src, meta);
  }
  if (data.lot) {
    // Сбрасываем прошлое смещение, чтобы не мелькало старое положение
    try { setLotOffset(0,0); } catch {}
    try { const m = data.lot && data.lot.meta && data.lot.meta._lpPos; if (m && (typeof m.x==='number' || typeof m.y==='number')) setLotOffset(m.x||0, m.y||0); } catch {}
    setLastLottie(data.lot);
    await loadLottieFromData(refs, data.lot); // учтёт state.loopOn
  }

  setPlaceholderVisible(refs, false);
  // Ждём 2 кадра, чтобы визуальный viewport, фон и контейнер гарантированно стабилизировались (особенно iOS A2HS)
  await afterTwoFrames();
  layoutLottie(refs);
  return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

  // 1) Пробуем id из URL
  const id = getShareIdFromLocation();
  if (id) {
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
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

  // 3) Резерв: локальный pinned
  if (isStandalone) {
    const pinned = loadPinned();
    if (pinned && await applyPayload(refs, pinned)) return;
  }

  // 4) Ничего не нашли — остаётся плейсхолдер
}
