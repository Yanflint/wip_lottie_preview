// src/app/lottie.js
import { state, setLastBgSize, setLastBgMeta } from './state.js';
import { openOfficialViewer } from './rlottieOfficial.js';
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { createTTPlayer } from './rlottieTT.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

/* ========= ENV DETECT (PWA + mobile) ========= */
(function detectEnv(){
  try {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      // iOS Safari
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
  // match @2x, @3x, @1.5x before extension
  const m = String(nameOrUrl || '').match(/@(\d+(?:\.\d+)?)x(?=\.[a-z0-9]+(\?|#|$))/i);
  if (!m) return 1;
  const s = parseFloat(m[1]);
  if (!isFinite(s) || s <= 0) return 1;
  // Ограничим разумными рамками
  return Math.max(1, Math.min(4, s));
}

/** Центрируем лотти-стейдж без масштаба (1:1) */
/** Центрируем и масштабируем лотти-стейдж синхронно с фоном */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  const wrap  = refs?.wrapper || refs?.previewBox || refs?.preview;
  if (!stage || !wrap) return;

  const cssW = +((state.lastBgSize && state.lastBgSize.w) || 0);
  const cssH = +((state.lastBgSize && state.lastBgSize.h) || 0);

  
  // Берём реальные рендерные размеры фоновой картинки (если есть),
  // чтобы масштаб лотти соответствовал именно фону, а не контейнеру превью.
  let realW = 0, realH = 0;
  const bgEl = refs?.bgImg;
  if (bgEl && bgEl.getBoundingClientRect) {
    const bgr = bgEl.getBoundingClientRect();
    realW = bgr.width || 0;
    realH = bgr.height || 0;
  }
  // Фолбэк: если по какой-то причине фон недоступен — используем контейнер
  if (!(realW > 0 && realH > 0)) {
    const br = wrap.getBoundingClientRect();
    realW = br.width || 0;
    realH = br.height || 0;
  }


  let fitScale = 1;
  
  if (cssW > 0 && cssH > 0 && realW > 0 && realH > 0) {
    // Масштаб подгоняем так, чтобы 1 CSS-пиксель лотти = 1 CSS-пиксель фона
    fitScale = Math.min(realW / cssW, realH / cssH);
  }
if (cssW > 0 && cssH > 0 && realW > 0 && realH > 0) {
    fitScale = Math.min(realW / cssW, realH / cssH);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
  }

  const x = (window.__lotOffsetX || 0);
  const y = (window.__lotOffsetY || 0);
  const xpx = x * fitScale;
  const ypx = y * fitScale;

  stage.style.left = '50%';
  stage.style.top  = '50%';
  stage.style.transformOrigin = '50% 50%';
  stage.style.transform = `translate(calc(-50% + ${xpx}px), calc(-50% + ${ypx}px)) scale(${fitScale})`;
  // [TEST OVERLAY] capture metrics for debug overlay
  try {
    const stageRect = stage.getBoundingClientRect ? stage.getBoundingClientRect() : { width: 0, height: 0 };
    const baseW = parseFloat(stage.style.width || '0') || stageRect.width / (fitScale || 1) || 0;
    const baseH = parseFloat(stage.style.height || '0') || stageRect.height / (fitScale || 1) || 0;
    window.__lpMetrics = {
      fitScale: fitScale,
      baseW: Math.round(baseW),
      baseH: Math.round(baseH),
      dispW: Math.round(stageRect.width),
      dispH: Math.round(stageRect.height),
      offsetX: x,
      offsetY: y,
      offsetXpx: Math.round(xpx),
      offsetYpx: Math.round(ypx)
    };
    if (typeof window.__updateOverlay === 'function') {
      window.__updateOverlay(window.__lpMetrics);
    }
  } catch {}

}
/**
 * Установка фоновой картинки из data:/blob:/http(s)
 * — считываем naturalWidth/naturalHeight
 * — учитываем @2x/@3x/@1.5x из имени
 * — прокидываем в .wrapper CSS-переменные:
 *     --preview-ar : (w/scale) / (h/scale)
 *     --preview-h  : (h/scale)px
 *
 * @param {object} refs
 * @param {string} src
 * @param {object} [meta] - опционально { fileName?: string }
 */
export async function setBackgroundFromSrc(refs, src, meta = {}) {
  // [PATCH] make function awaitable until image is loaded
  let __bgResolve = null; const __bgDone = new Promise((r)=>{ __bgResolve = r; });

  if (!refs?.bgImg) return;

  // Пытаемся вычислить название файла для парсинга @2x
  const guessName = (() => {
    // при передаче meta.fileName используем его
    if (meta.fileName) return meta.fileName;
    // попробуем достать из атрибутов, если кто-то положил туда
    const fromAttr = refs.bgImg.getAttribute('data-filename') || refs.bgImg.alt;
    if (fromAttr) return fromAttr;
    // как крайний случай — попробуем вытащить имя из обычного URL
    try {
      const u = new URL(src);
      const pathname = u.pathname || '';
      const base = pathname.split('/').pop();
      return base || src;
    } catch (_) {
      return src; // data:/blob: сюда свалится — шанса достать имя нет
    }
  })();

  refs.bgImg.onload = async () => {
    try { __bgResolve && __bgResolve(); } catch {}

    const iw = Number(refs.bgImg.naturalWidth || 0) || 1;
    const ih = Number(refs.bgImg.naturalHeight || 0) || 1;

    // Парсим коэффициент ретины из имени (mob@2x.png -> 2)
    const assetScale = (typeof meta.assetScale === 'number' && meta.assetScale > 0) ? meta.assetScale : parseAssetScale(guessName);

    // Приводим к «CSS-размеру», как это было бы на сайте
    const cssW = iw / assetScale;
    const cssH = ih / assetScale;

    const wrap = refs.wrapper;
    if (wrap) {
      wrap.style.setProperty('--preview-ar', `${cssW} / ${cssH}`);
      wrap.style.setProperty('--preview-h', `${cssH}px`);
      wrap.style.setProperty('--asset-scale', String(assetScale));
      // Сохраняем логический (CSS) размер и метаданные фона
      setLastBgSize(cssW, cssH);
      setLastBgMeta({ fileName: guessName, assetScale });
      wrap.classList.add('has-bg');
    }

    setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); } catch {}
  };

  refs.bgImg.onerror = () => {
    try { __bgResolve && __bgResolve(); } catch {}

    console.warn('Background image failed to load');
  };

  refs.bgImg.src = src;
  try { await __bgDone; } catch {}
}

/** Жёсткий перезапуск проигрывания */
export function restart() {
  if (!anim) return;
  try {
    anim.stop();
    anim.goToAndPlay(0, true);
  } catch (_) {}
}

/** Переключение loop "на лету" */
export function setLoop(on) {
  state.loopOn = !!on;
  if (anim) anim.loop = !!on;
}

/**
 * Загрузка Lottie из JSON (string|object)
 * — создаём инстанс
 * — задаём габариты стейджа по w/h из JSON
 */
export async function loadLottieFromData(refs, data) {
  try {
    const lotJson = typeof data === 'string' ? JSON.parse(data) : data;
    if (!lotJson || typeof lotJson !== 'object') return null;

    if (anim) {
      try { anim.destroy?.(); } catch (_) {}
      anim = null;
    }

    const w = Number(lotJson.w || 0) || 512;
    const h = Number(lotJson.h || 0) || 512;
    if (refs.lotStage) {
      refs.lotStage.style.width = `${w}px`;
      refs.lotStage.style.height = `${h}px`;
    }

    const loop = !!state.loopOn;
    
const autoplay = !!state.loopOn;


    const engine = pickEngine();
    try { document.documentElement.setAttribute('data-engine', engine); console.log('[engine]', engine); } catch {}
    if (engine === 'rlottie') {
      anim = await createTTPlayer({
        container: refs.lottieMount,
        loop,
        autoplay,
        animationData: lotJson
      });
    } else {
      anim = window.lottie.loadAnimation({
      container: refs.lottieMount,
      renderer: 'canvas',
      loop,
      autoplay,
      animationData: lotJson
    });
    }

    anim.addEventListener('DOMLoaded', () => {
      try { if (!state.loopOn && anim && anim.stop) { anim.stop(); anim.goToAndStop?.(0, true); } } catch {}
      setPlaceholderVisible(refs, false);
      if (refs.wrapper) refs.wrapper.classList.add('has-lottie');
      layoutLottie(refs);
    });
        // Click/Tap to play once when loop is off — guard against double fire (touch + click)
    try {
      const mount = refs.lottieMount || refs.preview || refs.wrapper;
      const root  = refs.preview || refs.wrapper || document.body;
      if (mount && !mount.__lp_clickBound) {
        mount.__lp_clickBound = true;
        let lastUserPlayAt = 0;
        const SUPPRESS_MS = 500;

        // capture-phase suppressor to block synthetic click after touch/pointer
        if (root && !root.__lp_clickSuppressor) {
          root.__lp_clickSuppressor = true;
          root.addEventListener('click', (ev) => {
            const now = Date.now();
            if (now - lastUserPlayAt < SUPPRESS_MS) {
              try { ev.stopImmediatePropagation(); ev.stopPropagation(); ev.preventDefault(); } catch {}
            }
          }, true);
        }

        const userPlay = (ev) => {
          const now = Date.now();
          lastUserPlayAt = now;
          try { ev.stopPropagation(); } catch {}
          try { ev.preventDefault && ev.preventDefault(); } catch {}
          if (!state.loopOn) {
            try { restart(); } catch {}
          }
        };

        if (window.PointerEvent) {
          mount.addEventListener('pointerdown', userPlay);
        } else {
          mount.addEventListener('touchstart', userPlay, { passive: false });
          mount.addEventListener('click', (ev) => {
            const now = Date.now();
            if (now - lastUserPlayAt > SUPPRESS_MS) userPlay(ev);
          });
        }
      }
    } catch {}

    anim.addEventListener('complete', () => {});

    return anim;
  } catch (e) {
    console.error('loadLottieFromData error:', e);
    return null;
  }
}

/** Экспорт текущей анимации (если нужно где-то ещё) */
export function getAnim() { return anim; }