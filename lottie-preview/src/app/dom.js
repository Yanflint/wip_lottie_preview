// src/app/dom.js
export function getRefs() {
  const $ = (id) => document.getElementById(id);
  return {
    wrapper: $('wrapper'),
    preview: $('preview'),
    previewBox: $('previewBox'),
    lottieBox: $('lottieBox'),
    bgImg: $('bgImg'),
    bgFile: $('bgFile'),
    lotFile: $('lotFile'),
    shareBtn: $('shareBtn'),
    shareOut: $('shareOut'),
    toastEl: $('toast'),
    controls: $('controls'),
    loopChk: $('loopChk'),
    autoplayChk: $('autoplayChk'),
    sizeSel: $('sizeSel'),
    wideChk: $('wideChk'),
    fullHChk: $('fullHChk'),
    verEl: $('ver'),
    phEl: $('ph'),
  };
}
