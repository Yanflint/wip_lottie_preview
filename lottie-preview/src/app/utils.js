// Общие утилиты

export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const text = btn.textContent;
  btn.classList.add('loading');
  try { return await fn(); }
  finally { btn.classList.remove('loading'); btn.textContent = text; }
}

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) {
    toastEl.style.left = (r.left + r.width / 2) + 'px';
    toastEl.style.top  = (r.top) + 'px';
  }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

export function showToast(toastEl, msg, ms = 1400) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}

export function setPlaceholderVisible(refs, on) {
  const el = refs?.phEl || document.getElementById('ph');
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

/** Надёжно включаем/выключаем режим DnD-оверлея */
export function setDropActive(on) {
  const root = document.documentElement;
  const body = document.body;
  root?.classList.toggle('dragging', !!on);
  body?.classList.toggle('dragging', !!on);
}

// === для layout.js ===
export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
