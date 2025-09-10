// src/app/layout.js
import { isMobile, afterTwoFrames } from './utils.js';
export function layout({ refs }) {
  const { preview, previewBox } = refs;
  if (!preview || !previewBox) return;
  const pad = isMobile() ? 8 : 12;
  if (!previewBox.style.padding) previewBox.style.padding = pad + 'px';
  const vw = window.innerWidth, vh = window.innerHeight;
  if (preview) {
    if (!preview.style.maxWidth)  preview.style.maxWidth  = Math.min(1200, vw - pad * 2) + 'px';
    if (!preview.style.maxHeight) preview.style.maxHeight = (vh - pad * 2) + 'px';
  }
}
export function initLayout({ refs }){
  const doLayout = () => layout({ refs });
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => afterTwoFrames().then(doLayout));
  doLayout();
}
