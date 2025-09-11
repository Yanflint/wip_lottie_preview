// src/app/lottie.js
import { state } from './state.js';
import { setPlaceholderVisible } from './utils.js';

let anim = null;

/** Центрируем и РАСТЯГИВАЕМ лотти-стейдж на всю область */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  if (!stage) return;

  // Размер контейнера: во всю «раму» превью
  stage.style.position = 'absolute';
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.width = '100%';
  stage.style.height = '100%';
  stage.style.transform = 'translate(-50%, -50%)';
  stage.style.transformOrigin = '50% 50%';
}

/**
 * Установка фоновой картинки (оставлено как было — без изменений логики лотти)
 * Функция может быть в другом файле у тебя — оставь свою; важно лишь layoutLottie выше.
 */
export function setBackgroundFromSrc(refs, src, opts = {}) {
  const img = refs?.bgImg;
  if (!img || !src) return Promise.resolve();

  // если передаёшь density через opts — ок; иначе просто грузим
  if (opts?.density) img.dataset.density = String(opts.density);

  return new Promise((resolve, reject) => {
    const onLoad = () => { img.removeEventListener('error', onError); resolve(); };
    const onError = (e) => { img.removeEventListener('load', onLoad); reject(e); };
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    img.src = src;
  }).then(() => setPlaceholderVisible(refs, false));
}

/** Загрузка Lottie JSON из объекта. */
export function loadLottieFromData(refs, json) {
  const mount = refs?.lottie;
  if (!mount || !json) return null;

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
    // как только DOM анимации готов — растягиваем стейдж
    layoutLottie(refs);
    // и на всякий прячем плейсхолдер
    setPlaceholderVisible(refs, false);
    // помечаем, что лотти есть (если где-то используется)
    refs.wrapper?.classList.add('has-lottie');
  });

  return anim;
}

export function restart() {
  if (!anim) return;
  try { anim.goToAndStop?.(0, true); anim.play?.(); } catch {}
}

export function setLoop(on) {
  try { if (anim) anim.loop = !!on; } catch {}
}

export function getAnim() { return anim; }
