// src/app/share.js
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function isWindows() {
  return /Windows/i.test(navigator.userAgent);
}

export function initShare({ refs }) {
  const { shareBtn, shareOut, toastEl, bgImg } = refs;
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    withLoading(shareBtn, async () => {
      // Снимок состояния
      const snap = {};

      // 1) Lottie JSON
      if (state.lastLottieJSON) snap.lot = state.lastLottieJSON;

      // 2) Фон: если blob:, пытаемся сохранить как dataURL (переживает перезагрузку/шеринг)
      if (bgImg?.src) {
        try {
          if (bgImg.src.startsWith('blob:')) {
            const cvs = document.createElement('canvas');
            const w = bgImg.naturalWidth || bgImg.width || 0;
            const h = bgImg.naturalHeight || bgImg.height || 0;
            if (w && h) {
              cvs.width = w; cvs.height = h;
              const ctx = cvs.getContext('2d');
              ctx.drawImage(bgImg, 0, 0);
              snap.bg = cvs.toDataURL('image/png');
            } else {
              // если не можем считать размеры (не успела загрузиться) — сохраним как есть
              snap.bg = bgImg.src;
            }
          } else {
            snap.bg = bgImg.src;
          }
        } catch(e) {
          // Если CORS не разрешает рендер в canvas — оставим URL как есть
          snap.bg = bgImg.src;
        }
      }

      // 3) Простейшие опции
      snap.opts = { loop: !!state.loopOn };

      // POST на /api/share
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

      // Сохраняем последний id для A2HS
      try { localStorage.setItem('lastShareId', id); } catch(_){}

      // Короткая ссылка
      const shortURL = location.origin + '/s/' + id;
      try { if (shareOut) shareOut.value = shortURL; } catch(_){}

      // Политика: на Windows — всегда копируем; на мобильных — можно system share
      const preferClipboard = isWindows() || !isMobileUA();

      if (!preferClipboard && navigator.share) {
        try {
          await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL });
          showToastNear(toastEl, shareBtn, 'Отправлено');
          return;
        } catch(_) { /* отмена → fallback в копирование */ }
      }

      // Копирование в буфер
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
