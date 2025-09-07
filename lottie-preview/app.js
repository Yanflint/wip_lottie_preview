/* Lottie Preview — Editor + Viewer
 * Version is embedded below
 */
const VERSION = "1.0.0-" + new Date().toISOString().slice(0,10);

const els = {
  preview: document.getElementById('preview'),
  bgCanvas: document.getElementById('bgCanvas'),
  lottieHost: document.getElementById('lottieHost'),
  overlay: document.getElementById('overlayImg'),
  hint: document.getElementById('dropHint'),
  zones: {
    bg: document.querySelector('.zone-bg'),
    lot: document.querySelector('.zone-lot'),
    ov: document.querySelector('.zone-ov'),
  },
  btnFile: document.getElementById('btnFile'),
  fileInput: document.getElementById('fileInput'),
  btnShare: document.getElementById('btnShare'),
  btnCopyLink: document.getElementById('btnCopyLink'),
  btnPlay: document.getElementById('btnPlay'),
  btnResetPos: document.getElementById('btnResetPos'),
  chkLoop: document.getElementById('chkLoop'),
  toast: document.getElementById('toast'),
  version: document.getElementById('version'),
  controls: document.getElementById('controls'),
  previewWrap: document.getElementById('previewWrap'),
};

// State
const state = {
  v: 3,
  bg: null,                  // dataURL or absolute
  bgx: 1,
  bgNatural: { w: 0, h: 0 },
  overlay: null,
  lot: null,                 // parsed JSON
  pos: { dx: 0, dy: 0 },
  opts: { loop: true },
  id: null,                  // share id
  isOwner: true,             // role
  logical: { w: 0, h: 0, scale: 1 }, // scale for mobile fit
  dragging: false,
  dragBase: { x: 0, y: 0, dx: 0, dy: 0 },
  player: null,
};

// —— Helpers
function showToast() {
  els.toast.style.opacity = 1;
  setTimeout(() => els.toast.style.opacity = 0, 1400);
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(showToast);
}
function filenameDPR(name) {
  const m = name.match(/@([234])x/i);
  return m ? parseInt(m[1], 10) : 1;
}
function isImageFile(f) {
  return /\.(png|jpe?g|webp)$/i.test(f.name);
}
function isJSONFile(f) {
  return /\.(json)$/i.test(f.name);
}
function routeByNameOrZone(file, zone) {
  const name = file.name.toLowerCase();
  const byNameBG = /(\b(bg|1)\b|@([234])x|@nx)/i.test(name);
  const byNameOV = /(\b(overlay|ov|2)\b)/i.test(name);
  if (zone === 'lot' || isJSONFile(file)) return 'lot';
  if (zone === 'ov' || byNameOV) return 'overlay';
  if (zone === 'bg' || byNameBG || isImageFile(file)) return 'bg';
  return 'unknown';
}
function absoluteOriginPath() {
  return location.origin + location.pathname;
}
function ownerKeySet(id) {
  const arr = JSON.parse(localStorage.getItem('own_ids') || '[]');
  if (!arr.includes(id)) {
    arr.push(id);
    localStorage.setItem('own_ids', JSON.stringify(arr));
  }
}
function ownerHas(id) {
  const arr = JSON.parse(localStorage.getItem('own_ids') || '[]');
  return arr.includes(id);
}
function setViewerUI(viewer) {
  els.btnShare.style.display = viewer ? 'none' : '';
  els.btnCopyLink.style.display = viewer ? 'none' : '';
  els.btnFile.style.display = viewer ? 'none' : '';
  els.btnResetPos.style.display = viewer ? 'none' : '';
  els.chkLoop.parentElement.style.display = viewer ? 'none' : '';
  els.btnPlay.style.display = viewer ? '' : '';
  els.hint.style.display = viewer ? 'none' : '';
  els.zones.bg.style.display = viewer ? 'none' : '';
  els.zones.lot.style.display = viewer ? 'none' : '';
  els.zones.ov.style.display = viewer ? 'none' : '';
}

function setOverlayDragging(active) {
  els.overlay.style.opacity = active ? 0.8 : 1;
}

function setVersion() {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  els.version.textContent = isMobile ? '' : VERSION;
}

// —— Scene render & sizing
const ctx = els.bgCanvas.getContext('2d');

function computeLogicalFromBG(natW, natH, dpr) {
  state.bgNatural = { w: natW, h: natH };
  state.bgx = dpr;
  const lw = Math.round(natW / dpr);
  const lh = Math.round(natH / dpr);
  state.logical.w = lw;
  state.logical.h = lh;
  // set canvas size to logical pixels
  els.bgCanvas.width = lw;
  els.bgCanvas.height = lh;
  // size preview to logical
  els.preview.style.width = lw + 'px';
  els.preview.style.height = lh + 'px';
  // overlay host size
  els.overlay.style.width = '100%';
  els.overlay.style.height = '100%';
  fitMobile();
}

function fitMobile() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (!isMobile) {
    state.logical.scale = 1;
    els.previewWrap.style.transform = '';
    els.previewWrap.style.transformOrigin = '';
    return;
  }
  const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
  const scale = vw / state.logical.w;
  state.logical.scale = scale;
  els.previewWrap.style.transform = `scale(${scale})`;
  els.previewWrap.style.transformOrigin = 'top center';
}

window.addEventListener('resize', fitMobile);

// Draw BG
function drawBG(img) {
  ctx.clearRect(0,0,els.bgCanvas.width, els.bgCanvas.height);
  ctx.drawImage(img, 0, 0, els.bgCanvas.width, els.bgCanvas.height);
}

// Load BG file
async function loadBG(file) {
  const dpr = filenameDPR(file.name) || 1;
  const imgURL = await readAsDataURL(file);
  const img = await loadImage(imgURL);
  state.bg = imgURL;
  computeLogicalFromBG(img.naturalWidth, img.naturalHeight, dpr);
  drawBG(img);
  placeLottie(); // re-center if needed
  updateHintVisibility();
}

// Load overlay
async function loadOverlay(file) {
  const url = await readAsDataURL(file);
  state.overlay = url;
  els.overlay.src = url;
  updateHintVisibility();
}

// Load Lottie
async function loadLottie(fileOrJSON) {
  let json, name = 'inline';
  if (fileOrJSON instanceof File) {
    name = fileOrJSON.name;
    try {
      json = JSON.parse(await fileOrText(fileOrJSON));
    } catch (e) {
      alert('Некорректный Lottie JSON');
      return;
    }
  } else {
    json = fileOrJSON;
  }

  destroyLottie();
  state.lot = json;

  // nominal size
  const { w = 0, h = 0 } = json || {};
  els.lottieHost.style.width = `${w}px`;
  els.lottieHost.style.height = `${h}px`;

  // center
  state.pos.dx = Math.round((state.logical.w - w) / 2);
  state.pos.dy = Math.round((state.logical.h - h) / 2);
  applyPos();

  // init player
  state.player = lottie.loadAnimation({
    container: els.lottieHost,
    renderer: 'svg',
    loop: state.opts.loop,
    autoplay: true,
    animationData: json,
    rendererSettings: { progressiveLoad: false },
  });
  lottie.setCacheEnabled(false);

  updateHintVisibility();
}

// Destroy existing lottie
function destroyLottie() {
  if (state.player) {
    try { state.player.destroy(); } catch {}
  }
  state.player = null;
  els.lottieHost.innerHTML = '';
}

// Positioning
function applyPos() {
  els.lottieHost.style.setProperty('--dx', state.pos.dx + 'px');
  els.lottieHost.style.setProperty('--dy', state.pos.dy + 'px');
}

function placeLottie() {
  if (!state.lot) return;
  const { w = 0, h = 0 } = state.lot;
  state.pos.dx = Math.round((state.logical.w - w) / 2);
  state.pos.dy = Math.round((state.logical.h - h) / 2);
  applyPos();
}

// Dragging
function onPointerDown(e) {
  if (!state.lot || state.isViewer) return;
  state.dragging = true;
  setOverlayDragging(true);
  const rect = els.preview.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  state.dragBase = { x, y, dx: state.pos.dx, dy: state.pos.dy };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}
function onPointerMove(e) {
  if (!state.dragging) return;
  const rect = els.preview.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ddx = Math.round((x - state.dragBase.x) / state.logical.scale);
  const ddy = Math.round((y - state.dragBase.y) / state.logical.scale);
  state.pos.dx = state.dragBase.dx + ddx;
  state.pos.dy = state.dragBase.dy + ddy;
  applyPos();
}
function onPointerUp() {
  state.dragging = false;
  setOverlayDragging(false);
  window.removeEventListener('pointermove', onPointerMove);
}

// Keyboard arrows
function onKeyDown(e) {
  if (!state.lot || state.isViewer) return;
  let step = e.shiftKey ? 10 : 1;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    if (e.key === 'ArrowLeft') state.pos.dx -= step;
    if (e.key === 'ArrowRight') state.pos.dx += step;
    if (e.key === 'ArrowUp') state.pos.dy -= step;
    if (e.key === 'ArrowDown') state.pos.dy += step;
    applyPos();
  }
}

// Tap to restart on mobile / viewer
function restart() {
  if (state.player) {
    state.player.stop();
    state.player.play();
  }
}

// File helpers
function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}
function fileOrText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(r.result);
    r.readAsText(file, 'utf-8');
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// DnD handling
function setupDnD() {
  const area = els.preview;
  const hint = els.hint;

  function over(e) { e.preventDefault(); hint.classList.add('drop'); }
  function leave() { hint.classList.remove('drop'); }

  area.addEventListener('dragenter', over);
  area.addEventListener('dragover', over);
  area.addEventListener('dragleave', leave);
  area.addEventListener('drop', async (e) => {
    e.preventDefault();
    hint.classList.remove('drop');
    const files = [...(e.dataTransfer.files || [])];
    if (!files.length) return;
    const zone = detectZone(e);
    await handleFiles(files, zone);
  });

  // clicks
  els.btnFile.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', async () => {
    const files = [...els.fileInput.files];
    await handleFiles(files, 'auto');
    els.fileInput.value = '';
  });
}

function detectZone(e) {
  const rect = els.preview.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const bl = { w: rect.width * 0.3, h: rect.height * 0.3 };
  const br = { w: rect.width * 0.7, h: rect.height * 0.3 };
  const inBL = (x <= bl.w) && (y >= rect.height - bl.h);
  const inBR = (x >= br.w) && (y >= rect.height - br.h);
  if (inBL) return 'lot';
  if (inBR) return 'ov';
  return 'bg';
}

async function handleFiles(files, zone) {
  if (!files.length) return;
  const f = files[0];
  const route = routeByNameOrZone(f, zone);
  if (route === 'bg') await loadBG(f);
  else if (route === 'overlay') await loadOverlay(f);
  else if (route === 'lot') await loadLottie(f);
  updateHintVisibility();
}

// Hint visibility
function updateHintVisibility() {
  els.hint.style.display = state.bg ? 'none' : 'grid';
}

// Sharing
function makeSnapshot() {
  return {
    v: state.v,
    bg: state.bg,
    bgx: state.bgx,
    bgNatural: state.bgNatural,
    overlay: state.overlay || null,
    lot: state.lot || null,
    pos: { ...state.pos },
    opts: { loop: !!state.opts.loop },
  };
}

async function apiShare(method, id, snapshot) {
  const url = new URL(absoluteOriginPath() + '.netlify/functions/share');
  if (id) url.searchParams.set('id', id);
  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error('share api failed');
  return res.json();
}
async function apiShot(id) {
  const url = new URL(absoluteOriginPath() + '.netlify/functions/shot');
  url.searchParams.set('id', id);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('shot api failed');
  return res.json();
}

function copyLinkWithId(id) {
  const u = new URL(absoluteOriginPath());
  u.searchParams.set('id', id);
  copyToClipboard(u.toString());
}

async function onShare() {
  const snap = makeSnapshot();
  try {
    if (!state.id) {
      const { id } = await apiShare('POST', null, snap);
      state.id = id;
      ownerKeySet(id);
      els.btnShare.textContent = 'Обновить';
      els.btnCopyLink.style.display = '';
      copyLinkWithId(id);
    } else {
      await apiShare('PUT', state.id, snap);
      copyLinkWithId(state.id);
    }
  } catch (e) {
    // fallback ?d=…
    try {
      const packed = LZString.compressToEncodedURIComponent(JSON.stringify(snap));
      const u = new URL(absoluteOriginPath());
      u.searchParams.set('d', packed);
      copyToClipboard(u.toString());
      // switch to viewer-only for safety when using fallback
      state.isViewer = true;
      setViewerUI(true);
    } catch {}
  }
}

// Viewer / Owner detection & restore
async function restoreFromQuery() {
  const q = new URLSearchParams(location.search);
  const id = q.get('id');
  const d = q.get('d');
  if (d) {
    state.isViewer = true;
    setViewerUI(true);
    const json = JSON.parse(LZString.decompressFromEncodedURIComponent(d));
    await restoreSnapshot(json);
    return;
  }
  if (id) {
    state.id = id;
    state.isViewer = !ownerHas(id);
    setViewerUI(state.isViewer);
    try {
      const snap = await apiShot(id);
      await restoreSnapshot(snap);
      if (!state.isViewer) {
        els.btnShare.textContent = 'Обновить';
        els.btnCopyLink.style.display = '';
      }
    } catch (e) {
      // couldn't fetch; keep viewer UI
    }
  } else {
    // fresh editor session
    state.isViewer = false;
    setViewerUI(false);
  }
}

async function restoreSnapshot(snap) {
  // order: pos/bgx → overlay → bg → lottie → loop
  state.pos = snap.pos || { dx: 0, dy: 0 };
  state.bgx = snap.bgx || 1;
  state.bgNatural = snap.bgNatural || state.bgNatural;

  // overlay
  if (snap.overlay) {
    state.overlay = snap.overlay;
    els.overlay.src = snap.overlay;
  } else {
    state.overlay = null;
    els.overlay.removeAttribute('src');
  }

  // bg
  if (snap.bg) {
    state.bg = snap.bg;
    const img = await loadImage(snap.bg);
    computeLogicalFromBG(img.naturalWidth, img.naturalHeight, state.bgx);
    drawBG(img);
  }

  // lottie
  if (snap.lot) {
    await loadLottie(snap.lot);
    state.pos = snap.pos || state.pos;
    applyPos();
  }

  // loop
  state.opts.loop = !!(snap.opts && snap.opts.loop);
  els.chkLoop.checked = state.opts.loop;
}

// UI wiring
function setupUI() {
  setupDnD();
  els.chkLoop.addEventListener('change', () => {
    state.opts.loop = els.chkLoop.checked;
    if (state.player) state.player.loop = state.opts.loop;
  });
  els.btnShare.addEventListener('click', onShare);
  els.btnCopyLink.addEventListener('click', () => state.id && copyLinkWithId(state.id));
  els.btnPlay.addEventListener('click', restart);
  els.btnResetPos.addEventListener('click', () => { placeLottie(); applyPos(); });
  els.preview.addEventListener('pointerdown', onPointerDown);
  els.preview.addEventListener('keydown', onKeyDown);
  els.preview.addEventListener('click', (e) => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile || state.isViewer) restart();
  });
  setVersion();
}

// Kickoff
(async function init() {
  setupUI();
  await restoreFromQuery();
})();