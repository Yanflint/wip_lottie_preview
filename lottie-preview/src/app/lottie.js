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
    // на всякий случай fallback через <script>
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

export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  refs.bgImg.src = src;
  await new Promise((res, rej) => {
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => rej(new Error('bg load failed'));
  });
}

function applyPlaybackOptions(inst) {
  if (!inst) return;
  try { inst.loop = !!state.loopOn; } catch {}
  if (state.autoplayOn) { try { inst.play?.(); } catch {} }
  else { try { inst.stop?.(); inst.goToAndStop?.(0, true); } catch {} }
}

export async function loadLottieFromData(refs, json) {
  try { if (typeof json === 'string') json = JSON.parse(json); } catch {}
  if (!json || typeof json !== 'object') return;

  setLastLottie(json);
  const mount = refs?.lottieMount;
  if (!mount) return;

  // чистим только сам mount, НЕ трогаем фон/оверлеи
  mount.innerHTML = '';

  const L = await ensureLottie();

  try { lottieInstance?.destroy?.(); } catch {}
  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });

  try { lottieInstance.addEventListener?.('DOMLoaded', () => applyPlaybackOptions(lottieInstance)); } catch {}
  applyPlaybackOptions(lottieInstance);
}

export function restartLottie() {
  try { lottieInstance?.goToAndPlay?.(0, true); } catch {}
}
