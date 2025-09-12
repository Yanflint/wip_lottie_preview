// netlify/functions/share_api.js
// Снимки + "последний" (__last__). Поддержка легковесной проверки:
//   GET /api/share?id=last&rev=1  → { rev: "<hash>" }
//   HEAD /api/share?id=last       → ETag: "<hash>"
// Основной GET без rev отдаёт полный payload.

const blobs = require('@netlify/blobs');

const LAST_KEY = '__last__';
const INDEX_PREFIX = 'index/';

// smart store selection: try Netlify blobs auto, then env, then in-memory (dev)
function getStoreSmart() {
  try {
    // Netlify auto store
    const st = blobs.getStore('shares');
    if (st) return st;
  } catch (e) {}
  try {
    return makeStoreFromEnv();
  } catch (e) {
    console.error('share_api env store not available:', e?.message || e);
  }
  // in-memory fallback for local/dev
  if (!globalThis.__MEM_STORE__) globalThis.__MEM_STORE__ = new Map();
  const M = globalThis.__MEM_STORE__;
  return {
    async get(key){ return M.has(key) ? M.get(key) : null; },
    async set(key, v){ M.set(key, v); return true; },
    async getJSON(key){ const t = M.get(key); try { return t ? JSON.parse(t) : null; } catch { return null; } },
    async setJSON(key, obj){ M.set(key, JSON.stringify(obj)); return true; },
    async list(){ return Array.from(M.keys()); }
  };
}


// ─── утилиты ──────────────────────────────────────────────────────────────────
function makeStoreFromEnv() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN;
  if (!siteID || !token) throw new Error('Missing NETLIFY_BLOBS_SITE_ID or NETLIFY_BLOBS_TOKEN');

  try { return blobs.getStore({ name: 'shares', siteID, token }); }
  catch (_) {
    try { /* @ts-ignore */ return blobs.getStore('shares', { siteID, token }); }
    catch (e2) {
      const client = blobs.createClient?.({ siteID, token });
      if (client?.store) return client.store('shares');
      throw e2;
    }
  }
}

async function anyToString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Uint8Array) return new TextDecoder().decode(v);
  if (typeof v?.getReader === 'function') {
    const reader = v.getReader(); const chunks = [];
    while (true) { const {value, done} = await reader.read(); if (done) break; if (value) chunks.push(value); }
    const buf = chunks.reduce((a,b)=>{const out=new Uint8Array(a.length+b.length); out.set(a,0); out.set(b,a.length); return out;}, new Uint8Array());
    return new TextDecoder().decode(buf);
  }
  if (typeof v?.arrayBuffer === 'function') {
    const ab = await v.arrayBuffer();
    return new TextDecoder().decode(new Uint8Array(ab));
  }
  return String(v);
}

async function setJson(store, key, obj) {
  const body = JSON.stringify(obj);
  if (typeof store.setJSON === 'function') return store.setJSON(key, obj);
  try { return await store.set(key, body, { contentType: 'application/json; charset=utf-8' }); }
  catch { return await store.set(key, body); }
}

async function getRaw(store, key) {
  // пытаемся найти JSON удобным способом…
  if (typeof store.getJSON === 'function') {
    try {
      const j = await store.getJSON(key);
      if (j != null) return { text: JSON.stringify(j), json: j };
    } catch (e) {}
  }
  // …или как строку/стрим
  try {
    const v = await store.get(key);
    if (v == null) return { text: null, json: null };
    const text = await anyToString(v);
    try { return { text, json: JSON.parse(text) }; } catch { return { text, json: null }; }
  } catch {
    return { text: null, json: null };
  }
}

function fnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function resV1(body, status=200, extraHeaders={}) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
    body: JSON.stringify(body)
  };
}

function resV2(body, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}

// ─── основной хэндлер ─────────────────────────────────────────────────────────
async function handle(method, getBody, getQuery) {
  let store = getStoreSmart();
, status:500, headers:{} }; }

  try {
    if (method === 'POST') {
      const payload = await getBody(); // { lot, bg?, opts? }
      if (!payload || typeof payload !== 'object' || !payload.lot) {
        return { body: { error: 'invalid payload' }, status: 400, headers:{} };
      }
      const id = (globalThis.crypto?.randomUUID?.())
        || (Math.random().toString(36).slice(2) + Date.now().toString(36));

      await setJson(store, id, payload);
      await setJson(store, LAST_KEY, payload);

      return { body: { id, rev }, status: 200, headers:{} };
    }

    if (method === 'GET' || method === 'HEAD') {
      let id = getQuery('id');
      if (!id) return { body: { error: 'missing id' }, status: 400, headers:{} };
      if (id === 'last' || id === LAST_KEY) id = LAST_KEY;

      const { text, json } = await getRaw(store, id);
      if (!text) return { body: { error: 'not found' }, status: 404, headers:{} };

      const etag = `"${fnv1a(text)}"`; // кавычки как у классического ETag
      const headers = { ETag: etag, 'cache-control': 'no-store, max-age=0' };

      // Лёгкий ответ с ревизией
      const revOnly = !!getQuery('rev');
      if (method === 'HEAD') {
        return { body: {}, status: 200, headers };
      }
      if (revOnly) {
        return { body: { rev: etag.replace(/"/g, '') }, status: 200, headers };
      }

      // Полный payload
      if (json != null) return { body: json, status: 200, headers };
      // если не распарсился JSON — вернём как есть (не должно быть)
      return { body: { raw: text }, status: 200, headers };
    }

    if (method === 'OPTIONS') return { body: {}, status: 204, headers:{} };
    return { body: { error: 'method not allowed' }, status: 405, headers:{} };

  } catch (e) {
    console.error('share_api runtime error:', e);
    return { body: { error: 'server error' }, status: 500, headers:{} };
  }
}

// v1
exports.handler = async (event) => {
  const { body, status, headers } = await handle(
    (event.httpMethod || 'GET').toUpperCase(),
    async () => (event.body ? JSON.parse(event.body) : {}),
    (k) => (event.queryStringParameters ? event.queryStringParameters[k] : null)
  );
  return resV1(body, status, headers);
};

// (edge runtime disabled in CJS build)
