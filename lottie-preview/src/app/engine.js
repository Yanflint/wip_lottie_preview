// src/app/engine.js
export function wantRlottie() {
  try {
    const sp = new URLSearchParams(location.search);
    if (sp.get('engine') === 'rlottie') return true;
  } catch {}
  try {
    const v = localStorage.getItem('lp_engine');
    if (v === 'rlottie') return true;
  } catch {}
  return false;
}
export function hasRlottieRuntime() {
  // Heuristics: some builds expose RLottie / RLottiePlayer / createRlottieModule
  return !!(window.RLottiePlayer || window.RLottie || window.createRlottieModule);
}
export function pickEngine() {
  return wantRlottie() && hasRlottieRuntime() ? 'rlottie' : 'lottie-web';
}
