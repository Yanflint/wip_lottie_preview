export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // для layout.js
  A2HS: false,                 // режим «на рабочем столе» (PWA / standalone)
  lastBgSize: { w: 0, h: 0 },
  lastBgMeta: { fileName: '', assetScale: 1 },  // последние известные размеры фонового изображения
};

export function setLoop(on)       { state.loopOn = !!on; }
export function setAutoplay(on)   { state.autoplayOn = !!on; }
export function setLastLottie(j)  { state.lastLottieJSON = j || null; }
export function setA2HS(on)       { state.A2HS = !!on; }
export function setLastBgSize(w,h){ state.lastBgSize = { w: +w||0, h: +h||0 }; }


export function setLastBgMeta(meta){
  try {
    const fn = meta && meta.fileName ? String(meta.fileName) : '';
    const sc = meta && +meta.assetScale > 0 ? +meta.assetScale : 1;
    state.lastBgMeta = { fileName: fn, assetScale: sc };
  } catch { state.lastBgMeta = { fileName: '', assetScale: 1 }; }
}
