// src/app/state.js
export const state = {
  loopOn: false,
  lastLottieJSON: null,
  isStandalone: false,      // выставляется в main.js
};

export function setLastLottie(j) {
  state.lastLottieJSON = j;
}
