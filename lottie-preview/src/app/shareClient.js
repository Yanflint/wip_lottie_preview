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

function buildShareUrl(id) {
  const base = `${location.origin}/s/${encodeURIComponent(id)}`;
  try {
    const cur = new URL(location.href);
    const fit = cur.searchParams.get('fit');
    return fit ? `${base}?fit=${encodeURIComponent(fit)}` : base;
  } catch {
    return base;
  }
}

async function copyTextFallback(text) {
  // Пытаемся writeText
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {}
  // Классический трюк со скрытым input
  try {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.style.zIndex = '-1';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return true;
  } catch {}
  // Совсем крайний случай — покажем alert, чтобы можно было скопировать вручную
  try { alert(String(text)); } catch {}
  return false;
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

    // 1) Сохраняем на бэке
    const res = await postJSON('/api/share', payload);
    const id = res && res.id ? String(res.id) : '';
    if (!id) throw new Error('no id');

    // 2) Строго собираем СТРОКУ ссылки
    const shareUrl = buildShareUrl(id); // всегда обычная строка

    // 3) Копируем надёжно
    const ok = await copyTextFallback(shareUrl);
    toast(refs, ok ? 'Ссылка скопирована' : shareUrl);
  }));
}
