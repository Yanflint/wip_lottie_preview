// src/app/shareClient.js
import { withLoading, toast } from './utils.js';
import { state } from './state.js';

async function postJSON(url, data) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error('share failed: ' + r.status);
  return r.json();
}

export function initShare({ refs, isStandalone }) {
  const btn = refs?.shareBtn;
  if (!btn) return;

  btn.addEventListener('click', () => withLoading(btn, async () => {
    const bgEl = refs.bgImg;
    const hasBg = !!(bgEl && bgEl.src);
    const hasLot = !!state.lastLottieJSON;

    if (!hasBg && !hasLot) {
      toast(refs, 'Нечего сохранять');
      return;
    }

    const payload = {
      lot: state.lastLottieJSON || null,
      bg: hasBg ? bgEl.src : null,
      bgMeta: { dpr: state.bgDPR || 1 },
      opts: { loop: !!state.loopOn },
    };

    const res = await postJSON('/api/share', payload);
    const id = res?.id;
    if (!id) throw new Error('no id');

    const url = new URL(location.origin + '/s/' + id);
    // прокинем текущий fit, если есть
    try {
      const cur = new URL(location.href);
      const fit = cur.searchParams.get('fit');
      if (fit) url.searchParams.set('fit', fit);
    } catch {}

    // Копируем в буфер
    try {
      await navigator.clipboard.writeText(url.toString());
      toast(refs, 'Ссылка скопирована');
    } catch {
      toast(refs, url.toString());
    }
  }));
}
