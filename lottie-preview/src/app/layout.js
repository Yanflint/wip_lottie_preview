import { isMobile, afterTwoFrames } from './utils.js';
import { state } from './state.js';

export function layout({ refs }) {
  const { preview, previewBox, bgImg } = refs;
  if (!preview || !previewBox) return;

  const root = document.documentElement;
  const noUI = root.classList.contains('standalone') || root.classList.contains('is-standalone');
  const pad = noUI ? 0 : (isMobile() ? 8 : 12);
  previewBox.style.padding = pad + 'px';

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // В режиме A2HS — подгоняем бокс под размеры фонового изображения (если есть)
  if (state.A2HS && (bgImg?.naturalWidth || state.lastBgSize.w)) {
    const iw = bgImg?.naturalWidth || state.lastBgSize.w;
    const ih = bgImg?.naturalHeight || state.lastBgSize.h;
    const scale = Math.min((vw - pad * 2) / iw, (vh - pad * 2) / ih, 1);
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    previewBox.style.width = w + 'px';
    previewBox.style.height = h + 'px';
    preview.style.maxWidth = 'unset';
    preview.style.maxHeight = 'unset';
  } else {
    preview.style.maxWidth = Math.min(1200, vw - pad * 2) + 'px';
    preview.style.maxHeight = (vh - pad * 2) + 'px';
    previewBox.style.width = '';
    previewBox.style.height = '';
  }
}

export function initLayout({ refs }) {
  const doLayout = () => layout({ refs });
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => afterTwoFrames().then(doLayout));
  doLayout();
}
