/**
 * Deliberately not Redis: this is a single-process cache for read-heavy,
 * short-TTL, non-critical data (dashboard aggregates) where a cache miss
 * after a restart or a slightly stale value across horizontally-scaled
 * instances is a non-issue. If Nebula outgrows a single backend instance,
 * this is the seam to swap in Redis — every call site already goes through
 * `getOrCompute`, so nothing above this module would need to change.
 */
const store = new Map();

async function getOrCompute(key, ttlMs, computeFn) {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await computeFn();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function invalidate(key) {
  store.delete(key);
}

module.exports = { getOrCompute, invalidate };
