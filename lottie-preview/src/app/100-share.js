/* ---------------- Share (как раньше) ---------------- */
function showToastNear(el, msg){
  if (!toastEl) return;
  toastEl.textContent = msg;
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (r) { toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top  = (r.top) + 'px'; }
  else   { toastEl.style.left = '50%'; toastEl.style.top  = (window.innerHeight - 24) + 'px'; }
  toastEl.classList.add('show');
  clearTimeout(showToastNear._t);
  showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
}

async function withLoading(btn, fn){
  if (!btn) return fn();
  const original = btn.textContent;
  btn.classList.add('loading');
  try {
    const res = await fn();
    return res;
  } finally {
    btn.classList.remove('loading');
    btn.textContent = original;
  }
}

if (shareBtn) {
  shareBtn.addEventListener('click', function(){
    withLoading(shareBtn, async function(){
      // собираем снапшот
      const snap = {};
      if (lastLottieJSON) snap.lot = lastLottieJSON;
      if (bgImg && bgImg.src)    snap.bg  = bgImg.src;
      snap.opts = { loop: !!loopOn };

      // отправляем и получаем id
      const id = await withLoading(null, async ()=>{
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(snap)
        });
        if (!resp.ok) throw new Error('share failed: ' + resp.status);
        const { id } = await resp.json();
        return id;
      });
      if (!id) return;

      // >>> ДОБАВЛЕНО: сохранить id локально и сформировать короткую ссылку
      try { localStorage.setItem('lastShareId', id); } catch(_){}
      const shortURL = location.origin + '/s/' + id;
      try {
        if (shareOut) shareOut.value = shortURL;
      } catch(_){}
      // <<< КОНЕЦ ДОБАВЛЕНОГО

      // сформировать ссылку (оставляем и старую совместимость, если где-то используется)
      const link = location.origin + '/?id=' + encodeURIComponent(id);

      // попытаться «поделиться» системно, иначе просто копируем ссылку
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title || 'Lottie-превью', url: shortURL });
          showToastNear(shareBtn, 'Отправлено');
          return;
        } catch(e){
          // пользователь мог отменить — тогда просто падаем в копирование
        }
      }

      try { await navigator.clipboard.writeText(shortURL); }
      catch(_){
        const ta = document.createElement('textarea'); ta.value = shortURL; document.body.appendChild(ta);
        ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToastNear(shareBtn, 'Ссылка скопирована');
    }).catch(err=>{
      console.error(err);
      showToastNear(shareBtn, 'Ошибка при шаринге');
    });
  });
}
