// src/app/lottie.js
import { state } from './state.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  if (!stage) return;
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.transform = 'translate(-50%, -50%)';
}

function detectRetinaFactorFromUrl(url) {
  try {
    const u = new URL(url, location.href);
    const name = u.pathname.split('/').pop() || '';
    const m = name.match(/@([23])x(\.[a-z0-9]+)?$/i) || name.match(/@([23])x(?=\.)/i);
    if (m && m[1]) return parseInt(m[1], 10);
  } catch {}
  return 1;
}

function applyPreviewSizeWeb(refs, logicalW, logicalH) {
  // Веб-редактор: реальный макет 1:1 в CSS-пикселях.
  if (!refs?.wrapper) return;
  refs.wrapper.style.width = logicalW + 'px';
  refs.wrapper.style.height = logicalH + 'px';
}

export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  const img = refs.bgImg;

  img.onload = () => {
    setPlaceholderVisible(refs, false);
    if (refs.wrapper) refs.wrapper.classList.add('has-bg');

    const natW = img.naturalWidth || img.width || 1;
    const natH = img.naturalHeight || img.height || 1;

    if (!state.isStandalone) {
      // Веб: учитываем @2x/@3x, чтобы логический размер был корректным
      const factor = detectRetinaFactorFromUrl(img.src);
      const logicalW = Math.round(natW / factor);
      const logicalH = Math.round(natH / factor);
      applyPreviewSizeWeb(refs, logicalW, logicalH);
      // саму картинку кладём 100% по ширине wrapper, чтобы 1:1 совпало
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
    } else {
      // Standalone (A2HS): ширина экрана, обрезка по высоте контейнером — как было
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
