export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const originalHTML = btn.innerHTML;
  const originalWidth = btn.offsetWidth;
  const labelAttr = btn.getAttribute('data-loading-label');
  const label = labelAttr ? labelAttr : 'создаю';
  btn.classList.add('loading');
  if (originalWidth) btn.style.minWidth = originalWidth + 'px';
  btn.innerHTML = '<span class="btn-load"><span class="lbl">' + label + '</span><span class="spin" aria-hidden="true"></span></span>';
  let _result, _error;
  try {
    _result = await fn();
  } catch (e) {
    _error = e;
  }
  btn.classList.remove('loading');
  btn.style.minWidth = '';
  btn.innerHTML = originalHTML;
  if (_error) throw _error;
  return _result;
}
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
