  /* ---------------- Lottie + фон ---------------- */
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
  }

  async function setBackgroundFromSrc(src){
    await new Promise(res=>{
      const meta = new Image();
      meta.onload = function(){
        bgNatW = meta.naturalWidth  || meta.width  || 0;
        bgNatH = meta.naturalHeight || meta.height || 0;
        bgImg.src = src;
        phEl && phEl.classList.add('hidden');
        res();
      };
      meta.src = src;
    });
    layout();
  }

  function loadLottieFromData(animationData){
    renewLottieRoot();

    lotNomW = Number(animationData.w) || 0;
    lotNomH = Number(animationData.h) || 0;

    animName = uid('anim_');
    lastLottieJSON = animationData;

    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieMount,
        renderer: 'svg',
        loop: loopOn,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData))
      });
      anim.addEventListener('DOMLoaded', layout);
    });
  }

