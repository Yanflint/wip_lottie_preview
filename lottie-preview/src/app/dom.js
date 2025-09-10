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
    sizeBtn: $('sizeBtn'),
    heightBtn: $('heightBtn'),
    restartBtn: $('restartBtn'),
    loopChk: $('loopChk'),
    shareBtn: $('shareBtn'),

    // misc
    toastEl: $('toast'),
    verEl: $('ver'),
  };
}
