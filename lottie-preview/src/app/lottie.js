// src/app/lottie.js
import { state } from './state.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  if (!stage) return;
  stage.style.position = 'absolute';
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.transform = 'translate(-50%, -50%)';
}

function detectRetinaFactorFromNameOrUrl(nameOrUrl = '') {
  const m = String(nameOrUrl).match(/@([23])x(?=\.|$)/i);
  return m ? Number(m[1]) : 1;
}

function applyPreviewSizeWeb(refs, logicalW, logicalH) {
  if (!refs?.wrapper) return;
  // wrapper и preview — строго 1:1 (CSS-пиксели)
  refs.wrapper.style.width  = logicalW + 'px';
  refs.wrapper.style.height = logicalH + 'px';
  if (refs.preview) {
    refs.preview.style.width  = logicalW + 'px';
    refs.preview.style.height = logicalH + 'px';
  }
}

export async function setBackgroundFromSrc(refs, src, options = {}) {
  if (!refs?.bgImg) return;
  const img = refs.bgImg;

  // Подсказки: dpr/name из DnD; иначе попытаемся из URL; fallback: 1
  const hintDpr  = options.dpr || state.bgDPR || 1;
  const hintName = options.name || '';

  img.onload = () => {
    setPlaceholderVisible(refs, false);
    if (refs.wrapper) refs.wrapper.classList.add('has-bg');

    const natW = img.naturalWidth || img.width || 1;
    const natH = img.naturalHeight || img.height || 1;

    // Определяем DPR (приоритет: state.bgDPR → hint → имя/URL → 1)
    let dpr = state.bgDPR || hintDpr || 1;
    if (dpr === 1) {
      // если state/hint не подсказали — попробуем по имени/URL
      dpr = detectRetinaFactorFromNameOrUrl(hintName) || detectRetinaFactorFromNameOrUrl(img.src) || 1;
    }

    // Логический размер (CSS px) для веб-режима: natural / dpr
    if (!state.isStandalone) {
      const logicalW = Math.max(1, Math.round(natW / dpr));
      const logicalH = Math.max(1, Math.round(natH / dpr));
      applyPreviewSizeWeb(refs, logicalW, logicalH);

      // Картинка заполняет wrapper (1:1)
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
    } else {
      // Standalone: ширина экрана, обрезка по высоте контейнером
      img.style.width = '100vw';
      img.style.height = 'auto';
      img.style.display = 'block';
    }
  };

  img.onerror = () => {};
  img.src = src;
}

export function restart() {
  if (!anim) return;
  try {
    anim.stop();
    anim.goToAndStop(0, true);
    anim.play();
  } catch {}
}

export function setLoop(on) {
  if (anim) anim.loop = !!on;
}

export async function loadLottieFromData(refs, lotJson) {
  if (!refs?.lottieMount || !lotJson) return;

  if (anim) { try { anim.destroy(); } catch {} anim = null; }

  const loop = !!state.loopOn;
  const autoplay = true;

  anim = window.lottie.loadAnimation({
    container: refs.lottieMount,
    renderer: 'svg',
    loop,
    autoplay,
    animationData: lotJson
  });

  anim.addEventListener('DOMLoaded', () => {
    const w = Number(lotJson.w || 0) || 512;
    const h = Number(lotJson.h || 0) || 512;
    if (refs.lotStage) {
      refs.lotStage.style.width = w + 'px';
      refs.lotStage.style.height = h + 'px';
    }
    setPlaceholderVisible(refs, false);
    if (refs.wrapper) refs.wrapper.classList.add('has-lottie');
    layoutLottie(refs);
  });

  anim.addEventListener('complete', () => {});
  return anim;
}

export function getAnim() { return anim; }
