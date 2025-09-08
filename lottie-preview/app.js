'use strict';

/* [ANCHOR:CODE_VERSION] */
const CODE_VERSION = 'v67-offline-sw-edge';

document.addEventListener('DOMContentLoaded', function () {
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

  let anim = null;
  let lastLottieJSON = null;
  let loopOn = false;
  let bgNatW = 0, bgNatH = 800;
  let bgDpr  = 1;
  let lotNomW = 0, lotNomH = 0;

  if (verEl) verEl.textContent = CODE_VERSION;

  function matchMediaSafe(q){ try{ return window.matchMedia(q).matches; } catch(_ ){ return false; } }
  function isStandalone(){ return matchMediaSafe('(display-mode: standalone)') || window.navigator.standalone === true; }
  const MOBILE = (function(){
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    return (coarse || touch) && small;
  })();
  if (MOBILE) document.body.classList.add('is-mobile');

  async function ensureLottieScript() {
    if (typeof window.lottie !== 'undefined') return;
    const ok = await new Promise((res)=>{
      const s = document.createElement('script');
      s.src = '/lib/lottie.min.js';
      s.onload = ()=>res(!!window.lottie);
      s.onerror = ()=>res(false);
      document.head.appendChild(s);
    });
    if (ok) return;
    await new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      s.onload = ()=>res();
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }
  function basePreviewWidth(){ return 360; }
  function basePreviewHeight(){ return Math.max(1, Math.round((bgNatH || 800) / (bgDpr || 1))); }

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

  ['dragenter','dragover','dragleave','drop'].forEach(evt => {
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
        v: 1, lot: lastLottieJSON, bg: bgImg ? (bgImg.src || null) : null,
        opts: { loop: loopOn, bgDpr: (bgDpr||1), version: CODE_VERSION }
      };
      try {
        const { data } = await tryShare(payload);
        rememberId(String(data.id), payload);
        const link = location.origin + '/s/' + encodeURIComponent(data.id);
        await copy(link);
        showToastNear(shareBtn, 'Ссылка скопирована');
      } catch(err) { console.error('[share] failed', err); showToastNear(shareBtn, 'Ошибка при шаринге'); }
    });
  }
  function rememberId(id, snap) {
    try { document.cookie = 'lastShotId=' + encodeURIComponent(String(id)) + '; Path=/; Max-Age=2592000; SameSite=Lax'; } catch(_ ){}
    try { localStorage.setItem('lastShotId', String(id)); localStorage.setItem('lastSnap', JSON.stringify(snap)); } catch(_ ){}
    try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({type:'SAVE_LAST', id, snap}); } catch(_ ){}
    try { idbPut('last','snap', snap); } catch(_ ){}
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch(_ ){ const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
               ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); try { document.execCommand('copy'); } catch(_ ){}
               document.body.removeChild(ta); }
  }

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
    if (id) {
      try {
        const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const snap = await resp.json();
        rememberId(String(id), snap);
        if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
        if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
        return;
      } catch(e){ console.warn('load by id failed', e); }
    }
    if (isStandalone()) {
      try {
        const r = await fetch('/offline-last', {cache:'reload'});
        if (r.ok) {
          const snap = await r.json();
          if (snap && (snap.bg || snap.lot)) {
            if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }
            if (snap.bg)  { await setBackgroundFromSrc(snap.bg, bgDpr); }
            if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); } else { layout(); }
            return;
          }
        }
      } catch(_ ){}
      try { const snap = await idbGet('last','snap'); if (snap && (snap.bg || snap.lot)) { if (snap.bg) await setBackgroundFromSrc(snap.bg, snap.opts&&snap.opts.bgDpr||1); if (snap.lot) { lastLottieJSON=snap.lot; loadLottieFromData(snap.lot); } return; } } catch(_ ){}
      try { const snap = JSON.parse(localStorage.getItem('lastSnap')||'null'); if (snap && (snap.bg || snap.lot)) { if (snap.bg) await setBackgroundFromSrc(snap.bg, snap.opts&&snap.opts.bgDpr||1); if (snap.lot) { lastLottieJSON=snap.lot; loadLottieFromData(snap.lot); } return; } } catch(_ ){}
    }
    layout();
  })();

  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(()=>{}); }

  try {
    const hud = document.createElement('div'); hud.id='hud';
    const toggle = document.createElement('button'); toggle.id='hudToggle'; toggle.textContent='HUD';
    document.body.appendChild(hud); document.body.appendChild(toggle);
    function render(){ 
      const lines=[];
      lines.push('ver ' + CODE_VERSION);
      lines.push('standalone=' + isStandalone());
      lines.push('path=' + location.pathname);
      lines.push('bg=' + (!!(bgImg&&bgImg.src)) + ' nat=' + bgNatW+'x'+bgNatH + ' dpr=' + bgDpr);
      lines.push('lot nom=' + lotNomW+'x'+lotNomH + ' children=' + (lottieMount?lottieMount.childNodes.length:0));
      lines.push('sw=' + (!!(navigator.serviceWorker&&navigator.serviceWorker.controller)));
      document.getElementById('hud').textContent = lines.join('\n');
    }
    toggle.addEventListener('click', ()=>{ hud.classList.toggle('show'); render(); });
    setTimeout(()=>{ if (isStandalone() && !bgImg.src && !lottieMount.childNodes.length) { hud.classList.add('show'); render(); } }, 1200);
    window.addEventListener('resize', render);
  } catch(_ ){}

  function showToastNear(btn, msg){
    if (!toastEl) return;
    toastEl.textContent = String(msg || '');
    toastEl.classList.add('show');
    clearTimeout(showToastNear._t);
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1600);
  }

  // Minimal IndexedDB helpers
  function idbOpen(dbName, storeName) {
    return new Promise((res, rej)=>{
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function idbPut(dbName, key, value) {
    try {
      const db = await idbOpen(dbName, 'kv');
      await new Promise((res, rej)=>{
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
      db.close();
    } catch(_ ){}
  }
  async function idbGet(dbName, key) {
    try {
      const db = await idbOpen(dbName, 'kv');
      const val = await new Promise((res, rej)=>{
        const tx = db.transaction('kv', 'readonly');
        const r = tx.objectStore('kv').get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      db.close();
      return val;
    } catch(_ ){ return null; }
  }
});
