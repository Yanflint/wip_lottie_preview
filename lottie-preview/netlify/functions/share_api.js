// Совместимо с Netlify Functions v1 и v2 и с разными версиями @netlify/blobs.
// Всегда настраивает Blobs вручную через ENV (siteID + token).

import * as blobs from '@netlify/blobs';

// --- конфиг стора из ENV ---
function makeStoreFromEnv() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN;
  if (!siteID || !token) {
    throw new Error('Missing NETLIFY_BLOBS_SITE_ID or NETLIFY_BLOBS_TOKEN in site env');
  }

  // v8+: getStore({ name, siteID, token })
  try {
    return blobs.getStore({ name: 'shares', siteID, token });
  } catch (_) {
    // старый формат: getStore('name', { siteID, token })
    try {
      // @ts-ignore
      return blobs.getStore('shares', { siteID, token });
    } catch (e2) {
      // последний шанс: createClient().store('name')
      try {
        const client = blobs.createClient?.({ siteID, token });
        if (client?.store) return client.store('shares');
      } catch {}
      throw e2;
    }
  }
}

// --- JSON совместимость: используем что доступно ---
async function setJson(store, key, obj) {
  if (typeof store.setJSON === 'function') {
    return await store.setJSON(key, obj);
  }
  // универсальный путь
  const body = JSON.stringify(obj);
  try {
    return await store.set(key, body, { contentType: 'application/json; charset=utf-8' });
  } catch {
    return await store.set(key, body); // старые версии без contentType
  }
}

async function getJson(store, key) {
  if (typeof store.getJSON === 'function') {
    return await store.getJSON(key);
  }
  // пробуем тип json, если поддерживается
  try {
    const v = await store.get(key, { type: 'json' });
    if (v !== undefined) return v;
  } catch {}
  // строка / байты
  const v = await store.get(key);
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  if (v instanceof Uint8Array) {
    try { return JSON.parse(new TextDecoder().decode(v)); } catch { return null; }
  }
  try { return JSON.parse(String(v)); } catch { return null; }
}

function jsonV1(obj, status=200){ return { statusCode:status, headers:{'content-type':'application/json; charset=utf-8'}, body:JSON.stringify(obj)};}
function jsonV2(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'content-type':'application/json; charset=utf-8'} });}

async function handle(method, getBody, getQuery) {
  let store;
  try { store = makeStoreFromEnv(); }
  catch (e) { console.error('share_api config error:', e); return { body:{ error:e.message }, status:500 }; }

  try {
    if (method === 'POST') {
      const payload = await getBody();              // { lot, bg?, opts? }
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

// v1
export const handler = async (event) => {
  const res = await handle(
    (event.httpMethod || 'GET').toUpperCase(),
    async () => (event.body ? JSON.parse(event.body) : {}),
    (k) => event.queryStringParameters?.[k]
  );
  return jsonV1(res.body, res.status);
};

// v2
export default async (request) => {
  const url = new URL(request.url);
  const res = await handle(
    request.method.toUpperCase(),
    async () => (await request.json().catch(() => ({}))),
    (k) => url.searchParams.get(k)
  );
  return jsonV2(res.body, res.status);
};
