import { isMobile, afterTwoFrames } from './utils.js';
import { state } from './state.js';

/**
 * Dynamic layout:
 * - Размер превью задаётся соотношением сторон фоновой картинки.
 * - Если картинка помещается — показываем 1:1 (реальные пиксели).
 *   Иначе — равномерно масштабируем внутрь доступной области.
 * - Больше нет фиксированной "360×800" — пропорции диктует изображение.
 */
export function layout({ refs }) {
  const { wrapper, preview, previewBox, bgImg } = refs;
  if (!wrapper || !preview) return;

  // В какой бокс выставляем размеры (если previewBox нет — падём на wrapper)
  const box = previewBox || wrapper;

  // Небольшой внутренний отступ вокруг бокса
  const pad = isMobile() ? 8 : 12;

  // Границы доступной области окна
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Резерв под панель кнопок (берём из CSS-переменной, по умолчанию 150)
  const rootStyles = getComputedStyle(document.documentElement);
  const controlsSpace = parseFloat(rootStyles.getPropertyValue('--controls-space')) || 150;

  // Доступные размеры под сам бокс
  const availW = Math.max(120, Math.min(1200, vw - pad * 2));
  const availH = Math.max(120, vh - controlsSpace - pad * 2);

  // Размеры/пропорции фоновой картинки
  const iw = (bgImg && bgImg.naturalWidth)  || state.lastBgSize.w || 360;
  const ih = (bgImg && bgImg.naturalHeight) || state.lastBgSize.h || 800;

  // Подстрахуемся на случай отсутствия данных
  const ratio = ih > 0 ? (iw / ih) : (360 / 800);

  // Пытаемся показать 1:1, но если не влезает — уменьшаем
  let targetW = iw;
  let targetH = ih;

  if (targetW > availW || targetH > availH) {
    const scale = Math.min(availW / targetW, availH / targetH);
    targetW = Math.floor(targetW * scale);
    targetH = Math.floor(targetH * scale);
  }

  // Явно задаём размеры бокса (перебьём любые aspect-ratio/height из CSS)
  box.style.width = `${targetW}px`;
  box.style.height = `${targetH}px`;

  // Слой превью должен ровно заполнять бокс, без «базовых 360px»
  preview.style.position = 'absolute';
  preview.style.left = '0';
  preview.style.top = '0';
  preview.style.width = '100%';
  preview.style.height = '100%';
  preview.style.transform = 'none';

  // Для надёжности ограничим наружный wrapper по вьюпорту
  wrapper.style.maxWidth = `${Math.min(1200, vw - pad * 2)}px`;
  wrapper.style.maxHeight = `${vh - pad * 2}px`;
}

export function initLayout({ refs }) {
  const doLayout = () => layout({ refs });

  // Пересчёт при изменении окна / ориентации
  window.addEventListener('resize', doLayout, { passive: true });
  window.addEventListener('orientationchange', () => afterTwoFrames().then(doLayout), { passive: true });

  // Пересчёт сразу после загрузки фоновой картинки
  if (refs?.bgImg) {
    refs.bgImg.addEventListener('load', doLayout, { passive: true });
  }

  // Первый запуск
  doLayout();
}
