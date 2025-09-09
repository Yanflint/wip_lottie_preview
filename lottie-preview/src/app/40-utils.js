  /* ---------------- UTILS ---------------- */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }
  function isMobile(){
    const ua = navigator.userAgent || '';
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    const uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }
  function matchMediaSafe(q){
    try { return window.matchMedia && window.matchMedia(q).matches; } catch(_){ return false; }
  }

  function basePreviewHeight(){ return Math.max(1, bgNatH || 800); }
  function basePreviewWidth(){ return wide ? 1000 : 360; }

  function appChromeH(){
    const app = document.querySelector('.app'); if (!app) return 0;
    const cs = getComputedStyle(app);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBot = parseFloat(cs.paddingBottom) || 0;
    const gap    = parseFloat(cs.rowGap || cs.gap) || 0;
    return Math.ceil(padTop + padBot + gap);
  }
  function controlsH(){
    if (!modeEl) return 0;
    const r = modeEl.getBoundingClientRect();
    return Math.ceil(r.height);
  }


