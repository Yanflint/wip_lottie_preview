'use strict';
const VERSION = '56';

document.addEventListener('DOMContentLoaded', function () {
  // Detect standalone (Add to Home Screen)
  const A2HS =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator && window.navigator.standalone === true);

  const wrapper    = document.getElementById('wrapper');
  const preview    = document.getElementById('preview');
  const previewBox = document.getElementById('previewBox');
  const lottieBox  = document.getElementById('lottieBox');
  const bgImg      = document.getElementById('bgImg');
  const bgFile     = document.getElementById('bgFile');
  const lotFile    = document.getElementById('lotFile');
  const shareBtn   = document.getElementById('shareBtn');
  const shareOut   = document.getElementById('shareOut');
  const toastEl    = document.getElementById('toast');
  const controls   = document.getElementById('controls');
  const loopChk    = document.getElementById('loopChk');
  const autoplayChk= document.getElementById('autoplayChk');
  const sizeSel    = document.getElementById('sizeSel');
  const wideChk    = document.getElementById('wideChk');
  const fullHChk   = document.getElementById('fullHChk');
});
