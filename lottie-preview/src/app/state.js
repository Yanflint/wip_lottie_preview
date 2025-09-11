// src/app/state.js
export const state = {
  loopOn: false,
  lastLottieJSON: null,
  isStandalone: false,
  // DPR фона (1|2|3), чтобы корректно показывать @2x/@3x без увеличения
  bgDPR: 1,
};

export function setLastLottie(j) {
  state.lastLottieJSON = j;
}

export function setBgDPR(dpr) {
  const n = Number(dpr);
  state.bgDPR = (n === 2 || n === 3) ? n : 1;
}
