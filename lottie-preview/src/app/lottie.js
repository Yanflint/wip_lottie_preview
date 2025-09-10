// src/app/lottie.js
import { setLastLottie, state } from './state.js';

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
  try { LOTTIE = await importViaESM(); }
  catch (e) { console.warn('[lottie] ESM import failed, fallback to script tag', e); LOTTIE = await importViaScriptTag(); }
  return LOTTIE;
}

export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  refs.bgImg.src = src;
  await new Promise((res, rej) => {
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => rej(new Error('background load failed'));
  });
}

let lottieInstance = null;

function applyPlaybackOptions(inst) {
  if (!inst) return;
  try { inst.loop = !!state.loopOn; } catch(_) {}
  if (state.autoplayOn) { try { inst.play?.(); } catch(_) {} }
  else { try { inst.stop?.(); inst.goToAndStop?.(0, true); } catch(_) {} }
}

export async function loadLottieFromData(refs, json) {
  setLastLottie(json);
  const lottieBox = refs?.lottieBox;
  if (!lottieBox) return;
  lottieBox.innerHTML = '';

  const L = await ensureLottie();

  const mount = document.createElement('div');
  mount.style.width = '100%';
  mount.style.height = '100%';
  lottieBox.appendChild(mount);

  try { lottieInstance?.destroy?.(); } catch(_) {}

  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });

  try { lottieInstance.addEventListener?.('DOMLoaded', () => applyPlaybackOptions(lottieInstance)); } catch(_) {}
  applyPlaybackOptions(lottieInstance);
}

export function updatePlaybackFromState() {
  applyPlaybackOptions(lottieInstance);
}
