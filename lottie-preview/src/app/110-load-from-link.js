  /* ---------------- Load from link ---------------- */
  (async function loadIfLinked(){
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { layout(); return; }
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.opts && typeof snap.opts.loop === 'boolean') {
        loopOn = !!snap.opts.loop;
        if (loopChk) loopChk.checked = loopOn;
      }

      if (snap.bg) { await setBackgroundFromSrc(snap.bg); }
      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      else { layout(); }
    } catch(e){
      console.error(e);
      layout();
    }
  })();
