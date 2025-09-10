// netlify/functions/share_api.js
// Netlify Functions v2 (ESM, Fetch API)

// POST /api/share { lot, bg?, opts? } -> { id }
// GET  /api/share?id=...               -> { lot, bg?, opts? }

export default async (request) => {
  let blobs;
  try {
    blobs = await import('@netlify/blobs'); // подтягиваем зависимость в рантайме
  } catch (e) {
    console.error('share_api: @netlify/blobs not available', e);
    return json({ error: 'storage unavailable: @netlify/blobs not installed' }, 500);
  }

  const { getStore } = blobs;
  const store = getStore('shares');
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === 'POST') {
      const payload = await request.json(); // { lot, bg?, opts? }
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return json({ error: 'invalid payload' }, 400);
      }
      const id = (crypto?.randomUUID && crypto.randomUUID())
        || Math.random().toString(36).slice(2) + Date.now().toString(36);

      await store.setJSON(id, payload);
      return json({ id }, 200);
    }

    if (method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'missing id' }, 400);

      const data = await store.getJSON(id);
      if (!data) return json({ error: 'not found' }, 404);

      return json(data, 200);
    }

    if (method === 'OPTIONS') return new Response(null, { status: 204 });
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error('share_api runtime error', e);
    return json({ error: 'server error' }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
