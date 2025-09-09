// Domain-based concatenation build to reconstruct app.js
import fs from 'fs';
import path from 'path';
const root = new URL('.', import.meta.url).pathname;
const srcDir = path.join(root, '../src/app');
const outPath = path.join(root, '../app.js');

const order = [
  "00-preamble.js",
  "10-dom.js",
  "20-state.js",
  "30-init.js",
  "40-utils.js",
  "50-layout.js",
  "60-mobile-restart.js",
  "70-dnd.js",
  "80-lottie-bg.js",
  "90-controls.js",
  "100-share.js",
  "110-load-from-link.js",
  "999-post.js"
];

let out = '';
for (const file of order) {
  const p = path.join(srcDir, file);
  if (!fs.existsSync(p)) throw new Error('Missing part: ' + file);
  out += fs.readFileSync(p, 'utf-8');
}
fs.writeFileSync(outPath, out, 'utf-8');
console.log('Built app.js from', order.length, 'parts');
