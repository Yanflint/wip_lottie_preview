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
let readOnly = false;  // «просмотр» при открытии чужой ссылки
let isOwner = true;    // владелец ли текущего снимка
let shareId = null;    // id снимка в Netlify Blobs

// фон
let bgNatW = 0, bgNatH = 0;
let bgx = 1; // bg fit: 0 — contain, 1 — cover (default)
let overlaySrc = null;

// позиция смещения контента (drag)
const pos = { dx: 0, dy: 0 };

// лотти
let anim = null;
let loopOn = true;
let lastLottieJSON = null;

// retina масштаб
let nx = 1;

// --- utils DOM ---
function setDisplay(el, on){ if (!el) return; el.style.display = on ? '' : 'none'; }
function setClass(el, cls, on){ if (!el) return; el.classList.toggle(cls, !!on); }
function showToastNear(anchor, text){
  if (!anchor) return alert(text);
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = text;
  document.body.appendChild(div);
  const rect = anchor.getBoundingClientRect();
  const x = rect.left + rect.width/2 - div.offsetWidth/2;
  const y = rect.top - 8 - div.offsetHeight;
  div.style.left = Math.max(8, Math.min(window.innerWidth - div.offsetWidth - 8, x)) + 'px';
  div.style.top  = Math.max(8, y) + 'px';
  setTimeout(()=> div.remove(), 1500);
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  } catch(_){
    try{
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      return true;
    } catch(_){
      return false;
    }
  }
}

function canonicalOrigin(){
  // Приводим origin к каноническому виду без параметров, чтобы ссылки сгенерились стабильно
  try{
    const u = new URL(location.href);
    return u.origin;
  } catch(_){
    return location.origin || '';
  }
}

function clampBgx(x){ x = +x; if (!Number.isFinite(x)) return 1; return Math.max(0, Math.min(1, x)); }

// --- init ---
function bindDom(){
  wrapper     = $('#wrapper');
  preview     = $('#preview');
  bgImg       = $('#bg');
  ovImg       = $('#overlay');
  phEl        = $('#ph');
  dropOverlay = $('#drop');
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

  // drag drop
  ['dragenter','dragover'].forEach(evt => {
    document.addEventListener(evt, (e)=>{
      e.preventDefault(); e.stopPropagation();
      dropOverlay && (dropOverlay.style.display = 'flex');
    });
  });
  ['dragleave','drop'].forEach(evt => {
    document.addEventListener(evt, (e)=>{
      e.preventDefault(); e.stopPropagation();
      if (evt==='drop'){
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length){
          handleFiles(dt.files);
        }
      }
      dropOverlay && (dropOverlay.style.display = 'none');
    });
  });

  // files
  pickBtn?.addEventListener('click', ()=> filePick?.click());
  filePick?.addEventListener('change', ()=> handleFiles(filePick.files || []));

  // buttons
  restartBtn?.addEventListener('click', restart);
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
  // КЛЮЧЕВАЯ ПРАВКА: используем hash (#d=...), чтобы ссылка реже ломалась
  return canonicalOrigin() + location.pathname + '#d=' + packed;
}

async function doShareOrUpdate(){
  if (!shareBtn) return;
  const original = shareBtn.textContent;
  shareBtn.classList.add('loading');
  shareBtn.textContent = shareId ? 'Обновляю…' : 'Публикую…';
  try{
    // подготовим снимок
    const body = snapshot();

    if (!shareId){
      // создаём новый
      const resp = await fetch('/.netlify/functions/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error('create failed');
      const { id } = await resp.json();
      shareId = String(id);
      addOwnedId(shareId);
    } else {
      // обновляем существующий
      const resp = await fetch('/.netlify/functions/share?id=' + encodeURIComponent(shareId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
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

// ---------- ownership ----------
function addOwnedId(id){
  try{
    const list = JSON.parse(localStorage.getItem(LS_OWNED_IDS) || '[]');
    if (!Array.isArray(list)) return localStorage.removeItem(LS_OWNED_IDS);
    if (!list.includes(id)){ list.push(id); localStorage.setItem(LS_OWNED_IDS, JSON.stringify(list)); }
  } catch(_){}
}
function isOwnedId(id){
  try{
    const list = JSON.parse(localStorage.getItem(LS_OWNED_IDS) || '[]');
    return Array.isArray(list) && list.includes(id);
  } catch(_){ return false; }
}

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
  // зритель чужого снимка
  [pickBtn, resetPosBtn, shareBtn, restartBtn].forEach(el=> setDisplay(el, false));
  setDisplay(copyBtn, true);
  setDisplay(loopLabel, true);
  readOnly = true;
}

// ---------- files ----------
function isImageFile(f){ return f && (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)); }
function isJsonFile(f){ return f && (f.type==='application/json' || /\.json$/i.test(f.name)); }

async function handleFiles(fileList){
  if (!fileList || !fileList.length) return;
  // определим, что принесли — фон/оверлей или лотти
  const imgFiles = []; const jsonFiles = [];
  for (const f of fileList){
    if (isImageFile(f)) imgFiles.push(f);
    else if (isJsonFile(f)) jsonFiles.push(f);
  }
  for (const f of imgFiles) await setBackgroundFromFile(f);
  for (const f of jsonFiles) await loadLottieFromFile(f);
  layout();
}

function restart(){
  shareId = null; isOwner = true; readOnly = false;
  overlaySrc = null;
  bgImg.src = ''; bgNatW = bgNatH = 0; bgx = 1;
  pos.dx = 0; pos.dy = 0;
  lastLottieJSON = null;
  if (anim){ try { anim.destroy?.(); } catch(_){ /* noop */ } anim = null; }
  loopOn = true; if (loopChk){ loopChk.checked = true; }
  applyOwnershipUI(); layout();
}

// ---------- background / overlay ----------
async function setBackgroundFromFile(file){
  const url = URL.createObjectURL(file);
  await setBackgroundFromSrc(url, bgx);
}
async function setBackgroundFromSrc(src, x){
  return new Promise((resolve)=>{
    bgImg.onload = ()=>{
      bgNatW = bgImg.naturalWidth  || bgImg.width  || 0;
      bgNatH = bgImg.naturalHeight || bgImg.height || 0;
      bgx = clampBgx(x);
      layout();
      resolve();
    };
    bgImg.onerror = ()=> resolve();
    bgImg.src = src || '';
  });
}
function setOverlayFromSrc(src){
  overlaySrc = src || null;
  ovImg.src = overlaySrc || '';
  layout();
}

// ---------- lottie ----------
function ensureLottie(){
  if (window.lottie) return window.lottie;
  throw new Error('Lottie is not loaded');
}
async function loadLottieFromFile(file){
  try{
    const text = await file.text();
    const json = JSON.parse(text);
    lastLottieJSON = json;
    loadLottieFromData(json);
  } catch(e){ console.error(e); }
}
function loadLottieFromData(json){
  try{
    const lottie = ensureLottie();
    if (anim){ try { anim.destroy?.(); } catch(_){ /* noop */ } anim = null; }
    lottieMount.innerHTML = '';
    anim = lottie.loadAnimation({
      container: lottieMount,
      renderer: 'svg',
      loop: loopOn,
      autoplay: true,
      animationData: json
    });
    try { anim.setLooping?.(loopOn); } catch(_){ anim.loop = loopOn; }
  } catch(e){ console.error(e); }
}

// ---------- layout / drag ----------
function isMobile(){
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
}
function layout(){
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  // ретина коэффициент (простой): 1x до 900px, иначе 2x
  nx = (Math.max(w,h) > 900 ? 2 : 1);
  document.documentElement.style.setProperty('--nx', String(nx));

  // фон
  const mode = bgx<0.5 ? 'contain' : 'cover';
  bgImg.style.objectFit = mode;

  // позиция смещения
  const tx = Math.round(pos.dx);
  const ty = Math.round(pos.dy);
  const t = `translate(${tx}px, ${ty}px)`;
  lottieMount.style.transform = t;
  ovImg.style.transform = t;

  // HUD
  posHud.textContent = `${tx}, ${ty}px`;
  setDisplay(phEl, !(bgImg.src || lastLottieJSON));
}
function beginDrag(e){
  if (readOnly) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const baseX = pos.dx;
  const baseY = pos.dy;

  function mm(ev){
    ev.preventDefault();
    pos.dx = baseX + (ev.clientX - startX);
    pos.dy = baseY + (ev.clientY - startY);
    layout();
  }
  function up(){
    window.removeEventListener('mousemove', mm);
    window.removeEventListener('mouseup', up);
  }
  window.addEventListener('mousemove', mm);
  window.addEventListener('mouseup', up);
}

preview?.addEventListener('mousedown', (e)=>{
  if (e.button!==0) return;
  if (e.target===filePick) return;
  beginDrag(e);
});

// колесо меняет режим bg-fit (contain/cover)
preview?.addEventListener('wheel', (e)=>{
  if (readOnly) return;
  if (e.ctrlKey || e.metaKey) return; // не мешаем системному зуму
  if (!bgImg.src) return; // без фона — нечего крутить
  const delta = Math.sign(e.deltaY);
  const next = clampBgx(bgx + (delta>0 ? 1 : -1));
  if (next !== bgx){ bgx = next; layout(); }
});

// ---------- link handling ----------
async function loadFromLink(){
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id');
  // читаем d и из query, и из hash (#d=...)
  const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const d  = qs.get('d') || hashParams.get('d');

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
    applyOwnershipUI();
    layout();
    // очищаем адресную строку от #d=..., чтобы ссылка стала аккуратной
    history.replaceState(null, '', location.pathname);
    return;
  }

  // id=… → владелец если id в localStorage
  if (id){
    shareId = String(id);
    isOwner = isOwnedId(shareId);
    readOnly = !isOwner;

    try{
      const resp = await fetch('/.netlify/functions/shot?id=' + encodeURIComponent(shareId));
      if (resp.ok){
        const snap = await resp.json();
        // порядок: pos/bgx → overlay → фон → лотти → loop
        if (snap.pos){ pos.dx = snap.pos.dx|0; pos.dy = snap.pos.dy|0; }
        if (snap.bgx){ bgx = clampBgx(snap.bgx); }
        if (snap.overlay){ overlaySrc = snap.overlay; ovImg.src = overlaySrc; }
        if (snap.bg){ await setBackgroundFromSrc(snap.bg, bgx); }
        if (snap.lot){ lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
        if (snap.opts && typeof snap.opts.loop === 'boolean'){ loopOn = !!snap.opts.loop; loopChk && (loopChk.checked = loopOn); }
      }
      applyOwnershipUI();
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

// ---------- boot ----------
async function boot(){
  bindDom();
  applyOwnershipUI();
  await loadFromLink();
  layout();
}

document.addEventListener('DOMContentLoaded', boot);
