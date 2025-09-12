// Клиентский «Поделиться»: сохраняем Lottie и фон, получаем короткую ссылку.
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';
import { savePinned } from './pinned.js';

async function imageElementToDataURL(imgEl) {
  if (!imgEl || !imgEl.src) return null;
  const src = imgEl.src;

  // уже data:
  if (src.startsWith('data:')) return src;

  // blob: -> прочитаем как dataURL
  if (src.startsWith('blob:')) {
    await new Promise((res) => {
      if (imgEl.complete && imgEl.naturalWidth) return res();
      imgEl.onload = () => res();
      imgEl.onerror = () => res();
    });
    const blob = await (await fetch(src)).blob().catch(() => null);
    if (!blob) return null;
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  }

  // http(s): оставим как url
  return src;
}

async function buildPayload(refs) {
  const rawLot = state.lastLottieJSON;
  if (!rawLot) throw new Error('Нет данных Lottie');

  // Глубокая копия + доп. мета
  const lot = JSON.parse(JSON.stringify(rawLot));
  try {
    const pos = state.lotOffset || { x: 0, y: 0 };
    lot.meta = lot.meta || {};
    lot.meta._lpPos = { x: +pos.x || 0, y: +pos.y || 0 };
  } catch {}

  // Фон
  let bg = null;
  const imgEl = refs?.bgImg;
  if (imgEl && imgEl.src) {
    const maybeData = await imageElementToDataURL(imgEl);
    const name = (state.lastBgMeta?.fileName || '');
    const assetScale = (state.lastBgMeta?.assetScale || undefined);
    if (maybeData && typeof maybeData === 'string' && maybeData.startsWith('data:')) {
      bg = { kind: 'data', value: maybeData, name, assetScale };
    } else if (maybeData) {
      bg = { kind: 'url', value: maybeData, name, assetScale };
    }
  }

  // Опции проигрывания
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
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

export function initShare({ refs }) {
  const btn = refs?.shareBtn;
  if (!btn) return;

  btn.addEventListener('click', async () => {
    // Предвалидация: показываем баблики, если чего-то не хватает
    const hasLot = !!state.lastLottieJSON;
    const hasBg  = !!(refs?.bgImg && refs.bgImg.src);
    if (!hasLot && !hasBg) { showToastNear(refs.toastEl, btn, 'Загрузите графику'); return; }
    if (!hasLot && hasBg)  { showToastNear(refs.toastEl, btn, 'Загрузите анимацию'); return; }
    if (hasLot && !hasBg)  { showToastNear(refs.toastEl, btn, 'Загрузите фон'); return; }

    await withLoading(btn, async () => {
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
