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

// ===== Размер и центрирование =====
function getAnimSize() {
  const j = state.lastLottieJSON;
  let w = 512, h = 512; // дефолт на всякий
  if (j && typeof j === 'object') {
    if (Number.isFinite(j.w)) w = j.w;
    if (Number.isFinite(j.h)) h = j.h;
  }
  return { w, h };
}

export function layoutLottie(refs) {
  const mount = refs?.lottieMount;
  const preview = refs?.preview;
  if (!mount || !preview) return;

  const { w, h } = getAnimSize();

  // Центрируем контейнер «как есть» (1:1), без масштабирования,
  // по центру превью: left/top 50% + translate(-50%, -50%)
  mount.style.position = 'absolute';
  mount.style.width = w + 'px';
  mount.style.height = h + 'px';
  mount.style.left = '50%';
  mount.style.top = '50%';
  mount.style.transform = 'translate(-50%, -50%)';
  mount.style.pointerEvents = 'none'; // чтобы не мешать dnd/кликам
  // не трогаем z-index — у тебя свой порядок слоёв
}

// ===== Фон (без влияния на лотти) =====
export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  await new Promise((res) => {
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => res();
    refs.bgImg.src = src;
  });
  // фон загрузился — просто перелэйаутим лотти на всякий
  layoutLottie(refs);
}

function applyPlaybackOptions(inst) {
  if (!inst) return;
  try { inst.loop = !!state.loopOn; } catch {}
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

  mount.innerHTML = ''; // чистим только сам mount

  const L = await ensureLottie();

  try { lottieInstance?.destroy?.(); } catch {}
  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: !!state.loopOn,
    autoplay: !!state.autoplayOn,
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });

  // как только собрался DOM — применим опции и разложим по центру 1:1
  try {
    lottieInstance.addEventListener?.('DOMLoaded', () => {
      applyPlaybackOptions(lottieInstance);
      layoutLottie(refs);
    });
  } catch {}

  applyPlaybackOptions(lottieInstance);
  layoutLottie(refs);
}

export function restartLottie() {
  try { lottieInstance?.goToAndPlay?.(0, true); } catch {}
}

export function updatePlaybackFromState(refs) {
  applyPlaybackOptions(lottieInstance);
  layoutLottie(refs); // на всякий при переключении loop
}
