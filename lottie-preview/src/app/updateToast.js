// src/app/updateToast.js
// Универсальные «баблики»-тосты: update (default), success, error.
// Поддерживает якорь (anchorEl) и «хвостик», указывающий на кнопку.

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
  .lp-toast-wrap.anchor {
    left: 0;
    right: 0;
    bottom: auto;
    transform: none;
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
  .lp-toast-bubble.success { background: rgba(24,24,24,0.95); }
  .lp-toast-bubble.error   { background: rgba(150, 20, 20, 0.95); }

  .lp-toast-icon { width: 18px; height: 18px; flex: 0 0 18px; display: inline-block; }

  /* Хвостик */
  .lp-toast-tail {
    position: absolute;
    width: 10px; height: 10px;
    background: currentColor;
    opacity: 1;
    transform: rotate(45deg);
  }
  /* Цвет хвостика берём из фона через filter для соответствия */
  .lp-toast-bubble,
  .lp-toast-tail { color: rgba(24,24,24,0.95); }
  .lp-toast-bubble.error,
  .lp-toast-bubble.error + .lp-toast-tail { color: rgba(150,20,20,0.95); }
  `;
  document.head.appendChild(st);
}

function svgIcon(type) {
  if (type === 'error') {
    return `
      <svg class="lp-toast-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#EF4444" />
        <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" />
      </svg>`;
  }
  // success/default
  return `
    <svg class="lp-toast-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#22C55E" />
      <path d="M7 12.5l3 3 7-7" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

function placeAnchored(wrap, bubble, tail, anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const gap = 10; // зазор между кнопкой и бабликом
  // первичное измерение
  bubble.style.visibility = 'hidden';
  bubble.style.left = '0px';
  bubble.style.top = '0px';
  document.body.appendChild(wrap);
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  bubble.style.visibility = '';

  const anchorCx = r.left + r.width/2;
  let left = Math.round(anchorCx - bw/2);
  left = Math.max(8, Math.min(left, vw - bw - 8));

  // Проверяем, хватает ли места сверху; если нет — показываем снизу
  const enoughTop = r.top >= (bh + gap + 8);
  const top = Math.round((enoughTop ? (r.top - bh - gap) : (r.bottom + gap)));

  bubble.style.position = 'fixed';
  bubble.style.left = left + 'px';
  bubble.style.top  = top + 'px';

  // Хвост: позиция по центру якоря (с поправкой на сдвиг баблика)
  const tailX = Math.round(anchorCx - left - 5); // 5 = half of tail width(10)
  tail.style.position = 'fixed';
  tail.style.left = (left + tailX - 5) + 'px';
  tail.style.width = '10px'; tail.style.height='10px';
  if (enoughTop) {
    // хвост смотрит вверх: ставим снизу баблика
    tail.style.top = (top + bh - 5) + 'px';
  } else {
    // хвост смотрит вниз: ставим сверху баблика и инвертируем на 225deg
    tail.style.top = (top - 5) + 'px';
    tail.style.transform = 'rotate(225deg)';
  }
}

function showBubble(msg, { type='success', anchorEl=null } = {}) {
  ensureStyles();

  const wrap = document.createElement('div');
  wrap.className = anchorEl ? 'lp-toast-wrap anchor' : 'lp-toast-wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');

  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble ' + (type === 'error' ? 'error' : 'success');
  bubble.innerHTML = svgIcon(type) + `<span>${msg}</span>`;

  const tail = document.createElement('div');
  tail.className = 'lp-toast-tail';

  if (anchorEl) {
    // Якорный режим
    wrap.appendChild(bubble);
    wrap.appendChild(tail);
    placeAnchored(wrap, bubble, tail, anchorEl);
  } else {
    // Центровка внизу (без хвостика)
    wrap.appendChild(bubble);
    document.body.appendChild(wrap);
  }

  const enter = 160, stay = 1600, exit = 260;
  if (!anchorEl) {
    wrap.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
    setTimeout(() => {
      wrap.style.animation = `lpToastOut ${exit}ms ease forwards`;
      setTimeout(() => { try { wrap.remove(); } catch(e) {} }, exit + 40);
    }, enter + stay);
  } else {
    // В якорном режиме анимации задаём на сам bubble (чтобы не дергать tail)
    bubble.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
    setTimeout(() => {
      bubble.style.animation = `lpToastOut ${exit}ms ease forwards`;
      setTimeout(() => { try { wrap.remove(); } catch(e) {} }, exit + 40);
    }, enter + stay);
  }
}

// === Публичные API ===

// Старый API «обновлено» (центральный баблик)
export function showUpdateToast(msg = 'Обновлено') {
  if (toastLock) return; toastLock = true;
  showBubble(msg, { type: 'success', anchorEl: null });
  setTimeout(() => { toastLock = false; }, 160 + 1600 + 260 + 60);
}

// Хелпер для авто-рефреша по флажку
export function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      showUpdateToast(msg);
    }
  } catch(e) {}
}

// Новые API
export function showSuccessToast(msg='Готово', anchorEl=null) { showBubble(msg, { type:'success', anchorEl }); }
export function showErrorToast(msg='Ошибка', anchorEl=null)   { showBubble(msg, { type:'error',   anchorEl }); }
