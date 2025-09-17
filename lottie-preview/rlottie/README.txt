Optional rlottie (WASM) support
-------------------------------
This build keeps lottie-web as the default engine so nothing breaks.

How to enable rlottie at runtime:
1) Put your rlottie WASM bundle on the page (for example, via a script tag that exposes `window.RLottiePlayer`
   or `window.RLottie` or `window.createRlottieModule`). See Samsung rlottie repo docs.
2) Open the app with `?engine=rlottie` in the URL, or set `localStorage.setItem('lp_engine','rlottie')` in DevTools.
3) If the rlottie runtime is detected, the app will use it via src/app/rlottieAdapter.js; otherwise it will fall back to lottie-web.
