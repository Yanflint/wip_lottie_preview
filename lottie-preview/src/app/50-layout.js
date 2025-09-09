  /* ---------------- LAYOUT CORE ---------------- */

  // Масштабирует сцену Lottie (lotStage) по ВЫСОТЕ превью
  function resizeLottieStage(){
    if (!lotNomW || !lotNomH) return; // нет анимации
    const ph = preview.clientHeight;  // высота "коробочки" превью (логическая)
    const scale = ph / lotNomH;

    lotStage.style.width  = lotNomW + 'px';
    lotStage.style.height = lotNomH + 'px';
    lotStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  // Десктоп: применяем размеры wrapper/preview и обновляем подписи
  function applyDesktopScale(){
    if (MOBILE) return;
    const baseW = basePreviewWidth();
    const baseH = basePreviewHeight();

    const SAFE = 8, GAP = 8;
    const winH = window.innerHeight || baseH;

    let targetH, targetW;
    if (fullH){
      const hCtrls  = controlsH();
      const hChrome = appChromeH();
      targetH = Math.max(80, winH - (SAFE*2 + hCtrls + hChrome + GAP));
      targetW = Math.round(baseW * (targetH / baseH));
    } else {
      targetW = baseW;
      targetH = baseH;
    }

    wrapper.style.width  = `${targetW}px`;
    wrapper.style.height = `${targetH}px`;

    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + targetH + 'px';

    resizeLottieStage();
  }

  // Мобилка: коробочка 360×(высота фона). Масштаб по ширине экрана
  function applyMobileScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / 360;
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;

    resizeLottieStage();
  }


  // Единая точка: пересчитать размеры и сцену Lottie
  function layout(){
    if (MOBILE) applyMobileScale(); else applyDesktopScale();
  }

