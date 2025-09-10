import { state, setLoop } from './state.js';
import { getRefs } from './dom.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';
import { restartLottie } from './lottie.js';

document.addEventListener('DOMContentLoaded', async () => {
  const refs = getRefs();
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  // Контролы, соответствующие твоей разметке
  if (refs.loopChk) refs.loopChk.addEventListener('change', () => setLoop(refs.loopChk.checked));
  if (refs.restartBtn) refs.restartBtn.addEventListener('click', () => restartLottie());

  initDnd({ refs });
  initShare({ refs });
  await initLoadFromLink({ refs });
});
