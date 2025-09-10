export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,
};

export function setLoop(on) { state.loopOn = !!on; }
export function setAutoplay(on) { state.autoplayOn = !!on; }
export function setLastLottie(json) { state.lastLottieJSON = json; }
