
function makeEventTarget(){
  const listeners = new Map();
  return {
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    dispatch(type, detail){ listeners.get(type)?.forEach(fn => { try{ fn(detail); } catch(e){} }); },
  };
}

// Tiny helper to extract fps from Lottie JSON
function getFps(json){ try { const v = Number(json?.fr); return isFinite(v) && v>0 ? v : 60; } catch { return 60; } }
function getTotalFrames(json){ try { const ip=Number(json?.ip)||0, op=Number(json?.op)||0; return Math.max(1, Math.round(op - ip)); } catch { return 1; } }

export function createPlayer(opts) {
  const { container, loop=false, autoplay=true, animationData } = opts || {};
  if (!container) throw new Error('rlottieAdapter: container required');
  if (!animationData) throw new Error('rlottieAdapter: animationData required');

  // Runtime detection: prefer official rlottie WASM class
  const hasModuleClass = !!(globalThis.Module && globalThis.Module.RlottieWasm);
  const hasAnyRlottie = hasModuleClass || !!(globalThis.RLottiePlayer || globalThis.RLottie || globalThis.createRlottieModule);
  if (!hasAnyRlottie) {
    throw new Error('rlottieAdapter: rlottie runtime not found. Include official rlottie WASM build.');
  }

  // Create canvas target
  let canvas = container.querySelector('canvas.rlottie-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'rlottie-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = container.clientWidth || 512;
    canvas.height = container.clientHeight || 512;
    container.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  const ev = makeEventTarget();
  let playing = !!autoplay;
  let destroyed = false;

  // Timing & state
  const fps = getFps(animationData);
  const totalFrames = getTotalFrames(animationData);
  const durationMS = Math.round((totalFrames / fps) * 1000);
  let currentMS = 0;

  // Instantiate rlottie
  let impl = null;
  if (hasModuleClass) {
    impl = new globalThis.Module.RlottieWasm();
    try {
      const jsonStr = typeof animationData === 'string' ? animationData : JSON.stringify(animationData);
      impl.load(jsonStr);
    } catch (e) {
      console.error('[rlottieAdapter] load json failed:', e);
    }
  } else if (globalThis.RLottiePlayer) {
    // Hypothetical alternate API – keep minimal compatibility if user drops a different build
    impl = new globalThis.RLottiePlayer();
    try {
      impl.load(animationData);
    } catch {}
  } else if (globalThis.RLottie) {
    // Very generic; may need vendor-specific glue
    impl = new globalThis.RLottie(animationData);
  } else if (globalThis.createRlottieModule) {
    // Emscripten-style factory returning a Module – user should attach RlottieWasm on it
    try {
      const Module = await globalThis.createRlottieModule();
      if (Module && Module.RlottieWasm) {
        impl = new Module.RlottieWasm();
        impl.load(typeof animationData === 'string' ? animationData : JSON.stringify(animationData));
      }
    } catch(e){ console.error(e); }
  }

  if (!impl || !impl.render) {
    throw new Error('rlottieAdapter: unsupported rlottie runtime shape (no render).');
  }

  function renderFrame(ms){
    const frame = Math.max(0, Math.min(totalFrames-1, Math.floor(ms * fps / 1000)));
    // rlottie wasm returns a buffer (RGBA) for the current frame
    const buffer = impl.render(frame, canvas.width|0, canvas.height|0);
    if (buffer) {
      const data = new Uint8ClampedArray(buffer);
      try {
        const imageData = new ImageData(data, canvas.width|0, canvas.height|0);
        ctx.putImageData(imageData, 0, 0);
      } catch(e){ /* Safari older... */ }
    }
  }

  function tick(ts){
    if (destroyed) return;
    renderFrame(currentMS);
    if (playing) {
      currentMS += 16.6667; // ~60Hz; we drive time independent of fps to keep smoothness
      if (currentMS >= durationMS) {
        if (loop) currentMS = 0;
        else playing = false;
        ev.dispatch('complete');
      }
      if (playing) requestAnimationFrame(tick);
    }
  }

  // Kick
  ev.dispatch('DOMLoaded');
  if (playing) requestAnimationFrame(tick);

  return {
    play(){ if (!playing) { playing = true; requestAnimationFrame(tick); } },
    pause(){ playing = false; },
    stop(){ playing = false; currentMS = 0; try { renderFrame(currentMS); } catch(e) {} },
    destroy(){ destroyed = true; try { container.innerHTML = ''; } catch(e) {} },
    goToAndStop(ms){ currentMS = Math.max(0, Math.min(ms|0, durationMS)); playing = false; try { renderFrame(currentMS); } catch(e) {} },
    setLoop(v){ /* noop – baked via options */ },
    addEventListener: ev.addEventListener,
    removeEventListener: ev.removeEventListener
  };
}
