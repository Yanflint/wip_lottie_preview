// Совместимо с Netlify Functions v1 и v2, и разными версиями @netlify/blobs.
// Жёсткая конфигурация по ENV (siteID + token) + сверхзащищённое чтение JSON.

import * as blobs from '@netlify/blobs';

// --- конфиг стора из ENV (без автоконфига) ---
function makeStoreFromEnv() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN;
  if (!siteID || !token) throw new Error('Missing NETLIFY_BLOBS_SITE_ID or NETLIFY_BLOBS_TOKEN');

  // v8 сигнатура
  try { return blobs.getStore({ name: 'shares', siteID, token }); }
  catch (_) {
    // старый формат
    try { /* @ts-ignore */ return blobs.getStore('shares', { siteID, token }); }
    catch (e2) {
      // последний шанс
      const client = blobs.createClient?.({ siteID, token });
      if (client?.store) return client.store('shares');
      throw e2;
    }
  }
}

// --- утилита: читаем различный формат в строку ---
async function anyToString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Uint8Array) return new TextDecoder().decode(v);

  // веб-поток
  if (typeof v?.getReader === 'function') {
    const reader = v.getReader();
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const buf = chunks.length === 1 ? chunks[0]
      : chunks.reduce((a, b) => {
          const out = new Uint8Array(a.length + b.length);
          out.set(a, 0); out.set(b, a.length);
          return out;
        }, new Uint8Array());
    return new TextDecoder().decode(buf);
  }

  // “похож на Response” (на всякий)
  if (typeof v?.arrayBuffer === 'function') {
    const ab = await v.arrayBuffer();
    return new TextDecoder().decode(new Uint8Array(ab));
  }

  // fallback
  return String(v);
}

// --- JSON-совместимость для разных API ---
async function setJson(store, key, obj) {
  if (typeof store.setJSON === 'function') {
    return await store.setJSON(key, obj);
  }
  const body = JSON.stringify(obj);
  try { return await store.set(key, body, { contentType: 'application/json; charset=utf-8' }); }
  catch { return await store.set(key, body); }
}

async function getJson(store, key) {
  // Современный способ
  if (typeof store.getJSON === 'function') {
    try { return await store.getJSON(key); }
    catch (_) { /* упадёт ниже в универсальный */ }
  }
  // Универсальный способ
  try {
    // если поддерживается auto-parse
    const vJson = await store.get(key, { type: 'json' }).catch(() => undefined);
    if (vJson !== undefined) return vJson;
  } catch (_) { /* игнор */ }

  // читаем как “что угодно” и парсим
  let raw;
  try { raw = await store.get(key); }
  catch (_) { return null; }                // treat as not found

  if (raw == null) return null;
  const text = await anyToString(raw);
  if (!text) return null;

  try { return JSON.parse(text); }
  catch (_) { return null; }                // не JSON → считаем отсутсвием корректных данных
}

function jsonV1(obj, status=200){ return { statusCode:status, headers:{'content-type':'application/json; charset=utf-8'}, body:JSON.stringify(obj)};}
function jsonV2(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'content-type':'application/json; charset=utf-8'} });}

async function handle(method, getBody, getQuery) {
  let store;
  try { store = makeStoreFromEnv(); }
  catch (e) { console.error('share_api config error:', e); return { body:{ error:e.message }, status:500 }; }

  try {
    if (method === 'POST') {
      const payload = await getBody();           // { lot, bg?, opts? }
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return { body: { error: 'invalid payload' }, status: 400 };
      }
      const id = (globalThis.crypto?.randomUUID?.())
        || (Math.random().toString(36).slice(2) + Date.now().toString(36));
      await setJson(store, id, payload);
      return { body: { id }, status: 200 };
    }

    if (method === 'GET') {
      const id = getQuery('id');
      if (!id) return { body: { error: 'missing id' }, status: 400 };

      const data = await getJson(store, id);
      if (!data) return { body: { error: 'not found' }, status: 404 };

      return { body: data, status: 200 };
    }

    if (method === 'OPTIONS') return { body: {}, status: 204 };
    return { body: { error: 'method not allowed' }, status: 405 };
  } catch (e) {
    console.error('share_api runtime error:', e);
    return { body: { error: 'server error' }, status: 500 };
  }
}

// ---- v1
export const handler = async (event) => {
  const res = await handle(
    (event.httpMethod || 'GET').toUpperCase(),
    async () => (event.body ? JSON.parse(event.body) : {}),
    (k) => event.queryStringParameters?.[k]
  );
  return jsonV1(res.body, res.status);
};

// ---- v2
export default async (request) => {
  const url = new URL(request.url);
  const res = await handle(
    request.method.toUpperCase(),
    async () => (await request.json().catch(() => ({}))),
    (k) => url.searchParams.get(k)
  );
  return jsonV2(res.body, res.status);
};
