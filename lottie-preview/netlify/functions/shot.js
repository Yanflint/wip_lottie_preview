// optional stub function
export default async () => new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
