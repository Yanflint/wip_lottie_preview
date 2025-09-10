// src/app/lottie.js
import { setLastLottie, state } from './state.js';

let LOTTIE = null;
async function ensureLottie() {
  if (LOTTIE) return LOTTIE;
  const mod = await import('https://esm.sh/lottie-web@5.12.2');
  LOTTIE = mod.default || mod;
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
export async function loadLottieFromData(refs, json) {
  setLastLottie(json);
  const lottieBox = refs?.lottieBox;
  if (!lottieBox) return;
  lottieBox.innerHTML = '';
  const L = await ensureLottie();
  const mount = document.createElement('div');
  mount.style.width = '100%'; mount.style.height = '100%';
  lottieBox.appendChild(mount);
  try { lottieInstance?.destroy?.(); } catch(_){}
  lottieInstance = L.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: !!state.loopOn,
    autoplay: !!state.autoplayOn,
    animationData: json,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });
}

export function setLoopRuntime(on) {
  try { lottieInstance?.setLooping?.(!!on); } catch(_){}
}
export function play(){ try { lottieInstance?.play?.(); } catch(_){ } }
export function pause(){ try { lottieInstance?.pause?.(); } catch(_){ } }
