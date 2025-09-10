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

/** Установка фона из data: / blob: / http(s) */
export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  refs.bgImg.onload = () => {
    setPlaceholderVisible(refs, false);
    if (refs.wrapper) refs.wrapper.classList.add('has-bg');
  };
  refs.bgImg.onerror = () => {};
  refs.bgImg.src = src;
}

/** Жёсткий перезапуск проигрывания */
export function restart() {
  if (!anim) return;
  try {
    anim.stop();
    anim.goToAndStop(0, true);
    anim.play();
  } catch {}
}

/** Включить/выключить цикл прямо во время проигрывания */
export function setLoop(on) {
  if (anim) anim.loop = !!on;
}

/** Подгрузка лотти из JSON-объекта */
export async function loadLottieFromData(refs, lotJson) {
  if (!refs?.lottieMount || !lotJson) return;

  // Сносим прежнюю
  if (anim) {
    try { anim.destroy(); } catch {}
    anim = null;
  }

  const loop = !!state.loopOn;        // берём текущее состояние чекбокса
  const autoplay = true;

  anim = window.lottie.loadAnimation({
    container: refs.lottieMount,
    renderer: 'svg',
    loop,
    autoplay,
    animationData: lotJson
  });

  // Когда DOM лотти готов — ставим габариты и показываем контент
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

  // На всякий случай: при завершении без loop – остаёмся на конце, кнопка/тап перезапустят
  anim.addEventListener('complete', () => {
    // ничего не делаем; restart() всегда доступен
  });

  return anim;
}

/** На всякий экспортим текущее окно анимации (если понадобится где-то ещё) */
export function getAnim() { return anim; }
