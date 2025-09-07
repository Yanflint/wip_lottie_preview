import { getStore } from '@netlify/blobs';

/** POST create / PUT update snapshot */
export async function handler(event, context) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const body = event.body ? JSON.parse(event.body) : null;
  if (!body || typeof body !== 'object') {
    return { statusCode: 400, body: 'Bad snapshot' };
  }
  const store = getStore('shots'); // serverless store
  let id = event.queryStringParameters && event.queryStringParameters.id;
  if (event.httpMethod === 'POST') {
    id = id || crypto.randomUUID();
  }
  // Required fields should be present
  const must = ['pos','bgx','bgNatural','opts'];
  for (const k of must) {
    if (!(k in body)) return { statusCode: 400, body: 'Missing ' + k };
  }

  await store.setJSON(id, body);
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id })
  };
}
