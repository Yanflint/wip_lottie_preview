export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const onRoot = url.pathname === '/' || url.pathname.endsWith('/index.html');
    if (!onRoot) return context.next();

    const cookie = request.headers.get('cookie') || '';
    const m = /(?:^|;\s*)lastShotId=([^;]+)/.exec(cookie);
    if (m && m[1]) {
      const id = decodeURIComponent(m[1]);
      if (id) {
        return Response.redirect(url.origin + '/s/' + encodeURIComponent(id), 302);
      }
    }
  } catch (e) {}
  return context.next();
};
