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
  return !!(window.RLottiePlayer || window.RLottie || window.createRlottieModule);
}
export function pickEngine() {
  try {
    const sp = new URLSearchParams(location.search);
    const v = (sp.get('engine') || '').toLowerCase();
    if (v === 'lw' || v === 'lottie-web') return 'lottie-web';
    if (v === 'rlottie') return 'rlottie';
  } catch {}
  try {
    const v = (localStorage.getItem('lp_engine') || '').toLowerCase();
    if (v === 'lw' || v === 'lottie-web') return 'lottie-web';
    if (v === 'rlottie') return 'rlottie';
  } catch {}
  // Default is rlottie
  return 'rlottie';
}
