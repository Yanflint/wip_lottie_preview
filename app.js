'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v59-fitH-by-default + full-viewport-width';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- DOM ---------------- */
  const wrapper     = document.getElementById('wrapper');
  const preview     = document.getElementById('preview');
  const bgImg       = document.getElementById('bgImg');
  const phEl        = document.getElementById('ph');
  const toastEl     = document.getElementById('toast');
  const verEl       = document.getElementById('ver');

  const pickBtn     = document.getElementById('pickBtn');
  const filePick    = document.getElementById('filePick');

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
  let wide = false;         // теперь = "вся ширина viewport", не 1000
  let fullH = false;        // если true — высота ровно доступная; если false — min(800, доступная)
  let lastLottieJSON = null;
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800;

  // номинал композиции Lottie
  let lotNomW = 0, lotNomH = 0;

  // номинальные размеры превью (портрет)
  const BASE_W = 360;
  const BASE_H = 800;

  /* ---------------- INIT ---------------- */
  if (verEl) verEl.textContent = VERSION;

  const MOBILE = isMobile();
  const STANDALONE = isStandalonePWA();
  if (MOBILE || STANDALONE) document.body.classList.add('is-mobile');

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
  function isStandalonePWA(){
    const mm = window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
    const ios = 'standalone' in navigator ? navigator.standalone : false;
    return !!(mm || ios);
  }
  function matchMediaSafe(q){ try { return window.matchMedia && window.matchMedia(q).matches; } catch(_){ return false; } }

  // Больше НЕ используем высоту фонового PNG как "базовую высоту превью".
  // Превью всегда пляшет от номинальных 800px, но ограничивается высотой окна.
  function basePreviewHeight(){ return BASE_H; }
  // Ширина: 360 (узко) или полная ширина viewport (широко)
  function basePreviewWidth(){
    if (!wide) return BASE_W;
    // вычтем рамки/поля страницы (примерно 16px слева/справа + безопасная зона)
    const SAFE = 8, PAGE_PAD = 16;
    const winW = window.innerWidth || 1000;
    return Math.max(320, Math.round(winW - 2*SAFE - 2*PAGE_PAD));
  }

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

  // доступная высота окна с учётом "хрома" и безопасных отступов
  function availableViewportHeight(){
    const SAFE = 8, GAP = 8;
    const winH = window.innerHeight || basePreviewHeight();
    const hCtrls  = controlsH();
    const hChrome = appChromeH();
    return Math.max(80, winH - (SAFE*2 + hCtrls + hChrome + GAP));
  }

  function updateWideClass(){
    document.body.classList.toggle('wide-mode', !!wide);
  }

  /* ---------------- LAYOUT CORE ---------------- */

  // Масштабирует сцену Lottie (lotStage) по ВЫСОТЕ превью
  function resizeLottieStage(){
    if (!lotNomW || !lotNomH) return;
    const ph = preview.clientHeight;
    const scale = ph / lotNomH;

    lotStage.style.width  = lotNomW + 'px';
    lotStage.style.height = lotNomH + 'px';
    lotStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  // Десктоп
  function applyDesktopScale(){
    if (isStandalonePWA()) { applyMobileScale(); return; }

    const baseW = basePreviewWidth();
    const baseH = basePreviewHeight();

    const availH = availableViewportHeight();

    // Новая логика высоты:
    // - fullH=true  → высота ровно доступная (как "Высота на весь экран")
    // - fullH=false → высота = min(номинал 800, доступная) — НИКОГДА не больше экрана
    const targetH = fullH ? availH : Math.min(baseH, availH);

    // Новая логика ширины:
    // - wide=false → 360px
    // - wide=true  → ширина из viewport, без жёстких 1000px
    let targetW = baseW;

    // Применяем размеры к wrapper/preview
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

  // Мобилка/PWA: центр флексом, только scale(...)
  function applyMobileScale(){
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / BASE_W;

    preview.style.width  = BASE_W + 'px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `scale(${s})`;

    resizeLottieStage();
  }

  function layout(){
    updateWideClass();
    if (MOBILE || STANDALONE || isStandalonePWA()) applyMobileScale();
    else applyDesktopScale();
  }

  /* ---------------- EVENTS ---------------- */
  if (MOBILE || STANDALONE) {
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.controls')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  } else {
    // даже когда fullH=false, нам нужно пересчитать ограничение по высоте при ресайзе
    window.addEventListener('resize', layout);
  }
  window.matchMedia && window.matchMedia('(display-mode: standalone)').addEventListener?.('change', layout);
  window.addEventListener('orientationchange', layout);
  window.visualViewport && window.visualViewport.addEventListener('resize', layout);

  /* ---------------- DnD ---------------- */
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

  /* ---------------- Загрузка по кнопке PNG/Lottie ---------------- */
  if (pickBtn && filePick){
    pickBtn.addEventListener('click', ()=> filePick.click());
    filePick.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try{
        if (isImageFile(f)) {
          const src = await readAsDataURL(f);
          await setBackgroundFromSrc(src);
        } else if (isJsonFile(f)) {
          const data = await readAsText(f);
          loadLottieFromData(JSON.parse(String(data)));
        } else {
          alert('Поддерживаются PNG/JPEG/WebP (фон) или JSON (Lottie).');
        }
      } finally {
        e.target.value = ''; // сбросить, чтобы можно было выбрать тот же файл
      }
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
    layout(); // после загрузки фона — пересчитать раскладку (высота по экрану)
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
  if (sizeBtn)   sizeBtn.addEventListener('click', ()=>{ wide=!wide; layout(); });
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

  /* ---------------- Share (как раньше) ---------------- */
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

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      await withLoading(shareBtn, async ()=>{
        const payload = { v:1, lot:lastLottieJSON, bg:bgImg.src || null, opts:{ loop:loopOn, wide:!!wide, fullH:!!fullH } };
        const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_){
          const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
          ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        showToastNear(shareBtn, 'Ссылка скопирована');
      }).catch(err=>{
        console.error(err);
        showToastNear(shareBtn, 'Ошибка при шаринге');
      });
    });
  }

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

  layout();
});
