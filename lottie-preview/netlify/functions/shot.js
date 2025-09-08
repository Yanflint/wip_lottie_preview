// [ANCHOR:FN_SHOT]
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const store = getStore({ name: 'shots', consistency: 'strong' });

  const lotText  = await store.get(`${id}/anim.json`, { type: 'text' });
  const metaText = await store.get(`${id}/meta.json`, { type: 'text' });
  const bgText   = await store.get(`${id}/bg.txt`,    { type: 'text' });

  if (!lotText || !metaText) return new Response('Not found', { status: 404 });

  return new Response(JSON.stringify({
    lot: JSON.parse(lotText),
    bg:  bgText || null,
    opts: JSON.parse(metaText).opts || {}
  }), { headers: { 'content-type': 'application/json' } });
};
