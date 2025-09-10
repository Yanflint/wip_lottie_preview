// src/app/main.js

// 1) Отметка standalone (A2HS)
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true);

if (isStandalone) document.documentElement.classList.add('standalone');

// 2) Импорты модулей
import { initDnd }           from './dnd.js';
import { initControls }      from './controls.js';
import { initShare }         from './shareClient.js';
import { initLoadFromLink }  from './loadFromLink.js';
import { layoutLottie }      from './lottie.js';

// 3) DOM-refs
function collectRefs() {
  return {
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
    sizeBtn:      document.getElementById('sizeBtn'),
    heightBtn:    document.getElementById('heightBtn'),
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
    toastEl:      document.getElementById('toast'),
    verEl:        document.getElementById('ver'),
    mode:         document.getElementById('mode'),
  };
}

// 4) Версия
function applyVersion(refs) {
  try {
    const u = new URL(import.meta.url);
    const v = u.searchParams.get('v') || 'dev';
    if (refs.verEl) refs.verEl.textContent = `build ${v}`;
  } catch {
    if (refs.verEl) refs.verEl.textContent = 'build dev';
  }
}

// 5) Init
window.addEventListener('DOMContentLoaded', async () => {
  const refs = collectRefs();
  applyVersion(refs);

  await initLoadFromLink({ refs, isStandalone });

  initDnd({ refs });
  initControls({ refs });
  initShare({ refs, isStandalone });

  // Перелайаут
  const relayout = () => { try { layoutLottie(refs); } catch {} };
  try { layoutLottie(refs); } catch {}
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // ──────────────────────────────────────────────
  // ТАП ПО ЭКРАНУ → ПОВТОР АНИМАЦИИ (мобила)
  // Работает, даже если кнопка «повтор» скрыта (мы программно кликаем её).
  const restartByTap = (e) => {
    // только тапы (не мышь), и не по панели управления
    const isTouch = e.pointerType ? (e.pointerType === 'touch') : (e.touches && e.touches.length === 1);
    if (!isTouch && !isStandalone) return;
    if (refs.mode && refs.mode.contains(e.target)) return;
    refs.restartBtn?.click();
  };

  // поддержим и pointer, и старые iOS touch
  refs.preview?.addEventListener('pointerdown', restartByTap, { passive: true });
  refs.preview?.addEventListener('touchstart',  restartByTap, { passive: true });
});
