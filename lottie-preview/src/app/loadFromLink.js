// Загружаем по /s/:id. Если id нет и это standalone, пробуем "последний" снимок.
// Флаг цикла (opts.loop) применяем до создания анимации.
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fetchStableLastPayload(maxMs=2000){
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline){
    const pr = await fetch('/api/share?id=last', { cache: 'no-store' });
    if (!pr.ok) throw new Error('payload get failed '+pr.status);
    const et = (pr.headers.get('ETag') || '').replace(/"/g,'');
    const data = await pr.json().catch(()=>null);
    let revNow = '';
    try{
      const rr = await fetch('/api/share?id=last&rev=1', { cache: 'no-store' });
      if (rr.ok){ const j = await rr.json().catch(()=>({})); revNow = String(j.rev||''); }
    }catch{}
    const hasLot = !!(data && typeof data === 'object' && data.lot);
    if (hasLot && et && revNow && et === revNow) return { data, etag: et };
    await sleep(250);
  }
  const pr2 = await fetch('/api/share?id=last', { cache: 'no-store' });
  const data2 = await pr2.json().catch(()=>null);
  const et2 = (pr2.headers.get('ETag') || '').replace(/"/g,'');
  return { data: data2, etag: et2 };
}

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
  let _hid=false; try {

  if (!data || typeof data !== 'object') return false;

  // ВАЖНО: сначала применяем флаг цикла
  applyLoopFromPayload(refs, data);

  // временно спрячем слой лотти до пересчёта, чтобы не было "вспышки" старого расположения
  try { if (refs?.lotStage) refs.lotStage.style.visibility = 'hidden'; _hid=true; } catch {}

  // скрываем лотти до полного применения размеров и конвертации
  try { if (refs?.lotStage) refs.lotStage.style.visibility = 'hidden'; } catch {}
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
  
  } finally { try { if (_hid && refs?.lotStage) refs.lotStage.style.visibility = ''; } catch {} }
  return true;
return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

  // 1) Пробуем id из URL
  const id = getShareIdFromLocation();
  if (id) {
    try {
      let data=null;
    if (id === 'last' || id === '__last__') {
      try { const st = await fetchStableLastPayload(2000); data = st?.data || null; } catch {}
    } else {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (r.ok) data = await r.json().catch(() => null);
    }
    if (data && await applyPayload(refs, data)) return;
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
