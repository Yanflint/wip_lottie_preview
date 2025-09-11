// src/app/lottie.js
import { state, setLastBgSize } from './state.js';
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

/**
 * Установка фоновой картинки из data:/blob:/http(s)
 * — считываем naturalWidth/naturalHeight
 * — прокидываем в .wrapper CSS-переменные:
 *     --preview-ar : w / h
 *     --preview-h  : hpx
 */
export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;

  refs.bgImg.onload = () => {
    const iw = Number(refs.bgImg.naturalWidth || 0) || 1;
    const ih = Number(refs.bgImg.naturalHeight || 0) || 1;

    // Сохраняем для других частей (если пригодится)
    setLastBgSize(iw, ih);

    // Проставляем переменные на .wrapper — он задаёт габариты превью
    const wrap = refs.wrapper;
    if (wrap) {
      // Соотношение сторон контейнера теперь = картинке
      wrap.style.setProperty('--preview-ar', `${iw} / ${ih}`);
      // Базовая «естественная» высота (дальше её ограничивают max-* в CSS)
      wrap.style.setProperty('--preview-h', `${ih}px`);
      wrap.classList.add('has-bg');
    }

    setPlaceholderVisible(refs, false);
  };

  refs.bgImg.onerror = () => {
    // Если фон не загрузился — оставляем плейсхолдер и дефолтные размеры
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

    // Габариты по данным JSON (пиксель-в-пиксель)
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

    // При завершении без loop ничего не делаем — restart() доступен всегда
    anim.addEventListener('complete', () => {});

    return anim;
  } catch (e) {
    console.error('loadLottieFromData error:', e);
    return null;
  }
}

/** Экспорт текущей анимации (если нужно где-то ещё) */
export function getAnim() { return anim; }
