// src/app/rlottieTT.js
// Dynamic integration with TamTam's RLottie WASM player (https://tamtam-chat.github.io/lottie-player/).
// We load the ESM bundle at runtime and use its Worker-based renderer.
// This avoids bundling and guarantees "real rlottie" parity with their viewer.
//
// NOTE: Cross-origin workers require special handling; TamTam's player supports updateConfig({ workerUrl }).
// We set workerUrl to their public worker.js URL.

const TT_MODULE_URL = 'https://tamtam-chat.github.io/lottie-player/index.js';
const TT_WORKER_URL = 'https://tamtam-chat.github.io/lottie-player/worker.js';

async function loadTT() {
  // cache on window to avoid re-loading
  if (window.__tt_mod) return window.__tt_mod;
  const mod = await import(/* @vite-ignore */ TT_MODULE_URL);
  if (mod?.updateConfig) {
    try {
      await mod.updateConfig({
        workerUrl: async () => {
          const resp = await fetch(TT_WORKER_URL, { mode: 'cors', credentials: 'omit' });
          const blob = await resp.blob();
          return URL.createObjectURL(blob);
        }
      });
    } catch {}
  }
  window.__tt_mod = mod;
  return mod;
}

function makeEventTarget(){
  const listeners = new Map();
  return {
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    dispatch(type, detail){ listeners.get(type)?.forEach(fn => { try{ fn(detail); } catch(e){} }); },
  };
}

export async function createTTPlayer({ container, loop=false, autoplay=false, animationData }) {
  if (!container) throw new Error('rlottieTT: container required');

  // Prepare canvas target
  const canvas = document.createElement('canvas');
  canvas.className = 'tt-rlottie-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-label', 'rlottie canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  const ev = makeEventTarget();
  const mod = await loadTT();
  // TamTam player accepts either URL or JSON string/object via "movie"
  let movie = animationData;
  try {
    if (typeof animationData === 'object') movie = JSON.stringify(animationData);
  } catch {}

  const player = await mod.createPlayer({
    canvas,
    movie,
    loop: !!loop
  });

  // TT player doesn't autoplay implicitly; respect desired autoplay
  if (autoplay) player.play();

  // Mimic lottie-web-ish API subset used in our app
  
  // Keep canvas resolution in sync with CSS size for crisp + correct mask coverage
  try {
    const ro = new ResizeObserver(() => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width  * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w)  canvas.width  = w;
      if (canvas.height !== h) canvas.height = h;
      try { player.resize && player.resize(); } catch {}
    });
    ro.observe(canvas);
  } catch {}
const api = {
    play(){ try { player.play(); } catch {} },
    pause(){ try { player.pause(); } catch {} },
    stop(){ try { player.pause(); player.frame = 0; } catch {} },
    destroy(){ try { player.dispose(); container.innerHTML=''; } catch {} },
    goToAndStop(ms){ 
      // TT uses frames; estimate from 60fps baseline if totalFrames known
      try {
        const tf = player.totalFrames || 0;
        const fps = 60; // heuristic; rlottie usually renders at 60fps
        const frame = Math.max(0, Math.round((ms/1000) * fps));
        player.frame = Math.min(frame, tf ? tf-1 : frame);
        player.pause();
      } catch {}
    },
    addEventListener: ev.addEventListener,
    removeEventListener: ev.removeEventListener,
  };

  // Wire TT events to our event target
  try {
    player.on('mount', () => ev.dispatch('DOMLoaded'));
    player.on('end', () => ev.dispatch('complete'));
    // "rendered" could be mapped if needed
  } catch {}

  return api;
}
