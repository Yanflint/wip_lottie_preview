// src/app/lottie.js
import { setLastLottie } from './state.js';

// Ленивая загрузка lottie-web через ESM CDN
let LOTTIE = null;
async function ensureLottie() {
  if (LOTTIE) return LOTTIE;
  const mod = await import('https://esm.sh/lottie-web@5.12.2');
  LOTTIE = mod.default || mod; // иногда библиотека завёрнута в default
  return LOTTIE;
}

// Установка фонового изображения
export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  refs.bgImg.src = src;
  await new Promise((res, rej) => {
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => rej(new Error('background load failed'));
  });
}

// Глобальная ссылка на текущий плеер
let lottieInstance = null;

// Загрузка и проигрывание Lottie-анимации
export async function loadLottieFromData(refs, json) {
  setLastLottie(json);

  const lottieBox = refs?.lottieBox;
  if (!lottieBox) return;

  // очистить контейнер
  lottieBox.innerHTML = '';

  // грузим движок
  const L = await ensureLottie();

  // контейнер для анимации
  const mount = document.createElement('div');
  mount.style.width = '100%';
  mount.style.height = '100%';
  lottieBox.appendChild(mount);

  // убиваем старый инстанс, если был
  try { lottieInstance?.destroy?.(); } catch(_) {}

  // создаём новый
  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,       // можно потом переключить из state.loopOn
    autoplay: true,   // idem для state.autoplayOn
    animationData: json,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet'
    }
  });
}
