import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichSignificance } from './wikipedia.js';
import { SIG_CONFIG } from './significance-config.js';

// `enrichSignificance` performs network I/O (pageviews + "On this day" feeds),
// so we stub global `fetch`. Each test uses unique page titles so the
// module-level api-cache (which has no reset hook) cannot leak between tests.

/**
 * Build a stub Response.
 * @param {boolean} ok
 * @param {any} body
 * @param {number} [status]
 */
function res(ok, body, status = ok ? 200 : 500) {
	return { ok, status, json: async () => body };
}

/** A pageviews REST body with `months` entries all at `views`. */
function pageviewsBody(views, months = SIG_CONFIG.PAGEVIEW_MONTHS) {
	return { items: Array.from({ length: months }, () => ({ views })) };
}

/**
 * Install a fetch mock that routes by URL.
 * @param {{ pageviews?: Record<string, number>, onthisday?: Record<string, any>, fail?: boolean }} cfg
 */
function stubFetch(cfg) {
	const fn = vi.fn(async (/** @type {string} */ url) => {
		if (cfg.fail) return res(false, null, 500);

		if (url.includes('/metrics/pageviews/per-article/')) {
			// title sits between /all-agents/ and /monthly/
			const m = url.match(/all-agents\/([^/]+)\/monthly/);
			const title = m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : '';
			const views = cfg.pageviews?.[title];
			if (views === undefined) return res(false, null, 404);
			return res(true, pageviewsBody(views));
		}

		if (url.includes('/onthisday/events/')) {
			const m = url.match(/onthisday\/events\/(\d{2})\/(\d{2})/);
			const key = m ? `${m[1]}/${m[2]}` : '';
			return res(true, cfg.onthisday?.[key] ?? { events: [] });
		}

		return res(false, null, 404);
	});
	vi.stubGlobal('fetch', fn);
	return fn;
}

/** @returns {import('./types.js').HistoricalEvent} */
function ev(year, text, pageTitle, textSignificance) {
	return { year, text, pageTitle, textSignificance, significance: textSignificance, boost: 1 };
}

beforeEach(() => {
	vi.useFakeTimers(); // collapse the 100ms inter-batch delays
	vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
});

afterEach(() => {
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('enrichSignificance', () => {
	it('promotes a popular low-text event above an unpopular high-text event', async () => {
		const plain = ev(1666, 'A minor statute is enacted by the local council', 'Minor Statute A', 0.6);
		const famous = ev(1666, 'The city is devastated by an enormous fire over four days', 'Famous Fire A', 0.4);

		stubFetch({ pageviews: { 'Minor Statute A': 20, 'Famous Fire A': 60_000 } });

		const p = enrichSignificance([plain, famous], 2026);
		await vi.runAllTimersAsync();
		await p;

		expect(famous.significance).toBeGreaterThan(plain.significance);
	});

	it('keeps text significance when the pageviews call fails (graceful degradation)', async () => {
		const e = ev(1666, 'A notable parliamentary act passes in the spring session', 'Degrade Title B', 0.55);
		stubFetch({ fail: true });

		const p = enrichSignificance([e], 2026);
		await vi.runAllTimersAsync();
		await p;

		expect(e.significance).toBeCloseTo(0.55, 6);
	});

	it('applies the curated boost on an "On this day" title + year match', async () => {
		const e = ev(1666, 'September 2 – A great fire breaks out in the capital city', 'Curated Fire C', 0.5);
		stubFetch({
			fail: false,
			pageviews: {}, // no pageview data → pop is null, isolates the curated boost
			onthisday: { '09/02': { events: [{ year: 1666, pages: [{ title: 'Curated Fire C' }] }] } },
		});

		const p = enrichSignificance([e], 2026);
		await vi.runAllTimersAsync();
		await p;

		expect(e.significance).toBeCloseTo(0.5 * SIG_CONFIG.CURATED_BOOST, 6);
	});

	it('does not apply the curated boost when the year does not match', async () => {
		const e = ev(1666, 'September 2 – A great fire breaks out in the capital city', 'Curated Fire D', 0.5);
		stubFetch({
			pageviews: {},
			onthisday: { '09/02': { events: [{ year: 1212, pages: [{ title: 'Curated Fire D' }] }] } },
		});

		const p = enrichSignificance([e], 2026);
		await vi.runAllTimersAsync();
		await p;

		expect(e.significance).toBeCloseTo(0.5, 6);
	});

	it('caches pageviews — a repeated title triggers no second fetch', async () => {
		const make = () => ev(1666, 'A notable event occurs in the northern province', 'Cache Title E', 0.5);
		const fn = stubFetch({ pageviews: { 'Cache Title E': 5000 } });

		const p1 = enrichSignificance([make()], 2026);
		await vi.runAllTimersAsync();
		await p1;
		const callsAfterFirst = fn.mock.calls.filter(c => String(c[0]).includes('Cache_Title_E')).length;

		const p2 = enrichSignificance([make()], 2026);
		await vi.runAllTimersAsync();
		await p2;
		const callsAfterSecond = fn.mock.calls.filter(c => String(c[0]).includes('Cache_Title_E')).length;

		expect(callsAfterFirst).toBe(1);
		expect(callsAfterSecond).toBe(1); // second run served from cache
	});

	it('preserves a pre-existing boost factor through enrichment', async () => {
		const e = ev(1666, 'A globally notable treaty is signed between empires', 'Boosted Title F', 0.4);
		e.boost = SIG_CONFIG.GLOBAL_NOTABLE_BOOST; // as set by boostGloballyNotableEvents
		stubFetch({ fail: true }); // no pop → blended == textSig

		const p = enrichSignificance([e], 2026);
		await vi.runAllTimersAsync();
		await p;

		expect(e.significance).toBeCloseTo(0.4 * SIG_CONFIG.GLOBAL_NOTABLE_BOOST, 6);
	});
});
