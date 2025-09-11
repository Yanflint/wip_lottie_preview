import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive }     from './utils.js';
import { setLastLottie }                             from './state.js';

/** Детект @Nx из имени файла */
function detectDensityFromFileName(name = '') {
  try {
    const m = /@(\d+)x(?:\.|$)/i.exec(name);
    const d = m ? parseInt(m[1], 10) : 1;
    return Number.isFinite(d) && d >= 1 && d <= 4 ? d : 1;
  } catch { return 1; }
}

async function processFilesSequential(refs, files) {
  let imgFile  = null;
  let jsonFile = null;

  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
    if (!jsonFile && isJson) jsonFile = f;
  }

  // 1) Фон (макет сайта)
  if (imgFile) {
    try {
      const url      = URL.createObjectURL(imgFile);
      const density  = detectDensityFromFileName(imgFile.name);
      await setBackgroundFromSrc(refs, url, { density });
      setPlaceholderVisible(refs, false);
    } catch (e) {
      console.warn('BG load failed:', e);
    }
  }

  // 2) Lottie JSON
  if (jsonFile) {
    try {
      const text = await jsonFile.text();
      const json = JSON.parse(text);
      setLastLottie(json);
      loadLottieFromData(refs, json);
      setPlaceholderVisible(refs, false);
    } catch (e) {
      console.warn('Invalid Lottie JSON:', e);
    }
  }
}

export function initDnd({ refs }) {
  const zone = refs?.preview || document.body;
  if (!zone) return;

  let dragCount = 0;

  const enableOverlay  = () => setDropActive(true);
  const disableOverlay = () => { dragCount = 0; setDropActive(false); };

  const onDragEnter = (e) => {
    e.preventDefault();
    if (dragCount++ === 0) enableOverlay();
  };

  const onDragOver = (e) => {
    e.preventDefault();
    // периодически «подсвечиваем» overlay, даже если dragleave не пришёл
    if (!document.body.classList.contains('dragging')) enableOverlay();
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    // Если реально ушли за пределы зоны/вьюпорта — выключаем
    if (--dragCount <= 0) disableOverlay();
  };

  const onDrop = async (e) => {
    e.preventDefault();
    disableOverlay();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) await processFilesSequential(refs, files);
  };

  // Навешиваем обработчики на зону превью
  zone.addEventListener('dragenter', onDragEnter);
  zone.addEventListener('dragover',  onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop',      onDrop);

  // Страховки: обязательно снимаем overlay
  window.addEventListener('dragend', disableOverlay);
  window.addEventListener('blur',    disableOverlay);

  // Вставка из буфера обмена (image / JSON)
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        if (it.getAsString) {
          textCandidate = await new Promise((r) => it.getAsString(r));
        } else {
          textCandidate = e.clipboardData.getData('text');
        }
      }
    }

    if (files.length) {
      await processFilesSequential(refs, files);
      disableOverlay();
    }

    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        setLastLottie(json);
        loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
      } catch {}
    }
  });
}
