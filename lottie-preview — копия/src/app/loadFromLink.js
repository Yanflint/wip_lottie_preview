import { loadLottieFromData, setBackgroundFromSrc } from './lottie.js';
import { setLoop, setLastLottie } from './state.js';

function getIdFromURL() {
  const u = new URL(location.href);

  // 1) ?id=...
  const idParam = u.searchParams.get('id');
  if (idParam) return idParam;

  // 2) /s/:id (без регулярок)
  const path = u.pathname;
  const idx = path.indexOf('/s/');
  if (idx !== -1) {
    const rest = path.slice(idx + 3);       // всё после "/s/"
    const id = rest.split(/[/?#]/)[0] || ''; // до следующего / ? #
    return id || null;
  }
  return null;
}

export async function initLoadFromLink({ refs }) {
  const id = getIdFromURL();
  if (!id) return;

  try {
    const r = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
    if (!r.ok) return;
    const data = await r.json(); // { lot, bg, opts }

    if (data.bg) await setBackgroundFromSrc(refs, data.bg);
    if (data.lot) {
      setLastLottie(data.lot);
      await loadLottieFromData(refs, data.lot);
    }
    if (data?.opts?.loop != null) setLoop(!!data.opts.loop);
  } catch (e) {
    console.warn('loadFromLink failed', e);
  }
}
