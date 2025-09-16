export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const prevHTML = btn.innerHTML;
  btn.classList.add('loading');
  btn.setAttribute('aria-busy', 'true');
  btn.style.filter = ''; /* не затемняем */
  btn.innerHTML = `<span class="loading-content">Создание</span><span class="spinner" aria-hidden="true"></span>`;
  try {
    return await fn();
  } finally {
    btn.classList.remove('loading');
    btn.removeAttribute('aria-busy');
    btn.innerHTML = prevHTML;
  }
}

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) {
    // Базовый отступ над кнопкой
    let top = r.top - 24; // подняли выше, чтобы не наслаивался на кнопку
    // Ошибочные баблики — ещё выше
    try { if (typeof msg === 'string' && msg.startsWith('Загрузите')) top -= 8; } catch {}
    if (top < 8) top = 8;
    toastEl.style.left = (r.left + r.width / 2) + 'px';
    toastEl.style.top  = top + 'px';
  }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

export function setDropActive(on) {
  document.body.classList.toggle('dragging', !!on);
}

export function setPlaceholderVisible(refs, on) {
  const el = refs?.phEl;
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

// === добавлено для layout.js ===
export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
