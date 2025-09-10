This archive contains only ESM app code (src/app), package.json and netlify.toml.
It will NOT touch your index.html or style.css to avoid breaking your design.

HOW TO INSTALL:
1) Unzip into your 'lottie-preview/' site root (it will create/overwrite src/app, package.json, netlify.toml).
2) In your index.html, ensure the script tag uses ES modules:
   <script type="module" src="./src/app/main.js?v=58"></script>
   Remove any old <script src="app.js">.
3) Deploy to Netlify. Build command is a no-op (echo static).

Features:
- Lottie via lottie-web (loaded from ESM CDN).
- Share creates short URL /s/:id, saves lastShareId; on Windows clipboard only.
- A2HS fallback restores last shared snapshot when opened from home screen.
- Drag&Drop & Paste for PNG/JPG and Lottie JSON.
- Background image is saved as dataURL when it was a blob: to persist across sessions.
