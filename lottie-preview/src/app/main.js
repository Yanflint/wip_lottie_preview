import { state } from './state.js';
import { getRefs } from './dom.js';
import { initLayout, layout } from './layout.js';
import { initDnd } from './dnd.js';
import { initShare } from './share.js';
import { initLoadFromLink } from './loadFromLink.js';

document.addEventListener('DOMContentLoaded', async () => {
  const refs = getRefs();
  if (refs.verEl) refs.verEl.textContent = 'v' + state.VERSION;

  initLayout({ refs });
  initDnd({ refs });
  initShare({ refs });
  await initLoadFromLink({ refs });

  layout({ refs });
});
