// src/app/loadFromLink.js
import { setLastLottie, setLoop, state } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';

export async function initLoadFromLink({ refs }){
  const url = new URL(location.href);
  const id = url.searchParams.get('id');

  async function loadBy(effId){
    const resp = await fetch('/api/shot?id=' + encodeURIComponent(effId));
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.opts) setLoop(!!data.opts.loop);
    if (data?.bg)   await setBackgroundFromSrc(refs, data.bg);
    if (data?.lot)  { setLastLottie(data.lot); loadLottieFromData(refs, data.lot); }
  }

  if (id) { try { await loadBy(id); } catch(e){ console.error(e); } }

  try {
    const hasId  = url.searchParams.has('id');
    const pathId = url.pathname.startsWith('/s/') ? url.pathname.split('/').pop() : null;
    let effId = hasId ? id : pathId;

    if (!effId && state.A2HS) {
      const lastId = localStorage.getItem('lastShareId');
      if (lastId) effId = lastId;
    }
    if (effId && !hasId) {
      try { history.replaceState(null, '', '/?id=' + encodeURIComponent(effId)); } catch(_){}
    }
    if (effId && !id) { await loadBy(effId); }
  } catch(e){ console.error(e); }
}
