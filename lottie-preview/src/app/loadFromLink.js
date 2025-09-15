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
  if (!data || typeof data !== 'object') return false;

  // 1) Применяем флаг цикла сразу (не влияет на визуальный своп)
  applyLoopFromPayload(refs, data);

  // 2) Готовим предзагрузку бэкграунда (без замены src до готовности)
  let bgReady = Promise.resolve();
  let bgSrc = null, bgMeta = {};
  if (data.bg) {
    bgSrc = (typeof data.bg === 'string') ? data.bg : (data.bg.value || data.bg.src || '');
    bgMeta = (typeof data.bg === 'object') ? { fileName: data.bg.name, assetScale: data.bg.assetScale } : {};
    if (bgSrc) {
      bgReady = (async () => { try { await setBackgroundFromSrc(refs, bgSrc, bgMeta); } catch {} })();
    }
  }

  // 3) Готовим скрытую «сцену» для новой лотти и предзагружаем её
  let newAnim = null, stagingStage = null, stagingMount = null;
  let lotReady = Promise.resolve();
  if (data.lot) {
    try {
      const lotJson = (typeof data.lot === 'string') ? JSON.parse(data.lot) : data.lot;
      const w = Number(lotJson?.w || 0) || 512;
      const h = Number(lotJson?.h || 0) || 512;

      // создать staging-слой поверх старого
      stagingStage = document.createElement('div');
      stagingStage.className = 'lot-stage lot-stage--staging';
      Object.assign(stagingStage.style, {
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        opacity: '0', pointerEvents: 'none'
      });
      stagingMount = document.createElement('div');
      stagingMount.className = 'lottie-mount';
      stagingStage.appendChild(stagingMount);
      try { refs.lotStage.parentElement.appendChild(stagingStage); } catch {}

      stagingStage.style.width = w + 'px';
      stagingStage.style.height = h + 'px';

      const isStandalone =
        (window.matchMedia &&
          (window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches)) ||
        (navigator.standalone === true);
      const isViewer = document.documentElement.classList.contains('viewer');
      const autoplay = isViewer && !isStandalone ? false : true;
      const loop = !!state.loopOn;

      newAnim = window.lottie.loadAnimation({
        container: stagingMount,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: lotJson
      });

      lotReady = new Promise((res) => {
        try { newAnim.addEventListener('DOMLoaded', () => res()); }
        catch { res(); }
      });
    } catch (e) {
      console.error('applyPayload: lottie staging error', e);
    }
  }

  // 4) Дожидаемся готовности ресурсов
  try { await Promise.all([bgReady, lotReady]); } catch {}

  // 5) Применяем смещение, если пришло
  try {
    const m = data?.lot?.meta?._offset || data?.lot?._offset || (data?.lot && data.lot.meta && data.lot.meta.offset);
    if (m && typeof m==='object' && typeof m.x==='number' && typeof m.y==='number') setLotOffset(m.x||0, m.y||0);
  } catch {}

  // 6) Лейаут под мобильный/экран (на новой сцене)
  try { layoutLottie(refs, stagingStage || refs.lotStage); } catch {}

  // 7) Быстрый атомарный своп: старая сцена -> новая
  if (stagingStage && newAnim) {
    // показать новую, спрятать старую
    stagingStage.style.opacity = '1';
    if (refs?.lotStage) refs.lotStage.style.opacity = '0';

    // заменить ссылки refs на новую сцену
    try { refs.lottieMount = stagingMount; } catch {}
    try { refs.lotStage    = stagingStage; } catch {}

    // установить новую анимацию как текущую (с уничтожением старой)
    try { setAnim(newAnim); } catch {}

    // удалить старые ноды чуть позже
    setTimeout(() => {
      try {
        const layer = document.querySelector('.lottie-layer');
        if (layer) {
          Array.from(layer.querySelectorAll('.lot-stage'))
            .slice(0,-1) // все, кроме последней (активной)
            .forEach(n => n.remove());
        }
      } catch {}
    }, 40);
  } else {
    // fallback: если лотти не было — просто установим стандартным способом
    if (data.lot) {
      await loadLottieFromData(refs, data.lot);
    }
  }

  // 8) Скрываем плейсхолдер и финальный лейаут
  try { setPlaceholderVisible(refs, false); } catch {}
  try { layoutLottie(refs); } catch {}

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
