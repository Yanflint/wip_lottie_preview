// src/app/lottie.js
import { setLastLottie, state } from './state.js';

let LOTTIE = null;
let lottieInstance = null;

async function ensureLottie() {
  if (window.lottie) return window.lottie;
  if (LOTTIE) return LOTTIE;
  try {
    const mod = await import('https://esm.sh/lottie-web@5.12.2');
    LOTTIE = mod.default || mod;
  } catch {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      s.onload = () => res();
      s.onerror = () => rej(new Error('lottie load failed'));
      document.head.appendChild(s);
    });
    LOTTIE = window.lottie;
  }
  return LOTTIE;
}

// --- СОВМЕЩЕНИЕ LOTTIE С ФОНОМ 1:1 ---
export function syncLottieToBg(refs) {
  const mount = refs?.lottieMount;
  const bg = refs?.bgImg;
  const preview = refs?.preview;
  if (!mount || !bg || !preview) return;

  const pr = preview.getBoundingClientRect();
  const br = bg.getBoundingClientRect();
  // Накладываем контейнер Lottie ровно поверх фактической области bgImg
  Object.assign(mount.style, {
    position: 'absolute',
    left: (br.left - pr.left) + 'px',
    top: (br.top - pr.top) + 'px',
    width: br.width + 'px',
    height: br.height + 'px',
    overflow: 'hidden',
  });
}

export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  await new Promise((res) => {
    // чтобы сначала подписаться на onload, а потом менять src
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => res(); // не валимся — всё равно попробуем синкнуть
    refs.bgImg.src = src;
  });
  // как только фон отрисован — подгоняем Lottie
  syncLottieToBg(refs);
}

function applyPlaybackOptions(inst) {
  if (!inst) return;
  // 1) Учитываем текущее состояние loop при ИНИЦИАЛИЗАЦИИ и при переключении
  try {
    // lottie-web поддерживает установку свойства loop на инстансе
    inst.loop = !!state.loopOn;
  } catch {}
  // 2) Автовоспроизведение
  if (state.autoplayOn) {
    try { inst.play?.(); } catch {}
  } else {
    try { inst.stop?.(); inst.goToAndStop?.(0, true); } catch {}
  }
}

export async function loadLottieFromData(refs, json) {
  try { if (typeof json === 'string') json = JSON.parse(json); } catch {}
  if (!json || typeof json !== 'object') return;

  setLastLottie(json);
  const mount = refs?.lottieMount;
  if (!mount) return;

  // Контейнер — тот же DOM-узел, НЕ трогаем фон/оверлеи
  mount.innerHTML = '';

  const L = await ensureLottie();

  try { lottieInstance?.destroy?.(); } catch {}
  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: !!state.loopOn,        // важно: петля учитывается уже на старте
    autoplay: !!state.autoplayOn,
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }, // 1:1 + центрирование
  });

  // Как только DOM Lottie построен — дожимаем настройки и подгоняем размер к фону
  try {
    lottieInstance.addEventListener?.('DOMLoaded', () => {
      applyPlaybackOptions(lottieInstance);
      syncLottieToBg(refs);
    });
  } catch {}

  // На всякий случай — и сразу применим
  applyPlaybackOptions(lottieInstance);
  syncLottieToBg(refs);
}

export function restartLottie() {
  try { lottieInstance?.goToAndPlay?.(0, true); } catch {}
}

export function updatePlaybackFromState(refs) {
  // дергаем при переключении loop/автовоспроизведения
  applyPlaybackOptions(lottieInstance);
  // и подстраховываемся на ресайзах/поворотах
  syncLottieToBg(refs);
}
