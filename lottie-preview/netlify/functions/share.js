// [ANCHOR:FN_SHARE]
import { getStore } from '@netlify/blobs';
import { v4 as uuid } from 'uuid';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { lot, bg, opts } = await req.json();
    if (!lot) return new Response('Missing lot', { status: 400 });

    const id = uuid();
    // В blobs@^8 корректный вызов — передавать строку-имя стора
    const store = getStore('shots');

    // У blobs правильная опция — contentType (не metadata)
    await store.set(`${id}/anim.json`, JSON.stringify(lot), { contentType: 'application/json' });
    if (bg) {
      await store.set(`${id}/bg.txt`, String(bg), { contentType: 'text/plain' });
    }
    await store.set(
      `${id}/meta.json`,
      JSON.stringify({ opts: opts || {} }),
      { contentType: 'application/json' }
    );

    return new Response(JSON.stringify({ id }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
};
