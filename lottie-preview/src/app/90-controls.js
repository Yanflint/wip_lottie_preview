  /* ---------------- Контролы ---------------- */
  if (sizeBtn) sizeBtn.addEventListener('click', ()=>{ wide=!wide; layout(); });
  if (heightBtn) heightBtn.addEventListener('click',()=>{ fullH=!fullH; layout(); });

  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  loopChk && loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_){ anim.loop = loopOn; }
    }
  });


