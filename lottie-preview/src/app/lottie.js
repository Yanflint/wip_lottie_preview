import { setLastLottie } from './state.js';

export async function setBackgroundFromSrc(refs, src) {
  if (!refs?.bgImg) return;
  refs.bgImg.src = src;
  await new Promise((res, rej) => {
    refs.bgImg.onload = () => res();
    refs.bgImg.onerror = () => rej();
  });
}

export function loadLottieFromData(refs, json) {
  setLastLottie(json);
  // Здесь должен быть вызов твоей инициализации Lottie
}
