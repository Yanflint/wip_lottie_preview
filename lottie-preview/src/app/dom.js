// Без sizeBtn/heightBtn — оставляем только то, что реально используем
export function getRefs() {
  const $ = (id) => document.getElementById(id);
  return {
    // layout
    wrapper: $('wrapper'),
    preview: $('preview'),

    // layers
    phEl: $('ph'),
    bgImg: $('bgImg'),
    lottieMount: $('lottie'),

    // dnd overlay
    dropOverlay: $('dropOverlay'),

    // controls
    restartBtn: $('restartBtn'),
    loopChk: $('loopChk'),
    shareBtn: $('shareBtn'),

    // misc
    toastEl: $('toast'),
    verEl: $('ver'),
  };
}
