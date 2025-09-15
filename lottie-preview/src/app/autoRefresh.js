// [ADDED] atomic-swap imports
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';
import { setLotOffset } from './state.js';
import { showUpdateToast } from './updateToast.js';

// src/app/autoRefresh.js
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

// [ADDED] Build minimal refs used by lottie helpers (no coupling to main.js)
function __collectRefsForViewer(){
  const $ = (id) => document.getElementById(id);
  const wrapper = $('wrapper');
  return {
    wrapper,
    preview: $('preview'),
    previewBox: $('previewBox') || wrapper,
    phEl: $('ph'),
    bgImg: $('bgImg'),
    lotStage: $('lotStage'),
    lottieMount: $('lottie'),
    toastEl: $('toast'),
  };
}

// [ADDED] Preload image and resolve after decode (if supported)
async function __preloadImage(src){
  if (!src) return;
  await new Promise((res)=>{
    const im = new Image();
    im.onload = () => res();
    im.onerror = () => res(); // don't block on errors
    try { im.decoding = 'sync'; } catch(e) {}
    im.src = src;
  });
  try {
    const imgEl = document.createElement('img');
    imgEl.src = src;
    if (imgEl.decode) await imgEl.decode();
  } catch(e){}
}

// [ADDED] Atomic (no-black) apply of new payload: preload everything, then swap
async function __applyAtomicUpdate(data){
  if (!data || typeof data !== 'object') return false;
  const refs = __collectRefsForViewer();

  // 1) Parse and preload background (if any)
  let bgSrc = null, bgMeta = {};
  try {
    if (data.bg) {
      if (typeof data.bg === 'string') bgSrc = data.bg;
      else { bgSrc = data.bg.value; bgMeta = { fileName: data.bg.name, assetScale: data.bg.assetScale }; }
    }
  } catch(e){}
  if (bgSrc) { await __preloadImage(bgSrc); }

  // 2) Read optional offset from lot meta (to avoid jump)
  try {
    const m = data.lot && data.lot.meta && data.lot.meta._prevView;
    if (m && typeof m.x==='number' && typeof m.y==='number') setLotOffset(m.x||0, m.y||0);
  } catch(e){}

  // 3) Swap in this order: background -> lottie
  if (bgSrc) {
    try { await setBackgroundFromSrc(refs, bgSrc, bgMeta); } catch(e){ console.warn('swap bg fail', e); }
  }
  if (data.lot) {
    try { await loadLottieFromData(refs, data.lot); } catch(e){ console.warn('swap lot fail', e); }
  }

  try { layoutLottie(refs); } catch(e){}
  return true;
}


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
  } catch(e){}
  return false;
}
function jittered(ms){const f=1+(Math.random()*2-1)*JITTER;return Math.max(1000,Math.round(ms*f));}
async function fetchRev(){
  const r=await fetch('/api/share?id=last&rev=1',{cache:'no-store'});
  if(!r.ok) throw new Error('bad '+r.status);
  const j=await r.json(); return String(j.rev||'');
}


async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// [PATCH-STABLE] Ensure GET payload matches current rev (ETag) for '__last__'
async function fetchStableLastPayload(maxMs=2000){
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline){
    // 1) fetch payload with no-store and capture ETag
    const pr = await fetch('/api/share?id=last', { cache: 'no-store' });
    if (!pr.ok) throw new Error('payload get failed '+pr.status);
    const et = (pr.headers.get('ETag') || '').replace(/"/g,'');
    const data = await pr.json().catch(()=>null);

    // 2) fetch current rev
    let revNow = '';
    try{
      const rr = await fetch('/api/share?id=last&rev=1', { cache: 'no-store' });
      if (rr.ok){ const j = await rr.json().catch(()=>({})); revNow = String(j.rev||''); }
    }catch(e){}

    // 3) If ETag equals current rev and data looks complete — return
    const hasLot = !!(data && typeof data === 'object' && data.lot);
    if (hasLot && et && revNow && et === revNow) return { data, etag: et };

    // else short sleep and retry
    await sleep(250);
  }
  // final attempt return whatever we have (best effort)
  const pr2 = await fetch('/api/share?id=last', { cache: 'no-store' });
  const data2 = await pr2.json().catch(()=>null);
  const et2 = (pr2.headers.get('ETag') || '').replace(/"/g,'');
  return { data: data2, etag: et2 };
}

export function initAutoRefreshIfViewingLast(){
  if(!isViewingLast()) return;

  let baseline=null, timer=null, currentDelay=BASE_INTERVAL, inFlight=false;

  const schedule=(d=currentDelay)=>{clearTimeout(timer); timer=setTimeout(tick,jittered(d));};
  const reset=()=>{currentDelay=BASE_INTERVAL;};

  const tick=async()=>{
    if(inFlight) return;
    if(document.visibilityState!=='visible'){schedule(currentDelay); return;}
    inFlight=true;
    try{
      const rev=await fetchRev();
      if(!baseline){ baseline=rev; }
      else if(rev && rev!==baseline){
  try {
    const { data } = await fetchStableLastPayload(4000);
    if (data && typeof data === 'object') {
      const ok = await __applyAtomicUpdate(data);
      if (ok) {
        try { baseline = rev; } catch(e) {}
        try { showUpdateToast('Обновлено'); } catch(e) {}
        currentDelay = BASE_INTERVAL;
        schedule(currentDelay);
        return;
      }
    }
  } catch(e) {
    console.warn('atomic update failed, fallback to reload', e);
  }
  // Fallback to old behaviour if something goes wrong
  try{ sessionStorage.setItem(TOAST_FLAG,'1'); }catch(e){}
  location.replace(location.href);
  return;
}

// [PATCH] Verify payload completeness before triggering hard reload on rev change.

      reset();
    }catch{
      currentDelay=Math.min(MAX_BACKOFF, Math.max(BASE_INTERVAL, currentDelay*2));
    }finally{
      inFlight=false;
      schedule(currentDelay);
    }
  };

  const onVisible=()=>{ if(document.visibilityState==='visible'){ reset(); clearTimeout(timer); tick(); } };
  const onPointer=()=>{ if(document.visibilityState==='visible'){ reset(); clearTimeout(timer); tick(); } };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('pointerdown', onPointer, {passive:true});

  (async()=>{ try{ baseline=await fetchRev(); }catch(e){} if(document.visibilityState==='visible'){ schedule(BASE_INTERVAL);} })();
}
