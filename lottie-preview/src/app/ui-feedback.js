// src/app/ui-feedback.js
// Небольшой модуль только для визуальных эффектов:
// 1) Тост "Обновлено" (пилюля снизу-центра)
// 2) Спиннер на кнопке "Поделиться" + тултип "Ссылка скопирована"

function ensureToastEl() {
  let el = document.querySelector('.update-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'update-toast';
    el.innerHTML = '<div class="ut-text">Обновлено</div>';
    document.body.appendChild(el);
  }
  return el;
}

/** Показать тост "Обновлено" (или кастомный текст) */
export function showUpdatedToast(text = 'Обновлено', { success = true, timeout = 1600 } = {}) {
  const el = ensureToastEl();
  const txt = el.querySelector('.ut-text');
  if (txt) txt.textContent = text;
  el.classList.toggle('success', !!success);
  // перезапуск анимации
  el.classList.add('show');
  clearTimeout(el._hideTid);
  el._hideTid = setTimeout(() => el.classList.remove('show'), timeout);
}

/** Показать подпрыгивающий тултип "Ссылка скопирована" над кнопкой */
export function showCopyTooltip(target, text = 'Ссылка скопирована', { timeout = 1400 } = {}) {
  try {
    const r = target.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.className = 'copy-tip';
    tip.textContent = text;
    document.body.appendChild(tip);

    // позиционируем по центру кнопки, чуть выше
    const x = r.left + r.width/2 + window.scrollX;
    const y = r.top + window.scrollY - 8; // стартовая позиция
    tip.style.left = `${x}px`;
    tip.style.top  = `${y}px`;

    requestAnimationFrame(() => {
      tip.classList.add('show');
    });

    setTimeout(() => {
      tip.classList.remove('show');
      setTimeout(() => tip.remove(), 180);
    }, timeout);
  } catch (_) {}
}

/** Копирование текста в буфер обмена с фолбэком */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  // фолбэк
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  } catch (_) {
    return false;
  }
}

/** Обёртка: повесить "busy"-состояние на кнопку на время async-операции */
export async function withButtonBusy(btn, fn) {
  if (!btn || typeof fn !== 'function') return;
  if (btn.dataset.busy === 'true') return;
  btn.dataset.busy = 'true';
  const prevDisabled = btn.disabled;
  btn.disabled = true;
  try {
    return await fn();
  } finally {
    btn.dataset.busy = 'false';
    btn.disabled = prevDisabled;
  }
}

/**
 * Автоподключение к кнопке "Поделиться".
 * По умолчанию ищет #shareBtn. Если window.makeShareLink существует — вызывает его;
 * иначе копирует текущий URL как "ссылку".
 */
export function wireShareButton({ selector = '#shareBtn', makeLink } = {}) {
  const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!btn) return;

  const getLink = async () => {
    if (typeof makeLink === 'function') return await makeLink();
    if (typeof window.makeShareLink === 'function') return await window.makeShareLink();
    // дефолт: текущий URL
    return location.href;
  };

  btn.addEventListener('click', async () => {
    await withButtonBusy(btn, async () => {
      try {
        const link = await getLink();
        if (link) {
          const ok = await copyToClipboard(link);
          showCopyTooltip(btn, ok ? 'Ссылка скопирована' : 'Не удалось скопировать');
          // Тост-подтверждение на вкус:
          // showUpdatedToast('Поделиться: ссылка готова');
        }
      } catch (e) {
        console.warn('share error', e);
        showCopyTooltip(btn, 'Ошибка');
      }
    });
  });
}

/* ===== Автоинициализация: если на странице есть #shareBtn — подключим сразу ===== */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#shareBtn');
  if (btn) wireShareButton({ selector: btn });
});

