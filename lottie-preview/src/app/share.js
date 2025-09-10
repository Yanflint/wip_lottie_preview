// Netlify Functions v2 (ESM, Fetch API)
import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  const store = getStore('shares'); // коллекция "shares" в Netlify Blobs

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === 'POST') {
      // ожидаем { lot, bg?, opts? }
      const payload = await request.json();

      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return json({ error: 'invalid payload' }, 400);
      }

      const id = (crypto?.randomUUID && crypto.randomUUID()) ||
                 Math.random().toString(36).slice(2) + Date.now().toString(36);

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

    // OPTIONS (на всякий) — можно вернуть пусто
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error('share function error', e);
    return json({ error: 'server error' }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
