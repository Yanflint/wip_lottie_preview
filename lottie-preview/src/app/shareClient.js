// Клиентский «Поделиться»: сохраняем lot и фон в Netlify Blobs через /api/share
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';

async function imageElementToDataURL(imgEl) {
  if (!imgEl || !imgEl.src) return null;

  const src = imgEl.src;

  // 1) Уже data: — просто вернуть
  if (src.startsWith('data:')) return src;

  // 2) blob: — рисуем в canvas и получаем data:
  if (src.startsWith('blob:')) {
    await new Promise((res, rej) => {
      if (imgEl.complete && imgEl.naturalWidth) return res();
      imgEl.onload = () => res();
      imgEl.onerror = (e) => rej(e);
    });
    try {
      const w = imgEl.naturalWidth || imgEl.width || 1;
      const h = imgEl.naturalHeight || imgEl.height || 1;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, w, h);
      return canvas.toDataURL('image/png');
    } catch {
      // если canvas «tainted» — вернём null, чтобы ниже упасть в URL-вариант
      return null;
    }
  }

  // 3) http(s): — лучше оставить как URL (так безопаснее с CORS)
  if (/^https?:\/\//i.test(src)) return src;

  // 4) fallback — попробуем как есть
  return src;
}

async function buildPayload(refs) {
  const lot = state.lastLottieJSON;
  if (!lot) throw new Error('Нет данных Lottie');

  let bg = null;
  const imgEl = refs?.bgImg;
  if (imgEl && imgEl.src) {
    // Пытаемся получить dataURL, если это blob:
    const maybeData = await imageElementToDataURL(imgEl);
    if (maybeData && maybeData.startsWith('data:')) {
      bg = { kind: 'data', value: maybeData };
    } else if (maybeData) {
      bg = { kind: 'url', value: maybeData };
    }
  }

  // Можно добавлять опции в будущем (loop и пр.)
  const opts = { loop: !!state.loopOn, autoplay: !!state.autoplayOn };

  return { lot, bg, opts };
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback — через временный input
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); return true; }
    catch { return false; }
    finally { document.body.removeChild(ta); }
  }
}

export function initShare({ refs }) {
  const btn = refs?.shareBtn;
  if (!btn) return;

  btn.addEventListener('click', async () => {
    await withLoading(btn, async () => {
      const payload = await buildPayload(refs);

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`share failed: ${res.status}${t ? ' ' + t : ''}`);
      }

      const { id } = await res.json();
      const shortUrl = `${location.origin}/s/${id}`;

      await copyToClipboard(shortUrl);
      showToastNear(refs.toastEl, btn, 'Ссылка скопирована');
    });
  });
}
