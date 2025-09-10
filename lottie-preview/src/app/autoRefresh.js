// src/app/autoRefresh.js
// Live-пулинг для /s/last: каждые 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Экспоненциальный бэкофф до 30с при ошибках.

const BASE_INTERVAL = 5000;        // 5s
const JITTER = 0.20;               // ±20%
const MAX_BACKOFF = 30000;         // 30s

function isViewingLast() {
  try {
    const p = location.pathname;
    if (p.startsWith('/s/')) {
      const id = decodeURIComponent(p.split('/')[2] || '');
      if (id === 'last' || id === '__last__') return true;
    }
    const u = new URL(location.href);
    const qid = u.searchParams.get('id');
    if (qid && (qid === 'last' || qid === '__last__')) return true;
  } catch {}
  return false;
}

function jittered(ms) {
  const f = 1 + (Math.random() * 2 - 1) * JITTER; // 0.8…1.2
  return Math.max(1000, Math.round(ms * f));
}

async function fetchRev() {
  // компактный ответ: { rev: "<hash>" }
  const r = await fetch('/api/share?id=last&rev=1', { cache: 'no-store' });
  if (!r.ok) throw new Error('bad status ' + r.status);
  const j = await r.json();
  return String(j.rev || '');
}

export function initAutoRefreshIfViewingLast() {
  if (!isViewingLast()) return;

  let baseline = null;
  let timer = null;
  let currentDelay = BASE_INTERVAL;
  let inFlight = false;

  const schedule = (delay = currentDelay) => {
    clearTimeout(timer);
    timer = setTimeout(tick, jittered(delay));
  };

  const resetDelay = () => { currentDelay = BASE_INTERVAL; };

  const tick = async () => {
    if (inFlight) return;
    if (document.visibilityState !== 'visible') { schedule(currentDelay); return; }
    inFlight = true;
    try {
      const rev = await fetchRev();
      if (!baseline) {
        baseline = rev;
      } else if (rev && rev !== baseline) {
        // обновилось — жёсткий рефреш текущего URL (сохраняет ?fit=…)
        location.replace(location.href);
        return; // прерываем — страница перезагрузится
      }
      // успех → сброс бэкоффа
      resetDelay();
    } catch (e) {
      // ошибка → экспоненциальный бэкофф
      currentDelay = Math.min(MAX_BACKOFF, Math.max(BASE_INTERVAL, currentDelay * 2));
    } finally {
      inFlight = false;
      schedule(currentDelay);
    }
  };

  // старт, если видимо
  const startIfVisible = () => {
    if (document.visibilityState === 'visible') {
      resetDelay();
      schedule(BASE_INTERVAL);
    }
  };

  // мгновенная проверка по возвращению в фокус/видимость
  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      resetDelay();
      clearTimeout(timer);
      tick();
    }
  };

  // быстрый триггер и при любом тапе/клике (дебаг)
  const onPointer = () => {
    if (document.visibilityState === 'visible') {
      resetDelay();
      clearTimeout(timer);
      tick();
    }
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('pointerdown', onPointer, { passive: true });

  // первичная фиксация ревизии (без ожидания интервала)
  (async () => {
    try { baseline = await fetchRev(); } catch {}
    startIfVisible();
  })();
}
