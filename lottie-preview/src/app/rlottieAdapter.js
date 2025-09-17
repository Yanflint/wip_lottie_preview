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

  if (!(window.RLottiePlayer || window.RLottie || window.createRlottieModule)) {
  throw new Error('rlottieAdapter: rlottie runtime not found. Include official rlottie WASM build.');
}


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

  function tick(){
    if (destroyed || !__impl) return;
    if (playing) {
      currentMS += 16.6667;
      if (currentMS > durationMS) {
        playing = !!loop;
        if (!playing) ev.dispatch('complete');
        currentMS = playing ? 0 : currentMS;
      }
      try { __impl.render(currentMS); } catch(e) {}
    }
    if (!destroyed && (playing || currentMS < durationMS)) requestAnimationFrame(tick);
  }

  try {
    if (typeof window.RLottiePlayer === 'function') {
      __impl = new window.RLottiePlayer(canvas);
      __impl.load(animationData);
      durationMS = (__impl.getDuration?.() ?? 0) * 1000;
    } else if (typeof window.RLottie === 'object' && typeof window.RLottie.create === 'function') {
      __impl = window.RLottie.create({ canvas });
      __impl.load(animationData);
      durationMS = (__impl.getDuration?.() ?? 0) * 1000;
    } else if (typeof window.createRlottieModule === 'function') {
      __impl = window.createRlottieModule({ canvas, json: animationData });
      durationMS = (__impl.getDuration?.() ?? 0) * 1000;
    }
  } catch(e) {
    console.error('[rlottieAdapter] init error, falling back to lottie-web', e);
  }

  if (!__impl) {
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

  ev.dispatch('DOMLoaded');
  if (playing) requestAnimationFrame(tick);

  return {
    play(){ playing = true; requestAnimationFrame(tick); },
    pause(){ playing = false; },
    stop(){ playing = false; currentMS = 0; try { __impl.render(currentMS); } catch(e) {} },
    destroy(){ destroyed = true; try { container.innerHTML = ''; } catch(e) {} },
    goToAndStop(ms){ currentMS = Math.max(0, Math.min(ms|0, durationMS)); playing = false; try { __impl.render(currentMS); } catch(e) {} },
    setLoop(v){ /* noop */ },
    addEventListener: ev.addEventListener,
    removeEventListener: ev.removeEventListener
  };
}
