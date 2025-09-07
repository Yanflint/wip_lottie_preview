'use strict';

const VERSION = 'v71 owner/read-only, pos fix, dnd zones, overlay restore, @nx';
const LS_SHARE_KEY = 'lp_share_id';

document.addEventListener('DOMContentLoaded', () => {
  /* DOM */
  const wrapper     = document.getElementById('wrapper');
  const preview     = document.getElementById('preview');
  const bgImg       = document.getElementById('bgImg');
  const ovImg       = document.getElementById('ovImg');
  const phEl        = document.getElementById('ph');
  const dropOverlay = document.getElementById('dropOverlay');
  const posHud      = document.getElementById('posHud');

  const pickBtn     = document.getElementById('pickBtn');
  const filePick    = document.getElementById('filePick');
  const restartBtn  = document.getElementById('restartBtn');
  const loopChk     = document.getElementById('loopChk');
  const resetPosBtn = document.getElementById('resetPosBtn');
  const shareBtn    = document.getElementById('shareBtn');
  const copyBtn     = document.getElementById('copyBtn');

  const toastEl     = document.getElementById('toast');
  const verEl       = document.getElementById('ver');

  const lotStage    = document.getElementById('lotStage');
  const lottieMount = document.getElementById('lottie');

  /* STATE */
  const MOBILE = isMobile();
  if (verEl) verEl.textContent = VERSION;
  if (MOBILE) document.body.classList.add('is-mobile');

  let anim = null, animName = null, lastLottieJSON = null;
  let loopOn = false;

  let bgNatW = 360, bgNatH = 800;
  let bgx    = 1;   // 1|2|3|4; логика = nat / bgx

  let overlaySrc = null;

  let lotNomW = 0, lotNomH = 0;

  let pos = { dx: 0, dy: 0 }; // смещение Lottie (логические px фона)

  let shareId = null;     // id снимка
  let isOwner = false;    // владелец ссылки?
  let readOnly = false;   // режим просмотра

  /* UTILS */
  function isMobile(){
    const ua = navigator.userAgent || '';
    const coarse = matchMediaSafe('(pointer: coarse)');
    const touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    const uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }
  function matchMediaSafe(q){ try { return window.matchMedia && window.matchMedia(q).matches; } catch(_){ return false; } }
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }

  function detectBgScaleFromName(name){
    if (!name) return 1;
    const m = /@([234])x(?=\.|$)/i.exec(name);
    return m ? Math.max(1, Math.min(4, parseInt(m[1],10))) : 1;
  }
  function clampBgx(n){
    if (!Number.isFinite(n)) return 0;
    const k = Math.max(1, Math.min(4, n|0));
    return k;
  }
  function logicalSize(){
    return { w: Math.max(1, Math.round(bgNatW / bgx)), h: Math.max(1, Math.round(bgNatH / bgx)) };
  }
  function getPreviewScale(){
    const rectW = preview.getBoundingClientRect().width || 1;
    const logicalW = preview.clientWidth || rectW;
    return rectW / logicalW;
  }
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
  async function copyText(text){
    try { await navigator.clipboard.writeText(text); }
    catch(_){
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  }

  /* LAYOUT */
  function layout(){
    const { w: lw, h: lh } = logicalSize();

    if (MOBILE){
      const vw = (window.visualViewport && window.visualViewport.width) ? visualViewport.width : window.innerWidth;
      const s = vw / lw;
      preview.style.width  = lw + 'px';
      preview.style.height = lh + 'px';
      preview.style.left = '50%';
      preview.style.top  = '50%';
      preview.style.transform = `translate(-50%, -50%) scale(${s})`;
    } else {
      wrapper.style.width  = lw + 'px';
      wrapper.style.height = lh + 'px';
      preview.style.left = '0'; preview.style.top = '0';
      preview.style.width  = '100%';
      preview.style.height = '100%';
      preview.style.transform = 'none';
    }

    if (lotNomW && lotNomH){
      lotStage.style.width  = lotNomW + 'px';
      lotStage.style.height = lotNomH + 'px';
      lotStage.style.transform = `translate(-50%, -50%) translate(${pos.dx}px, ${pos.dy}px)`;
    }

    if (overlaySrc){ ovImg.src = overlaySrc; }

    if (posHud){
      posHud.textContent = `x:${pos.dx>=0?'+':''}${Math.round(pos.dx)} y:${pos.dy>=0?'+':''}${Math.round(pos.dy)} px`;
      posHud.style.display = (MOBILE || readOnly) ? 'none' : 'block';
    }
  }

  /* FILE HELPERS */
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

  /* SETTERS */
  async function setBackgroundFromFile(file){
    const src = await readAsDataURL(file);
    const detected = detectBgScaleFromName(file && file.name);
    await setBackgroundFromSrc(src, detected || 1);
  }
  async function setBackgroundFromSrc(src, scaleHint = 1){
    await new Promise(res=>{
      const meta = new Image();
      meta.onload = function(){
        bgNatW = meta.naturalWidth  || meta.width  || 0;
        bgNatH = meta.naturalHeight || meta.height || 0;
        bgx    = Math.max(1, Math.min(4, scaleHint|0 || 1));
        bgImg.src = src;
        phEl && phEl.classList.add('hidden');
        res();
      };
      meta.src = src;
    });
    layout();
  }
  async function setOverlayFromFile(file){
    const src = await readAsDataURL(file);
    overlaySrc = src;
    ovImg.src  = src;
    layout();
  }
  function loadLottieFromData(animationData){
    renewLottieRoot();

    lotNomW = Number(animationData.w) || 0;
    lotNomH = Number(animationData.h) || 0;

    animName = uid('anim_');
    lastLottieJSON = animationData;

    try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

    requestAnimationFrame(()=>{
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
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;
    while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
  }

  /* PNG/Lottie кнопка */
  if (pickBtn && filePick){
    pickBtn.addEventListener('click', ()=> { if(!readOnly) filePick.click(); });
    filePick.addEventListener('change', async (e)=>{
      if (readOnly) { e.target.value=''; return; }
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try{
        if (isImageFile(f)) {
          const lower = f.name.toLowerCase();
          if (!bgImg.src || /(^|[_\-\.])(bg|1)(@[\d]x)?\./i.test(lower)) {
            await setBackgroundFromFile(f);
          } else if (/overlay|ov|2(\@[\d]x)?\./i.test(lower)) {
            await setOverlayFromFile(f);
          } else if (!overlaySrc) {
            await setOverlayFromFile(f);
          } else {
            await setOverlayFromFile(f);
          }
        } else if (isJsonFile(f)) {
          const data = await readAsText(f);
          loadLottieFromData(JSON.parse(String(data)));
        } else {
          alert('Поддерживаются PNG/JPEG/WebP (фон/overlay) и JSON (Lottie).');
        }
      } finally {
        e.target.value = '';
      }
    });
  }
  function isImageFile(f){ return f && (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)); }
  function isJsonFile(f){ return f && (f.type === 'application/json' || /\.json$/i.test(f.name)); }

  /* Drag&Drop */
  let dragDepth = 0;
  document.addEventListener('dragenter',(e)=>{ e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
  document.addEventListener('dragover', (e)=>{ e.preventDefault(); });
  document.addEventListener('dragleave',(e)=>{ e.preventDefault(); dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) document.body.classList.remove('dragging'); });
  document.addEventListener('drop',     async (e)=>{
    e.preventDefault();
    const files = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
    if (!files.length) { document.body.classList.remove('dragging'); dragDepth=0; return; }

    // зона сначала!
    const pt = { x: e.clientX, y: e.clientY };
    const zone = zoneAtPoint(pt);
    document.body.classList.remove('dragging'); dragDepth=0;

    if (readOnly) return;

    if (files.length === 1){
      const f = files[0];
      if (isJsonFile(f)) { const data = await readAsText(f); loadLottieFromData(JSON.parse(String(data))); return; }
      if (isImageFile(f)) {
        if (zone === 'bg')      return await setBackgroundFromFile(f);
        if (zone === 'overlay') return await setOverlayFromFile(f);
        const lower = f.name.toLowerCase();
        if (/(^|[_\-\.])(bg|1)(@[\d]x)?\./i.test(lower)) return await setBackgroundFromFile(f);
        if (/(overlay|ov|2)(@[\d]x)?\./i.test(lower))    return await setOverlayFromFile(f);
        if (!bgImg.src) return await setBackgroundFromFile(f);
        return await setOverlayFromFile(f);
      }
      return;
    }

    const imgs  = files.filter(isImageFile);
    const jsons = files.filter(isJsonFile);

    if (jsons.length) {
      const f = jsons[0]; const data = await readAsText(f);
      try { loadLottieFromData(JSON.parse(String(data))); } catch(_){ alert('Некорректный JSON Lottie'); }
    }

    if (imgs.length === 1) {
      const f = imgs[0];
      const lower = f.name.toLowerCase();
      if (/overlay|ov|2/.test(lower)) await setOverlayFromFile(f);
      else await setBackgroundFromFile(f);
    } else if (imgs.length >= 2) {
      let bgFile = imgs.find(f=>/(^|[_\-\.])(bg|1)(@[\d]x)?\./i.test(f.name.toLowerCase()));
      let ovFile = imgs.find(f=>/(overlay|ov|2)(@[\d]x)?\./i.test(f.name.toLowerCase()));
      if (!bgFile || !ovFile){
        const withArea = await Promise.all(imgs.map(async f=>{
          const src = await readAsDataURL(f);
          const meta = await loadImageMeta(src);
          return { file: f, area: (meta.w||0)*(meta.h||0) };
        }));
        withArea.sort((a,b)=>b.area-a.area);
        bgFile = bgFile || withArea[0]?.file;
        ovFile = ovFile || withArea[1]?.file;
      }
      if (bgFile) await setBackgroundFromFile(bgFile);
      if (ovFile) await setOverlayFromFile(ovFile);
    }
  });
  function zoneAtPoint(pt){
    const r = dropOverlay.getBoundingClientRect();
    if (!r || !document.body.classList.contains('dragging')) return null;
    const x = (pt.x - r.left) / Math.max(1, r.width);
    if (x < 0.33) return 'bg';
    if (x > 0.66) return 'overlay';
    return 'lottie';
  }
  function loadImageMeta(src){
    return new Promise(res=>{
      const im = new Image();
      im.onload = ()=> res({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = ()=> res({ w:0,h:0 });
      im.src = src;
    });
  }

  /* Позиционирование Lottie */
  let drag = null;
  function startDrag(e){
    if (readOnly) return;
    if (!lotNomW || !lotNomH) return;
    e.preventDefault();
    const scale = getPreviewScale();
    drag = {
      startX: e.clientX, startY: e.clientY,
      startDx: pos.dx, startDy: pos.dy,
      scale
    };
    lotStage.classList.add('dragging');
    document.querySelector('.overlay')?.classList.add('dim');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd, { once:true });
  }
  function onDragMove(e){
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.scale;
    const dy = (e.clientY - drag.startY) / drag.scale;
    pos.dx = Math.round(drag.startDx + dx);
    pos.dy = Math.round(drag.startDy + dy);
    layout();
  }
  function onDragEnd(){
    window.removeEventListener('pointermove', onDragMove);
    lotStage.classList.remove('dragging');
    document.querySelector('.overlay')?.classList.remove('dim');
    drag = null;
  }
  lotStage.addEventListener('pointerdown', startDrag);
  lotStage.addEventListener('mouseenter', ()=> !readOnly && lotStage.classList.add('hover'));
  lotStage.addEventListener('mouseleave', ()=> lotStage.classList.remove('hover'));

  // клавиатура
  window.addEventListener('keydown', (e)=>{
    if (readOnly || MOBILE) return;
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;

    let step = e.shiftKey ? 10 : 1;
    let used = false;
    if (e.key === 'ArrowLeft')  { pos.dx -= step; used = true; }
    if (e.key === 'ArrowRight') { pos.dx += step; used = true; }
    if (e.key === 'ArrowUp')    { pos.dy -= step; used = true; }
    if (e.key === 'ArrowDown')  { pos.dy += step; used = true; }
    if (e.key.toLowerCase() === 'r') { pos.dx = 0; pos.dy = 0; used = true; }
    if (used){ e.preventDefault(); layout(); }
  });

  // мобайл: тап = повтор
  if (MOBILE) {
    wrapper.addEventListener('click', ()=>{
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  }

  /* Контролы */
  restartBtn?.addEventListener('click', ()=>{
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });
  loopChk?.addEventListener('change', ()=>{
    if (readOnly) { loopChk.checked = loopOn; return; }
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_){ anim.loop = loopOn; }
    }
  });
  resetPosBtn?.addEventListener('click', ()=>{
    if (readOnly) return;
    pos.dx = 0; pos.dy = 0; layout();
  });

  /* Share */
  function snapshot(){
    return {
      v: 3,
      bg: bgImg.src || null,
      overlay: overlaySrc || null,
      lot: lastLottieJSON || null,
      pos: { dx: pos.dx, dy: pos.dy },
      opts: { loop: !!loopOn },
      bgx: bgx
    };
  }
  function localPackedLink(){
    const json = JSON.stringify(snapshot());
    const packed = (window.LZString && LZString.compressToEncodedURIComponent)
      ? LZString.compressToEncodedURIComponent(json)
      : encodeURIComponent(json);
    return location.origin + location.pathname + '?d=' + packed;
  }
  async function withLoading(btn, fn){
    if (!btn) return fn();
    const original = btn.textContent;
    btn.classList.add('loading');
    btn.textContent = original === 'Поделиться' ? 'Ссылка…' : 'Обновление…';
    try { return await fn(); }
    finally { btn.classList.remove('loading'); btn.textContent = original; }
  }

  shareBtn?.addEventListener('click', async ()=>{
    if (readOnly) return;
    await withLoading(shareBtn, async ()=>{
      if (!bgImg.src && !lastLottieJSON){ showToastNear(shareBtn, 'Загрузите фон или Lottie'); return; }

      try {
        if (!shareId){
          const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(snapshot()) });
          if (!resp.ok) throw new Error('share failed');
          const data = await resp.json();
          shareId = String(data.id || '');
          localStorage.setItem(LS_SHARE_KEY, shareId);
          copyBtn.disabled = false;
          shareBtn.textContent = 'Обновить';
          isOwner = true; readOnly = false;
          applyOwnershipUI();
        } else {
          const resp = await fetch('/api/share?id=' + encodeURIComponent(shareId), { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(snapshot()) });
          if (!resp.ok) throw new Error('update failed');
        }
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(shareId);
        await copyText(link);
        showToastNear(copyBtn, 'Скопировано');
      } catch(e){
        const link = localPackedLink();
        await copyText(link);
        copyBtn.disabled = false;
        showToastNear(copyBtn, 'Скопировано (локально)');
      }
    });
  });

  copyBtn?.addEventListener('click', async ()=>{
    const link = shareId
      ? (location.origin + location.pathname + '?id=' + encodeURIComponent(shareId))
      : localPackedLink();
    await copyText(link);
    showToastNear(copyBtn, 'Скопировано');
  });

  function applyOwnershipUI(){
    if (isOwner){
      [pickBtn, loopChk, resetPosBtn, shareBtn, copyBtn].forEach(el=> el && (el.style.display=''));
      readOnly = false;
      return;
    }
    [pickBtn, loopChk, resetPosBtn, shareBtn, copyBtn].forEach(el=> el && (el.style.display='none'));
    readOnly = true;
    layout();
  }

  /* Загрузка из ссылки — порядок фикс */
  (async function loadFromLink(){
    const qs = new URLSearchParams(location.search);
    const id = qs.get('id');
    const d  = qs.get('d');

    const ownerId = localStorage.getItem(LS_SHARE_KEY) || '';

    if (!id && !d){ applyOwnershipUI(); layout(); return; }

    try {
      if (id){
        shareId = String(id);
        isOwner = (shareId && shareId === ownerId);
        readOnly = !isOwner;
        applyOwnershipUI();

        const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
        if (!resp.ok) throw new Error('404');
        const snap = await resp.json();

        // 1) pos и bgx сначала
        if (snap.pos && Number.isFinite(snap.pos.dx) && Number.isFinite(snap.pos.dy)){
          pos.dx = snap.pos.dx|0; pos.dy = snap.pos.dy|0;
        } else { pos.dx = 0; pos.dy = 0; }
        const sx = clampBgx(snap.bgx); if (sx) bgx = sx;

        // 2) overlay сразу
        if (snap.overlay){ overlaySrc = snap.overlay; ovImg.src = overlaySrc; }

        // 3) фон и лотти
        if (snap.bg)  await setBackgroundFromSrc(snap.bg, bgx);
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }

        // 4) loop
        if (snap.opts && typeof snap.opts.loop === 'boolean'){
          loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn;
        }

        layout();
        if (isOwner){ shareBtn.textContent = 'Обновить'; copyBtn.disabled = false; }
        return;
      }

      if (d){
        const json = (window.LZString && LZString.decompressFromEncodedURIComponent)
          ? LZString.decompressFromEncodedURIComponent(d)
          : decodeURIComponent(d);
        const snap = JSON.parse(json);

        if (snap.pos && Number.isFinite(snap.pos.dx) && Number.isFinite(snap.pos.dy)){
          pos.dx = snap.pos.dx|0; pos.dy = snap.pos.dy|0;
        } else { pos.dx = 0; pos.dy = 0; }
        const sx = clampBgx(snap.bgx); if (sx) bgx = sx;

        if (snap.overlay){ overlaySrc = snap.overlay; ovImg.src = overlaySrc; }
        if (snap.bg)  await setBackgroundFromSrc(snap.bg, bgx);
        if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
        if (snap.opts && typeof snap.opts.loop === 'boolean'){
          loopOn = !!snap.opts.loop; if (loopChk) loopChk.checked = loopOn;
        }

        shareId = null; isOwner = false; readOnly = false;
        applyOwnershipUI();
        layout();
      }
    } catch(e){
      console.error(e);
      applyOwnershipUI();
      layout();
    }
  })();

  /* misc */
  window.addEventListener('resize', ()=>{ layout(); });
  window.visualViewport && window.visualViewport.addEventListener('resize', layout);

  // init
  layout();
});
