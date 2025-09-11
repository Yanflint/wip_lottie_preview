// src/app/state.js
export const state = {
  loopOn: false,
  lastLottieJSON: null,
  isStandalone: false, // заполняется в main.js, как и раньше
  bgDPR: 1,            // 1 | 2 | 3 — ретина-фактор фона
};

export function setLastLottie(j) {
  state.lastLottieJSON = j;
}

export function setBgDPR(dpr) {
  const n = Number(dpr);
  state.bgDPR = (n === 2 || n === 3) ? n : 1;
}
