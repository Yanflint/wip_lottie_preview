// src/app/updateToast.js
// Единый стиль баблика (как у «Обновлено»): тёмный фон, белый текст.
// Иконка меняется (зелёная галочка / красный крест). Без хвоста.
// Обновление — снизу по центру; успех/ошибка — над переданной кнопкой (anchorEl).

let toastLock = false;

function __lpParseTimeMs(v, fallbackMs){
  if(!v) return fallbackMs;
  const s = String(v).trim();
  if(!s) return fallbackMs;
  if (s.endsWith('ms')) { const n = parseFloat(s); return isNaN(n)?fallbackMs:n; }
  if (s.endsWith('s'))  { const n = parseFloat(s); return isNaN(n)?fallbackMs:Math.round(n*1000); }
  const n = parseFloat(s); return isNaN(n)?fallbackMs:n;
}
function __lpDurations(kind='generic'){
  // generic = для success/error; update = только для «Обновлено»
  const cs = getComputedStyle(document.documentElement);
  if (kind === 'update') {
    const enter = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-update-enter') || cs.getPropertyValue('--lp-toast-enter'), 160);
    const stay  = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-update-stay')  || cs.getPropertyValue('--lp-toast-stay'),  1600);
    const exit  = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-update-exit')  || cs.getPropertyValue('--lp-toast-exit'),  260);
    return { enter, stay, exit };
  }
  const enter = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-enter'), 160);
  const stay  = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-stay'),  1600);
  const exit  = __lpParseTimeMs(cs.getPropertyValue('--lp-toast-exit'),  260);
  return { enter, stay, exit };
}


function ensureStyles() {
  if (document.getElementById('lp-toast-style')) return;
  const st = document.createElement('style');
  st.id = 'lp-toast-style';
  st.textContent = `
  @keyframes lpToastIn {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1.00); }
  }
  @keyframes lpToastOut {
    from { opacity: 1; transform: translateY(0)    scale(1.00); }
    to   { opacity: 0; transform: translateY(8px)  scale(0.98); }
  }
  .lp-toast-wrap {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    transform: translateX(-50%);
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
  .lp-toast-icon { width: 18px; height: 18px; flex: 0 0 18px; display: inline-block; }
  `;
  document.head.appendChild(st);
}

function iconSVG(type) {
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

function placeAbove(anchorEl, bubble) {
  const r = anchorEl.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const gap = 10;
  // Временное измерение для ширины/высоты
  bubble.style.visibility = 'hidden';
  document.body.appendChild(bubble);
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  bubble.style.visibility = '';
  // Центрируем по кнопке и не даём выйти за экран
  let left = Math.round(r.left + r.width/2 - bw/2);
  left = Math.max(8, Math.min(left, vw - bw - 8));
  // Строго над кнопкой (с зазором)
  let top = Math.round(r.top - gap - bh);
  const minTop = 8;
  if (top < minTop) top = minTop;
  bubble.style.position = 'fixed';
  bubble.style.left = left + 'px';
  bubble.style.top  = top  + 'px';
}

function showCentered(msg) {
  const wrap = document.createElement('div');
  wrap.className = 'lp-toast-wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');
  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble';
  bubble.innerHTML = iconSVG('success') + `<span>${msg}</span>`;
  wrap.appendChild(bubble);
  document.body.appendChild(wrap);
  const { enter, stay, exit } = __lpDurations('update');
  bubble.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
  setTimeout(() => {
    bubble.style.animation = `lpToastOut ${exit}ms ease forwards`;
    setTimeout(() => { try { wrap.remove(); } catch(e) {} }, exit + 40);
  }, enter + stay);
}

\1const { enter, stay, exit } = __lpDurations('generic');
  bubble.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
  setTimeout(() => {
    bubble.style.animation = `lpToastOut ${exit}ms ease forwards`;
    setTimeout(() => { try { bubble.remove(); } catch(e) {} }, exit + 40);
  }, enter + stay);
}

// === Публичные API ===

export function showUpdateToast(msg = 'Обновлено') {
  if (toastLock) return; toastLock = true;
  ensureStyles();
  showCentered(msg);
  const __d = __lpDurations('update'); setTimeout(() => { toastLock = false; }, __d.enter + __d.stay + __d.exit + 60);
}

export function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      showUpdateToast(msg);
    }
  } catch(e) {}
}

export function showSuccessToast(msg='Готово', anchorEl=null) {
  ensureStyles();
  if (!anchorEl) return showUpdateToast(msg);
  showAnchored(msg, 'success', anchorEl);
}
export function showErrorToast(msg='Ошибка', anchorEl=null) {
  ensureStyles();
  if (!anchorEl) return showAnchored(msg, 'error', document.body);
  showAnchored(msg, 'error', anchorEl);
}
