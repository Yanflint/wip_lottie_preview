// src/app/updateToast.js
// Красивый тост "Обновлено" с плавным появлением/исчезанием.

let toastLock = false;

export function showUpdateToast(msg = 'Обновлено') {
  if (toastLock) return;
  toastLock = true;

  // контейнер
  const el = document.createElement('div');
  el.className = 'update-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="ut-wrap">
      <svg class="ut-ic" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.0 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
      <span class="ut-text">${msg}</span>
    </div>
  `;
  document.body.appendChild(el);

  // тайминги из CSS-переменных
  const cs = getComputedStyle(el);
  const enter = parseInt(cs.getPropertyValue('--toast-enter-ms')) || 260;
  const stay  = parseInt(cs.getPropertyValue('--toast-stay-ms'))  || 1400;
  const exit  = parseInt(cs.getPropertyValue('--toast-exit-ms'))  || 400;

  // плавный вход → пауза → выход
  requestAnimationFrame(() => {
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => {
        el.remove();
        toastLock = false;
      }, exit + 40);
    }, enter + stay);
  });
}

// Хелпер: показать при флаге из sessionStorage (после авто-рефреша)
export function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      showUpdateToast(msg);
    }
  } catch {}
}
