import { isMobile, afterTwoFrames } from './utils.js';

export function layout({ refs }) {
  const { preview, previewBox } = refs;
  if (!preview || !previewBox) return;

  const pad = isMobile() ? 8 : 12;
  previewBox.style.padding = pad + 'px';

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  preview.style.maxWidth = Math.min(1200, vw - pad * 2) + 'px';
  preview.style.maxHeight = (vh - pad * 2) + 'px';
}

export function initLayout({ refs }) {
  const doLayout = () => layout({ refs });
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => afterTwoFrames().then(doLayout));
  doLayout();
}
