// Клиентский «Поделиться»: сохраняем lot и фон через /api/share, и параллельно
// закрепляем текущий макет локально (для A2HS).
import { state } from './state.js';
import { withLoading, showToastNear } from './utils.js';
import { savePinned } from './pinned.js';

async function imageElementToDataURL(imgEl) {
      // Параллельно закрепляем локально (для A2HS)
      savePinned(payload);

      await copyToClipboard(shortUrl);
      showToastNear(refs.toastEl, btn, 'Ссылка скопирована');
    });
  });
}
