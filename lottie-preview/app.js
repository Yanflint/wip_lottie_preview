'use strict';

/* [ANCHOR:CODE_VERSION] */
const CODE_VERSION = 'v59-debug-hud';

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

  /* ---------------- DEBUG HUD ---------------- */
  const hud = (function createHUD(){
    const hud = document.createElement('div');
    hud.id = 'debugHUD';
    hud.style.cssText = [
      'position:fixed',
      'left:50%','top:50%','transform:translate(-50%, -50%)',
      'max-width:520px','width:90vw',
      'background:rgba(0,0,0,0.78)','color:#fff',
      'font:12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
      'padding:12px 14px','border-radius:12px','z-index:100000',
      'white-space:pre-wrap','text-align:left',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'display:none'
    ].join(';');
    const chip = document.createElement('div');
    chip.id='debugHUDToggle';
    chip.textContent='DBG';
    chip.style.cssText=[
      'position:fixed','right:10px','bottom:10px',
      'width:42px','height:28px','border-radius:14px',
      'background:rgba(0,0,0,0.65)','color:#fff','z-index:100001',
      'display:flex','align-items:center','justify-content:center',
      'font:12px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
      'letter-spacing:0.5px','user-select:none','-webkit-user-select:none',
      'cursor:pointer'
    ].join(';');
    chip.addEventListener('click', ()=>{ toggle(); });
    document.body.appendChild(hud);
    document.body.appendChild(chip);

    let data = { phase:'startup' };
    function set(k,v){ data[k]=v; render(); }
    function merge(obj){ Object.assign(data,obj||{}); render(); }
    function visible(){ return hud.style.display !== 'none'; }
    function show(){ hud.style.display='block'; render(); }
    function hide(){ hud.style.display='none'; }
    function toggle(){ visible()?hide():show(); }
    function render(){
      const rPrev = (preview && preview.getBoundingClientRect) ? preview.getBoundingClientRect() : {width:0,height:0,left:0,top:0};
      const style = window.getComputedStyle(preview||document.body);
      merge.now = Date.now();
      const lines = [];
      lines.push(`CODE: ${CODE_VERSION}`);
      lines.push(`phase: ${data.phase||'-'}`);
      lines.push(`url: ${location.href}`);
      lines.push(`display-mode.standalone: ${data.standalone}  sw.supported: ${'serviceWorker' in navigator}  sw.controller: ${!!(navigator.serviceWorker && navigator.serviceWorker.controller)}`);
      lines.push(`id.search: ${data.idSearch||'-'}  id.hash: ${data.idHash||'-'}  lastShotId.ls: ${data.lastShotId||'-'}`);
      lines.push(`offline-last.fetch: ${data.offlineLast||'-'}  lastSnap.ls: ${data.lastSnapBytes||0} bytes`);
      lines.push(`BG: loaded=${data.bgLoaded||false}  src=${(bgImg&&bgImg.src&&bgImg.src.length)?'yes':'no'} nat=${data.bgNatW||0}x${data.bgNatH||0} dpr=${data.bgDpr||1}`);
      lines.push(`Preview: ${
        w: Math.round(rPrev.width), h: Math.round(rPrev.height),
        left: Math.round(rPrev.left), top: Math.round(rPrev.top)
      } scaleInfo={css: style.transform}`);
      lines.push(`Lottie: loaded=${data.lottieLoaded||false} nom=${data.lotNomW||0}x${data.lotNomH||0} anim=${!!data.anim} children=${(lottieMount&&lottieMount.childNodes)?lottieMount.childNodes.length:0}`);
      hud.textContent = lines.join('\n');
    }
    window.__DBG__ = { set, merge, show, hide, toggle };
    // Keyboard toggle on desktop
    window.addEventListener('keydown', (e)=>{ if (e.key === '?' || e.key === 'h' || e.key==='H') toggle(); });
    // Auto show if nothing visible after 1.2s
    setTimeout(()=>{ if (!document.body.classList.contains('standalone')) return; if (!data.bgLoaded && !data.lottieLoaded) show(); }, 1200);
    return { set, merge, show, hide, toggle };
  })();

  /* ---------------- STATE ---------------- */
  let anim = null, animName = null;
  let wide = false;
  let fullH = false;
  let lastLottieJSON = null;
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800;
  let bgDpr  = 1;

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
  hud.merge({ standalone: isStandalone() });

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

  function layout(){ (MOBILE ? applyMobileScale : applyDesktopScale)(); hud.merge({phase:'layout', lotNomW, lotNomH, bgNatW, bgNatH, bgDpr}); }
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
        hud.merge({ bgLoaded:true, bgNatW, bgNatH, bgDpr });
        res();
      };
      im.onerror = function(e){ hud.merge({ bgLoaded:false, phase:'bg-error' }); res(); };
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
        anim.addEventListener('DOMLoaded', function(){ hud.merge({ lottieLoaded:true, anim:true, lotNomW, lotNomH, phase:'lottie-domloaded' }); layout(); });
      }catch(e){ console.error(e); hud.merge({ lottieLoaded:false, phase:'lottie-error' }); }
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

        try { localStorage.setItem('lastShotId', String(data.id)); localStorage.setItem('lastSnap', JSON.stringify(payload)); } catch(_ ){}
        try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type:'SAVE_LAST', id:data.id, snap: payload }); } catch(_ ){}

        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id) + '#id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_ ){ const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
                   ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); try { document.execCommand('copy'); } catch(_ ){}
                   document.body.removeChild(ta); }
        showToastNear(shareBtn, 'Ссылка скопирована');
      }).catch(err=>{ console.error(err); showToastNear(shareBtn, 'Ошибка при шаринге'); });
    });
  }

  /* ---------------- Load by id ---------------- */
  function getShareId(){
    const qs = new URLSearchParams(location.search);
    const fromSearch = qs.get('id');
    const h = String(location.hash||'').replace(/^#/, '');
    const idFromHash = h ? (h.startsWith('id=') ? h.slice(3) : (h.split(/[\/?=&]/).filter(Boolean)[0]||null)) : null;
    hud.merge({ idSearch: fromSearch||null, idHash: idFromHash||null });
    return fromSearch || idFromHash || null;
  }

  (async function loadIfLinked(){
    const standalone = isStandalone();
    hud.merge({ phase: 'loadIfLinked', standalone });

    let id = getShareId();

    if (id) {
      try {
        const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
        if (!resp.ok) throw new Error('404');
        const snap = await resp.json();
        try { localStorage.setItem('lastShotId', String(id)); localStorage.setItem('lastSnap', JSON.stringify(snap)); } catch(_ ){}
        hud.merge({ phase:'loaded:api/shot', lastShotId:id, offlineLast:'--' });

        if (snap.opts && typeof snap.opts.loop === 'boolean') { loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn; }
        if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version) + ' · ' + CODE_VERSION; }catch(_ ){} }
        if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }

        if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
        return;
      } catch(e){ console.error(e); hud.merge({ phase:'api/shot error' }); /* fall through */ }
    }

    if (standalone) {
      // Try SW cache endpoint
      try {
        const r = await fetch('/offline-last', { cache:'reload' });
        if (r.ok) {
          const snap = await r.json();
          if (snap && (snap.bg || snap.lot)) {
            hud.merge({ phase:'loaded:/offline-last', offlineLast:'ok' });
            if (snap.opts && typeof snap.opts.loop === 'boolean') { loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn; }
            if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version) + ' · ' + CODE_VERSION; }catch(_ ){} }
            if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
            if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
            if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
            return;
          } else {
            hud.merge({ phase:'offline-last empty', offlineLast:'empty' });
          }
        } else {
          hud.merge({ phase:'offline-last not ok', offlineLast:r.status });
        }
      } catch(e){ hud.merge({ phase:'offline-last error', offlineLast:'error' }); }

      // Fallback: localStorage
      let snap = null; let lsId = null;
      try { lsId = localStorage.getItem('lastShotId'); } catch(_ ){}
      try { snap = JSON.parse(localStorage.getItem('lastSnap') || 'null'); } catch(_ ){}
      hud.merge({ lastShotId: lsId || null, lastSnapBytes: snap ? JSON.stringify(snap).length : 0 });
      if (snap && (snap.bg || snap.lot)) {
        hud.merge({ phase:'loaded:localStorage' });
        if (snap.opts && typeof snap.opts.loop === 'boolean') { loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn; }
        if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version) + ' · ' + CODE_VERSION; }catch(_ ){} }
        if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
        if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
        return;
      }
    }

    // Editor: blank
    hud.merge({ phase:'editor blank' });
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
