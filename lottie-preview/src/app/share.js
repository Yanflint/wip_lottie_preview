// src/app/share.js
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function isWindows() {
  return /Windows/i.test(navigator.userAgent);
}

const MAX_BG_BYTES = 900 * 1024; // ~900 KB

async function makeShareableBG(bgImg) {
  if (!bgImg?.src) return undefined;
  if (/^(https?:|data:)/i.test(bgImg.src)) return bgImg.src;

  if (bgImg.src.startsWith('blob:')) {
    try {
      if (!bgImg.naturalWidth || !bgImg.naturalHeight) {
        await new Promise(r => setTimeout(r, 50));
      }
      const w = bgImg.naturalWidth || bgImg.width || 0;
      const h = bgImg.naturalHeight || bgImg.height || 0;
      if (!w || !h) return bgImg.src;

      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');

      const MAX_DIM = 1600;
      const sw = (w > MAX_DIM || h > MAX_DIM) ? Math.min(MAX_DIM / w, MAX_DIM / h) : 1;

      cvs.width = Math.max(1, Math.round(w * sw));
      cvs.height = Math.max(1, Math.round(h * sw));
      ctx.drawImage(bgImg, 0, 0, cvs.width, cvs.height);

      let dataUrl = cvs.toDataURL('image/png');
      if (dataUrl.length > MAX_BG_BYTES) {
        let q = 0.9;
        do { dataUrl = cvs.toDataURL('image/jpeg', q); q -= 0.1; }
        while (dataUrl.length > MAX_BG_BYTES && q >= 0.4);
      }
      return dataUrl;
    } catch { return bgImg.src; }
  }
  return bgImg.src;
}

export function initShare({ refs }) {
  const { shareBtn, shareOut, toastEl, bgImg } = refs;
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    withLoading(shareBtn, async () => {
      if (!state.lastLottieJSON) {
        showToastNear(toastEl, shareBtn, 'Сначала загрузите Lottie JSON');
        return;
      }

      const snap = { lot: state.lastLottieJSON, opts: { loop: !!state.loopOn } };
      const bg = await makeShareableBG(bgImg);
      if (bg) snap.bg = bg;

      const id = await withLoading(null, async () => {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(snap),
        });
        if (!resp.ok) throw new Error('share failed: ' + resp.status);
        const { id } = await resp.json();
        return id;
      });
      if (!id) return;

      try { localStorage.setItem('lastShareId', id); } catch(_){}

      const shortURL = location.origin + '/s/' + id;
      try { if (shareOut) shareOut.value = shortURL; } catch(_){}

      const preferClipboard = isWindows() || !isMobileUA();
      if (!preferClipboard && navigator.share) {
        try { await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL }); showToastNear(toastEl, shareBtn, 'Отправлено'); return; }
        catch(_) {}
      }
      try { await navigator.clipboard.writeText(shortURL); }
      catch(_) {
        const ta = document.createElement('textarea'); ta.value = shortURL; document.body.appendChild(ta);
        ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToastNear(toastEl, shareBtn, 'Ссылка скопирована');
    }).catch((e) => {
      console.error(e);
      showToastNear(refs.toastEl, shareBtn, 'Ошибка при шаринге');
    });
  });
}
