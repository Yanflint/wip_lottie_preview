// src/app/shareClient.js
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

function isMobileUA() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }
function isWindows() { return /Windows/i.test(navigator.userAgent); }

export function initShare({ refs }) {
  const { shareBtn, toastEl } = refs;
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    withLoading(shareBtn, async () => {
      if (!state.lastLottieJSON) {
        showToastNear(toastEl, shareBtn, 'Сначала загрузите Lottie JSON');
        return;
      }

      const snap = { lot: state.lastLottieJSON, opts: { loop: true } };
      // Если нужно будет добавить фон, просто добавим snap.bg = dataURL;
      const resp = await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(snap),
      });
      if (!resp.ok) throw new Error('share failed: ' + resp.status);
      const { id } = await resp.json();

      const shortURL = location.origin + '/s/' + id;

      // На мобильных — system share, на десктопах (и Windows) — копируем
      const preferClipboard = isWindows() || !isMobileUA();
      if (!preferClipboard && navigator.share) {
        try { await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL });
             showToastNear(toastEl, shareBtn, 'Отправлено'); return; } catch {}
      }
      try { await navigator.clipboard.writeText(shortURL); }
      catch {
        const ta = document.createElement('textarea'); ta.value = shortURL;
        ta.style.position='fixed'; ta.style.left='-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToastNear(toastEl, shareBtn, 'Ссылка скопирована');
    }).catch((e) => {
      console.error(e);
      showToastNear(refs.toastEl, shareBtn, 'Ошибка при шаринге');
    });
  });
}
