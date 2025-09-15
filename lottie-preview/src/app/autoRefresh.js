// src/app/autoRefresh.js
import { applyPayloadWithRefs } from './loadFromLink.js';
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

function ensureRefreshOverlay(){
  let ov = document.getElementById('refreshOverlay');
  if (!ov){
    ov = document.createElement('div');
    ov.id = 'refreshOverlay';
    ov.className = 'refresh-overlay';
    const lbl = document.createElement('div');
    lbl.className = 'label';
    lbl.textContent = 'Обновление';
    ov.appendChild(lbl);
    document.body.appendChild(ov);
  }
  return ov;
}
function waitMs(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fadeInOverlay(){
  const ov = ensureRefreshOverlay();
  // force reflow then add .show
  ov.classList.remove('hiding');
  // Use rAF to ensure CSS transition kicks in
  await new Promise(r=>requestAnimationFrame(r));
  ov.classList.add('show');
  await waitMs(250); // match CSS .22s
  return ov;
}
async function fadeOutOverlay(){
  const ov = ensureRefreshOverlay();
  ov.classList.add('hiding');
  ov.classList.remove('show');
  await waitMs(250);
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
            // Soft update under overlay
            await fadeInOverlay();
            try {
              const refs = (window && window.__LP_REFS) || null;
              if (refs) { await applyPayloadWithRefs(refs, data); baseline = rev; }
              else { location.replace(location.href); return; }
            } catch(e){ console.warn('soft update failed, fallback reload', e); location.replace(location.href); return; }
            await fadeOutOverlay();
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