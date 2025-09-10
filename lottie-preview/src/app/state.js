// Глобальное, но модульное состояние и конфиг
export const state = {
  VERSION: '58',
  A2HS:
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone === true),

  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,
  lastBgSize: { w: 0, h: 0 },
};

export function setLoop(on) { state.loopOn = !!on; }
export function setAutoplay(on) { state.autoplayOn = !!on; }
export function setLastLottie(json) { state.lastLottieJSON = json; }
export function setLastBgSize(w, h) { state.lastBgSize = { w, h }; }
