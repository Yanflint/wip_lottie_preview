// src/app/updateToast.js

// === SINGLE SOURCE OF TRUTH — edit only here ===
export const TOAST_PRESETS = Object.freeze({
  short: { enter: 140,  stay: 1000, exit: 220 },
  base:  { enter: 160,  stay: 1600, exit: 260 },
  long:  { enter: 2200, stay: 2200, exit: 3000 } // tweak as needed
});
export const TOAST_MAPPING = Object.freeze({
  update:  'long',
  success: 'short',
  error:   'short'
});

// Runtime copies derived strictly from constants above
const toastPresets   = { ...TOAST_PRESETS };
const toastPresetMap = { ...TOAST_MAPPING };

const EASING_IN  = 'cubic-bezier(0.42, 0, 0.58, 1)';
const EASING_OUT = 'cubic-bezier(0.42, 0, 0.58, 1)';

function resolveToastConfig(kind) {
  const key = toastPresetMap[kind] || 'base';
  const preset = toastPresets[key] || toastPresets.base || toastPresets.short;
  return { ...preset, easingIn: EASING_IN, easingOut: EASING_OUT };
}

// Safe clamp
function __safeMs(v, fb, min=0, max=60000){
  const n = Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.min(Math.max(n, min), max);
}
// Единый стиль баблика (как у «Обновлено»): тёмный фон, белый текст.
// Иконка меняется (зелёная галочка / красный крест). Без хвоста.
// Обновление — снизу по центру; успех/ошибка — над переданной кнопкой (anchorEl).

let toastLock = false;

function ensureStyles() {

  if (document.getElementById('lp-toast-style')) return;
  const st = document.createElement('style');
  st.id = 'lp-toast-style';
  st.textContent = `
  @keyframes lpToastIn {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }

function waitForContentPaint(maxWait=3000){
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const to = setTimeout(finish, maxWait);
    const onPaint = () => { clearTimeout(to); finish(); };
    try { document.addEventListener('lp:content-painted', onPaint, { once: true }); } catch {}
  });
}

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
  
  const kind  = 'update';
  const cfg   = resolveToastConfig(kind);
  const base  = toastPresets.base || toastPresets.short;
  const enter = __safeMs(cfg.enter, base.enter);
  const stay  = __safeMs(cfg.stay,  base.stay);
  const exit  = __safeMs(cfg.exit,  base.exit);

  let removed = false;
  const safeRemove = () => { if (!removed) { removed = true; try { wrap.remove(); } catch {} } };

  // Start strictly after next paint(s)
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(8px) scale(0.98)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.style.animation = `lpToastIn ${enter}ms ${cfg.easingIn} forwards`;
      setTimeout(() => {
        bubble.style.animation = `lpToastOut ${exit}ms ${cfg.easingOut} forwards`;
        setTimeout(safeRemove, exit + 80);
      }, enter + stay);
    });
  });

  // Safety TTL no matter what
  setTimeout(safeRemove, enter + stay + exit + 1000);
  bubble.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
  setTimeout(() => {
    bubble.style.animation = `lpToastOut ${exit}ms ease forwards`;
    setTimeout(() => { try { wrap.remove(); } catch(e) {} }, exit + 40);
  }, enter + stay);
}

function showAnchored(msg, type, anchorEl) {
  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble';
  bubble.innerHTML = iconSVG(type) + `<span>${msg}</span>`;
  placeAbove(anchorEl, bubble);
  document.body.appendChild(bubble);
  
  const kind  = (type === 'error' ? 'error' : 'success');
  const cfg   = resolveToastConfig(kind);
  const base  = toastPresets.base || toastPresets.short;
  const enter = __safeMs(cfg.enter, base.enter);
  const stay  = __safeMs(cfg.stay,  base.stay);
  const exit  = __safeMs(cfg.exit,  base.exit);

  let removed = false;
  const safeRemove = () => { if (!removed) { removed = true; try { bubble.remove(); } catch {} } };

  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(8px) scale(0.98)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.style.animation = `lpToastIn ${enter}ms ${cfg.easingIn} forwards`;
      setTimeout(() => {
        bubble.style.animation = `lpToastOut ${exit}ms ${cfg.easingOut} forwards`;
        setTimeout(safeRemove, exit + 80);
      }, enter + stay);
    });
  });

  setTimeout(safeRemove, enter + stay + exit + 1000);
  bubble.style.animation = `lpToastIn ${enter}ms cubic-bezier(.21,.75,.2,1) forwards`;
  setTimeout(() => {
    bubble.style.animation = `lpToastOut ${exit}ms ease forwards`;
    setTimeout(() => { try { bubble.remove(); } catch(e) {} }, exit + 40);
  }, enter + stay);
}

// === Публичные API ===

export function showUpdateToast(msg = 'Обновлено') {
  if (toastLock) return;
  toastLock = true;
  ensureStyles();
  showCentered(msg); // uses kind='update' inside

  try {
    const { enter, stay, exit } = resolveToastConfig('update');
    const ttl = __safeMs(enter,160) + __safeMs(stay,1600) + __safeMs(exit,260) + 120;
    setTimeout(() => { toastLock = false; }, ttl);
  } catch {
    setTimeout(() => { toastLock = false; }, 2200); // safe fallback
  }
}

export async function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      await waitForContentPaint();
      showUpdateToast(msg);
    }
  } catch(e) {}
}

export function showSuccessToast(msg='Готово', anchorEl=null) {
  ensureStyles();
  if (!anchorEl) return showCentered(msg, { kind: 'success' });
  showAnchored(msg, 'success', anchorEl);
}
export function showErrorToast(msg='Ошибка', anchorEl=null) {
  ensureStyles();
  if (!anchorEl) return showAnchored(msg, 'error', document.body);
  showAnchored(msg, 'error', anchorEl);
}
