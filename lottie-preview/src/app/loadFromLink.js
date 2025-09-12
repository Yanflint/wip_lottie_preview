// Загружаем по /s/:id. Если id нет и это standalone, пробуем "последний" снимок.
// Флаг цикла (opts.loop) применяем до создания анимации.
import { setPlaceholderVisible } from './utils.js';
import { setLotOffset } from './state.js';
import { setLastLottie, state } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';
import { loadPinned } from './pinned.js';


function getRevFromLocation() {
  try {
    const u = new URL(location.href);
    const r = u.searchParams.get('rev');
    return r && r.replace(/"/g,'') || null;
  } catch { return null; }
}
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
    try { const m = data.lot && data.lot.meta && data.lot.meta._lpPos; if (m && (typeof m.x==='number' || typeof m.y==='number')) setLotOffset(m.x||0, m.y||0); } catch {}
    setLastLottie(data.lot);
    await loadLottieFromData(refs, data.lot); // учтёт state.loopOn
  }

  setPlaceholderVisible(refs, false);
  layoutLottie(refs);
  return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

  // 1) Пробуем id из URL
  const id = getShareIdFromLocation();
  const wantRev = getRevFromLocation();
  if (id) {

try {
  // Если указан rev — дождёмся совпадения ETag перед загрузкой JSON
  if (wantRev) {
    const maxTries = 25; // ~2.5сек при 100мс
    let ok = false;
    for (let i=0; i<maxTries; i++) {
      const head = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { method: 'HEAD', cache: 'no-store' });
      const et = (head.headers.get('ETag') || '').replace(/"/g, '');
      if (et && et === wantRev) { ok = true; break; }
      await new Promise(r => setTimeout(r, 100));
    }
  }
} catch {}
try {
  const r = await fetch(`/api/share?id=${encodeURIComponent(id)}&ts=${Date.now()}`, { cache: 'no-store' });
  if (r.ok) {
    const data = await r.json().catch(() => null);
    if (data && await applyPayload(refs, data)) {
      // Проверка корректной инициализации
      try {
        const okW = (refs?.lottieMount?.firstElementChild?.getBoundingClientRect?.().width || 0) > 0;
        const okH = (refs?.lottieMount?.firstElementChild?.getBoundingClientRect?.().height || 0) > 0;
        const hasBg = !!(refs?.bgImg?.naturalWidth);
        if (!(okW && okH && hasBg)) {
          const r2 = await fetch(`/api/share?id=${encodeURIComponent(id)}&ts=${Date.now()}`, { cache: 'no-store' });
          if (r2.ok) {
            const d2 = await r2.json().catch(() => null);
            if (d2) await applyPayload(refs, d2);
          }
        }
      } catch {}
      return;
    }
  }
} catch (e) { console.error('id GET error', e); }

  }
    } catch (e) { console.error('share GET error', e); }
  }

  // 2) Если ярлык — тянем "последний" снимок с сервера
  if (isStandalone) {
    try {
      const r = await fetch(`/api/share?id=last&ts=${Date.now()}`, { cache: 'no-store' });
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
