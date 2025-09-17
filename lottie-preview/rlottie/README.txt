Official rlottie (WASM) is REQUIRED
-----------------------------------
This build uses Samsung's official rlottie as the ONLY animation engine.

How to install rlottie runtime into this app:
1) Download an official rlottie WebAssembly build (JS + WASM) from the Samsung rlottie repository.
2) Place the JS loader as /rlottie/rlottie.min.js and the corresponding .wasm file in the same folder.
3) The runtime must expose one of the following globals on window: `RLottiePlayer`, `RLottie`, or `createRlottieModule`.
4) No lottie-web fallback is included anymore. If rlottie is missing, the app will throw at startup.
