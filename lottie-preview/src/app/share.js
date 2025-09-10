import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

export function initShare({ refs }) {
  const { shareBtn, shareOut, toastEl, bgImg } = refs;
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    withLoading(shareBtn, async () => {
      const snap = {};
      if (state.lastLottieJSON) snap.lot = state.lastLottieJSON;
      if (bgImg?.src) snap.bg = bgImg.src;
      snap.opts = { loop: !!state.loopOn };

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

      if (navigator.share) {
        try {
          await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL });
          showToastNear(toastEl, shareBtn, 'Отправлено');
          return;
        } catch(_) {}
      }

      try { await navigator.clipboard.writeText(shortURL); }
      catch(_) {
        const ta = document.createElement('textarea'); ta.value = shortURL; document.body.appendChild(ta);
        ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToastNear(toastEl, shareBtn, 'Ссылка скопирована');
    }).catch((e) => {
      console.error(e);
      showToastNear(toastEl, shareBtn, 'Ошибка при шаринге');
    });
  });
}
