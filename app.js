/* v74 — viewer/owner, pos+overlay in share, retina @nx, canonical link, Netlify functions
   Автор: обновление под простую статическую структуру (index.html + app.js + style.css)
*/

'use strict';

const VERSION = 'v74';
const LS_OWNED_IDS = 'lp_owned_ids'; // список id, которые вы создавали → вы «владелец»

// --- DOM ---
const $ = (sel) => document.querySelector(sel);
let wrapper, preview, bgImg, ovImg, phEl, dropOverlay, posHud;
let pickBtn, filePick, restartBtn, loopChk, resetPosBtn, shareBtn, copyBtn, verEl;
let lotStage, lottieMount;

// --- STATE ---
let MOBILE = false;
let anim = null, animName = null, lastLottieJSON = null;
let loopOn = true;

let bgNatW = 360, bgNatH = 800;  // натуральные размеры загруженного фона
let bgx    = 1;                  // DPR из имени: @2x/@3x/@4x → 2/3/4; логическая ширина = nat / bgx

let overlaySrc = null;           // dataURL верхнего слоя
let lotNomW = 0, lotNomH = 0;    // номинальные размеры лотти (из JSON)
let pos = { dx: 0, dy: 0 };      // смещение лотти (в логических px фона, от центра)

let shareId = null;              // id снимка (если шарили через функции)
let isOwner = false;             // владелец ли текущий пользователь этого id
let readOnly = false;            // режим просмотра

// --- INIT ---
document.addEventListener('DOMContentLoaded', init);

function init() {
  // DOM
  wrapper     = $('#wrapper');
  preview     = $('#preview');
  bgImg       = $('#bgImg');
  ovImg       = $('#ovImg');
  phEl        = $('#ph');
  dropOverlay = $('#dropOverlay');
  posHud      = $('#posHud');

  pickBtn     = $('#pickBtn');
  filePick    = $('#filePick');
  restartBtn  = $('#restartBtn');
  loopChk     = $('#loopChk');
  resetPosBtn = $('#resetPosBtn');
  shareBtn    = $('#shareBtn');
  copyBtn     = $('#copyBtn');
  verEl       = $('#ver');

  lotStage    = $('#lotStage');
  lottieMount = $('#lottie');

  MOBILE = isMobile();
  verEl && (verEl.textContent = VERSION);
  MOBILE && document.body.classList.add('is-mobile');

  bindUI();
  loadFromLink(); // решает owner/viewer и поднимает снапшот
  layout();

  window.addEventListener('resize', layout);
  window.visualViewport && window.visualViewport.addEventListener('resize', layout);
}

// ---------- UTILS ----------
function isMobile(){
  const ua = navigator.userAgent || '';
  const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const small = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
  const uaMob= /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
  return (touch || uaMob) && small;
}
function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
function setDisplay(el, show){ if (el) el.style.display = show ? '' : 'none'; }
function showToastNear(el, msg){
  const toast = $('#toast'); if (!toast) return;
  toast.textContent = msg;
  const r = el?.getBoundingClientRect?.();
  if (r){ toast.style.left = (r.left + r.width/2) + 'px'; toast.style.top = r.top + 'px'; }
  else { toast.style.left = '50%'; toast.style.top = (window.innerHeight - 24) + 'px'; }
  toast.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(()=>toast.classList.remove('show'), 1400);
}
async function copyText(s){
  try { await navigator.clipboard.writeText(s); }
  catch(_){
    const ta = document.createElement('textarea'); ta.value = s;
    ta.style.position='fixed'; ta.style.left='-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  }
}
function getOwnedIds(){
  try { const raw = localStorage.getItem(LS_OWNED_IDS); const arr = raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }
  catch(_){ return []; }
}
function addOwnedId(id){
  try { const arr = getOwnedIds(); if(!arr.includes(id)){ arr.push(id); localStorage.setItem(LS_OWNED_IDS, JSON.stringify(arr)); } }
  catch(_){}
}
function isOwnedId(id){ return !!id && getOwnedIds().includes(id); }
function detectBgScaleFromName(name){
  if (!name) return 1;
  const m = /@([234])x(?=\.|$)/i.exec(name);
  if (!m) return 1;
  const n = +m[1]; return (n===2||n===3||n===4)?n:1;
}
function clampBgx(n){ if(!Number.isFinite(n)) return 1; n|=0; return Math.max(1, Math.min(4, n)); }
function logicalSize(){ return { w: Math.max(1, Math.round(bgNatW / bgx)), h: Math.max(1, Math.round(bgNatH / bgx)) }; }
function getPreviewScale(){
  const rectW = preview.getBoundingClientRect().width || 1;
  const logicalW = preview.clientWidth || rectW;
  return rectW / logicalW;
}
function canonicalOrigin(){
  // если локально — всё равно берём текущее origin; иначе тоже
  return location.origin;
}

// ---------- LAYOUT ----------
function layout(){
  const { w: lw, h: lh } = logicalSize();

  if (MOBILE){
    const vw = (window.visualViewport?.width) || window.innerWidth;
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

  if (overlaySrc) ovImg.src = overlaySrc;

  if (posHud){
    const lotInfo = (lotNomW && lotNomH) ? ` | lot:${lotNomW}×${lotNomH}` : '';
    posHud.textContent = `x:${pos.dx>=0?'+':''}${pos.dx} y:${pos.dy>=0?'+':''}${pos.dy} px · dpr:${bgx}x${lotInfo}`;
    posHud.style.display = (MOBILE || readOnly) ? 'none' : 'block';
  }
}

// ---------- FILE IO ----------
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
function loadImageMeta(src){
  return new Promise((res)=>{
    const im = new Image();
    im.onload = ()=> res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = ()=> res({ w:0,h:0 });
    im.src = src;
  });
}

// ---------- BG / OVERLAY / LOTTIE ----------
async function setBackgroundFromFile(file){
  const src = await readAsDataURL(file);
  const detected = detectBgScaleFromName(file?.name);
  await setBackgroundFromSrc(src, detected || 1);
}
async function setBackgroundFromSrc(src, scaleHint=1){
  const meta = await loadImageMeta(src);
  bgNatW = meta.w || 0;
  bgNatH = meta.h || 0;
  bgx    = clampBgx(scaleHint || 1);
  bgImg.src = src;
  phEl && phEl.classList.add('hidden');
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
  try { anim?.destroy?.(); } catch(_){}
  anim = null; animName = null;
  while (lottieMount.firstChild) lottieMount.removeChild(lottieMount.firstChild);
}

// ---------- UI BIND ----------
function bindUI(){
  // PNG/Lottie кнопка
  if (pickBtn && filePick){
    pickBtn.addEventListener('click', ()=> { if(!readOnly) filePick.click(); });
    filePick.addEventListener('change', async (e)=>{
      if (readOnly) { e.target.value=''; return; }
      const f = e.target.files?.[0]; if (!f) return;
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
      } finally { e.target.value = ''; }
    });
  }

  // DnD (три зоны в одном контейнере)
  let dragDepth = 0;
  document.addEventListener('dragenter',(e)=>{ e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
  document.addEventListener('dragover', (e)=>{ e.preventDefault(); });
  document.addEventListener('dragleave',(e)=>{ e.preventDefault(); dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) document.body.classList.remove('dragging'); });
  document.addEventListener('drop',     async (e)=>{
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) { document.body.classList.remove('dragging'); dragDepth=0; return; }
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
      // самая большая → фон, вторая → overlay
      const metas = await Promise.all(imgs.map(async f=>{
        const src = await readAsDataURL(f);
        const m = await loadImageMeta(src);
        return { f, area:(m.w||0)*(m.h||0) };
      }));
      metas.sort((a,b)=>b.area-a.area);
      if (metas[0]) await setBackgroundFromFile(metas[0].f);
      if (metas[1]) await setOverlayFromFile(metas[1].f);
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

  // Перетаскивание лотти
  let drag = null;
  lotStage.addEventListener('pointerdown', (e)=>{
    if (readOnly || !lotNomW || !lotNomH) return;
    e.preventDefault();
    const scale = getPreviewScale();
    drag = { startX:e.clientX, startY:e.clientY, startDx:pos.dx, startDy:pos.dy, scale };
    lotStage.classList.add('dragging'); $('.overlay')?.classList.add('dim');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd, { once:true });
  });
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
    lotStage.classList.remove('dragging'); $('.overlay')?.classList.remove('dim');
    drag = null;
  }

  // клавиатура
  window.addEventListener('keydown', (e)=>{
    if (readOnly || MOBILE) return;
    if (/input|textarea|select/i.test(e.target?.tagName||'')) return;
    let step = e.shiftKey ? 10 : 1, used=false;
    if (e.key==='ArrowLeft')  { pos.dx -= step; used=true; }
    if (e.key==='ArrowRight') { pos.dx += step; used=true; }
    if (e.key==='ArrowUp')    { pos.dy -= step; used=true; }
    if (e.key==='ArrowDown')  { pos.dy += step; used=true; }
    if (e.key.toLowerCase()==='r') { pos.dx=0; pos.dy=0; used=true; }
    if (used){ e.preventDefault(); layout(); }
  });

  // мобайл: тап = повтор
  if (MOBILE) {
    wrapper.addEventListener('click', ()=>{
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  }

  restartBtn?.addEventListener('click', ()=>{
    if (!anim) return; try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });
  loopChk?.addEventListener('change', ()=>{
    if (readOnly){ loopChk.checked = loopOn; return; }
    loopOn = !!loopChk.checked;
    if (anim){ try { anim.setLooping?.(loopOn); } catch(_){ anim.loop = loopOn; } }
  });
  resetPosBtn?.addEventListener('click', ()=>{ if(!readOnly){ pos.dx=0; pos.dy=0; layout(); } });

  // Share / Copy
  shareBtn?.addEventListener('click', doShareOrUpdate);
  copyBtn?.addEventListener('click', async ()=>{
    const link = shareId
      ? (canonicalOrigin() + location.pathname + '?id=' + encodeURIComponent(shareId))
      : localPackedLink();
    await copyText(link); showToastNear(copyBtn, 'Скопировано');
  });
}

// ---------- SHARE ----------
function snapshot(){
  return {
    v: 3,
    bg: bgImg.src || null,
    overlay: overlaySrc || null,
    lot: lastLottieJSON || null,
    pos: { dx: pos.dx, dy: pos.dy },
    opts: { loop: !!loopOn },
    bgx: bgx,
    bgNatural: { w: bgNatW, h: bgNatH }
  };
}
function localPackedLink(){
  const json = JSON.stringify(snapshot());
  const packed = (window.LZString?.compressToEncodedURIComponent)
      ? window.LZString.compressToEncodedURIComponent(json)
      : encodeURIComponent(json);
  return canonicalOrigin() + location.pathname + '?d=' + packed;
}
async function doShareOrUpdate(){
  if (readOnly) return;
  if (!bgImg.src && !lastLottieJSON){ showToastNear(shareBtn, 'Загрузите фон или Lottie'); return; }

  shareBtn.classList.add('loading');
  const original = shareBtn.textContent;
  shareBtn.textContent = shareId ? 'Обновление…' : 'Ссылка…';

  try{
    if (!shareId){
      // create
      const resp = await fetch('/.netlify/functions/share', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify(snapshot())
      });
      if (!resp.ok) throw new Error('share failed');
      const data = await resp.json();
      shareId = String(data.id || '');
      addOwnedId(shareId);
      shareBtn.textContent = 'Обновить';
      copyBtn && (copyBtn.disabled = false);
      isOwner = true; readOnly = false;
      applyOwnershipUI();
    } else {
      // update
      const resp = await fetch('/.netlify/functions/share?id=' + encodeURIComponent(shareId), {
        method:'PUT',
        headers:{'content-type':'application/json'},
        body: JSON.stringify(snapshot())
      });
      if (!resp.ok) throw new Error('update failed');
    }
    const link = canonicalOrigin() + location.pathname + '?id=' + encodeURIComponent(shareId);
    await copyText(link); showToastNear(copyBtn||shareBtn, 'Скопировано');
  } catch(e){
    // fallback: локальная d-ссылка (но с корректным origin!)
    const link = localPackedLink();
    await copyText(link);
    copyBtn && (copyBtn.disabled = false);
    showToastNear(copyBtn||shareBtn, 'Скопировано (локально)');
  } finally {
    shareBtn.classList.remove('loading');
    shareBtn.textContent = shareId ? 'Обновить' : original;
  }
}

// ---------- OWNER / VIEWER ----------
function applyOwnershipUI(){
  const loopLabel = loopChk?.closest('label');
  if (!shareId || isOwner){
    [pickBtn, resetPosBtn, shareBtn, copyBtn, restartBtn].forEach(el=> setDisplay(el, true));
    setDisplay(loopLabel, true);
    readOnly = false;
    if (!shareId && copyBtn) copyBtn.disabled = true;
    if (!shareId && shareBtn) shareBtn.textContent = 'Поделиться';
    return;
  }
  // зритель
  [pickBtn, resetPosBtn, shareBtn, copyBtn].forEach(el=> setDisplay(el, false));
  setDisplay(loopLabel, false);
  setDisplay(restartBtn, true);
  readOnly = true;
  layout();
}

async function loadFromLink(){
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id');
  const d  = qs.get('d');

  // d=… → всегда «просмотр» (только Play)
  if (d && !id){
    try{
      const json = (window.LZString?.decompressFromEncodedURIComponent)
        ? window.LZString.decompressFromEncodedURIComponent(d)
        : decodeURIComponent(d);
      const snap = JSON.parse(json);

      // порядок: pos/bgx → overlay → фон → лотти → loop
      if (snap.pos){ pos.dx = snap.pos.dx|0; pos.dy = snap.pos.dy|0; }
      if (snap.bgx){ bgx = clampBgx(snap.bgx); }
      if (snap.overlay){ overlaySrc = snap.overlay; ovImg.src = overlaySrc; }
      if (snap.bg){ await setBackgroundFromSrc(snap.bg, bgx); }
      if (snap.lot){ lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      if (snap.opts && typeof snap.opts.loop === 'boolean'){ loopOn = !!snap.opts.loop; loopChk && (loopChk.checked = loopOn); }
    } catch(_){}
    shareId = null; isOwner = false; readOnly = true;
    applyOwnershipUI(); layout(); return;
  }

  // id=… → владелец если id в localStorage
  if (id){
    shareId = String(id);
    isOwner = isOwnedId(shareId);
    readOnly = !isOwner;
    applyOwnershipUI();

    try{
      const resp = await fetch('/.netlify/functions/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.pos){ pos.dx = snap.pos.dx|0; pos.dy = snap.pos.dy|0; } else { pos.dx=0; pos.dy=0; }
      if (snap.bgx){ bgx = clampBgx(snap.bgx); }
      if (snap.overlay){ overlaySrc = snap.overlay; ovImg.src = overlaySrc; }
      if (snap.bg){ await setBackgroundFromSrc(snap.bg, bgx); }
      if (snap.lot){ lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      if (snap.opts && typeof snap.opts.loop === 'boolean'){ loopOn = !!snap.opts.loop; loopChk && (loopChk.checked = loopOn); }
    } catch(e){
      // если не нашли снимок — переключим в локальный редактор
      shareId = null; isOwner = true; readOnly = false; applyOwnershipUI();
    }
    layout(); return;
  }

  // без параметров — локальный редактор
  shareId = null; isOwner = true; readOnly = false;
  applyOwnershipUI(); layout();
}

// ---------- helpers ----------
function isImageFile(f){ return f && (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)); }
function isJsonFile(f){ return f && (f.type==='application/json' || /\.json$/i.test(f.name)); }
