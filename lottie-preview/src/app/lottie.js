// src/app/lottie.js
import { state } from './state.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

/** Центрируем лотти-стейдж без масштаба (1:1) */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  if (!stage) return;
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.transform = 'translate(-50%, -50%)';
}

/** Детект @Nx из имени/URL */
function detectDensityFromName(str = '') {
  try {
    const m = /@(\d+)x(?:\.|$)/i.exec(str);
    const d = m ? parseInt(m[1], 10) : 1;
    return Number.isFinite(d) && d >= 1 && d <= 4 ? d : 1;
  } catch { return 1; }
}

/**
 * Установка фоновой картинки.
 * @param {object} refs - ссылки на DOM
 * @param {string} src  - data:/blob:/http(s) URL
 * @param {object} [opts]
 * @param {number} [opts.density] - 1|2|3... Если не передан, пробуем распарсить из src/name.
 */
export async function setBackgroundFromSrc(refs, src, opts = {}) {
  const img = refs?.bgImg;
  if (!img || !src) return;

  // Плотность ассета (важно для корректного 1x-лейаута)
  const density =
    Math.max(1, parseInt(opts?.density || '', 10)) ||
    detectDensityFromName(src);

  // Проставим data-атрибут, чтобы layout.js мог его использовать
  img.dataset.density = String(density);

  // Загрузка изображения
  await new Promise((resolve, reject) => {
    const onLoad = () => { img.removeEventListener('error', onError); resolve(); };
    const onError = (e) => { img.removeEventListener('load', onLoad); reject(e); };
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    img.src = src;
  });

  // Спрячем плейсхолдер после удачной загрузки
  setPlaceholderVisible(refs, false);
}

/**
 * Загрузка Lottie JSON из объекта.
 * Совместимо с существующими контролами (loop/restart).
 */
export function loadLottieFromData(refs, json) {
  const mount = refs?.lottie;
  if (!mount || !json) return null;

  // Очищаем предыдущую анимацию
  try { anim?.destroy?.(); } catch {}
  mount.innerHTML = '';

  anim = window.lottie?.loadAnimation?.({
    container: mount,
    renderer: 'svg',
    loop: !!state.loopOn,
    autoplay: !!state.autoplayOn,
    animationData: json,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet',
      progressiveLoad: true,
      hideOnTransparent: true,
    },
  });

  if (!anim) return null;

  anim.addEventListener?.('DOMLoaded', () => {
    if (refs.wrapper) refs.wrapper.classList.add('has-lottie');
    layoutLottie(refs);
  });

  // При завершении без loop остаёмся на конце, кнопка/тап перезапустят
  anim.addEventListener?.('complete', () => { /* noop */ });

  return anim;
}

export function restart() {
  if (!anim) return;
  try {
    anim.goToAndStop?.(0, true);
    anim.play?.();
  } catch {}
}

export function setLoop(on) {
  try {
    if (anim) anim.loop = !!on;
  } catch {}
}

/** На всякий экспортим текущее окно анимации (если понадобится где-то ещё) */
export function getAnim() { return anim; }
