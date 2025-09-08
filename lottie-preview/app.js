'use strict';

/* Early redirect from root using cookie (works for A2HS base URL) */
(function () {
  try {
    var p = location.pathname;
    var onRoot = (p === '/' || p.endsWith('/index.html'));
    var noDeep = !/[?]id=|#|\/(?:s|shot)\//i.test(location.href);
    if (onRoot && noDeep) {
      var m = document.cookie.match(/(?:^|;\s*)lastShotId=([^;]+)/);
      if (m && m[1]) {
        var id = decodeURIComponent(m[1]);
        if (id) location.replace('/s/' + encodeURIComponent(id));
      }
    }
  } catch (_e) {}
})();

/* [ANCHOR:CODE_VERSION] */
const CODE_VERSION = 'v65-share-fallback';

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

  const lotStage    = document.getElementById('lotStage');
  const lottieMount = document.getElementById('lottie');

  /* ---------------- STATE ---------------- */
  let anim = null;
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
  const MOBILE = (function(){
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    return (coarse || touch) && small;
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
    if (wrapper) { wrapper.style.width  = baseW + 'px'; wrapper.style.height = baseH + 'px'; }
    if (preview) {
      preview.style.left = '0'; preview.style.top = '0';
      preview.style.width  = '100%';
      preview.style.height = '100%';
      preview.style.transform = 'none';
    }
    resizeLottieStage();
  }

  function applyMobileScale(){
    const vw = (window.visualViewport && window.visualViewport.width) ? window.visualViewport.width : window.innerWidth;
    const s  = vw / 360;
    if (preview) {
      preview.style.width  = '360px';
      preview.style.height = basePreviewHeight() + 'px';
      preview.style.left = '50%'; preview.style.top = '50%';
      preview.style.transformOrigin = '50% 50%';
      preview.style.transform = `translate(-50%, -50%) scale(${s})`;
    }
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
        if (bgImg) bgImg.src = src;
        bgDpr = dpr || 1;
        if (phEl) phEl.classList.add('hidden');
        res();
      };
      im.onerror = function(){ res(); };
      im.src = src;
    });
    layout();
  }

  /* ---------------- LOTTIE ---------------- */
  function renewLottieRoot(){
    if (!lottieMount) return;
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
    anim = null;
  }

  function loadLottieFromData(animationData){
    ensureLottieScript().catch(()=>{});
    renewLottieRoot();
    lotNomW = Number(animationData && animationData.w) || 0;
    lotNomH = Number(animationData && animationData.h) || 0;
    lastLottieJSON = animationData;
    afterTwoFrames(function(){
      try{
        if (typeof lottie === 'undefined') throw new Error('lottie-not-loaded');
        anim = lottie.loadAnimation({
          container: lottieMount, renderer: 'svg',
          loop: loopOn, autoplay: true,
          animationData: JSON.parse(JSON.stringify(animationData))
        });
        anim.addEventListener('DOMLoaded', layout);
      }catch(e){ console.error(e); }
    });
  }

  /* ---------------- Контролы ---------------- */
  if (restartBtn) restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_ ){}
  });

  if (loopChk) loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_ ){ anim.loop = loopOn; }
    }
  });

  /* ---------------- DnD ---------------- */
  ;['dragenter','dragover','dragleave','drop'].forEach(evt => {
    window.addEventListener(evt, (e)=>{ e.preventDefault(); }, false);
    document.addEventListener(evt, (e)=>{ e.preventDefault(); }, false);
  });

  function isImageFile(f){ return !!(f && ((f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif)$/i.test(f.name||''))); }
  function isJsonFile(f){ return !!(f && (f.type === 'application/json' || /\.json$/i.test(f.name||''))); }

  document.addEventListener('drop', async (e)=>{
    let files = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
    if ((!files || !files.length) && e.dataTransfer && e.dataTransfer.items) {
      const its = Array.from(e.dataTransfer.items);
      const fs = its.map(it => (it && it.kind === 'file' && it.getAsFile) ? it.getAsFile() : null).filter(Boolean);
      if (fs.length) files = fs;
    }
    if ((!files || !files.length) && e.dataTransfer) {
      const droppedURL = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
      if (droppedURL && /^https?:\/\//i.test(droppedURL) && /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(droppedURL)) {
        try { await setBackgroundFromSrc(droppedURL, 1); return; } catch(_ ){}
      }
    }
    if (!files || !files.length) return;

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

  /* ---------------- Share with fallback endpoints ---------------- */
  async function postJSON(url, body) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' @ ' + url);
    return resp.json();
  }

  async function tryShare(payload) {
    const endpoints = ['/api/share', '/.netlify/functions/share', '/share'];
    let lastErr = null, data = null;
    for (const ep of endpoints) {
      try { data = await postJSON(ep, payload); if (data && data.id) return { data, used: ep }; }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('no-endpoint');
  }

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      const payload = {
        v: 1,
        lot: lastLottieJSON,
        bg: bgImg ? (bgImg.src || null) : null,
        opts: { loop: loopOn, bgDpr: (bgDpr||1), version: CODE_VERSION }
      };
      try {
        const { data, used } = await tryShare(payload);
        try { localStorage.setItem('lastShotId', String(data.id)); localStorage.setItem('lastSnap', JSON.stringify(payload)); } catch(_ ){}
        try { document.cookie = 'lastShotId=' + encodeURIComponent(String(data.id)) + '; Path=/; Max-Age=2592000; SameSite=Lax'; } catch(_ ){}
        const link = location.origin + '/s/' + encodeURIComponent(data.id);
        try { await navigator.clipboard.writeText(link); }
        catch(_ ){ const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
                   ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); try { document.execCommand('copy'); } catch(_ ){}
                   document.body.removeChild(ta); }
        showToastNear(shareBtn, 'Ссылка скопирована');
        console.log('[share] OK via', used);
      } catch(err) {
        console.error('[share] failed', err);
        showToastNear(shareBtn, 'Ошибка при шаринге: ' + (err && err.message ? err.message : 'unknown'));
      }
    });
  }

  /* ---------------- Load by id ---------------- */
  function getShareId(){
    const m = location.pathname.match(/\/(?:s|shot)\/([^\/]+)/i);
    if (m && m[1]) return m[1];
    const qs = new URLSearchParams(location.search);
    const fromSearch = qs.get('id');
    if (fromSearch) return fromSearch;
    const h = String(location.hash||'').replace(/^#/, '');
    if (h.startsWith('id=')) return h.slice(3);
    const seg = h.split(/[\/?=&]/).filter(Boolean)[0];
    if (seg) return seg;
    return null;
  }

  (async function loadIfLinked(){
    let id = getShareId();
    if (!id) { layout(); return; } // editor starts blank
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const snap = await resp.json();
      try { document.cookie = 'lastShotId=' + encodeURIComponent(String(id)) + '; Path=/; Max-Age=2592000; SameSite=Lax'; } catch(_ ){}
      try { localStorage.setItem('lastShotId', String(id)); localStorage.setItem('lastSnap', JSON.stringify(snap)); } catch(_ ){}
      if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
      if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
    } catch(e){ console.error(e); layout(); }
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
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1800);
  }
});
