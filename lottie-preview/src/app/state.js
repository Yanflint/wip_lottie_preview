export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // смещение лотти (px) в CSS-пикселях фона
  lotOffset: { x: 0, y: 0 },

  // признак A2HS / standalone
  A2HS: false,

  // последние известные логические (CSS) размеры фоновой картинки
  lastBgSize: { w: 0, h: 0 },

  // метаданные фона (имя файла и ретина-множитель)
  lastBgMeta: { fileName: '', assetScale: 1 },

  // множитель ретины для лотти (если фон @2x/@3x)
  lotMul: 1,

  // признак, что CSS-габариты уже учитывают ретину (чтобы не домножать повторно)
  bgAccountedAssetScale: false,
};

// ── setters / getters ────────────────────────────────────────────────────────
export function setLoop(on)            { state.loopOn = !!on; }
export function setAutoplay(on)        { state.autoplayOn = !!on; }
export function setA2HS(on)            { state.A2HS = !!on; }

export function setLastBgSize(w, h)    { state.lastBgSize = { w: +w || 0, h: +h || 0 }; }
export function setLastBgMeta(meta)    { state.lastBgMeta = { fileName: String(meta?.fileName || ''), assetScale: +meta?.assetScale || 1 }; }

export function setLastLottie(obj)     { state.lastLottieJSON = obj || null; }

export function setLotOffset(x, y) {
  const nx = +x || 0, ny = +y || 0;
  state.lotOffset = { x: nx, y: ny };
  // пробрасываем в глобал (если где-то читают оттуда)
  try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {}
}
export function bumpLotOffset(dx, dy)  { setLotOffset((state.lotOffset?.x || 0) + (+dx || 0), (state.lotOffset?.y || 0) + (+dy || 0)); }
export function getLotOffset()         { return state.lotOffset || { x: 0, y: 0 }; }

export function setLotMul(m)           { state.lotMul = (+m > 0 ? +m : 1); }
export function setBgAccounted(on)     { state.bgAccountedAssetScale = !!on; }
