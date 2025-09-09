/* ---------------- Load from link ---------------- */
(async function(){
  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  if (id) {
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.lot) {
          if (data.opts) { loopOn = !!data.opts.loop; }
          if (data.bg)   { await setBackgroundFromSrc(data.bg); }
          lastLottieJSON = data.lot;
          loadLottieFromData(data.lot);
        }
      }
    } catch(e){
      console.error('Ошибка загрузки снапшота', e);
    }
  }

  // A2HS fallback: если запущены standalone и URL без id — восстановим последний снапшот
  try {
    const hasId = url.searchParams.has('id');
    const pathId = (url.pathname.startsWith('/s/') ? url.pathname.split('/').pop() : null);
    let effId = hasId ? url.searchParams.get('id') : pathId;

    if (!effId && typeof A2HS !== 'undefined' && A2HS) {
      const lastId = localStorage.getItem('lastShareId');
      if (lastId) effId = lastId;
    }

    if (effId && !hasId) {
      try { history.replaceState(null, '', '/?id=' + encodeURIComponent(effId)); } catch(_){}
    }

    if (effId && !id) {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(effId));
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.lot) {
          if (data.opts) { loopOn = !!data.opts.loop; }
          if (data.bg)   { await setBackgroundFromSrc(data.bg); }
          lastLottieJSON = data.lot;
          loadLottieFromData(data.lot);
        }
      }
    }
  } catch(e){
    console.error(e);
  }
})  // ← ВАЖНО: только закрывающая скобка функции, БЕЗ '();'
