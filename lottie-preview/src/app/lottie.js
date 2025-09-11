// src/app/lottie.js
// Стабильный вариант: автопропорции + поддержка @2x/@3x, корректное mobile/standalone.
// Ничего лишнего — только то, что влияет на превью.

import { state, setLastBgSize } from './state.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

/* ========= ENV DETECT: mobile + standalone ========= */
(function detectEnv(){
  try {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (typeof navigator !== 'undefined' && navigator.standalone === true);

    const isMobile =
      /Android|iPhone|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent || ''
      );

    if (isStandalone) document.documentElement.classList.add('is-standalone');
    if (isMobile) document.documentElement.classList.add('is-mobile');
  } catch (_) {}
})();

/* ========= HELPERS ========= */
function parseAssetScale(nameOrUrl) {
  // распознаём @2x, @3x, @1.5x
  const m = String(nameOrUrl || '').match(/@(\d+(?:\.\d+)?)x(?=\.[a-z0-9]+(?:[?#]|$))/i);
  if (!m) return 1;
  const s = parseFloat(m[1]);
  return isFinite(s) && s > 0 ? Math.min(Math.max(1, s), 4) : 1;
}

/** Центрируем лотти-стейдж без масштаба (1:1) */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  if (!stage) return;
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.transform = 'translate(-50%, -50%)';
}

/**
 * Установка фоновой картинки.
 * — читаем naturalWidth/naturalHeight
 * — учитываем @2x/@3x в имени файла (если его знаем)
 * — прокидываем CSS-переменные на .wrapper:
 *     --preview-ar : (w/scale) / (h/scale)
 *     --preview-h  : (h/scale)px
 *
 * @param {object} refs
 * @param {string} src
 * @param {object} [meta] - опционально { fileName?: string }
 */
export async function setBackgroundFromSrc(refs, src, meta = {}) {
  if (!refs?.bgImg) return;

  // пробуем угадать имя файла, чтобы вытащить @2x
  const guessName = (() => {
    if (meta.fileName) return meta.fileName;
    const fromAttr = refs.bgImg.getAttribute('data-filename') || refs.bgImg.alt;
    if (fromAttr) return fromAttr;
    try {
      const u = new URL(src);
      const base = (u.pathname || '').split('/').pop();
      return base || src;
    } catch (_) { return src; }
  })();

  refs.bgImg.onload = () => {
    const iw = Number(refs.bgImg.naturalWidth || 0) || 1;
    const ih = Number(refs.bgImg.naturalHeight || 0) || 1;

    // сохраняем реальные пиксели (если где-то пригодится)
    setLastBgSize(iw, ih);

    // делим на ретина-коэффициент из имени (mob@2x.png -> 2)
    const assetScale = parseAssetScale(guessName);
    const cssW = iw / assetScale;
    const cssH = ih / assetScale;

    const wrap = refs.wrapper;
    if (wrap) {
      wrap.style.setProperty('--preview-ar', `${cssW} / ${cssH}`);
      wrap.style.setProperty('--preview-h', `${cssH}px`);
      wrap.classList.add('has-bg');
    }

    setPlaceholderVisible(refs, false);
  };

  refs.bgImg.onerror = () => {
    console.warn('Background image failed to load');
  };

  refs.bgImg.src = src;
}

/** Перезапуск анимации */
export function restart() {
  if (!anim) return;
  try { anim.stop(); anim.goToAndPlay(0, true); } catch (_) {}
}

/** Переключение loop "на лету" */
export function setLoop(on) {
  state.loopOn = !!on;
  if (anim) anim.loop = !!on;
}

/**
 * Загрузка Lottie JSON
 * — создаём инстанс
 * — габариты стейджа = w/h из JSON (1:1)
 */
export async function loadLottieFromData(refs, data) {
  try {
    const lotJson = typeof data === 'string' ? JSON.parse(data) : data;
    if (!lotJson || typeof lotJson !== 'object') return null;

    if (anim) { try { anim.destroy?.(); } catch (_) {} anim = null; }

    const w = Number(lotJson.w || 0) || 512;
    const h = Number(lotJson.h || 0) || 512;
    if (refs.lotStage) {
      refs.lotStage.style.width = `${w}px`;
      refs.lotStage.style.height = `${h}px`;
    }

    anim = window.lottie.loadAnimation({
      container: refs.lottieMount,
      renderer: 'svg',
      loop: !!state.loopOn,
      autoplay: true,
      animationData: lotJson
    });

    anim.addEventListener('DOMLoaded', () => {
      setPlaceholderVisible(refs, false);
      if (refs.wrapper) refs.wrapper.classList.add('has-lottie');
      layoutLottie(refs);
    });

    return anim;
  } catch (e) {
    console.error('loadLottieFromData error:', e);
    return null;
  }
}

/** Экспорт анимации при необходимости */
export function getAnim() { return anim; }
