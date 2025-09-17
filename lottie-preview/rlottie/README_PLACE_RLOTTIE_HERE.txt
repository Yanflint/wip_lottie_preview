Place the official rlottie WebAssembly build here.

Recommended file names (any of these will be auto-detected):
- rlottie-wasm.js + rlottie-wasm.wasm (exactly what rlottie `wasm_build.sh` produces)
- rlottie.min.js + rlottie.wasm
- rlottie.js + rlottie.wasm

How to build from rlottie sources (Linux/macOS):
1) Install Emscripten SDK and activate env (emsdk_env):
   git clone https://github.com/emscripten-core/emsdk.git
   ./emsdk install latest && ./emsdk activate latest
   source ./emsdk_env.sh

2) In the rlottie repo root run:
   ./wasm_build.sh /ABSOLUTE/PATH/TO/emsdk

   The outputs will appear in: rlottie/builddir_wasm/src/
   Files: rlottie-wasm.js, rlottie-wasm.wasm

3) Copy them into this folder (project publish root + /rlottie/):
   /rlottie/rlottie-wasm.js
   /rlottie/rlottie-wasm.wasm

4) Open the app; the dynamic loader will detect and load them automatically.
