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
    btn.textContent = 'Ссылка…';
    try { return await fn(); }
    finally {
      btn.classList.remove('loading');
      btn.textContent = original;
    }
  }

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      await withLoading(shareBtn, async ()=>{
        const payload = { v:1, lot:lastLottieJSON, bg:bgImg.src || null, opts:{ loop:loopOn, wide:!!wide, fullH:!!fullH } };
        const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_){
          const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
          ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        showToastNear(shareBtn, 'Ссылка скопирована');
      }).catch(err=>{
        console.error(err);
        showToastNear(shareBtn, 'Ошибка при шаринге');
      });
    });
  }

