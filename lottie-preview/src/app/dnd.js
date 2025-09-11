import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

async function processFilesSequential(refs, files) {
  let imgFile = null, jsonFile = null;
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
    if (!jsonFile && isJson) jsonFile = f;
  }
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url);
    setPlaceholderVisible(refs, false);
  }
  if (jsonFile) {
    const text = await jsonFile.text();
    try {
      const json = JSON.parse(text);
      setLastLottie(json);
      await loadLottieFromData(refs, json);
      setPlaceholderVisible(refs, false);
    } catch (e) { console.error('Invalid JSON', e); }
  }
}

export function initDnd({ refs }) {
  let depth = 0;
  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault(); depth = 0; setDropActive(false);
    const dt = e.dataTransfer; if (!dt) return;
    if (dt.files && dt.files.length) return processFilesSequential(refs, Array.from(dt.files));
    if (dt.items && dt.items.length) {
      const files = [];
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
      if (files.length) return processFilesSequential(refs, files);
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

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = []; let textCandidate = null;
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type === 'application/json' || it.type === 'text/plain') {
        textCandidate = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    if (textCandidate) { try { const json = JSON.parse(textCandidate); setLastLottie(json); await loadLottieFromData(refs, json); setPlaceholderVisible(refs, false); } catch {} }
  });
}
