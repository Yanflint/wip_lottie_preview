// netlify/functions/share_api.js
// Совместимо с Functions v1 (export handler) и v2 (export default).

async function getStoreSafe() {
  try {
    const mod = await import('@netlify/blobs');
    return mod.getStore;
  } catch (e) {
    console.error('share_api: @netlify/blobs not available', e);
    return null;
  }
}

function jsonV1(obj, status = 200) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj)
  };
}
function jsonV2(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

// ---- V1 (handler) ----
export const handler = async (event) => {
  const getStore = await getStoreSafe();
  if (!getStore) return jsonV1({ error: 'storage unavailable: @netlify/blobs not installed' }, 500);

  const store = getStore('shares');
  const method = (event.httpMethod || 'GET').toUpperCase();

  try {
    if (method === 'POST') {
      let payload = {};
      try { payload = JSON.parse(event.body || '{}'); } catch {}
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return jsonV1({ error: 'invalid payload' }, 400);
      }
      const id = (globalThis.crypto?.randomUUID?.() ||
        (Math.random().toString(36).slice(2) + Date.now().toString(36)));

      await store.setJSON(id, payload);
      return jsonV1({ id }, 200);
    }

    if (method === 'GET') {
      const id = event.queryStringParameters?.id;
      if (!id) return jsonV1({ error: 'missing id' }, 400);
      const data = await store.getJSON(id);
      if (!data) return jsonV1({ error: 'not found' }, 404);
      return jsonV1(data, 200);
    }

    if (method === 'OPTIONS') return jsonV1({}, 204);
    return jsonV1({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error('share_api runtime error (v1)', e);
    return jsonV1({ error: 'server error' }, 500);
  }
};

// ---- V2 (default export) ----
export default async (request) => {
  // Если Netlify использует v1, в default никогда не зайдём — но пусть будет.
  const getStore = await getStoreSafe();
  if (!getStore) return jsonV2({ error: 'storage unavailable: @netlify/blobs not installed' }, 500);

  const store = getStore('shares');
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === 'POST') {
      const payload = await request.json().catch(() => ({}));
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return jsonV2({ error: 'invalid payload' }, 400);
      }
      const id = (globalThis.crypto?.randomUUID?.() ||
        (Math.random().toString(36).slice(2) + Date.now().toString(36)));

      await store.setJSON(id, payload);
      return jsonV2({ id }, 200);
    }

    if (method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return jsonV2({ error: 'missing id' }, 400);
      const data = await store.getJSON(id);
      if (!data) return jsonV2({ error: 'not found' }, 404);
      return jsonV2(data, 200);
    }

    if (method === 'OPTIONS') return new Response(null, { status: 204 });
    return jsonV2({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error('share_api runtime error (v2)', e);
    return jsonV2({ error: 'server error' }, 500);
  }
};
