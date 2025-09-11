import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

/** Детект @Nx из имени файла */
function detectDensityFromFileName(name = '') {
  try {
    const m = /@(\d+)x(?:\.|$)/i.exec(name);
    const d = m ? parseInt(m[1], 10) : 1;
    return Number.isFinite(d) && d >= 1 && d <= 4 ? d : 1;
  } catch { return 1; }
}

async function processFilesSequential(refs, files) {
  let imgFile = null, jsonFile = null;
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
    if (!jsonFile && isJson) jsonFile = f;
  }

  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    const density = detectDensityFromFileName(imgFile.name);
    await setBackgroundFromSrc(refs, url, { density });
    setPlaceholderVisible(refs, false);
  }

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

  // dragover / dragleave
  const onDragOver = (e) => {
    e.preventDefault();
    setDropActive(refs, true);
  };
  const onDragLeave = (e) => {
    if (e.target === zone) setDropActive(refs, false);
  };
  const onDrop = async (e) => {
    e.preventDefault();
    setDropActive(refs, false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) await processFilesSequential(refs, files);
  };

  zone.addEventListener('dragover', onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop', onDrop);

  // paste: image / JSON
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        // getAsString может отсутствовать; fallback на .getData('text')
        if (it.getAsString) {
          textCandidate = await new Promise((r) => it.getAsString(r));
        } else {
          textCandidate = e.clipboardData.getData('text');
        }
      }
    }

    if (files.length) await processFilesSequential(refs, files);

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
