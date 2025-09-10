// Собираем ссылки на DOM с безопасными «опциональными» полями
export function getRefs() {
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelector(sel);

  const wrapper = $('wrapper');
  const preview = $('preview');
  // previewBox не обязателен — если его нет, используем wrapper
  const previewBox = $('previewBox') || wrapper;

  return {
    // layout
    wrapper,
    preview,
    previewBox,

    // layers
    phEl: $('ph'),
    bgImg: $('bgImg'),
    lottieMount: $('lottie'),

    // dnd overlay
    dropOverlay: $('dropOverlay'),

    // controls (часть может отсутствовать в HTML — это ок)
    restartBtn: $('restartBtn'),
    loopChk: $('loopChk'),
    autoplayChk: $('autoplayChk'),
    sizeSel: $('sizeSel'),
    wideChk: $('wideChk'),
    fullHChk: $('fullHChk'),
    bgPickBtn: $('bgPickBtn'),
    lotPickBtn: $('lotPickBtn'),
    bgFile: $('bgFile'),
    lotFile: $('lotFile'),
    shareBtn: $('shareBtn'),

    // misc
    toastEl: $('toast'),
    verEl: $('ver'),
  };
}
