// src/app/updateToast.js
// Всплывающий «баблик» с зелёной галочкой. Совместим по API:
//   showUpdateToast(msg?: string)
//   showToastIfFlag(flagKey?: string, msg?: string)

let toastLock = false;

function ensureStyles() {
  if (document.getElementById('lp-toast-style')) return;
  const st = document.createElement('style');
  st.id = 'lp-toast-style';
  st.textContent = `
  @keyframes lpToastIn {
    from { opacity: 0; transform: translate(-50%, 8px) scale(0.98); }
    to   { opacity: 1; transform: translate(-50%, 0)    scale(1.00); }
  }
  @keyframes lpToastOut {
    from { opacity: 1; transform: translate(-50%, 0)    scale(1.00); }
    to   { opacity: 0; transform: translate(-50%, 8px)  scale(0.98); }
  }
  .lp-toast-wrap {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    transform: translate(-50%, 0);
    z-index: 999999;
    pointer-events: none;
  }
  .lp-toast-bubble {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(24,24,24,0.95);
    color: #fff;
    font-size: 15px;
    line-height: 1;
    font-weight: 500;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    -webkit-backdrop-filter: saturate(1.1);
            backdrop-filter: saturate(1.1);
  }
  .lp-toast-bubble:before {
    content: "";
    position: absolute;
    top: 0;
    left: 18%;
    right: 18%;
    height: 2px;
    background: rgba(255,255,255,0.85);
    opacity: .75;
    border-radius: 2px;
    transform: translateY(-1px);
  }
  .lp-toast-icon {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    display: inline-block;
  }
  `;
  document.head.appendChild(st);
}

export function showUpdateToast(msg = 'Обновлено') {
  if (toastLock) return;
  toastLock = true;
  ensureStyles();

  const wrap = document.createElement('div');
  wrap.className = 'lp-toast-wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');

  // Зеленая галочка (inline SVG, чтобы не зависеть от ассетов)
  const icon = `
    <svg class="lp-toast-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#22C55E" />
      <path d="M7 12.5l3 3 7-7" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble';
  bubble.innerHTML = `${icon}<span>${msg}</span>`;
  wrap.appendChild(bubble);

  document.body.appendChild(wrap);

  // Анимация: появление → пауза → исчезновение
  const enter = 160, stay = 1600, exit = 260;
  wrap.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
  setTimeout(() => {
    wrap.style.animation = `lpToastOut ${exit}ms ease forwards`;
    setTimeout(() => {
      try { wrap.remove(); } catch {}
      toastLock = false;
    }, exit + 40);
  }, enter + stay);
}

// Показать тост по флажку в sessionStorage (после авто-рефреша)
export function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      showUpdateToast(msg);
    }
  } catch(e) {}
}
