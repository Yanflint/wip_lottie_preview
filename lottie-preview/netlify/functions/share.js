// /.netlify/functions/share
// POST  -> создать снимок, вернуть { id }
// PUT ?id=... -> обновить существующий снимок тем же id
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  try {
    const method = event.httpMethod || 'GET';
    if (method !== 'POST' && method !== 'PUT') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');

    // Нормализуем снапшот: храним только нужные поля
    const snap = {
      v: 3,
      bg: typeof body.bg === 'string' ? body.bg : null,
      overlay: typeof body.overlay === 'string' ? body.overlay : null,
      lot: body.lot ?? null,
      pos: body.pos && typeof body.pos === 'object'
        ? { dx: body.pos.dx | 0, dy: body.pos.dy | 0 }
        : { dx: 0, dy: 0 },
      opts: { loop: !!(body.opts && body.opts.loop) },
      bgx: typeof body.bgx === 'number' ? body.bgx : null,
      bgNatural: body.bgNatural && typeof body.bgNatural === 'object'
        ? { w: body.bgNatural.w | 0, h: body.bgNatural.h | 0 }
        : null,
    };

    // id: если не передан, создаём
    let id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const store = getStore('shots'); // одно имя стора на проект
    await store.set(id, JSON.stringify(snap), { contentType: 'application/json' });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    };
  } catch {
    return { statusCode: 500, body: 'share failed' };
  }
};
