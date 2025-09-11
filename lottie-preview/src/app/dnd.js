import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible } from './utils.js';
import { setBgDPR } from './state.js';

function parseDprFromName(name = '') {
  const m = String(name).match(/@([23])x(?=\.|$)/i);
  return m ? Number(m[1]) : 1;
}

export function initDnd({ refs }) {
  const host = refs?.wrapper || document.body;
  const overlay = refs?.dropOverlay;

  // Глобально запрещаем дефолтное поведение (чтобы браузер не «открывал» файл)
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  window.addEventListener('dragover', prevent);
  window.addEventListener('drop', prevent);

  let depth = 0;
  const showOverlay = () => overlay && overlay.classList.add('on');
  const hideOverlay = () => {
    depth = 0;
    overlay && overlay.classList.remove('on');
  };

  host.addEventListener('dragenter', (e) => { prevent(e); depth++; showOverlay(); });
  host.addEventListener('dragover',  (e) => { prevent(e); showOverlay(); });
  host.addEventListener('dragleave', (e) => { prevent(e); depth--; if (depth <= 0) hideOverlay(); });
  host.addEventListener('drop', async (e) => {
    prevent(e); hideOverlay();

    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;

    const imgFile = files.find(f => f.type.startsWith('image/'));
    const lotFile = files.find(f => f.type === 'application/json' || f.name.toLowerCase().endsWith('.json'));

    if (imgFile) {
      const dpr = parseDprFromName(imgFile.name);
      setBgDPR(dpr);
      const url = URL.createObjectURL(imgFile);
      await setBackgroundFromSrc(refs, url, { name: imgFile.name, dpr });
      setPlaceholderVisible(refs, false);
    }

    if (lotFile) {
      const txt = await lotFile.text().catch(() => '');
      if (txt) {
        try {
          const json = JSON.parse(txt);
          await loadLottieFromData(refs, json);
          setPlaceholderVisible(refs, false);
        } catch {}
      }
    }
  }, false);
}
