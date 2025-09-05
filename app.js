'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v50-refactor-lottie-fit-height-via-stage';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- DOM ---------------- */
  const wrapper   = document.getElementById('wrapper');
  const preview   = document.getElementById('preview');
  const bgImg     = document.getElementById('bgImg');
  const phEl      = document.getElementById('ph');
  const toastEl   = document.getElementById('toast');
  const verEl     = document.getElementById('ver');

  const bgInput   = document.getElementById('bgInput');
  const lotInput  = document.getElementById('lotInput');
  const restartBtn= document.getElementById('restartBtn');
  const loopChk   = document.getElementById('loopChk');
  const sizeBtn   = document.getElementById('sizeBtn');
  const heightBtn = document.getElementById('heightBtn');
  const shareBtn  = document.getElementById('shareBtn');
  const modeEl    = document.getElementById('mode');

  const lotStage  = document.getElementById('lotStage');   // сцена фиксированного номинала
  const lottieMount = document.getElementById('lottie');    // точка монтирования Lottie

  /* ---------------- STATE ---------------- */
  let anim = null, animName = null;
  let wide = false;         // 360 / 1000 (десктоп)
  let fullH = false;        // высота = экран (десктоп)
  let lastLottieJSON = null;
  const MOBILE = isMobile();
  let loopOn = false;

  // фон
  let bgNatW = 0, bgNatH = 800; // до загрузки — 800 (для плейсхолдера)

  // номинал композиции Lottie, чтобы масштабировать по ВЫСОТЕ
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
    const ph = preview.clientHeight;  // высота "коробочки" превью (НЕ визуальный scale)
    const scale = ph / lotNomH;

    // сцене задаём "номинальные" размеры и центрируем
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

    wrapper.style.width  = targetW + 'px';
    wrapper.style.height = targetH + 'px';

    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + targetH + 'px';
  }

  // Мобилка: коробочка 360×(высота фона). Масштаб по ширине экрана
  function applyMobileScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / 360;
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  // Единая точка: пересчитать размеры и сцену Lottie
  function layout(){
    if (MOBILE) applyMobileScale(); else applyDesktopScale();
    resizeLottieStage();
  }

  /* ---------------- LISTENERS (desktop/mobile) ---------------- */
  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click', ()=>{ wide=!wide; layout(); });
    heightBtn && heightBtn.addEventListener('click',()=>{ fullH=!fullH; layout(); });
    window.addEventListener('resize', ()=>{ if (fullH) layout(); });
  } else {
    window.visualViewport && window.visualViewport.addEventListener('resize', layout);
    window.addEventListener('resize', layout);

    // Тап по превью = повтор
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.mode')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  }

  /* ---------------- LOADERS ---------------- */

  // Фон
  bgInput && bgInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      const src = String(reader.result);
      const meta = new Image();
      meta.onload = function(){
        bgNatW = meta.naturalWidth  || meta.width  || 0;
        bgNatH = meta.naturalHeight || meta.height || 0;
        bgImg.src = src;
        phEl && phEl.classList.add('hidden');
        layout();
      };
      meta.src = src;
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  // Lottie
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;

    // полностью очищаем mount
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
  }

  function loadLottieFromData(animationData){
    renewLottieRoot();

    // запоминаем номинал композиции (ключевое для масштабирования по высоте)
    lotNomW = Number(animationData.w) || 0;
    lotNomH = Number(animationData.h) || 0;

    animName = uid('anim_');
    lastLottieJSON = animationData;

    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieMount,   // ← монтируем внутрь сцены фиксированного номинала
        renderer: 'svg',
        loop: loopOn,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData)),
        // rendererSettings по умолчанию; размеры задаёт наш lotStage
      });

      anim.addEventListener('DOMLoaded', function(){
        layout(); // как только DOM Lottie готов — сразу подгоняем сцену
      });
    });
  }

  lotInput && lotInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      try { loadLottieFromData(JSON.parse(String(reader.result))); }
      catch(err){ alert('Не удалось прочитать JSON Lottie.'); }
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsText(file, 'utf-8');
  });

  // Повтор
  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  // Цикл
  loopChk && loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_){ anim.loop = loopOn; }
    }
  });

  /* ---------------- SHARE (как было) ---------------- */
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

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      try {
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
      } catch(err) {
        console.error(err); showToastNear(shareBtn, 'Ошибка при шаринге');
      }
    });
  }

  /* ---------------- LOAD FROM LINK ---------------- */
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

      if (snap.bg) {
        await new Promise(res=>{
          const meta = new Image();
          meta.onload = function(){
            bgNatW = meta.naturalWidth  || meta.width  || 0;
            bgNatH = meta.naturalHeight || meta.height || 0;
            bgImg.src = snap.bg;
            phEl && phEl.classList.add('hidden');
            res();
          };
          meta.src = snap.bg;
        });
      }

      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      else { layout(); }
    } catch(e){
      console.error(e);
      layout();
    }
  })();

  // первичный рендер
  layout();
});
