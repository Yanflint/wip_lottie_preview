// Глобальное, но модульное состояние и конфиг
export const state = {
  VERSION: '57',
  A2HS:
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone === true),

  loopOn: false,
  autoplayOn: false,
  lastLottieJSON: null,
};

export function setLoop(on) { state.loopOn = !!on; }
export function setAutoplay(on) { state.autoplayOn = !!on; }
export function setLastLottie(json) { state.lastLottieJSON = json; }
