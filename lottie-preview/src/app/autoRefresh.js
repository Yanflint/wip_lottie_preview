// src/app/autoRefresh.js
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

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
          const pr = await fetch('/api/share?id=last', { cache: 'no-store' });
          if (!pr.ok) throw new Error('preload failed '+pr.status);
          const data = await pr.json().catch(() => null);
          const hasLot = !!(data && typeof data === 'object' && data.lot);
          const hasBgMaybe = !!(data && (data.bg || (data.lot && data.lot.meta && data.lot.meta._lpBgMeta)));
          // If payload looks complete, proceed with hard refresh; otherwise, retry soon without switching baseline
          if (hasLot) {
            try{ sessionStorage.setItem(TOAST_FLAG,'1'); }catch{}
            location.replace(location.href); // жёсткий рефреш, сохраняя ?fit
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
