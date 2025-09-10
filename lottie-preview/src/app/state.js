export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // для layout.js
  A2HS: false,                 // режим «на рабочем столе» (PWA / standalone)
  lastBgSize: { w: 0, h: 0 },  // последние известные размеры фонового изображения
};

export function setLoop(on)       { state.loopOn = !!on; }
export function setAutoplay(on)   { state.autoplayOn = !!on; }
export function setLastLottie(j)  { state.lastLottieJSON = j || null; }
export function setA2HS(on)       { state.A2HS = !!on; }
export function setLastBgSize(w,h){ state.lastBgSize = { w: +w||0, h: +h||0 }; }
