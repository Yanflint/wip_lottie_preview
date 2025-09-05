'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v56-rollback + share-fallback';

/* [ANCHOR:BOOT] */
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
  const sizeBtn     = document.getElementById('sizeBtn');
  const heightBtn   = document.getElementById('heightBtn');
  const shareBtn    = document.getElementById('shareBtn');
  const modeEl      = document.getElementById('mode');

  const lotStage    = document.getElementById('lotStage');
  const lottieMount = document.getElementById('lottie');

  /* ---------------- STATE ---------------- */
  let anim = null, animName = null;
  let wide = false;         // 360 / 1000 (десктоп)
  let fullH = false;        // высота = экран (десктоп)
  let lastLottieJSON = null;
  const MOBILE = isMobile();
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800; // до загрузки — 800 (для плейсхолдера)

  // номинал композиции Lottie
  let lotNomW = 0, lotNomH = 0;

  /* ---------------- INIT ---------------- */
  if (verEl) verEl.textContent = VERSION;
  if (MOBILE) document.body.classList.add('is-mobile');

  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

  /* ---------------- UTILS ---------------- */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }
  function isMobile(){
    const ua = navigator.userAgent || '';
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    const uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }
  function matchMediaSafe(q){
    try { return window.matchMedia && window.matchMedia(q).matches; } catch(_){ return false; }
  }

  function basePreviewHeight(){ return Math.max(1, bgNatH || 800); }
  function basePreviewWidth(){ return wide ? 1000 : 360; }

  function appChromeH(){
    const app = document.querySelector('.app'); if (!app) return 0;
    const cs = getComputedStyle(app);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBot = parseFloat(cs.paddingBottom) || 0;
    const gap    = parseFloat(cs.rowGap || cs.gap) || 0;
    return Math.ceil(padTop + padBot + gap);
  }
  function controlsH(){
    if (!modeEl) return 0;
    const r = modeEl.getBoundingClientRect();
    return Math.ceil(r.height);
  }

  /* ---------------- LAYOUT CORE ---------------- */

  // Масштабирует сцену Lottie (lotStage) по ВЫСОТЕ превью
  function resizeLottieStage(){
    if (!lotNomW || !lotNomH) return; // нет анимации
    const ph = preview.clientHeight;  // высота "коробочки" превью (логическая)
    const scale = ph / lotNomH;

    lotStage.style.width  = lotNomW + 'px';
    lotStage.style.height = lotNomH + 'px';
    lotStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  // Десктоп: применяем размеры wrapper/preview и обновляем подписи
  function applyDesktopScale(){
    if (MOBILE) return;
    const baseW = basePreviewWidth();
    const baseH = basePreviewHeight();

    const SAFE = 8, GAP = 8;
    const winH = window.innerHeight || baseH;

    let targetH, targetW;
    if (fullH){
      const hCtrls  = controlsH();
      const hChrome = appChromeH();
      targetH = Math.max(80, winH - (SAFE*2 + hCtrls + hChrome + GAP));
      targetW = Math.round(baseW * (targetH / baseH));
    } else {
      targetW = baseW;
      targetH = baseH;
    }

    wrapper.style.width  = `${targetW}px`;
    wrapper.style.height = `${targetH}px`;

    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + targetH + 'px';

    resizeLottieStage();
  }

  // Мобилка: коробочка 360×(высота фона). Масштаб по ширине экрана
  function applyMobileScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / 360;
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;

    resizeLottieStage();
  }

  // Единая точка: пересчитать размеры и сцену Lottie
  function layout(){
    if (MOBILE) applyMobileScale(); else applyDesktopScale();
  }

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

  /* ---------------- Lottie + фон ---------------- */
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
  }

  async function setBackgroundFromSrc(src){
    await new Promise(res=>{
      const meta = new Image();
      meta.onload = function(){
        bgNatW = meta.naturalWidth  || meta.width  || 0;
        bgNatH = meta.naturalHeight || meta.height || 0;
        bgImg.src = src;
        phEl && phEl.classList.add('hidden');
        res();
      };
      meta.src = src;
    });
    layout();
  }

  function loadLottieFromData(animationData){
    renewLottieRoot();

    lotNomW = Number(animationData.w) || 0;
    lotNomH = Number(animationData.h) || 0;

    animName = uid('anim_');
    lastLottieJSON = animationData;

    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieMount,
        renderer: 'svg',
        loop: loopOn,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData))
      });
      anim.addEventListener('DOMLoaded', layout);
    });
  }

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

  /* ---------------- Share: сервер → запасной локальный ---------------- */
  function showToastNear(el, msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r) { toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top  = (r.top) + 'px'; }
    else   { toastEl.style.left = '50%'; toastEl.style.top  = (window.innerHeight - 24) + 'px'; }
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

  function buildLocalShareLink(){
    const payload = {
      v:1,
      lot:lastLottieJSON || null,
      bg:bgImg && bgImg.src ? bgImg.src : null,
      opts:{ loop:!!loopOn, wide:!!wide, fullH:!!fullH }
    };
    const json = JSON.stringify(payload);
    // сжимаем в URI-safe строку
    const packed = (window.LZString && LZString.compressToEncodedURIComponent)
      ? LZString.compressToEncodedURIComponent(json)
      : encodeURIComponent(json);
    return location.origin + location.pathname + '?d=' + packed;
  }

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON && !bgImg.src){ showToastNear(shareBtn, 'Загрузите фон или Lottie'); return; }
      await withLoading(shareBtn, async ()=>{
        // 1) пробуем короткий серверный вариант
        try {
          const payload = { v:1, lot:lastLottieJSON, bg:bgImg.src || null, opts:{ loop:loopOn, wide:!!wide, fullH:!!fullH } };
          const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
          if (!resp.ok) throw new Error('share failed');
          const data = await resp.json();
          const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);
          await copyText(link);
          showToastNear(shareBtn, 'Ссылка скопирована');
          return;
        } catch(e){
          // 2) падение → локальная ссылка
          const link = buildLocalShareLink();
          await copyText(link);
          showToastNear(shareBtn, 'Ссылка скопирована (локальный режим)');
        }
      }).catch(err=>{
        console.error(err);
        showToastNear(shareBtn, 'Ошибка при шаринге');
      });
    });
  }

  async function copyText(text){
    try { await navigator.clipboard.writeText(text); }
    catch(_){
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  }

  /* ---------------- Загрузка из ссылки ---------------- */
  (async function loadIfLinked(){
    const qs = new URLSearchParams(location.search);
    const id = qs.get('id');
    const d  = qs.get('d'); // локально сжатые данные
    if (!id && !d) { layout(); return; }

    try {
      if (id){
        const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
        if (!resp.ok) throw new Error('404');
        const snap = await resp.json();
        if (snap.opts && typeof snap.opts.loop === 'boolean') {
          loopOn = !!snap.opts.loop;
          if (loopChk) loopChk.checked = loopOn;
        }
        if (snap.bg)  { await setBackgroundFromSrc(snap.bg); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
        else { layout(); }
        return;
      }

      if (d){
        const json = (window.LZString && LZString.decompressFromEncodedURIComponent)
          ? LZString.decompressFromEncodedURIComponent(d)
          : decodeURIComponent(d);
        const snap = JSON.parse(json);

        if (snap.opts && typeof snap.opts.loop === 'boolean') {
          loopOn = !!snap.opts.loop;
          if (loopChk) loopChk.checked = loopOn;
        }
        if (snap.bg)  { await setBackgroundFromSrc(snap.bg); }
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
        else { layout(); }
      }
    } catch(e){
      console.error(e);
      layout();
    }
  })();

  // первичный рендер
  layout();
});
