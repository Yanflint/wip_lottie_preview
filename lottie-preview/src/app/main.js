// src/app/main.js
import { state } from './state.js';
import { initDnd }           from './dnd.js';
import { initControls }      from './controls.js';
import { initShare }         from './shareClient.js';
import { initLoadFromLink }  from './loadFromLink.js';
import { layoutLottie }      from './lottie.js';
import { initAutoRefreshIfViewingLast } from './autoRefresh.js';
import { showToastIfFlag }   from './updateToast.js';

// 1) Определяем standalone (A2HS)
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true);

if (isStandalone) document.documentElement.classList.add('standalone');
state.isStandalone = isStandalone;

// 2) Это режим просмотра (открыт шот /s/:id)?
function isViewerPage() {
  try {
    const p = location.pathname;
    if (p.startsWith('/s/')) return true;
    const q = new URL(location.href).searchParams.get('id');
    return !!q;
  } catch { return false; }
}

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
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
    toastEl:      document.getElementById('toast'),
    verEl:        document.getElementById('ver'),
    mode:         document.getElementById('mode'),
  };
}

// 4) Версия + маленькая ссылка на Viewer
function applyVersion(refs) {
  const build = (() => {
    try { return new URL(import.meta.url).searchParams.get('v') || 'dev'; }
    catch { return 'dev'; }
  })();
  if (refs.verEl) {
    refs.verEl.innerHTML = `build ${build} <span class="dot">·</span> <a class="ver-link" href="/viewer/launch.html" target="_blank" rel="noopener">viewer</a>`;
  }
}

// 5) Init
window.addEventListener('DOMContentLoaded', async () => {
  const refs = collectRefs();
  applyVersion(refs);
  showToastIfFlag();

  // Авто-рефреш для /s/last
  initAutoRefreshIfViewingLast();

  // Если это просмотр (/s/:id) — прячем UI и рамки
  if (isViewerPage()) {
    document.documentElement.classList.add('view-mode');
  }

  await initLoadFromLink({ refs, isStandalone });

  // Только в редакторе нужен DnD и Share
  if (!isViewerPage()) {
    initDnd({ refs });
    initShare({ refs, isStandalone });
  }

  // Контролы (restart/loop) доступны везде
  initControls({ refs });

  // Перелайаут
  const relayout = () => { try { layoutLottie(refs); } catch {} };
  try { layoutLottie(refs); } catch {}
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Тап по превью = повтор (в любом режиме)
  const restartByTap = (e) => {
    const isTouch = e.pointerType ? (e.pointerType === 'touch') : (e.touches && e.touches.length === 1);
    if (!isTouch && !isStandalone) return;
    if (refs.mode && refs.mode.contains(e.target)) return;
    refs.restartBtn?.click();
  };
  refs.preview?.addEventListener('pointerdown', restartByTap, { passive: true });
  refs.preview?.addEventListener('touchstart',  restartByTap, { passive: true });
});
