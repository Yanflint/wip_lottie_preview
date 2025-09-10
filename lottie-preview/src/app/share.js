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
      const snap = { lot: state.lastLottieJSON, opts: { loop: !!state.loopOn } };

      const resp = await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(snap),
      });
      if (!resp.ok) throw new Error('share failed: ' + resp.status);
      const { id } = await resp.json();
      const shortURL = location.origin + '/s/' + id;

      // На Windows сразу копируем в буфер; на мобильных — system share если есть
      const preferClipboard = isWindows() || !isMobileUA();
      if (!preferClipboard && navigator.share) {
        try { await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL }); showToastNear(toastEl, shareBtn, 'Отправлено'); return; }
        catch(_) {}
      }
      try { await navigator.clipboard.writeText(shortURL); }
      catch {
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
