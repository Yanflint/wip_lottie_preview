'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION_SEED = 'v56-rollback-no-click-upload';
function parseVersionSeed(s){ try{ const m=String(s||'').match(/^v(\d+)[- ]?(.*)$/i); return {num:m?Number(m[1]):1, desc:(m&&m[2])?m[2]:''}; }catch(_){ return {num:1, desc:''}; }
}
function loadVersion(){ try{ const v=JSON.parse(localStorage.getItem('appVersion')||'null'); if(v&&typeof v.num==='number') return v; }catch(_){} const seed=parseVersionSeed(VERSION_SEED); try{ localStorage.setItem('appVersion', JSON.stringify(seed)); }catch(_){ } return seed; }
function saveVersion(v){ try{ localStorage.setItem('appVersion', JSON.stringify(v)); }catch(_){ } }
function versionToString(v){ const d=(v.desc||'').trim(); return 'v'+String(Math.max(1,v.num))+(d?'-'+d:''); }
function getCurrentVersion(){ return versionToString(loadVersion()); }
function bumpVersion(newDesc){ const v=loadVersion(); v.num=Math.max(1,(v.num||1)+1); if(typeof newDesc==='string') v.desc=newDesc.trim(); saveVersion(v); return versionToString(v); }

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
  const MOBILE = isMobile();
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800; // до загрузки — 800 (для плейсхолдера)
  let bgDpr = 1; // DPR из имени файла @2x/@3x/@4x

  // номинал композиции Lottie
  let lotNomW = 0, lotNomH = 0;

  /* ---------------- INIT ---------------- */
  if (verEl) verEl.textContent = getCurrentVersion();
  if (MOBILE) document.body.classList.add('is-mobile');

  try { if (typeof lottie !== 'undefined' && typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

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
  function matchMediaSafe(q){ try{ return window.matchMedia(q).matches; } catch(_){ return false; } }
  function isMobile(){
    const ua = navigator.userAgent || '';
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    const uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }

  function basePreviewWidth(){ return 360; }
  function basePreviewHeight(){ return Math.max(1, Math.round((bgNatH || 800) / (bgDpr || 1))); }

  function controlsH(){
    if (!modeEl) return 0;
    const r = modeEl.getBoundingClientRect();
    return Math.ceil(r.height);
  }

  /* ---------------- LAYOUT CORE ---------------- */

  function resizeLottieStage(){
    if (!lotNomW || !lotNomH) return;
    const ph = preview.clientHeight || basePreviewHeight();
    const scale = ph / lotNomH;
    lotStage.style.width  = lotNomW + 'px';
    lotStage.style.height = lotNomH + 'px';
    lotStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function applyDesktopScale(){
    if (MOBILE) return;
    const baseW = basePreviewWidth();
    const baseH = basePreviewHeight();

    // wrapper = короба превью
    wrapper.style.width  = `${baseW}px`;
    wrapper.style.height = `${baseH}px`;

    // preview = слой, который растягиваем под фон/лотти
    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';

    resizeLottieStage();
  }

  function applyMobileScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width) ? window.visualViewport.width : window.innerWidth;
    const s  = vw / 360;
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.left = '50%';
    preview.style.top  = '50%';
    preview.style.transformOrigin = '50% 50%';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;
    resizeLottieStage();
  }

  function layout(){
    if (MOBILE) applyMobileScale(); else applyDesktopScale();
  }

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
          name: animName,
          container: lottieMount,
          renderer: 'svg',
          loop: loopOn,
          autoplay: true,
          animationData: JSON.parse(JSON.stringify(animationData))
        });
        anim.addEventListener('DOMLoaded', layout);
      }catch(e){ console.error(e); }
    });
  }

  /* ---------------- Контролы ---------------- */
  // size/height кнопки скрыты по ТЗ — обработчики не вешаем
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

  /* ---------------- LISTENERS: DnD ---------------- */
  let dragDepth = 0;

  function isImageFile(f){
    return !!(f && ( (f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif)$/i.test(f.name||'') ));
  }
  function isJsonFile(f){
    return !!(f && (f.type === 'application/json' || /\.json$/i.test(f.name||'')));
  }

  document.addEventListener('dragenter', (e)=>{
    e.preventDefault(); dragDepth++;
    document.body.classList.add('dragging');
  }, false);

  document.addEventListener('dragover', (e)=>{
    e.preventDefault();
  }, false);

  document.addEventListener('dragleave', (e)=>{
    e.preventDefault(); dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('dragging');
  }, false);

  document.addEventListener('drop', async (e)=>{
    e.preventDefault(); dragDepth = 0;
    document.body.classList.remove('dragging');

    let files = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
    if (!files.length && e.dataTransfer && e.dataTransfer.items) {
      const its = Array.from(e.dataTransfer.items);
      const fs = its.map(it => (it && it.getAsFile) ? it.getAsFile() : null).filter(Boolean);
      if (fs.length) files = fs;
    }
    // URL fallback
    let droppedURL = null;
    if (!files.length && e.dataTransfer) {
      droppedURL = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
      if (droppedURL && /^https?:\/\//i.test(droppedURL) && /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(droppedURL)) {
        try { await setBackgroundFromSrc(droppedURL, 1); return; } catch(_){}
      }
    }

    if (!files.length) return;

    let imgFile  = files.find(isImageFile);
    let jsonFile = files.find(isJsonFile);
    if (files.length === 1) {
      const f = files[0]; imgFile = isImageFile(f) ? f : null; jsonFile = isJsonFile(f) ? f : jsonFile;
    }

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
        catch(_){ alert('Некорректный JSON Lottie.'); }
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

        // VERSION BUMP
        let newDesc=null; try{ const cur=loadVersion(); newDesc=prompt('Описание версии:', cur.desc||''); }catch(_){}
        const nextVer=bumpVersion(newDesc||undefined);
        if (verEl) verEl.textContent = nextVer;

        const payload = {
          v: 1,
          lot: lastLottieJSON,
          bg: bgImg.src || null,
          opts: { loop: loopOn, wide: !!wide, fullH: !!fullH, bgDpr: (bgDpr||1), version: getCurrentVersion() }
        };

        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { localStorage.setItem('lastShotId', String(data.id)); } catch(_){}
        try { await navigator.clipboard.writeText(link); }
        catch(_){
          const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
          ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); try { document.execCommand('copy'); } catch(_){}
          document.body.removeChild(ta);
        }
        showToastNear(shareBtn, 'Ссылка скопирована');
      }).catch(err=>{
        console.error(err);
        showToastNear(shareBtn, 'Ошибка при шаринге');
      });
    });
  }

  /* ---------------- Load by id (query/hash/localStorage) ---------------- */
  function getShareId(){
    const qs = new URLSearchParams(location.search);
    const fromSearch = qs.get('id');
    if (fromSearch) return fromSearch;
    let h = String(location.hash || '').replace(/^#/, '');
    if (!h) return null;
    if (h.startsWith('id=')) return h.slice(3);
    const parts = h.split(/[\/=?&]/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const idIdx = parts.findIndex(p => p.toLowerCase() === 'id');
    if (idIdx >= 0 && parts[idIdx+1]) return parts[idIdx+1];
    return null;
  }

  (async function loadIfLinked(){
    let id = getShareId();
    if (!id) { try { id = localStorage.getItem('lastShotId'); } catch(_){} }
    if (!id) { layout(); return; }
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.opts && typeof snap.opts.loop === 'boolean') {
        loopOn = !!snap.opts.loop;
        if (loopChk) loopChk.checked = loopOn;
      }
      if (snap.opts && snap.opts.version && verEl) { try{ verEl.textContent = String(snap.opts.version); }catch(_){} }
      if (snap.opts && (snap.opts.bgDpr!=null)) { bgDpr = Math.max(1, Number(snap.opts.bgDpr)||1); }

      if (snap.bg) { await setBackgroundFromSrc(snap.bg, bgDpr); }
      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      else { layout(); }
    } catch(e){
      console.error(e);
      layout();
    }
  })();

  /* ---------------- UI bits ---------------- */
  function showToastNear(btn, msg){
    if (!toastEl) return;
    toastEl.textContent = String(msg || '');
    const r = (btn && btn.getBoundingClientRect) ? btn.getBoundingClientRect() : null;
    if (r){ toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top  = (r.top) + 'px'; }
    else  { toastEl.style.left = '50%'; toastEl.style.top  = (window.innerHeight - 24) + 'px'; }
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
    finally {
      btn.classList.remove('loading');
      btn.textContent = original;
    }
  }

  // PWA standalone detection
  function updateDisplayModeClass() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    document.body.classList.toggle('standalone', !!isStandalone);
  }
  updateDisplayModeClass();
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateDisplayModeClass); } catch(e){}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  // tap-to-restart on mobile
  if (MOBILE) {
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.controls')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  }

});
