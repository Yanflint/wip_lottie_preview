import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setDropActive, setPlaceholderVisible } from './utils.js';
import { setLastLottie } from './state.js';

function readDroppedFile(file, refs) {
  if (!file) return;

  // Картинки
  if (file.type?.startsWith?.('image/')) {
    const url = URL.createObjectURL(file);
    return setBackgroundFromSrc(refs, url).then(() => setPlaceholderVisible(refs, false));
  }

  // JSON (.json, application/json, или text/plain с JSON)
  const isJson = file.type === 'application/json' || file.name?.endsWith?.('.json') || file.type === 'text/plain';
  if (isJson) {
    return file.text().then(text => {
      try {
        const json = JSON.parse(text);
        setLastLottie(json);
        loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
      } catch (e) {
        console.error('Invalid JSON', e);
      }
    });
  }
}

export function initDnd({ refs }) {
  let depth = 0;

  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault();
    depth = 0; setDropActive(false);
    const dt = e.dataTransfer;
    if (!dt) return;

    if (dt.files && dt.files.length) {
      await readDroppedFile(dt.files[0], refs);
      return;
    }
    if (dt.items && dt.items.length) {
      const it = dt.items[0];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        await readDroppedFile(f, refs);
      }
    }
  };

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  // Вставка из буфера
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile();
        const url = URL.createObjectURL(f);
        await setBackgroundFromSrc(refs, url);
        setPlaceholderVisible(refs, false);
        return;
      }
      if (it.type === 'application/json' || it.type === 'text/plain') {
        const text = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
        try {
          const json = JSON.parse(text);
          setLastLottie(json);
          loadLottieFromData(refs, json);
          setPlaceholderVisible(refs, false);
          return;
        } catch {}
      }
    }
  });
}
