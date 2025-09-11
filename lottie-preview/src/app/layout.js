import { isMobile, afterTwoFrames } from './utils.js';
import { state } from './state.js';

/**
 * Динамический лэйаут превью:
 * - Пропорции диктует сама картинка (bgImg.naturalWidth/Height).
 * - Пытаемся показать 1:1 пиксели; если не влазит — равномерно уменьшаем.
 * - Никаких зашитых 360×800 и max-width:1000 — только ограничения вьюпорта.
 */
export function layout({ refs }) {
  const { wrapper, preview, previewBox, bgImg } = refs;
  if (!wrapper || !preview) return;

  // В какой бокс выставляем размеры (если previewBox нет — падаем на wrapper)
  const box = previewBox || wrapper;

  // Небольшие поля вокруг бокса
  const pad = isMobile() ? 8 : 12;

  // Габариты окна
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Резерв под панель кнопок (берём из CSS-переменной)
  const rootStyles = getComputedStyle(document.documentElement);
  const controlsSpace = parseFloat(rootStyles.getPropertyValue('--controls-space')) || 150;

  // Доступная область под рамку превью
  const availW = Math.max(120, vw - pad * 2);
  const availH = Math.max(120, vh - controlsSpace - pad * 2);

  // Размеры исходного изображения (или последний известный)
  const iw = (bgImg && bgImg.naturalWidth)  || state.lastBgSize.w || 360;
  const ih = (bgImg && bgImg.naturalHeight) || state.lastBgSize.h || 800;

  // Стартуем с натурального размера (1:1), но ужимаем, если не помещается
  let targetW = iw;
  let targetH = ih;

  if (targetW > availW || targetH > availH) {
    const scale = Math.min(availW / targetW, availH / targetH);
    targetW = Math.floor(targetW * scale);
    targetH = Math.floor(targetH * scale);
  }

  // Чётко задаём размеры рамки (снимаем влияние aspect-ratio из CSS)
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

  // Перебиваем CSS-кап на wrapper (1000px) — даём расти до вьюпорта
  wrapper.style.maxWidth = `${vw - pad * 2}px`;
  wrapper.style.maxHeight = `${vh - pad * 2}px`;
  wrapper.style.aspectRatio = 'auto';
}

export function initLayout({ refs }) {
  const doLayout = () => layout({ refs });

  // Пересчёт по изменению окна/ориентации
  window.addEventListener('resize', doLayout, { passive: true });
  window.addEventListener(
    'orientationchange',
    () => afterTwoFrames().then(doLayout),
    { passive: true }
  );

  // Пересчёт после загрузки фоновой картинки (когда известны naturalWidth/Height)
  if (refs?.bgImg) {
    refs.bgImg.addEventListener('load', doLayout, { passive: true });
  }

  // Первый запуск
  doLayout();
}
