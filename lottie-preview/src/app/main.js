import { state } from './state.js';
import { getRefs } from './dom.js';
import { initLayout, layout } from './layout.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';
import { initControls } from './controls.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[boot] ES modules start');
  const refs = getRefs();
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  initLayout({ refs });
  initDnd({ refs });
  initControls({ refs });
  initShare({ refs });

  // Если пришли по short URL или A2HS — подтянем снапшот
  await initLoadFromLink({ refs });

  layout({ refs });
});
