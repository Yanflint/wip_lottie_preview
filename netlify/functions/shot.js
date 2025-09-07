// /.netlify/functions/shot?id=...
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  try {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return { statusCode: 400, body: 'missing id' };

    const store = getStore('shots');
    const snap = await store.get(id, { type: 'json' });

    if (!snap) return { statusCode: 404, body: 'not found' };

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(snap)
    };
  } catch (e) {
    return { statusCode: 500, body: 'shot failed' };
  }
};
