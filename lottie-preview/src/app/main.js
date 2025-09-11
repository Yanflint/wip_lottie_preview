import { state } from './state.js';
import { initDnd }           from './dnd.js';
import { initControls }      from './controls.js';
import { initShare }         from './shareClient.js';
import { initLoadFromLink }  from './loadFromLink.js';
import { layoutLottie }      from './lottie.js';
import { initAutoRefreshIfViewingLast } from './autoRefresh.js';
import { showToastIfFlag }   from './updateToast.js';

// A2HS?
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true);

if (isStandalone) document.documentElement.classList.add('standalone');
state.isStandalone = isStandalone;

// Viewer-страница только когда путь начинается с /s/
function isViewerPage() {
  try { return location.pathname.startsWith('/s/'); } catch { return false; }
}

// DOM refs
function collectRefs() {
  return {
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
    toastEl:      document.getElementById('toast'),
    verEl:        document.getElementById('ver'),
    mode:         document.getElementById('mode'),
  };
}

// Версия (надёжнее вытаскиваем v)
function detectBuildVersion() {
  // 1) из import.meta.url
  try {
    const v = new URL(import.meta.url).searchParams.get('v');
    if (v) return v;
  } catch {}
  // 2) из тега script
  try {
    const s = document.querySelector('script[type="module"][src*="/src/app/main.js"]');
    if (s) {
      const v2 = new URL(s.src).searchParams.get('v');
      if (v2) return v2;
    }
  } catch {}
  return 'dev';
}
function applyVersion() {
  const span = document.getElementById('verText');
  if (span) span.textContent = `build ${detectBuildVersion()}`;
}

window.addEventListener('DOMContentLoaded', async () => {
  applyVersion();
  showToastIfFlag();
  initAutoRefreshIfViewingLast();

  const refs = collectRefs();

  // В режиме просмотра убираем UI/рамки
  if (isViewerPage()) {
    document.documentElement.classList.add('view-mode');
  }

  await initLoadFromLink({ refs, isStandalone });

  // Только в редакторе включаем DnD и Share
  if (!isViewerPage()) {
    initDnd({ refs });
    initShare({ refs, isStandalone });
  }

  initControls({ refs });

  const relayout = () => { try { layoutLottie(refs); } catch {} };
  try { layoutLottie(refs); } catch {}
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Тап по превью = перезапуск (в любом режиме)
  const restartByTap = (e) => {
    const isTouch = e.pointerType ? (e.pointerType === 'touch') : (e.touches && e.touches.length === 1);
    if (!isTouch && !isStandalone) return;
    if (refs.mode && refs.mode.contains(e.target)) return;
    refs.restartBtn?.click();
  };
  refs.preview?.addEventListener('pointerdown', restartByTap, { passive: true });
  refs.preview?.addEventListener('touchstart',  restartByTap, { passive: true });
});
