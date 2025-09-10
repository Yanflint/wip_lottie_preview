// netlify/functions/check_blobs.js
// Диагностика окружения для Netlify Blobs (НЕ выводит сам токен)
export const handler = async () => {
  const env = process.env;
  const siteID = env.NETLIFY_BLOBS_SITE_ID || env.NETLIFY_SITE_ID || null;
  const hasToken = !!(env.NETLIFY_BLOBS_TOKEN || env.NETLIFY_API_TOKEN);

  let canAuto = false, canManual = false, errAuto = null, errManual = null, storeType = null;

  try {
    const { getStore } = await import('@netlify/blobs');
    try {
      await getStore('shares').list();   // автоконфиг
      canAuto = true; storeType = 'auto';
    } catch (e) { errAuto = String(e?.message || e); }
    try {
      if (!siteID || !hasToken) throw new Error('missing siteID/token for manual');
      await getStore('shares', { siteID, token: env.NETLIFY_BLOBS_TOKEN || env.NETLIFY_API_TOKEN }).list();
      canManual = true; storeType = storeType || 'manual';
    } catch (e) { errManual = String(e?.message || e); }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok:false, error: 'cannot import @netlify/blobs', detail: String(e?.message||e) })
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      ok: canAuto || canManual,
      siteID_present: !!siteID,
      token_present: hasToken,
      auto_ok: canAuto, auto_err: errAuto,
      manual_ok: canManual, manual_err: errManual,
      storeType
    })
  };
};
