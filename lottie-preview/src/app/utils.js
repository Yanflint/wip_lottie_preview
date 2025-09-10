export function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function afterTwoFrames() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const original = btn.textContent;
  btn.classList.add('loading');
  try { return await fn(); }
  finally {
    btn.classList.remove('loading');
    btn.textContent = original;
  }
}

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) {
    toastEl.style.left = (r.left + r.width / 2) + 'px';
    toastEl.style.top = (r.top) + 'px';
  } else {
    toastEl.style.left = '50%';
    toastEl.style.top = (window.innerHeight - 24) + 'px';
  }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

/* UI helpers */
export function setPlaceholderVisible(refs, on) {
  try { if (refs?.phEl) refs.phEl.style.display = on ? '' : 'none'; } catch(_) {}
}
export function setDropActive(refs, on) {
  const box = refs?.previewBox || refs?.wrapper || document.body;
  if (!box) return;
  try {
    if (on) {
      box.classList.add('drop-active');
      if (refs.phEl) refs.phEl.textContent = 'Отпустите здесь';
    } else {
      box.classList.remove('drop-active');
      if (refs.phEl) refs.phEl.textContent = 'Перетащите PNG/JPG или Lottie JSON сюда, либо вставьте из буфера.';
    }
  } catch(_) {}
}
