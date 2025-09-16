// src/app/updateToast.js
// Единый стиль баблика (как у «Обновлено»): тёмный фон, белый текст.
// Иконка меняется (зелёная галочка / красный крест). Без хвоста.
// Обновление — снизу по центру; успех/ошибка — над переданной кнопкой (anchorEl).

let toastLock = false;

// === Global config for all bubbles ===
const toastConfig = {
  enter: 160,   // ms: fade/slide in
  stay: 1600,   // ms: visible
  exit: 260,    // ms: fade out
  easingIn: 'cubic-bezier(.21,.75,.2,1)',
  easingOut: 'ease',
};
export function setToastConfig(opts={}){
  if (!opts || typeof opts !== 'object') return;
  if (Number.isFinite(opts.enter)) toastConfig.enter = +opts.enter;
  if (Number.isFinite(opts.stay))  toastConfig.stay  = +opts.stay;
  if (Number.isFinite(opts.exit))  toastConfig.exit  = +opts.exit;
  if (typeof opts.easingIn  === 'string') toastConfig.easingIn  = opts.easingIn;
  if (typeof opts.easingOut === 'string') toastConfig.easingOut = opts.easingOut;
}
export function getToastConfig(){ return { ...toastConfig }; }
// === Presets system ===
// === SINGLE SOURCE OF TRUTH (edit only here) ===
export const TOAST_PRESETS = Object.freeze({
  short: { enter: 140, stay: 1000, exit: 220 },
  long:  { enter: 2200, stay: 2200, exit: 3000 },
});
export const TOAST_MAPPING = Object.freeze({
  update: 'long',   // «Обновлено» — длинный
  success: 'short', // успех — короткий
  error:  'short',  // ошибка — короткий
});

const toastPresets = { ...TOAST_PRESETS };
const toastPresetMap = { ...TOAST_MAPPING };;

export function setToastPresets(presets = {}) {
  if (!presets || typeof presets !== 'object') return;
  for (const [name, cfg] of Object.entries(presets)) {
    if (!cfg || typeof cfg !== 'object') continue;
    const p = { ...toastPresets[name] };
    if (Number.isFinite(cfg.enter)) p.enter = +cfg.enter;
    if (Number.isFinite(cfg.stay))  p.stay  = +cfg.stay;
    if (Number.isFinite(cfg.exit))  p.exit  = +cfg.exit;
    toastPresets[name] = p;
  }
}
export function getToastPresets() { return JSON.parse(JSON.stringify(toastPresets)); }

export function setToastPresetFor(kind, presetName) {
  if (!toastPresets[presetName]) return;
  if (kind !== 'update' && kind !== 'success' && kind !== 'error') return;
  toastPresetMap[kind] = presetName;
}
export function getToastPresetFor(kind){ return toastPresetMap[kind] || null; }

function resolveToastConfig(kind, options = {}){
  // base from global config
  let cfg = { ...toastConfig };
  // overlay mapped preset if exists
  try { const p = toastPresets[ toastPresetMap[kind] ]; if (p) cfg = { ...cfg, ...p }; } catch {}
  // final call-time overrides
  if (Number.isFinite(options.enter)) cfg.enter = +options.enter;
  if (Number.isFinite(options.stay))  cfg.stay  = +options.stay;
  if (Number.isFinite(options.exit))  cfg.exit  = +options.exit;
  if (typeof options.easingIn  === 'string') cfg.easingIn  = options.easingIn;
  if (typeof options.easingOut === 'string') cfg.easingOut = options.easingOut;
  return cfg;
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

function showCentered(msg, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'lp-toast-wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');
  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble';
  bubble.innerHTML = iconSVG('success') + `<span>${msg}</span>`;
  wrap.appendChild(bubble);
  document.body.appendChild(wrap);
    const kind = (options && options.kind) || (type === 'error' ? 'error' : 'success');
  const cfg = resolveToastConfig(kind, options);
  // Prepare initial state but don't start animation yet
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(8px) scale(0.98)';
  // Start strictly after next paint to avoid early timeline progress
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.style.animation = `lpToastIn ${cfg.enter}ms ${cfg.easingIn} forwards`;
      const totalStay = cfg.stay;
      setTimeout(() => {
        bubble.style.animation = `lpToastOut ${cfg.exit}ms ${cfg.easingOut} forwards`;
        setTimeout(() => { try { wrap.remove(); } catch(e) {} }, cfg.exit + 40);
      }, cfg.enter + totalStay);
    });
  });
}

function showAnchored(msg, type, anchorEl, options = {}) {
  const bubble = document.createElement('div');
  bubble.className = 'lp-toast-bubble';
  bubble.innerHTML = iconSVG(type) + `<span>${msg}</span>`;
  placeAbove(anchorEl, bubble);
  document.body.appendChild(bubble);
    const kind = (options && options.kind) || (type === 'error' ? 'error' : 'success');
  const cfg = resolveToastConfig(kind, options);
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(8px) scale(0.98)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.style.animation = `lpToastIn ${cfg.enter}ms ${cfg.easingIn} forwards`;
      setTimeout(() => {
        bubble.style.animation = `lpToastOut ${cfg.exit}ms ${cfg.easingOut} forwards`;
        setTimeout(() => { try { bubble.remove(); } catch(e) {} }, cfg.exit + 40);
      }, cfg.enter + cfg.stay);
    });
  });
}

// === Публичные API ===

export function showUpdateToast(msg = 'Обновлено', options = {}) {
  if (toastLock) return; toastLock = true;
  ensureStyles();
  showCentered(msg, options);
  setTimeout(() => { toastLock = false; }, 160 + 1600 + 260 + 60);
}

export function showToastIfFlag(flagKey = 'lp_show_toast', msg = 'Обновлено') {
  try {
    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
      showUpdateToast(msg);
    }
  } catch(e) {}
}

export function showSuccessToast(msg='Готово', anchorEl=null, options = {}) {
  ensureStyles();
  if (!anchorEl) return showCentered(msg, { ...(options||{}), kind: 'success' });
  showAnchored(msg, 'success', anchorEl, options);
}
export function showErrorToast(msg='Ошибка', anchorEl=null, options = {}) {
  ensureStyles();
  if (!anchorEl) return showAnchored(msg, 'error', document.body, options);
  showAnchored(msg, 'error', anchorEl, options);
}
