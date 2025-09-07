// /.netlify/functions/share
// POST  -> создать снимок, вернуть { id }
// PUT ?id=... -> обновить существующий снимок тем же id
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');

    // нормализуем снапшот (важные поля)
    const snap = {
      v: 3,
      bg: body.bg || null,
      overlay: body.overlay || null,
      lot: body.lot || null,
      pos: (body.pos && Number.isFinite(body.pos.dx) && Number.isFinite(body.pos.dy))
            ? { dx: body.pos.dx|0, dy: body.pos.dy|0 } : { dx:0, dy:0 },
      opts: { loop: !!(body.opts && body.opts.loop) },
      bgx: Math.max(1, Math.min(4, body.bgx|0 || 1)),
      bgNatural: body.bgNatural || null
    };

    // id
    let id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);

    const store = getStore('shots'); // имя стора — любое; одно для проекта
    await store.set(id, JSON.stringify(snap), { contentType: 'application/json' });

    return { statusCode: 200, body: JSON.stringify({ id }) };
  } catch (e) {
    return { statusCode: 500, body: 'share failed' };
  }
};
