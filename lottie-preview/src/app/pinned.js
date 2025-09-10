// Локально запоминаем последний макет, чтобы A2HS (базовый URL) открыл именно его.
const KEY = 'lp_pinned_payload_v1';

export function savePinned(payload) {
  try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch {}
}

export function loadPinned() {
  try {
    const t = localStorage.getItem(KEY);
    return t ? JSON.parse(t) : null;
  } catch { return null; }
}

export function clearPinned() {
  try { localStorage.removeItem(KEY); } catch {}
}
