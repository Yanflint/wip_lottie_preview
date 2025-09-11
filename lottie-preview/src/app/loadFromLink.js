// src/app/loadFromLink.js
import { setPlaceholderVisible } from './utils.js';
import { setLastLottie, state, setBgDPR } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';

function getShareIdFromLocation() {
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  const q = u.searchParams.get('id');
  return q || null;
}

function applyLoopFromPayload(refs, data) {
  if (data?.opts && typeof data.opts.loop === 'boolean') {
    state.loopOn = !!data.opts.loop;
    if (refs?.loopChk) refs.loopChk.checked = state.loopOn;
  }
}

async function applyPayload(refs, data) {
  if (!data || typeof data !== 'object') return false;

  applyLoopFromPayload(refs, data);

  if (data.bg) {
    const src = typeof data.bg === 'string' ? data.bg : data.bg.value;
    const dpr = Number(data.bgMeta?.dpr || 0);
    if (dpr) setBgDPR(dpr);
    if (src) await setBackgroundFromSrc(refs, src, { dpr });
  }

  if (data.lot) {
    setLastLottie(data.lot);
    await loadLottieFromData(refs, data.lot);
  }

  setPlaceholderVisible(refs, false);
  layoutLottie(refs);
  return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

  const id = getShareIdFromLocation();
  if (id) {
    try {
      const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (await applyPayload(refs, data)) return;
      }
    } catch {}
  }
}
