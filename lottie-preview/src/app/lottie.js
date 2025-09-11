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

function detectDprFromNameOrUrl(nameOrUrl = '') {
  const m = String(nameOrUrl).match(/@([23])x(?=\.|$)/i);
  return m ? Number(m[1]) : 1;
}

function applyPreviewSizeWeb(refs, w, h) {
  if (refs?.wrapper) { refs.wrapper.style.width = w + 'px'; refs.wrapper.style.height = h + 'px'; }
  if (refs?.preview) { refs.preview.style.width = w + 'px'; refs.preview.style.height = h + 'px'; }
}

export async function setBackgroundFromSrc(refs, src, options = {}) {
  if (!refs?.bgImg) return;
  const img = refs.bgImg;

  const hintName = options.name || '';
  const hintDpr  = options.dpr || 0;

  img.onload = () => {
    setPlaceholderVisible(refs, false);
    refs.wrapper?.classList.add('has-bg');

    const natW = img.naturalWidth  || 1;
    const natH = img.naturalHeight || 1;

    // DPR: state.bgDPR → options.dpr → по имени/URL → 1
    let dpr = state.bgDPR || hintDpr || detectDprFromNameOrUrl(hintName) || detectDprFromNameOrUrl(img.src) || 1;

    if (!state.isStandalone) {
      // Веб-редактор: показываем 1:1 (логический размер = natural / dpr)
      const logicalW = Math.max(1, Math.round(natW / dpr));
      const logicalH = Math.max(1, Math.round(natH / dpr));
      applyPreviewSizeWeb(refs, logicalW, logicalH);

      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
    } else {
      // A2HS: оставляем поведение как в стабильной версии
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
    refs.wrapper?.classList.add('has-lottie');
    layoutLottie(refs);
  });

  anim.addEventListener('complete', () => {});
  return anim;
}

export function getAnim() { return anim; }
