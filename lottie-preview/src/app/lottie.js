// src/app/lottie.js
import { setLastLottie, state } from './state.js';

// Ленивая загрузка lottie-web: сначала пробуем ESM, если не вышло — через <script> (глобал window.lottie)
let LOTTIE = null;

async function importViaESM() {
  const mod = await import('https://esm.sh/lottie-web@5.12.2');
  return mod.default || mod;
}
function importViaScriptTag() {
  return new Promise((resolve, reject) => {
    if (window.lottie) return resolve(window.lottie);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js';
    s.async = true;
    s.onload = () => resolve(window.lottie);
    s.onerror = () => reject(new Error('lottie script load failed'));
    document.head.appendChild(s);
  });
}

async function ensureLottie() {
  if (LOTTIE) return LOTTIE;
  try {
    LOTTIE = await importViaESM();
  } catch (e) {
    console.warn('[lottie] ESM import failed, fallback to script tag', e);
    LOTTIE = await importViaScriptTag();
  }
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

// Глобальная ссылка на текущий плеер (для обновления настроек)
let lottieInstance = null;

function applyPlaybackOptions(inst) {
  if (!inst) return;
  // loop
  try { inst.loop = !!state.loopOn; } catch(_) {}
  // autoplay: если выключаем — поставим на кадр 0
  if (state.autoplayOn) {
    try { inst.play?.(); } catch(_) {}
  } else {
    try { inst.stop?.(); inst.goToAndStop?.(0, true); } catch(_) {}
  }
}

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
    loop: true,       // базово true, но сейчас ниже синхронизируем со state
    autoplay: true,   // базово true, ниже синхронизируем со state
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });

  // как только анимация готова — применить опции
  try {
    lottieInstance.addEventListener?.('DOMLoaded', () => applyPlaybackOptions(lottieInstance));
  } catch(_) {}
  // и на всякий случай сразу
  applyPlaybackOptions(lottieInstance);
}

// экспортируем helper чтобы можно было обновить loop/autoplay из контролов
export function updatePlaybackFromState() {
  applyPlaybackOptions(lottieInstance);
}
