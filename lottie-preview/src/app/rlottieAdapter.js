// src/app/rlottieAdapter.js
// A very thin adapter that emulates a subset of lottie-web API on top of an rlottie runtime.
// Safe by default: if rlottie isn't present, it falls back to lottie-web transparently.

function makeEventTarget(){
  const listeners = new Map();
  return {
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    dispatch(type, detail){ listeners.get(type)?.forEach(fn => { try{ fn(detail); } catch(e){} }); },
  };
}

export function createPlayer(opts) {
  const { container, loop=false, autoplay=true, animationData } = opts || {};
  if (!container) throw new Error('rlottieAdapter: container required');

  // Fallback: if rlottie runtime isn't present, proxy to lottie-web to avoid breaking anything
  if (!(window.RLottiePlayer || window.RLottie || window.createRlottieModule)) {
    // eslint-disable-next-line no-console
    console.warn('[rlottieAdapter] rlottie runtime not found — falling back to lottie-web');
    const anim = window.lottie?.loadAnimation?.({
      container,
      renderer: 'svg',
      loop,
      autoplay,
      animationData
    });
    if (!anim) throw new Error('Neither rlottie nor lottie-web available');
    return anim;
  }

  // Minimal canvas player shim. Expect a global RLottiePlayer(canvas) { load(json), play(), pause(), stop(), renderFrame(ms) ... }
  // Since various rlottie builds differ, we keep this lenient and vendor-agnostic.
  const ev = makeEventTarget();
  const canvas = document.createElement('canvas');
  canvas.className = 'rlottie-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-label', 'rlottie canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  let destroyed = false;
  let playing = !!autoplay;
  let currentMS = 0;
  let durationMS = 0;
  let __impl = null;

  function tick(ts){
    if (destroyed || !__impl) return;
    if (playing) {
      currentMS += 16.6667;
      if (currentMS > durationMS) {
        if (loop === true || (typeof loop === 'number' && loop > 1)) {
          currentMS = 0;
          if (typeof loop === 'number' && loop > 1) loop--;
        } else {
          playing = false;
          ev.dispatch('complete');
        }
      }
      try { __impl.render(currentMS); } catch(e) {}
    }
    if (!destroyed && (playing || currentMS < durationMS)) requestAnimationFrame(tick);
  }

  // Try to initialize a very generic rlottie implementation
  try {
    // Common community wrappers may expose RLottiePlayer(canvas)
    if (typeof window.RLottiePlayer === 'function') {
      __impl = new window.RLottiePlayer(canvas);
      __impl.load(animationData);
      durationMS = (__impl.getDuration?.() ?? 0) * 1000;
    } else if (typeof window.RLottie === 'object' && typeof window.RLottie.create === 'function') {
      __impl = window.RLottie.create({ canvas });
      __impl.load(animationData);
      durationMS = (__impl.getDuration?.() ?? 0) * 1000;
    } else {
      // Last-resort: assume Emscripten style factory `createRlottieModule`
      if (typeof window.createRlottieModule === 'function') {
        // Consumers will need to wire their own small glue; we keep API consistent.
        __impl = window.createRlottieModule({ canvas, json: animationData });
        durationMS = (__impl.getDuration?.() ?? 0) * 1000;
      }
    }
  } catch(e) {
    console.error('[rlottieAdapter] init error, falling back to lottie-web', e);
  }

  if (!__impl) {
    // Could not hook rlottie — fall back without breaking
    const anim = window.lottie?.loadAnimation?.({
      container,
      renderer: 'svg',
      loop,
      autoplay,
      animationData
    });
    if (!anim) throw new Error('rlottie init failed and lottie-web not available');
    return anim;
  }

  // Fire ready event and start loop if needed
  ev.dispatch('DOMLoaded');
  if (playing) requestAnimationFrame(tick);

  // Adapter API (lottie-web-ish)
  return {
    play(){ playing = true; requestAnimationFrame(tick); },
    pause(){ playing = false; },
    stop(){ playing = false; currentMS = 0; try { __impl.render(currentMS); } catch(e) {} },
    destroy(){ destroyed = true; try { container.innerHTML = ''; } catch(e) {} },
    goToAndStop(ms){ currentMS = Math.max(0, Math.min(ms|0, durationMS)); playing = false; try { __impl.render(currentMS); } catch(e) {} },
    setLoop(v){ /* best-effort */ },
    addEventListener: ev.addEventListener,
    removeEventListener: ev.removeEventListener
  };
}
