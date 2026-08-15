// A deliberately simple in-memory cache for the handful of public, read-heavy GET
// endpoints (marketplace listings, a single parcel, the land use taxonomy). Good
// enough for a single-process deployment; if this ever runs across multiple
// instances, swap the Map below for Redis without touching the call sites.
const store = new Map(); // key -> { expiresAt, body }

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.body;
}

function set(key, body, ttlMs) {
  store.set(key, { body, expiresAt: Date.now() + ttlMs });
}

// Clears every cached entry whose key starts with one of the given prefixes. Called
// after any write so the next read is never stale — coarse, but correct, and cheap at
// this scale.
function invalidate(...prefixes) {
  for (const key of store.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}

function clearAll() {
  store.clear();
}

// Express middleware factory: caches the JSON body of successful GET responses for
// `ttlMs`, keyed by the request path + query string. Also sets a matching
// Cache-Control header so browsers/CDNs can skip the round trip entirely.
function cacheGet(ttlMs) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = get(key);
    if (cached !== undefined) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(key, body, ttlMs);
        res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}

module.exports = { get, set, invalidate, clearAll, cacheGet };
