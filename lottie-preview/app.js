'use strict';

/* [ANCHOR:CODE_VERSION] */
const CODE_VERSION = 'v57-editor-blank-standalone-persist';

document.addEventListener('DOMContentLoaded', function () {
  /* ---------------- DOM ---------------- */
  const wrapper     = document.getElementById('wrapper');
  const preview     = document.getElementById('preview');
  const bgImg       = document.getElementById('bgImg');
  const phEl        = document.getElementById('ph');
  const toastEl     = document.getElementById('toast');
  const verEl       = document.getElementById('ver');

  const restartBtn  = document.getElementById('restartBtn');
  const loopChk     = document.getElementById('loopChk');
  const shareBtn    = document.getElementById('shareBtn');
  const modeEl      = document.getElementById('mode');

  const lotStage    = document.getElementById('lotStage');
  const lottieMount = document.getElementById('lottie');

  /* ---------------- STATE ---------------- */
  let anim = null, animName = null;
  let wide = false;
  let fullH = false;
  let lastLottieJSON = null;
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800;
  let bgDpr  = 1; // DPR из имени файла @2x/@3x/@4x

  // номинал композиции Lottie
  let lotNomW = 0, lotNomH = 0;

  /* ---------------- INIT ---------------- */
  if (verEl) verEl.textContent = CODE_VERSION;

  function matchMediaSafe(q){ try{ return window.matchMedia(q).matches; } catch(_ ){ return false; } }
  function isStandalone(){ return matchMediaSafe('(display-mode: standalone)') || window.navigator.standalone === true; }
  const MOBILE = (function(){
    const ua = navigator.userAgent || '';
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    const uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  })();
  if (MOBILE) document.body.classList.add('is-mobile');

  try { if (typeof lottie !== 'undefined' && typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_ ){}

  /* ---------------- UTILS ---------------- */
  async function ensureLottieScript(){
    if (typeof window.lottie !== 'undefined') return;
    await new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      s.onload = ()=>res(); s.onerror = rej; document.head.appendChild(s);
    });
  }

  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }

  function basePreviewWidth(){ return 360; }
  function basePreviewHeight(){ return Math.max(1, Math.round((bgNatH || 800) / (bgDpr || 1))); }

  function controlsH(){ if (!modeEl) return 0; const r = modeEl.getBoundingClientRect(); return Math.ceil(r.height); }

  /* ---------------- LAYOUT ---------------- */
  function resizeLottieStage(){
    if (!lotNomW || !lotNomH) return;
    const ph = preview.clientHeight || basePreviewHeight();
    const scale = ph / lotNomH;
    lotStage.style.width  = lotNomW + 'px';
    lotStage.style.height = lotNomH + 'px';
    lotStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function applyDesktopScale(){
    const baseW = basePreviewWidth();
    const baseH = basePreviewHeight();
    wrapper.style.width  = baseW + 'px';
    wrapper.style.height = baseH + 'px';
    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';
    resizeLottieStage();
  }

  function applyMobileScale(){
    const vw = (window.visualViewport && window.visualViewport.width) ? window.visualViewport.width : window.innerWidth;
    const s  = vw / 360;
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.left = '50%'; preview.style.top = '50%';
    preview.style.transformOrigin = '50% 50%';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;
    resizeLottieStage();
  }

  function layout(){ (MOBILE ? applyMobileScale : applyDesktopScale)(); }
  window.addEventListener('resize', layout);

  /* ---------------- ФОН ---------------- */
  async function setBackgroundFromSrc(src, dpr = 1){
    await new Promise(res=>{
      const im = new Image();
      im.onload = function(){
        bgNatW = im.naturalWidth  || im.width  || 0;
        bgNatH = im.naturalHeight || im.height || 0;
        bgImg.src = src;
        bgDpr = dpr || 1;
        if (phEl) phEl.classList.add('hidden');
        res();
      };
      im.src = src;
    });
    layout();
  }

  /* ---------------- LOTTIE ---------------- */
  function renewLottieRoot(){
    if (!lottieMount) return;
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
    anim = null; animName = null;
  }

  function loadLottieFromData(animationData){
    ensureLottieScript().catch(()=>{});
    renewLottieRoot();
    lotNomW = Number(animationData && animationData.w) || 0;
    lotNomH = Number(animationData && animationData.h) || 0;
    animName = uid('anim_');
    lastLottieJSON = animationData;
    afterTwoFrames(function(){
      try{
        if (typeof lottie === 'undefined') throw new Error('lottie-not-loaded');
        anim = lottie.loadAnimation({
          name: animName, container: lottieMount, renderer: 'svg',
          loop: loopOn, autoplay: true,
          animationData: JSON.parse(JSON.stringify(animationData))
        });
        anim.addEventListener('DOMLoaded', layout);
      }catch(e){ console.error(e); }
    });
  }

  /* ---------------- Контролы ---------------- */
  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_ ){}
  });

  loopChk && loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_ ){ anim.loop = loopOn; }
    }
  });

  /* ---------------- DnD ---------------- */
  let dragDepth = 0;
  function isImageFile(f){ return !!(f && ((f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif)$/i.test(f.name||''))); }
  function isJsonFile(f){ return !!(f && (f.type === 'application/json' || /\.json$/i.test(f.name||''))); }

  document.addEventListener('dragenter', (e)=>{ e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); }, false);
  document.addEventListener('dragover',  (e)=>{ e.preventDefault(); }, false);
  document.addEventListener('dragleave', (e)=>{ e.preventDefault(); dragDepth = Math.max(0, dragDepth-1); if(!dragDepth) document.body.classList.remove('dragging'); }, false);

  document.addEventListener('drop', async (e)=>{
    e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging');
    let files = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
    if (!files.length && e.dataTransfer && e.dataTransfer.items) {
      const its = Array.from(e.dataTransfer.items);
      const fs = its.map(it => (it && it.getAsFile) ? it.getAsFile() : null).filter(Boolean);
      if (fs.length) files = fs;
    }
    let droppedURL = null;
    if (!files.length && e.dataTransfer) {
      droppedURL = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
      if (droppedURL && /^https?:\/\//i.test(droppedURL) && /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(droppedURL)) {
        try { await setBackgroundFromSrc(droppedURL, 1); return; } catch(_ ){}
      }
    }
    if (!files.length) return;

    let imgFile  = files.find(isImageFile);
    let jsonFile = files.find(isJsonFile);
    if (files.length === 1) { const f = files[0]; imgFile = isImageFile(f) ? f : null; jsonFile = isJsonFile(f) ? f : jsonFile; }

    try {
      if (imgFile) {
        const name = (imgFile && imgFile.name) || '';
        const m = name.match(/@([234])x(?=\.)/i);
        const dpr = m ? Number(m[1]) : 1;
        const src = await readAsDataURL(imgFile);
        await setBackgroundFromSrc(src, dpr);
      }
      if (jsonFile) {
        const data = await readAsText(jsonFile);
        try { loadLottieFromData(JSON.parse(String(data))); }
        catch(_ ){ alert('Некорректный JSON Lottie.'); }
      }
    } catch(err){ console.error(err); }
  }, false);

  function readAsDataURL(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload  = ()=> res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function readAsText(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload  = ()=> res(String(r.result));
      r.onerror = rej;
      r.readAsText(file, 'utf-8');
    });
  }

  /* ---------------- Share ---------------- */
  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      await withLoading(shareBtn, async ()=>{
        const payload = {
          v: 1,
          lot: lastLottieJSON,
          bg: bgImg.src || null,
          opts: { loop: loopOn, wide: !!wide, fullH: !!fullH, bgDpr: (bgDpr||1), version: CODE_VERSION }
        };

        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();

        // Сохраним снап для standalone (A2HS)
        try { localStorage.setItem('lastShotId', String(data.id)); localStorage.setItem('lastSnap', JSON.stringify(payload)); } catch(_ ){}

        // Ссылка с дублированием id и в hash (для iOS A2HS)
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id) + '#id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_ ){ const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
                   ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); try { document.execCommand('copy'); } catch(_ ){}
                   document.body.removeChild(ta); }
        showToastNear(shareBtn, 'Ссылка скопирована');
      }).catch(err=>{ console.error(err); showToastNear(shareBtn, 'Ошибка при шаринге'); });
    });
  }

  /* ---------------- Load by id (query/hash; localStorage only in standalone) ---------------- */
  function getShareId(){
    const qs = new URLSearchParams(location.search);
    const fromSearch = qs.get('id');
    if (fromSearch) return fromSearch;
    let h = String(location.hash || '').replace(/^#/, '');
    if (!h) return null;
    if (h.startsWith('id=')) return h.slice(3);
    const parts = h.split(/[\/?=&]/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const idIdx = parts.findIndex(p => p.toLowerCase() === 'id');
    if (idIdx >= 0 && parts[idIdx+1]) return parts[idIdx+1];
    return null;
  }

  (async function loadIfLinked(){
    const standalone = isStandalone();
    let id = getShareId();

    if (id) {
      try {
        const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
        if (!resp.ok) throw new Error('404');
        const snap = await resp.json();

        // Память для standalone/офлайн
        try { localStorage.setItem('lastShotId', String(id)); localStorage.setItem('lastSnap', JSON.stringify(snap)); } catch(_ ){}

        if (snap.opts && typeof snap.opts.loop === 'boolean') { loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn; }
        if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version) + ' · ' + CODE_VERSION; }catch(_ ){} }
        if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }

        if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
        return;
      } catch(e){ console.error(e); /* fall through */ }
    }

    if (standalone) {
      // В установленном приложении пробуем восстановить локально
      let snap = null;
      try { snap = JSON.parse(localStorage.getItem('lastSnap') || 'null'); } catch(_ ){}
      if (snap && (snap.bg || snap.lot)) {
        if (snap.opts && typeof snap.opts.loop === 'boolean') { loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn; }
        if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version) + ' · ' + CODE_VERSION; }catch(_ ){} }
        if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
        if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
        return;
      }
    }

    // Editor (браузер): по умолчанию пусто
    layout();
  })();

  /* ---------------- UI bits ---------------- */
  function showToastNear(btn, msg){
    if (!toastEl) return;
    toastEl.textContent = String(msg || '');
    const r = (btn && btn.getBoundingClientRect) ? btn.getBoundingClientRect() : null;
    if (r){ toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top = (r.top) + 'px'; }
    else { toastEl.style.left = '50%'; toastEl.style.top = (window.innerHeight - 24) + 'px'; }
    toastEl.classList.add('show');
    clearTimeout(showToastNear._t);
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
  }

  async function withLoading(btn, fn){
    if (!btn) return fn();
    const original = btn.textContent;
    btn.classList.add('loading');
    btn.textContent = 'Ссылка…';
    try { return await fn(); }
    finally { btn.classList.remove('loading'); btn.textContent = original; }
  }

  function updateDisplayModeClass() { const st = isStandalone(); document.body.classList.toggle('standalone', !!st); }
  updateDisplayModeClass();
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateDisplayModeClass); } catch(e){}

  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(()=>{}); }

  if (MOBILE) {
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.controls')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_ ){}
    });
  }
});
