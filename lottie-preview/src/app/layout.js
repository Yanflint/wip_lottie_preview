import { isMobile, afterTwoFrames } from './utils.js';
import { state } from './state.js';

/** Парсим плотность ассета из имени/URL: ...@2x.png / ...@3x.jpg */
function detectDensityFromName(str = '') {
  try {
    const m = /@(\d+)x(?:\.|$)/i.exec(str);
    const d = m ? parseInt(m[1], 10) : 1;
    return Number.isFinite(d) && d >= 1 && d <= 4 ? d : 1;
  } catch { return 1; }
}

/** Берём плотность из data-атрибута или по имени/URL картинки */
function getAssetDensity(imgEl) {
  if (!imgEl) return 1;
  const fromAttr = parseInt(imgEl.dataset?.density || '', 10);
  if (Number.isFinite(fromAttr) && fromAttr >= 1) return fromAttr;
  // currentSrc даёт реальный src после выбора <source>, если такое будет
  return detectDensityFromName(imgEl.currentSrc || imgEl.src || '');
}

/**
 * Динамический лэйаут превью:
 * - Пропорции диктует картинка, но размер берём в «дизайнерских» 1x-пикселях.
 * - Если ассет retina (@2x/@3x) — делим naturalWidth/Height на плотность.
 * - Пытаемся показать 1:1 (в 1x), иначе равномерно уменьшаем под экран.
 */
export function layout({ refs }) {
  const { wrapper, preview, previewBox, bgImg } = refs;
  if (!wrapper || !preview) return;

  const box = previewBox || wrapper;

  const pad = isMobile() ? 8 : 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rootStyles = getComputedStyle(document.documentElement);
  const controlsSpace = parseFloat(rootStyles.getPropertyValue('--controls-space')) || 150;

  const availW = Math.max(120, vw - pad * 2);
  const availH = Math.max(120, vh - controlsSpace - pad * 2);

  // --- размеры фона в 1x (эффективные дизайнерские пиксели) ---
  const density = getAssetDensity(bgImg); // 1, 2, 3 ...
  const natW = bgImg?.naturalWidth  || state.lastBgSize.w || 360;
  const natH = bgImg?.naturalHeight || state.lastBgSize.h || 800;
  const effW = Math.max(1, Math.floor(natW / Math.max(1, density)));
  const effH = Math.max(1, Math.floor(natH / Math.max(1, density)));

  // Стартуем с 1:1 (в 1x), но уменьшаем, если не помещается
  let targetW = effW;
  let targetH = effH;

  if (targetW > availW || targetH > availH) {
    const scale = Math.min(availW / targetW, availH / targetH);
    targetW = Math.max(1, Math.floor(targetW * scale));
    targetH = Math.max(1, Math.floor(targetH * scale));
  }

  // Проставляем размеры бокса
  box.style.width = `${targetW}px`;
  box.style.height = `${targetH}px`;
  box.style.aspectRatio = 'auto';

  // Превью заполняет бокс полностью
  preview.style.position = 'absolute';
  preview.style.left = '0';
  preview.style.top = '0';
  preview.style.width = '100%';
  preview.style.height = '100%';
  preview.style.transform = 'none';

  // Ограничения по вьюпорту на wrapper (без старого «1000px капа»)
  wrapper.style.maxWidth = `${vw - pad * 2}px`;
  wrapper.style.maxHeight = `${vh - pad * 2}px`;
  wrapper.style.aspectRatio = 'auto';
}

export function initLayout({ refs }) {
  const doLayout = () => layout({ refs });

  window.addEventListener('resize', doLayout, { passive: true });
  window.addEventListener(
    'orientationchange',
    () => afterTwoFrames().then(doLayout),
    { passive: true }
  );

  if (refs?.bgImg) {
    // как только картинка загрузилась — известны naturalWidth/Height → пересчёт
    refs.bgImg.addEventListener('load', doLayout, { passive: true });
  }

  doLayout();
}
