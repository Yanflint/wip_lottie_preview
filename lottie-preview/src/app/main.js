import { state, setLoop, setA2HS } from './state.js';
import { getRefs } from './dom.js';
import { initDnd } from './dnd.js';
import { initShare } from './shareClient.js';
import { initLoadFromLink } from './loadFromLink.js';
import { restartLottie, updatePlaybackFromState, layoutLottie } from './lottie.js';
import { initControls } from './controls.js';
import { initLayout } from './layout.js';

function detectA2HS() {
  // PWA / iOS standalone
  const mq = window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches);
const iosStandalone = (window.navigator && (window.navigator).standalone) === true;
  return !!(mq || iosStandalone);
}

document.addEventListener('DOMContentLoaded', async () => {
  const refs = getRefs();

  // версия
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  // A2HS флаг для layout.js
  setA2HS(detectA2HS());

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

  // инициализация подсистем
  initControls({ refs });     // твои контролы — тихо «но-оп», если элементов нет
  initDnd({ refs });
  initShare({ refs });
  await initLoadFromLink({ refs });
  initLayout({ refs });       // твой layout — подгон размеров превью

  // дополнительная центрировка лотти (на всякий)
  const relayout = () => layoutLottie(refs);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 50));
  relayout();
});
