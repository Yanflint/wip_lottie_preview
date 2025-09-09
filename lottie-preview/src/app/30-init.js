  /* ---------------- INIT ---------------- */
  if (verEl) verEl.textContent = VERSION;
  if (MOBILE) document.body.classList.add('is-mobile');

  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

