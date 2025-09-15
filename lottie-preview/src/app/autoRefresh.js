// src/app/autoRefresh.js
import { applyPayloadWithRefs } from './loadFromLink.js';
import { getAnim } from './lottie.js';
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

function ensureBufferRefs(baseRefs){
  const refs = baseRefs || (window && window.__LP_REFS);
  if (!refs) return null;
  const preview = refs.preview || document.getElementById('preview');
  let bgWrap = preview.querySelector('.bg.buffer');
  if (!bgWrap){
    bgWrap = document.createElement('div');
    bgWrap.className = 'bg buffer';
    const img = document.createElement('img');
    img.id = 'bgImgBuf';
    img.alt = '';
    bgWrap.appendChild(img);
    preview.appendChild(bgWrap);
  }
  const bgImg = bgWrap.querySelector('img');
  let lotLayer = preview.querySelector('.lottie-layer.buffer');
  if (!lotLayer){
    lotLayer = document.createElement('div');
    lotLayer.className = 'lottie-layer buffer';
    const stage = document.createElement('div');
    stage.className = 'lot-stage';
    stage.id = 'lotStageBuf';
    const mount = document.createElement('div');
    mount.className = 'lottie-mount';
    mount.id = 'lottieBuf';
    stage.appendChild(mount);
    lotLayer.appendChild(stage);
    preview.appendChild(lotLayer);
  }
  const lotStage = lotLayer.querySelector('.lot-stage');
  const lottieMount = lotStage.querySelector('.lottie-mount');
  try { bgWrap.style.visibility = 'hidden'; bgWrap.style.pointerEvents = 'none'; } catch {}
  try { lotLayer.style.visibility = 'hidden'; lotLayer.style.pointerEvents = 'none'; } catch {}
  const bufRefs = Object.assign({}, refs, { bgImg, lotStage, lottieMount });
  return { bufRefs, bgWrap, lotLayer };
}
function swapToBuffer(baseRefs, bufRefs, bgWrap, lotLayer, prevAnim){
  const refs = baseRefs || (window && window.__LP_REFS);
  if (!refs) return;
  try { const w = refs.bgImg && refs.bgImg.closest('.bg'); if (w) w.style.display = 'none'; } catch {}
  try { const w = refs.lotStage && refs.lotStage.closest('.lottie-layer'); if (w) w.style.display = 'none'; } catch {}
  try { bgWrap.style.visibility = ''; bgWrap.style.removeProperty('display'); } catch {}
  try { lotLayer.style.visibility = ''; lotLayer.style.removeProperty('display'); } catch {}
  try { if (bufRefs.bgImg && bufRefs.bgImg.id !== 'bgImg') bufRefs.bgImg.id = 'bgImg'; } catch {}
  try { if (bufRefs.lotStage && bufRefs.lotStage.id !== 'lotStage') bufRefs.lotStage.id = 'lotStage'; } catch {}
  try { const m = bufRefs.lottieMount; if (m && m.id !== 'lottie') m.id = 'lottie'; } catch {}
  try { if (window && window.__LP_REFS) { window.__LP_REFS.bgImg = bufRefs.bgImg; window.__LP_REFS.lotStage = bufRefs.lotStage; window.__LP_REFS.lottieMount = bufRefs.lottieMount; } } catch {}
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
            const prevAnim = (typeof getAnim==='function') ? getAnim() : null;
            const holder = ensureBufferRefs(window.__LP_REFS);
            if (!holder){ location.replace(location.href); return; }
            const { bufRefs, bgWrap, lotLayer } = holder;
            const ok = await applyPayloadWithRefs(bufRefs, data);
            if (ok) {
              swapToBuffer(window.__LP_REFS, bufRefs, bgWrap, lotLayer, prevAnim);
              baseline = rev;
            } else {
              location.replace(location.href);
              return;
            }
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