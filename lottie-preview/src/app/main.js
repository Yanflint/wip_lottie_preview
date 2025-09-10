// src/app/main.js
import { state, setLoop } from './state.js';
import { getRefs } from './dom.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';
import { restartLottie, updatePlaybackFromState, layoutLottie } from './lottie.js';

document.addEventListener('DOMContentLoaded', async () => {
  const refs = getRefs();

  // версия в углу
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  // контролы
  if (refs.loopChk) {
    refs.loopChk.addEventListener('change', () => {
      setLoop(refs.loopChk.checked);
      updatePlaybackFromState(refs);
    });
  }
  if (refs.restartBtn) {
    refs.restartBtn.addEventListener('click', () => restartLottie());
  }

  // dnd / share / загрузка снапшота
  initDnd({ refs });
  initShare({ refs });
  await initLoadFromLink({ refs });

  // центрирование лотти (1:1) при старте и на ресайзах
  const relayout = () => layoutLottie(refs);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 50));
  relayout();
});
