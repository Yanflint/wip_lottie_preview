import { state } from './state.js';
import { getRefs } from './dom.js';
import { initLayout, layout } from './layout.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';
import { initControls } from './controls.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[boot] ES modules v' + state.VERSION);
  const refs = getRefs();
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  if (state.A2HS) document.documentElement.classList.add('a2hs');

  initLayout({ refs });
  initDnd({ refs });
  initControls({ refs });
  initShare({ refs });

  await initLoadFromLink({ refs });
  layout({ refs });
});
