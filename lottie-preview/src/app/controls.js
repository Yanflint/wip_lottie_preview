import { setLoop, setAutoplay } from './state.js';
import { layout } from './layout.js';

export function initControls({ refs }) {
  const { loopChk, autoplayChk, sizeSel, wideChk, fullHChk } = refs;

  if (loopChk) loopChk.addEventListener('change', () => setLoop(loopChk.checked));
  if (autoplayChk) autoplayChk.addEventListener('change', () => setAutoplay(autoplayChk.checked));

  const relayout = () => layout({ refs });
  if (sizeSel) sizeSel.addEventListener('change', relayout);
  if (wideChk) wideChk.addEventListener('change', relayout);
  if (fullHChk) fullHChk.addEventListener('change', relayout);
}
