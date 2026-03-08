/**
 * Simple in-memory LRU cache with TTL for Wikipedia API responses.
 *
 * Year articles are quasi-immutable, so a long TTL is safe.
 * The module-level Map persists across requests within a warm
 * server process (works on Node.js and warm serverless instances).
 */

/** Maximum number of cached entries (~10 MB ceiling at ~5 KB avg). */
const MAX_ENTRIES = 2000;

/** Time-to-live for each entry (24 hours). */
const TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { data: any, timestamp: number }>} */
const cache = new Map();

let hits = 0;
let misses = 0;

/**
 * Retrieve a cached value, or undefined if missing / expired.
 * Refreshes the entry's position in insertion order on hit (LRU).
 *
 * @param {string} key
 * @returns {any | undefined}
 */
export function cacheGet(key) {
	const entry = cache.get(key);
	if (!entry) {
		misses++;
		return undefined;
	}
	if (Date.now() - entry.timestamp > TTL_MS) {
		cache.delete(key);
		misses++;
		return undefined;
	}
	// Move to end (most-recently-used) by re-inserting
	cache.delete(key);
	cache.set(key, entry);
	hits++;
	return entry.data;
}

/**
 * Store a value in the cache. Evicts the oldest entry if at capacity.
 *
 * @param {string} key
 * @param {any} value
 */
export function cacheSet(key, value) {
	// Delete first so re-insertion moves to end
	cache.delete(key);
	if (cache.size >= MAX_ENTRIES) {
		// Evict oldest (first key in Map iteration order)
		const oldest = cache.keys().next().value;
		cache.delete(oldest);
	}
	cache.set(key, { data: value, timestamp: Date.now() });
}

/**
 * Return cache statistics for monitoring / testing.
 * @returns {{ size: number, hits: number, misses: number }}
 */
export function cacheStats() {
	return { size: cache.size, hits, misses };
}
