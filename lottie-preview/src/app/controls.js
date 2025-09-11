// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state } from './state.js';

export function initControls({ refs }) {
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => restart());
  }
  if (refs?.loopChk) {
    refs.loopChk.checked = !!state.loopOn;
    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;
      setLoop(on);
    });
  }
}
