// src/app/lottie.js
import { state, setLastBgSize, setLastBgMeta } from './state.js';
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

  refs.bgImg.onload = () => {
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
  };

  refs.bgImg.onerror = () => {
    console.warn('Background image failed to load');
  };

  refs.bgImg.src = src;
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
    
// Autoplay: off in web viewer mode (path /s/*), on elsewhere (incl. PWA standalone)
const isStandalone = !!(window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches)) || (navigator.standalone === true);
const isViewer = document.documentElement.classList.contains('viewer');
const autoplay = isViewer && !isStandalone ? false : true;


    anim = window.lottie.loadAnimation({
      container: refs.lottieMount,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: lotJson
    });

    
anim.addEventListener('DOMLoaded', () => {
  try {
    if (typeof autoplay !== 'undefined' && autoplay === false && typeof anim.goToAndStop === 'function') {
      anim.goToAndStop(0, true);
    }
  } catch {}

      setPlaceholderVisible(refs, false);
      if (refs.wrapper) refs.wrapper.classList.add('has-lottie');
      layoutLottie(refs);
    });

    anim.addEventListener('complete', () => {});

    return anim;
  } catch (e) {
    console.error('loadLottieFromData error:', e);
    return null;
  }
}

/** Экспорт текущей анимации (если нужно где-то ещё) */
export function getAnim() { return anim; }
