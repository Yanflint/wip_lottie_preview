export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // смещение лотти (px)
  lotOffset: { x: 0, y: 0 },

  // для layout.js
  A2HS: false,                 // режим «на рабочем столе» (PWA / standalone)
  lastBgSize: { w: 0, h: 0 },  // последние известные размеры фонового изображения
  lastBgMeta: { fileName: '', assetScale: 1 }, // метаданные фона
  lotMul: 1,                 // множитель ретины для лотти (из @2x/@3x)
  bgAccountedAssetScale: false, // CSS-размеры уже учитывают assetScale

};

export function setLoop(on)       { state.loopOn = !!on; }
export function setAutoplay(on)   { state.autoplayOn = !!on; }
export function setLastLottie(j)  { state.lastLottieJSON = j || null; }
export function setA2HS(on)       { state.A2HS = !!on; }
export function setLastBgSize(w,h){ state.lastBgSize = { w: +w||0, h: +h||0 }; }


export function setLastBgMeta(meta){
  try {
    const fn = (meta && meta.fileName) ? String(meta.fileName) : '';
    const sc = (meta && +meta.assetScale > 0) ? +meta.assetScale : 1;
    state.lastBgMeta = { fileName: fn, assetScale: sc };
  } catch { state.lastBgMeta = { fileName: '', assetScale: 1 }; }
}


// === позиционирование лотти ===
export function setLotOffset(x, y) {
  try {
    const nx = +x || 0, ny = +y || 0;
    state.lotOffset = { x: nx, y: ny };
    // пробрасываем в глобал, если layout читает оттуда
    try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {}
  } catch {}
}
export function bumpLotOffset(dx, dy) {
  const cx = (state.lotOffset?.x || 0), cy = (state.lotOffset?.y || 0);
  setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
}
export function getLotOffset() {
  return state.lotOffset || { x: 0, y: 0 };
}
