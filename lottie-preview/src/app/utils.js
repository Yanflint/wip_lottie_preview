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
  if (r) { toastEl.style.left = (r.left + r.width/2)+'px'; toastEl.style.top = (r.top)+'px'; }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

export function setDropActive(on) {
  document.body.classList.toggle('dragging', !!on);
}

export function setPlaceholderVisible(refs, on) {
  const el = refs?.phEl; if (!el) return;
  el.classList.toggle('hidden', !on);
}

// === добавлено для layout.js ===
export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
