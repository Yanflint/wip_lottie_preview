// src/app/utils.js
let toastTimer = null;

export function setPlaceholderVisible(refs, visible) {
  const el = refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

export async function withLoading(btn, fn) {
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.setAttribute('aria-busy', 'true');
  }
  try {
    return await fn();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.removeAttribute('aria-busy');
    }
  }
}

export function toast(refs, message, ms = 1800) {
  const el = refs?.toastEl ?? document.getElementById('toast');
  const text = String(message ?? '');
  if (!el) { try { alert(text); } catch {} return; }
  el.textContent = text;
  el.classList.add('on');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}
