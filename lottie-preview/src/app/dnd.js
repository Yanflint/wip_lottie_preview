import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setLastLottie } from './state.js';
import { setDropActive, setPlaceholderVisible } from './utils.js';

function readDroppedFile(file, refs) {
  if (!file) return;
  if (file.type?.startsWith?.('image/')) {
    const url = URL.createObjectURL(file);
    return setBackgroundFromSrc(refs, url);
  }
  if (file.type === 'application/json' || file.name?.endsWith?.('.json')) {
    return file.text().then(text => {
      try {
        const json = JSON.parse(text);
        setLastLottie(json);
        loadLottieFromData(refs, json);
      } catch (e2) { console.error('Invalid Lottie JSON', e2); }
    });
  }
}

export function initDnd({ refs }) {
  const root = refs.wrapper || document.body;

  let dragDepth = 0;
  const onDragEnter = (e) => { e.preventDefault(); if (dragDepth++ === 0) setDropActive(refs, true); };
  const onDragOver = (e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'copy'; } catch(_) {} };
  const onDragLeave = (e) => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; setDropActive(refs, false); } };
  const onDrop = async (e) => {
    e.preventDefault();
    dragDepth = 0;
    setDropActive(refs, false);
    const dt = e.dataTransfer;
    if (!dt) return;

    if (dt.files && dt.files.length) {
      await readDroppedFile(dt.files[0], refs);
      return;
    }
    if (dt.items && dt.items.length) {
      const it = dt.items[0];
      if (it.kind === 'file') {
        const file = it.getAsFile();
        await readDroppedFile(file, refs);
        return;
      }
    }
  };

  // Слушатели на window + document + root
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  root.addEventListener('dragenter', onDragEnter);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);

  // Paste поддержка (png из буфера или JSON)
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const file = it.getAsFile();
        const url = URL.createObjectURL(file);
        await setBackgroundFromSrc(refs, url);
        setPlaceholderVisible(refs, false);
        return;
      }
      if (it.type === 'application/json' || it.type === 'text/plain') {
        const text = await (it.getAsString
          ? new Promise(r => it.getAsString(r))
          : Promise.resolve(e.clipboardData.getData('text')));
        try {
          const json = JSON.parse(text);
          setLastLottie(json);
          loadLottieFromData(refs, json);
          setPlaceholderVisible(refs, false);
          return;
        } catch (_) {}
      }
    }
  });

  // Инпуты файлов (если есть)
  if (refs.bgFile) {
    refs.bgFile.addEventListener('change', async () => {
      const f = refs.bgFile.files?.[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      await setBackgroundFromSrc(refs, url);
      setPlaceholderVisible(refs, false);
    });
  }
  if (refs.lotFile) {
    refs.lotFile.addEventListener('change', async () => {
      const f = refs.lotFile.files?.[0]; if (!f) return;
      const text = await f.text();
      try {
        const json = JSON.parse(text);
        setLastLottie(json);
        loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
      } catch(e) { console.error(e); }
    });
  }
}
