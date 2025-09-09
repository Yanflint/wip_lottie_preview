  /* ---------------- MOBILE: tap-to-restart ---------------- */
  if (MOBILE) {
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.controls')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  } else {
    window.addEventListener('resize', ()=>{ if (fullH) layout(); });
  }

