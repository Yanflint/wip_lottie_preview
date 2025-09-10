// netlify/functions/check_blobs.js
import * as blobs from '@netlify/blobs';

export const handler = async () => {
  const env = process.env;
  const siteID = env.NETLIFY_BLOBS_SITE_ID || env.NETLIFY_SITE_ID || null;
  const token  = env.NETLIFY_BLOBS_TOKEN   || env.NETLIFY_API_TOKEN || null;

  let auto_ok = false, manual_ok = false, auto_err = null, manual_err = null, storeType = null;

  try {
    try {
      await blobs.getStore('shares').list(); // автоконфиг (если вдруг доступен)
      auto_ok = true; storeType = 'auto';
    } catch (e) {
      auto_err = String(e?.message || e);
    }

    try {
      if (!siteID || !token) throw new Error('missing siteID/token for manual');
      // v8 сигнатура
      try {
        await blobs.getStore({ name: 'shares', siteID, token }).list();
        manual_ok = true; storeType = storeType || 'manual(new)';
      } catch (eNew) {
        // старый формат
        // @ts-ignore
        await blobs.getStore('shares', { siteID, token }).list();
        manual_ok = true; storeType = storeType || 'manual(old)';
      }
    } catch (e) {
      manual_err = String(e?.message || e);
    }
  } catch (fatal) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, error: 'cannot use @netlify/blobs', detail: String(fatal?.message || fatal) })
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      ok: auto_ok || manual_ok,
      siteID_present: !!siteID,
      token_present: !!token,
      auto_ok, auto_err,
      manual_ok, manual_err,
      storeType
    })
  };
};
