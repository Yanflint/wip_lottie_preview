export function withLoading(btn, fn) {
  if (!btn) return fn();
  btn.classList.add('loading');
  const txt = btn.textContent;
  return Promise.resolve()
    .then(fn)
    .finally(() => { btn.classList.remove('loading'); btn.textContent = txt; });
}

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) {
    toastEl.style.left = (r.left + r.width / 2) + 'px';
    toastEl.style.top = (r.top) + 'px';
  }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

// Включаем/выключаем твой dnd-режим
export function setDropActive(on) {
  document.body.classList.toggle('dragging', !!on);
}

// Плейсхолдер скрываем/показываем твоим классом
export function setPlaceholderVisible(refs, on) {
  if (!refs?.phEl) return;
  refs.phEl.classList.toggle('hidden', !on);
}
