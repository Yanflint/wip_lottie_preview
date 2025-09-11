// src/app/lottie.js
import { state, setLastBgSize } from './state.js';
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
  try {
    if (!nameOrUrl) return 1;
    // Strip query/hash
    const s = String(nameOrUrl).replace(/[?#].*$/, '');
    // Extract the last path component
    const base = s.split('/').pop() || s;
    // Look for @<number>x just before extension or end
    const m = base.match(/@([0-9]+(?:\.[0-9]+)?)x(?=\.[a-z0-9]+$|$)/i);
    const val = m ? Number(m[1]) : NaN;
    return (val && isFinite(val) && val > 0) ? val : 1;
  } catch (_) {
    return 1;
  }
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

    // Сохраняем фактический размер пикселей
    // Парсим коэффициент ретины из имени (mob@2x.png -> 2)
    const assetScale = parseAssetScale(guessName);

    // Приводим к «CSS-размеру», как это было бы на сайте
    const cssW = iw / assetScale;
    const cssH = ih / assetScale;
    // Сохраняем CSS-размер для layout (учитывая ретину)
    setLastBgSize(cssW, cssH);

    const wrap = refs.wrapper;
    if (wrap) {
      wrap.style.setProperty('--preview-ar', `${cssW} / ${cssH}`);
      wrap.style.setProperty('--preview-h', `${cssH}px`);
      wrap.style.setProperty('--asset-scale', String(assetScale));
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
    const autoplay = true;

    anim = window.lottie.loadAnimation({
      container: refs.lottieMount,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: lotJson
    });

    anim.addEventListener('DOMLoaded', () => {
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
