// [ANCHOR:FN_SHARE]
import { getStore } from '@netlify/blobs';
import { v4 as uuid } from 'uuid';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { lot, bg, opts } = await req.json();
    if (!lot) return new Response('Missing lot', { status: 400 });

    const id = uuid();
    const store = getStore({ name: 'shots', consistency: 'strong' });

    await store.set(`${id}/anim.json`, JSON.stringify(lot), { metadata: { contentType: 'application/json' } });
    if (bg) await store.set(`${id}/bg.txt`, String(bg), { metadata: { contentType: 'text/plain' } });
    await store.set(`${id}/meta.json`, JSON.stringify({ opts: opts || {} }), { metadata: { contentType: 'application/json' } });

    return new Response(JSON.stringify({ id }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
};
