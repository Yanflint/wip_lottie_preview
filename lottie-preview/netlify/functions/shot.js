import { getStore } from '@netlify/blobs';

/** GET snapshot by id */
export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Missing id' };
  const store = getStore('shots');
  const snap = await store.get(id, { type: 'json' });
  if (!snap) return { statusCode: 404, body: 'Not found' };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snap)
  };
}
