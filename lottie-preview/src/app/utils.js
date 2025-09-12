export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const originalHTML = btn.innerHTML;
  const originalWidth = btn.offsetWidth;
  const label = btn.getAttribute('data-loading-label') || 'Создаю';
  btn.classList.add('loading');
  btn.style.minWidth = originalWidth ? (originalWidth + 'px') : '';
  btn.innerHTML = '<span class="btn-load"><span class="lbl">' + label + '</span><span class="spin" aria-hidden="true"></span></span>';
  try { return await fn(); }
  finally { btn.classList.remove('loading'); btn.style.minWidth = ''; btn.innerHTML = originalHTML; }
}
  finally { btn.classList.remove('loading'); btn.textContent = text; }
}

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) {
    toastEl.style.left = (r.left + r.width/2)+'px';
    toastEl.style.top = (r.top)+'px';
  }
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
