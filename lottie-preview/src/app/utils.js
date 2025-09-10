// src/app/utils.js
export const afterTwoFrames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
export const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

export function showToastNear(toastEl, el, msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r) { toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top = (r.top) + 'px'; }
  else   { toastEl.style.left = '50%'; toastEl.style.top  = (window.innerHeight - 24) + 'px'; }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
}

export async function withLoading(btn, fn){
  if (!btn) return fn();
  const original = btn.textContent;
  btn.classList.add('loading');
  try { return await fn(); }
  finally { btn.classList.remove('loading'); btn.textContent = original; }
}
