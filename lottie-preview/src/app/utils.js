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
    const centerX = r.left + r.width / 2;

    // измеряем высоту бабла
    let toastH = toastEl.offsetHeight || 0;
    if (!toastH) {
      const prevVis  = toastEl.style.visibility;
      const prevTop  = toastEl.style.top;
      const prevLeft = toastEl.style.left;
      const hadShow  = toastEl.classList.contains('show');
      toastEl.style.visibility = 'hidden';
      toastEl.classList.add('show');
      toastEl.style.left = centerX + 'px';
      toastEl.style.top  = '0px';
      toastH = toastEl.offsetHeight || 24;
      // откат
      toastEl.classList.toggle('show', hadShow);
      toastEl.style.visibility = prevVis;
      toastEl.style.left = prevLeft;
      toastEl.style.top  = prevTop;
    }

    const gap = Math.max(4, r.height / 2); // половина высоты кнопки
    let top = r.top - gap - toastH;
    if (top < 8) top = 8; // запас сверху
    toastEl.style.left = centerX + 'px';
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
