// src/app/state.js
export const state = {
  VERSION: '58',
  A2HS:
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone === true),
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,
};
export const setLoop = (on) => state.loopOn = !!on;
export const setAutoplay = (on) => state.autoplayOn = !!on;
export const setLastLottie = (json) => state.lastLottieJSON = json;
