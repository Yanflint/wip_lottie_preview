import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setLastLottie } from './state.js';

function readDroppedFile(file, refs) {
  if (!file) return;
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    return setBackgroundFromSrc(refs, url);
  }
  if (file.type === 'application/json' || file.name.endsWith('.json')) {
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

  const onDragOver = (e) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'copy'; } catch(_) {}
  };
  const onDrop = async (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;

    // 1) Files list (основной путь)
    if (dt.files && dt.files.length) {
      await readDroppedFile(dt.files[0], refs);
      return;
    }
    // 2) items (некоторые браузеры)
    if (dt.items && dt.items.length) {
      const it = dt.items[0];
      if (it.kind === 'file') {
        const file = it.getAsFile();
        await readDroppedFile(file, refs);
        return;
      }
    }
  };

  // Слушатели на window + document + корневой контейнер — чтобы точно ловить dnd
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('drop', onDrop);

  // Paste поддержка (png из буфера или JSON)
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const file = it.getAsFile();
        const url = URL.createObjectURL(file);
        await setBackgroundFromSrc(refs, url);
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
      } catch(e) { console.error(e); }
    });
  }
}
