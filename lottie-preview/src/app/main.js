// src/app/main.js
import { state, setLoop } from './state.js';
import { getRefs } from './dom.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';
import { restartLottie, updatePlaybackFromState, syncLottieToBg } from './lottie.js';

document.addEventListener('DOMContentLoaded', async () => {
  const refs = getRefs();
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  // Контролы (как в твоём HTML)
  if (refs.loopChk) {
    refs.loopChk.addEventListener('change', () => {
      setLoop(refs.loopChk.checked);
      updatePlaybackFromState(refs); // <-- применяем сразу
    });
  }
  if (refs.restartBtn) refs.restartBtn.addEventListener('click', () => restartLottie());

  // DnD, share, загрузка по ссылке
  initDnd({ refs });
  initShare({ refs });
  await initLoadFromLink({ refs });

  // Подгоняем Lottie под фон на ресайзе/повороте
  window.addEventListener('resize', () => syncLottieToBg(refs));
  window.addEventListener('orientationchange', () => setTimeout(() => syncLottieToBg(refs), 50));
  // И сразу один проход
  syncLottieToBg(refs);
});
