  /* ---------------- STATE ---------------- */
  let anim = null, animName = null;
  let wide = false;         // 360 / 1000 (десктоп)
  let fullH = false;        // высота = экран (десктоп)
  let lastLottieJSON = null;
  const MOBILE = isMobile();
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800; // до загрузки — 800 (для плейсхолдера)

  // номинал композиции Lottie
  let lotNomW = 0, lotNomH = 0;

