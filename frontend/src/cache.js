// A tiny in-memory cache for the read-heavy, mostly-public GET calls (marketplace
// listings, a single parcel, the land use taxonomy). Lives for the life of the tab —
// intentionally not persisted to localStorage, since parcel data changes and we'd
// rather re-fetch on a hard refresh than show something stale indefinitely.
const store = new Map(); // key -> { expiresAt, value }

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Drops every cached entry whose key starts with any of the given prefixes — used
// after a mutation so the next read is never stale.
export function cacheInvalidate(...prefixes) {
  for (const key of store.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}
