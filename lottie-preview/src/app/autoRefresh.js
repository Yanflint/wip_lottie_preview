// src/app/autoRefresh.js
import { applyPayloadWithRefs } from './loadFromLink.js';
import { getAnim } from './lottie.js'; } from './loadFromLink.js';
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

function ensureBufferRefs(refs){
  const preview = refs.preview || document.getElementById('preview');

  // buffer bg
  let bgWrap = preview.querySelector('.bg.buffer');
  let bgImg = null;
  if (!bgWrap){
    bgWrap = document.createElement('div');
    bgWrap.className = 'bg buffer';
    bgImg = document.createElement('img');
    bgImg.id = 'bgImgBuf';
    bgImg.alt = '';
    bgWrap.appendChild(bgImg);
    preview.appendChild(bgWrap);
  } else {
    bgImg = bgWrap.querySelector('img') || (() => { const i=document.createElement('img'); bgWrap.appendChild(i); return i; })();
  }

  // buffer lottie layer
  let lotLayer = preview.querySelector('.lottie-layer.buffer');
  let lotStage = null, lottieMount = null;
  if (!lotLayer){
    lotLayer = document.createElement('div');
    lotLayer.className = 'lottie-layer buffer';
    lotStage = document.createElement('div');
    lotStage.className = 'lot-stage';
    lotStage.id = 'lotStageBuf';
    lottieMount = document.createElement('div');
    lottieMount.className = 'lottie-mount';
    lottieMount.id = 'lottieBuf';
    lotStage.appendChild(lottieMount);
    lotLayer.appendChild(lotStage);
    preview.appendChild(lotLayer);
  } else {
    lotStage = lotLayer.querySelector('.lot-stage') || (()=>{ const s=document.createElement('div'); s.className='lot-stage'; lotLayer.appendChild(s); return s;})();
    lottieMount = lotStage.querySelector('.lottie-mount') || (()=>{ const m=document.createElement('div'); m.className='lottie-mount'; lotStage.appendChild(m); return m;})();
  }

  const bufRefs = Object.assign({}, refs, {
    bgImg: bgImg,
    lotStage: lotStage,
    lottieMount: lottieMount,
    // leave other refs (wrapper/preview/placeholder etc.) same as base
  });

  // keep buffer hidden for now
  try { bgWrap.style.visibility = 'hidden'; } catch {}
  try { lotLayer.style.visibility = 'hidden'; } catch {}

  return { bufRefs, bgWrap, lotLayer };
}

function swapToBuffer(refs, bufRefs, bgWrap, lotLayer, prevAnim){
  // Hide old visible layers
  try { refs.bgImg.closest('.bg').style.display = 'none'; } catch {}
  try { refs.lotStage.closest('.lottie-layer').style.display = 'none'; } catch {}

  // Show buffer layers
  try { bgWrap.style.visibility = ''; bgWrap.style.removeProperty('display'); } catch {}
  try { lotLayer.style.visibility = ''; lotLayer.style.removeProperty('display'); } catch {}

  // Rebind ids so future updates target the now-visible elements
  try { if (bufRefs.bgImg && bufRefs.bgImg.id !== 'bgImg') bufRefs.bgImg.id = 'bgImg'; } catch {}
  try { if (bufRefs.lotStage && bufRefs.lotStage.id !== 'lotStage') bufRefs.lotStage.id = 'lotStage'; } catch {}
  try { const m = bufRefs.lottieMount; if (m && m.id !== 'lottie') m.id = 'lottie'; } catch {}

  // Update global refs used elsewhere
  try {
    window.__LP_REFS.bgImg = bufRefs.bgImg;
    window.__LP_REFS.lotStage = bufRefs.lotStage;
    window.__LP_REFS.lottieMount = bufRefs.lottieMount;
  } catch {}

  // Clean up old nodes and animation after the swap, to avoid leak
  try { prevAnim && prevAnim.destroy && prevAnim.destroy(); } catch {}
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
  } catch {}
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
    }catch{}

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
        // [PATCH]: pre-fetch full payload to ensure Lottie data is present (avoid showing stale lot pos)
        try {
          const { data } = await fetchStableLastPayload(2000);
          const hasLot = !!(data && typeof data === 'object' && data.lot);
          if (hasLot) {
            try{ sessionStorage.setItem(TOAST_FLAG,'1'); }catch{}
            try{ sessionStorage.setItem(TOAST_FLAG,'1'); }catch{}
            const prevAnim = getAnim && getAnim();
            const { bufRefs, bgWrap, lotLayer } = ensureBufferRefs(window.__LP_REFS || refs);
            // Apply payload into hidden buffer
            await applyPayloadWithRefs(bufRefs, data);
            // Swap instantly without black frame
            swapToBuffer(window.__LP_REFS || refs, bufRefs, bgWrap, lotLayer, prevAnim);
            return;
          } else {
            // Payload not ready yet; try again quickly (no exponential backoff)
            currentDelay = Math.min(currentDelay, 1500);
            schedule(currentDelay);
            return;
          }
        } catch (e) {
          // Network hiccup; retry a bit sooner than backoff
          currentDelay = Math.min(MAX_BACKOFF, Math.max(1500, currentDelay));
          schedule(currentDelay);
          return;
        }
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

  (async()=>{ try{ baseline=await fetchRev(); }catch{} if(document.visibilityState==='visible'){ schedule(BASE_INTERVAL);} })();
}