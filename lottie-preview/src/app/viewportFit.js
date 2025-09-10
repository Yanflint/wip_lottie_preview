// src/app/viewportFit.js
// Центрируем по реальному visual viewport (без догадок про safe-area).
// Работает только в standalone (A2HS). По умолчанию включаем режим "vv".
// Можно переключить через ?fit=edge|safe|vv — vv имеет приоритет.

export function initViewportFit({ isStandalone }) {
  if (!isStandalone) return;

  const url = new URL(location.href);
  const fit = (url.searchParams.get('fit') || 'vv').toLowerCase();

  if (fit !== 'vv') return; // уважаем принудительный edge/safe, если попросили

  const root = document.documentElement;
  root.classList.add('fit-vv'); // для CSS (на всякий случай)

  const bg = document.querySelector('.bg');
  const layer = document.querySelector('.lottie-layer');
  const img = document.getElementById('bgImg');

  function apply() {
    const vv = window.visualViewport;
    const left   = vv?.offsetLeft ?? 0;
    const top    = vv?.offsetTop  ?? 0;
    const width  = vv?.width      ?? window.innerWidth;
    const height = vv?.height     ?? window.innerHeight;

    [bg, layer].forEach((el) => {
      if (!el) return;
      Object.assign(el.style, {
        position: 'absolute',
        left:  left  + 'px',
        top:   top   + 'px',
        width: width + 'px',
        height:height+ 'px',
        overflow: 'hidden'
      });
    });

    if (img) {
      // фон по ширине контейнера, без искажения; обрезка по высоте контейнером
      img.style.width  = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
    }
  }

  apply();
  if (window.visualViewport) {
    ['resize', 'scroll', 'geometrychange'].forEach((ev) =>
      window.visualViewport.addEventListener(ev, apply)
    );
  }
  window.addEventListener('resize', apply, { passive: true });
}
