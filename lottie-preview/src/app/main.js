// src/app/main.js

// 1) Отметка standalone (A2HS)
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true);

if (isStandalone) document.documentElement.classList.add('standalone');

// Viewer mode on /s/*
const isViewer = /^\/s\//.test(location.pathname);
if (isViewer) document.documentElement.classList.add('viewer');
  /* disable DnD in viewer */
  if (isViewer) {
    try {
      window.addEventListener('dragover', e => e.preventDefault(), { passive:false });
      window.addEventListener('drop', e => e.preventDefault(), { passive:false });
    } catch {}
  }


// [PATCH] Boot hard refresh once per session, to avoid stale payload
try {
  if (isViewer && sessionStorage.getItem('lp_boot_refreshed') !== '1') {
    sessionStorage.setItem('lp_boot_refreshed','1');
    location.replace(location.href);
  }
} catch {}


// 2) Импорты модулей
import { initDnd }           from './dnd.js';
import { state }           from './state.js';
import { getAnim, restart } from './lottie.js';
import { initControls }      from './controls.js';
import { initShare }         from './shareClient.js';
import { initLoadFromLink }  from './loadFromLink.js';
import { layoutLottie }      from './lottie.js';
import { initAutoRefreshIfViewingLast } from './autoRefresh.js'; // ← НОВОЕ
import { showToastIfFlag } from './updateToast.js';
import { bumpLotOffset } from './state.js';

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
showToastIfFlag(); // покажет "Обновлено", если страница была перезагружена авто-рефрешом

  // Авто-рефреш для /s/last (Viewer)
  initAutoRefreshIfViewingLast(); // ← НОВОЕ

  await initLoadFromLink({ refs, isStandalone });

  if (!isViewer) initDnd({ refs });
  initControls({ refs });
  initShare({ refs, isStandalone });

  /* DISABLE TAB FOCUS */
  try { document.querySelectorAll('button').forEach(b => b.setAttribute('tabindex','-1')); } catch {}
  /* REMOVE SHARE TITLE */
  try { refs.shareBtn?.removeAttribute('title'); } catch {}

  // Перелайаут
  const relayout = () => { try { layoutLottie(refs); } catch {} };
  try { layoutLottie(refs); } catch {}
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Тап = перезапуск (если было добавлено ранее)
  const restartByTap = (e) => {
    if (isViewer) return;
    const isTouch = e.pointerType ? (e.pointerType === 'touch') : (e.touches && e.touches.length === 1);
    if (!isTouch && !isStandalone) return;
    if (refs.mode && refs.mode.contains(e.target)) return;
    refs.restartBtn?.click();
  };
  refs.preview?.addEventListener('pointerdown', restartByTap, { passive: true });
  refs.preview?.addEventListener('touchstart',  restartByTap, { passive: true });

  // In viewer mode: click to RESTART animation (always from start)
  if (isViewer && refs.preview) {
    refs.preview.addEventListener('click', (e) => {
      if (refs.mode && refs.mode.contains(e.target)) return;
      try { restart(); } catch {}
    });
  }


window.addEventListener('keydown', (e) => {
  const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (!keys.includes(e.key)) return;
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (['input','textarea','select'].includes(tag)) return;
  const step = e.shiftKey ? 10 : 1;
  let dx = 0, dy = 0;
  if (e.key === 'ArrowLeft')  dx = -step;
  if (e.key === 'ArrowRight') dx = +step;
  if (e.key === 'ArrowUp')    dy = -step;
  if (e.key === 'ArrowDown')  dy = +step;
  bumpLotOffset(dx, dy);
  layoutLottie(refs);
  e.preventDefault();
}, { passive: false });

window.addEventListener('resize', () => { try { layoutLottie(refs); } catch {} });

  // ===== [TEST OVERLAY UI] only in viewer mode =====
  try {
    if (isViewer) {
      // Metrics overlay
      const ov = document.createElement('div');
      ov.id = 'debugOverlay';
      ov.className = 'debug-overlay';
      ov.setAttribute('aria-live','polite');
      ov.textContent = '—';
      // attach to wrapper if exists else body
      (refs?.wrapper || document.body).appendChild(ov);

      // Refresh button fixed at bottom-right above build/version
      const rb = document.createElement('button');
      rb.id = 'forceRefreshBtn';
      rb.className = 'overlay-refresh-btn';
      rb.type = 'button';
      rb.textContent = 'Обновить';
      rb.title = 'Принудительно перезагрузить ссылку';
      rb.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { sessionStorage.setItem('lp_show_toast','1'); } catch {}
        location.replace(location.href);
      });
      document.body.appendChild(rb); // ensure it's on top layer

      // Debug visibility gating (hidden by default; enable via ?debug=1 or localStorage('lp_debug'='1'))
      try {
        const sp = new URL(location.href).searchParams;
        const dbgParam = (sp.get('debug')||'').toLowerCase();
        const dbgPref  = (typeof localStorage!=='undefined' && (localStorage.getItem('lp_debug')||'').toLowerCase()) || '';
        const debugOn  = (dbgParam==='1'||dbgParam==='true'||dbgParam==='on') || (!dbgParam && (dbgPref==='1'||dbgPref==='true'||dbgPref==='on'));
        ov.style.display = debugOn ? '' : 'none';
        rb.style.display = debugOn ? '' : 'none';
      } catch {}

      // Expose updater
      window.__updateOverlay = (m) => {
        try {
          const txt = [
            `offset: x=${m?.offsetX ?? 0} (px), y=${m?.offsetY ?? 0} (px)`,
            `offset*scale: x=${m?.offsetXpx ?? 0}px, y=${m?.offsetYpx ?? 0}px`,
            `size: ${m?.baseW ?? 0}×${m?.baseH ?? 0} (base), ${m?.dispW ?? 0}×${m?.dispH ?? 0} (display)`,
            `scale: ${m?.fitScale?.toFixed ? m.fitScale.toFixed(4) : m?.fitScale ?? 1}`
          ].join('\n');
          ov.textContent = txt;
        } catch {}
      };
    }
  } catch {}

});