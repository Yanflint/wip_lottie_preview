// src/app/share.js
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function isWindows() {
  return /Windows/i.test(navigator.userAgent);
}

// Максимальный размер dataURL для сохранения фона (чтобы не словить 400 из функции)
const MAX_BG_BYTES = 900 * 1024; // ~900 KB

async function makeShareableBG(bgImg) {
  if (!bgImg?.src) return undefined;

  // Если уже http(s)/data: — отдаём как есть
  if (/^(https?:|data:)/i.test(bgImg.src)) return bgImg.src;

  // Если blob: — попробуем сконвертить в dataURL с ограничением размера
  if (bgImg.src.startsWith('blob:')) {
    try {
      // ждём, вдруг не догрузилась
      if (!bgImg.naturalWidth || !bgImg.naturalHeight) {
        await new Promise(r => setTimeout(r, 50));
      }
      const w = bgImg.naturalWidth || bgImg.width || 0;
      const h = bgImg.naturalHeight || bgImg.height || 0;
      if (!w || !h) return bgImg.src; // fallback

      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');

      // уменьшим большие фоновые изображения, чтобы влезть в лимит
      let scale = 1;
      const MAX_DIM = 1600;
      const sw = w > MAX_DIM || h > MAX_DIM ? Math.min(MAX_DIM / w, MAX_DIM / h) : 1;
      scale = Math.min(1, sw);

      cvs.width = Math.max(1, Math.round(w * scale));
      cvs.height = Math.max(1, Math.round(h * scale));
      ctx.drawImage(bgImg, 0, 0, cvs.width, cvs.height);

      // начнём с PNG, если слишком большой — перейдём на JPEG c качеством
      let dataUrl = cvs.toDataURL('image/png');
      if (dataUrl.length > MAX_BG_BYTES) {
        let q = 0.9;
        do {
          dataUrl = cvs.toDataURL('image/jpeg', q);
          q -= 0.1;
        } while (dataUrl.length > MAX_BG_BYTES && q >= 0.4);
      }
      return dataUrl;
    } catch (e) {
      // CORS или другая ошибка — вернём то, что есть
      return bgImg.src;
    }
  }

  // Иначе — как есть
  return bgImg.src;
}

export function initShare({ refs }) {
  const { shareBtn, shareOut, toastEl, bgImg } = refs;
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    withLoading(shareBtn, async () => {
      // Валидация: без Lottie JSON нет смысла шэрить — сервер вернёт 400
      if (!state.lastLottieJSON) {
        showToastNear(toastEl, shareBtn, 'Сначала загрузите Lottie JSON');
        return;
      }

      // Снимок состояния
      const snap = { lot: state.lastLottieJSON, opts: { loop: !!state.loopOn } };

      // Фон
      const bg = await makeShareableBG(bgImg);
      if (bg) snap.bg = bg;

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
