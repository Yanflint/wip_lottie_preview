// src/app/pan.js
// Перемещение Lottie мышкой (только в редакторе).
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return;

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    try { const cur = getLotOffset(); orig = { x: cur?.x||0, y: cur?.y||0 }; } catch {}
    document.body.classList.add('lp-grabbing');
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    try { layoutLottie(refs); } catch {}
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('lp-grabbing');
  };

  stage.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', endDrag);
}

  // hotkey: center-reset R/K (layout-agnostic), editor only
  /* hotkey: center-reset R/K */
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    // physical key (KeyR) OR character 'r' OR russian 'к/К'
    const code = e.code;
    const key  = e.key;
    const isR  = (code === 'KeyR') || (key && (key.toLowerCase() === 'r' || key === 'к' || key === 'К'));
    if (!isR) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    try { setLotOffset(0, 0); layoutLottie(refs); } catch(_) {}
    e.preventDefault();
  }, { passive: false });
