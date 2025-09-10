// src/app/main.js

// ── 1) Помечаем запуск "с иконки" (A2HS / standalone) для CSS
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true); // iOS Safari

if (isStandalone) {
  document.documentElement.classList.add('standalone');
}

// ── 2) Импорты модулей приложения
import { initDnd }         from './dnd.js';
import { initControls }    from './controls.js';
import { initShare }       from './shareClient.js';
import { initLoadFromLink } from './loadFromLink.js';
import { layoutLottie }    from './lottie.js';

// ── 3) Готовим ссылки на DOM
function collectRefs() {
  return {
    // контейнеры
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    // фон и лотти
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
    // UI
    sizeBtn:      document.getElementById('sizeBtn'),
    heightBtn:    document.getElementById('heightBtn'),
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
    // служебные
    toastEl:      document.getElementById('toast'),
    verEl:        document.getElementById('ver'),
    mode:         document.getElementById('mode'),
  };
}

// ── 4) Версия сборки внизу страницы (берём ?v= из src скрипта)
function applyVersion(refs) {
  try {
    const u = new URL(import.meta.url);
    const v = u.searchParams.get('v') || 'dev';
    if (refs.verEl) refs.verEl.textContent = `build ${v}`;
  } catch {
    if (refs.verEl) refs.verEl.textContent = 'build dev';
  }
}

// ── 5) Инициализация
window.addEventListener('DOMContentLoaded', async () => {
  const refs = collectRefs();
  applyVersion(refs);

  // Загружаем состояние по короткой ссылке (если /s/:id)
  await initLoadFromLink({ refs });

  // DnD: перетаскивание PNG/JPG/JSON
  initDnd({ refs });

  // Контролы (loop, restart, размеры и пр. — если нужны)
  initControls({ refs });

  // Поделиться (сохранение в Blobs + короткая ссылка)
  initShare({ refs });

  // Первичная раскладка лотти относительно фона
  try { layoutLottie(refs); } catch {}

  // Перелайаут при ресайзе/повороте
  const relayout = () => {
    try { layoutLottie(refs); } catch {}
  };
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });
});
