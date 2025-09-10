// netlify/functions/share_api.js
// Работает с Functions v1 (handler) и v2 (default). Настраивает Blobs автоматически,
// а при отсутствии автоконфига использует переменные окружения.

async function makeStore() {
  const { getStore } = await import('@netlify/blobs');

  // 1) Пробуем автоконфиг от Netlify (если Blobs включены для сайта)
  try {
    return getStore('shares'); // может бросить MissingBlobsEnvironmentError
  } catch (_) {
    // 2) Фоллбэк: ручная конфигурация через env
    const siteID =
      process.env.NETLIFY_BLOBS_SITE_ID ||
      process.env.NETLIFY_SITE_ID ||
      process.env.SITE_ID;

    const token =
      process.env.NETLIFY_BLOBS_TOKEN ||
      process.env.NETLIFY_API_TOKEN ||
      process.env.BLOBS_TOKEN;

    if (!siteID || !token) {
      throw new Error(
        'Netlify Blobs not configured. Set NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN in site env'
      );
    }
    return getStore('shares', { siteID, token });
  }
}

function jsonV1(obj, status = 200) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj),
  };
}
function jsonV2(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function handle(method, getBody, getQuery) {
  try {
    const store = await makeStore();

    if (method === 'POST') {
      const payload = await getBody();
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return { body: { error: 'invalid payload' }, status: 400 };
      }
      const id =
        (globalThis.crypto?.randomUUID?.()) ||
        (Math.random().toString(36).slice(2) + Date.now().toString(36));

      await store.setJSON(id, payload);
      return { body: { id }, status: 200 };
    }

    if (method === 'GET') {
      const id = getQuery('id');
      if (!id) return { body: { error: 'missing id' }, status: 400 };
      const data = await store.getJSON(id);
      if (!data) return { body: { error: 'not found' }, status: 404 };
      return { body: data, status: 200 };
    }

    if (method === 'OPTIONS') return { body: {}, status: 204 };
    return { body: { error: 'method not allowed' }, status: 405 };
  } catch (e) {
    console.error('share_api error:', e);
    return { body: { error: e.message || 'server error' }, status: 500 };
  }
}

// ---- Functions v1
export const handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const res = await handle(
    method,
    async () => (event.body ? JSON.parse(event.body) : {}),
    (k) => event.queryStringParameters?.[k]
  );
  return jsonV1(res.body, res.status);
};

// ---- Functions v2
export default async (request) => {
  const url = new URL(request.url);
  const res = await handle(
    request.method.toUpperCase(),
    async () => (await request.json().catch(() => ({}))),
    (k) => url.searchParams.get(k)
  );
  return jsonV2(res.body, res.status);
};
