  /* ---------------- LISTENERS: DnD ---------------- */
  let dragDepth = 0;
  const isImageFile = (f) => f && (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name));
  const isJsonFile  = (f) => f && (f.type === 'application/json' || /\.json$/i.test(f.name));

  document.addEventListener('dragenter',(e)=>{ e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
  document.addEventListener('dragover', (e)=>{ e.preventDefault(); });
  document.addEventListener('dragleave',(e)=>{ e.preventDefault(); dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) document.body.classList.remove('dragging'); });
  document.addEventListener('drop',     async (e)=>{
    e.preventDefault(); dragDepth=0; document.body.classList.remove('dragging');

    const files = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
    if (!files.length) return;

    let imgFile  = files.find(isImageFile);
    let jsonFile = files.find(isJsonFile);
    if (files.length === 1) {
      const f = files[0]; imgFile = isImageFile(f) ? f : null; jsonFile = isJsonFile(f) ? f : jsonFile;
    }

    try {
      if (imgFile) {
        const src = await readAsDataURL(imgFile);
        await setBackgroundFromSrc(src);
      }
      if (jsonFile) {
        const data = await readAsText(jsonFile);
        try { loadLottieFromData(JSON.parse(String(data))); }
        catch(_){ alert('Некорректный JSON Lottie.'); }
      }
    } catch(err){ console.error(err); }
  });

  function readAsDataURL(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload = ()=> res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function readAsText(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload = ()=> res(String(r.result));
      r.onerror = rej;
      r.readAsText(file, 'utf-8');
    });
  }


