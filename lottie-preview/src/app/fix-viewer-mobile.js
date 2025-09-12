
// src/app/fix-viewer-mobile.js
// Purpose: eliminate stale Lottie layout/state in standalone (A2HS/WebView) viewers.
// Strategy:
//  - Detect standalone/WebView contexts.
//  - Re-fetch payload for /s/:id with `no-store` and apply *fresh* opts before layout.
//  - Force-clear any stale inline styles/state before applying new ones.
//  - Retry once after first layout to eliminate races.
(function(){
  try {
    const isStandalone =
      (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
                             window.matchMedia('(display-mode: fullscreen)').matches)) ||
      (typeof navigator !== 'undefined' && navigator.standalone === true);

    const isViewer = /^\\/s\\//.test(location.pathname);

    if (!isViewer) return;
    // Only harden in standalone-like shells (PWA / installed webview)
    if (!isStandalone) return;

    let appliedOnce = false;

    function getShareId() {
      try {
        const m = location.pathname.match(/\\/s\\/([^/?#]+)/);
        if (m && m[1]) return decodeURIComponent(m[1]);
        const u = new URL(location.href);
        return u.searchParams.get('id');
      } catch { return null; }
    }

    async function hardLoadOnce() {
      const id = getShareId();
      if (!id) return;

      // Defer a tick to let the built-in loader initialize DOM nodes.
      await new Promise(res => requestAnimationFrame(res));

      const { setBackgroundFromSrc, loadLottieFromData, layoutLottie } = await import('/src/app/lottie.js');
      const { setLotOffset, state } = await import('/src/app/state.js');

      const refs = {
        preview: document.getElementById('preview'),
        previewBox: document.getElementById('previewBox'),
        bgImg: document.getElementById('bgImg'),
        lotMount: document.getElementById('lotMount')
      };

      // Force-clear previous inline transforms/sizing to avoid leaking prior state
      try {
        const layer = document.querySelector('.lottie-layer');
        if (layer) {
          layer.style.transform = 'translate(-50%, -50%) scale(1)';
          layer.style.width = '';
          layer.style.height = '';
          layer.style.left = '';
          layer.style.top = '';
        }
        if (refs.lotMount) {
          refs.lotMount.style.transform = '';
          refs.lotMount.style.width = '';
          refs.lotMount.style.height = '';
          refs.lotMount.style.left = '';
          refs.lotMount.style.top = '';
        }
        // Reset offset in state before we apply new payload
        setLotOffset(0, 0);
      } catch {}

      // Fetch payload with no caching to avoid stale data in WebViews
      const url = new URL('/api/share', location.origin);
      url.searchParams.set('id', id);
      const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' }).catch(() => null);
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data) return;

      // Apply opts FIRST (loop/autoplay etc) so they take effect on player creation
      try {
        if (data.opts && typeof data.opts.loop === 'boolean') {
          state.loopOn = !!data.opts.loop;
          // reflect any UI checkbox if present
          const loopChk = document.getElementById('loopChk');
          if (loopChk) loopChk.checked = state.loopOn;
        }
      } catch {}

      // Apply background
      try {
        if (data.bg && data.bg.src) await setBackgroundFromSrc(refs, data.bg.src, data.bg.meta || {});
      } catch(e) { console.error('fix-viewer-mobile: bg apply error', e); }

      // Load lottie (await, then layout)
      try {
        if (data.lot) {
          await loadLottieFromData(refs, data.lot);
        }
      } catch(e) { console.error('fix-viewer-mobile: lottie load error', e); }

      // Try to read possible position/size hints from payload (best-effort — tolerant to missing keys)
      try {
        const hints = (data.lot && (data.lot.hints || data.lot.layout || data.lot.pos || data.lot.opts)) || (data.opts && data.opts.lottie) || {};
        // Common key aliases we will accept
        const x = hints.x ?? hints.left ?? hints.offsetX ?? hints.dx ?? 0;
        const y = hints.y ?? hints.top  ?? hints.offsetY ?? hints.dy ?? 0;
        // Apply offset via state if it's numeric
        const nx = (typeof x === 'number') ? x : parseFloat(x);
        const ny = (typeof y === 'number') ? y : parseFloat(y);
        if (Number.isFinite(nx) || Number.isFinite(ny)) {
          setLotOffset(Number.isFinite(nx) ? nx : 0, Number.isFinite(ny) ? ny : 0);
        }
        // Width/height/scale attempts — if provided, apply to the layer directly
        const layer = document.querySelector('.lottie-layer');
        if (layer) {
          const w = hints.w ?? hints.width  ?? null;
          const h = hints.h ?? hints.height ?? null;
          const s = hints.s ?? hints.scale  ?? null;
          if (w && (typeof w === 'number' || (typeof w === 'string' && w))) layer.style.width  = String(w).replace(/[^0-9.%-]/g,'') + (/%$/.test(String(w)) ? '' : (String(w).includes('%') || String(w).includes('px')) ? '' : 'px');
          if (h && (typeof h === 'number' || (typeof h === 'string' && h))) layer.style.height = String(h).replace(/[^0-9.%-]/g,'') + (/%$/.test(String(h)) ? '' : (String(h).includes('%') || String(h).includes('px')) ? '' : 'px');
          if (s && !isNaN(parseFloat(s))) {
            const cs = window.getComputedStyle(layer).transform;
            // Overwrite any previous scale by rebuilding translate + scale
            layer.style.transform = 'translate(-50%, -50%) scale(' + parseFloat(s) + ')';
          }
        }
      } catch(e) { console.warn('fix-viewer-mobile: layout hints skipped', e); }

      // Final layout (twice — to outwait any late upgrades)
      try {
        layoutLottie(refs);
        // A second pass after two RAFs helps with WebView races
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        layoutLottie(refs);
      } catch {}

      appliedOnce = true;
    }

    // Run after DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hardLoadOnce, { once: true });
    } else {
      hardLoadOnce();
    }

    // Also re-run once on pageshow (iOS restores from BFCache)
    window.addEventListener('pageshow', () => {
      if (!appliedOnce) hardLoadOnce();
    }, { once: true });

  } catch (e) {
    console.error('fix-viewer-mobile bootstrap error', e);
  }
})();
