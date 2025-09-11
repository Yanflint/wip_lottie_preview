// src/app/utils.js
// Небольшие утилиты, которые используют остальные модули.

let toastTimer = null;

/** Показать/скрыть плейсхолдер "Перетащите файл..." */
export function setPlaceholderVisible(refs, visible) {
  const el = refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

/** Обёртка с состоянием загрузки на кнопке */
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

/** Простой тост внизу (использует #toast в index.html) */
export function toast(refs, message, ms = 1800) {
  const el = (refs && refs.toastEl) ? refs.toastEl : document.getElementById('toast');
  const text = String(message ?? '');
  if (!el) { try { alert(text); } catch {} return; } // запасной вариант

  el.textContent = text;
  el.classList.add('on');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('on');
  }, ms);
}
