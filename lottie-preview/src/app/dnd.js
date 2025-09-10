// src/app/dnd.js
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setLastLottie } from './state.js';

export function initDnd({ refs }){
  const root = refs.wrapper || document.body;
  root.addEventListener('dragover', e => e.preventDefault());
  root.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')){
      const url = URL.createObjectURL(file);
      await setBackgroundFromSrc(refs, url);
    } else if (file.type === 'application/json' || file.name.endsWith('.json')){
      const text = await file.text();
      try { const json = JSON.parse(text); setLastLottie(json); loadLottieFromData(refs, json); }
      catch(err){ console.error('Invalid Lottie JSON', err); }
    }
  });
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items){
      if (it.type?.startsWith?.('image/')){
        const f = it.getAsFile(); const url = URL.createObjectURL(f);
        await setBackgroundFromSrc(refs, url); return;
      }
      if (it.type === 'application/json' || it.type === 'text/plain'){
        const text = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
        try { const json = JSON.parse(text); setLastLottie(json); loadLottieFromData(refs, json); return; } catch(_){}
      }
    }
  });
  if (refs.bgFile){
    refs.bgFile.addEventListener('change', async () => {
      const f = refs.bgFile.files?.[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      await setBackgroundFromSrc(refs, url);
    });
  }
  if (refs.lotFile){
    refs.lotFile.addEventListener('change', async () => {
      const f = refs.lotFile.files?.[0]; if (!f) return;
      const text = await f.text();
      try { const json = JSON.parse(text); setLastLottie(json); loadLottieFromData(refs, json); } catch(e){ console.error(e); }
    });
  }
}
