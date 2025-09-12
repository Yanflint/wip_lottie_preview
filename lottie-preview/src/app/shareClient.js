// Клиентский «Поделиться»: сохраняем lot и фон через /api/share, и параллельно
// закрепляем текущий макет локально (для A2HS).
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';
import { savePinned } from './pinned.js';

async function imageElementToDataURL(imgEl) {
  if (!imgEl || !imgEl.src) return null;
  const src = imgEl.src;

  if (src.startsWith('data:')) return src;

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
      return null;
    }
  }

  if (/^https?:\/\//i.test(src)) return src;
  return src;
}

async function buildPayload(refs) {
  const rawLot = state.lastLottieJSON;
  const lot = rawLot ? JSON.parse(JSON.stringify(rawLot)) : null;
  if (!lot) throw new Error('Нет данных Lottie');
  // Встраиваем позицию в метаданные
  try { const pos = (state.lotOffset || {x:0,y:0}); lot.meta = lot.meta || {}; lot.meta._lpPos = { x: +pos.x||0, y: +pos.y||0 }; } catch {}
  if (!lot) throw new Error('Нет данных Lottie');

  let bg = null;
  const imgEl = refs?.bgImg;
  if (imgEl && imgEl.src) {
    const maybeData = await imageElementToDataURL(imgEl);
    if (maybeData && maybeData.startsWith('data:')) {
      bg = { kind: 'data', value: maybeData, name: (state.lastBgMeta?.fileName || ''), assetScale: (state.lastBgMeta?.assetScale || undefined) };
    } else if (maybeData) {
      bg = { kind: 'url', value: maybeData, name: (state.lastBgMeta?.fileName || ''), assetScale: (state.lastBgMeta?.assetScale || undefined) };
    }
  }

  // ВАЖНО: передаём флаг цикла
  const opts = { loop: !!state.loopOn };

  return { lot, bg, opts };
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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
      
      const hasLot = !!state.lastLottieJSON;
      const hasBg  = !!(refs?.bgImg && refs.bgImg.src);
      if (!hasBg && !hasLot) { showToastNear(refs.toastEl, btn, 'Загрузите графику'); return; }
      if (!hasBg) { showToastNear(refs.toastEl, btn, 'Загрузите фон'); return; }
      if (!hasLot) { showToastNear(refs.toastEl, btn, 'Загрузите анимацию'); return; }
      try { btn.setAttribute('data-loading-label','создаю'); } catch {}
    const payload = await buildPayload(refs);

      // Сохраняем на сервер (короткая ссылка)
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

      // Параллельно закрепляем локально (для A2HS)
      savePinned(payload);

      await copyToClipboard(shortUrl);
      showToastNear(refs.toastEl, btn, 'Ссылка скопирована');
    });
  });
}
