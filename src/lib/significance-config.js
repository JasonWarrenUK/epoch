/**
 * @module significance-config
 * Central, tunable configuration for event-significance scoring.
 *
 * All weights, caps, and damping factors live here so the scoring model can
 * be tuned in one place. This module must NOT import from `event-filters.js`
 * or `wikipedia.js` (it sits at the bottom of the dependency graph to avoid
 * circular imports).
 *
 * The scoring model combines three signals, learning from established work on
 * ranking historical significance (MIT Pantheon's Historical Popularity Index;
 * Skiena & Ward, "Who's Bigger?"):
 *   - **textSig**   — Wikipedia text heuristics (named-event prefix, links, keywords).
 *   - **popScore**  — reader attention (pageviews), log-normalized. The best
 *                     single proxy for human-perceived significance.
 *   - **sitelinks** — breadth across language editions (a distinct axis from views).
 */

export const SIG_CONFIG = Object.freeze({
	// ── Tier 1: main timeline `event.significance` blend ──────────────
	/** Weight of text heuristics in the timeline blend. */
	W_TEXT: 0.45,
	/** Weight of pageview popularity in the timeline blend. */
	W_POP: 0.55,

	// ── Pageviews (popularity) ────────────────────────────────────────
	/**
	 * Average monthly pageviews at which `popScore` saturates to ~1.
	 * Pageviews are heavily right-skewed, so popScore is log-normalized:
	 * `ln(1 + views) / ln(1 + POP_SATURATION)`.
	 */
	POP_SATURATION: 50_000,
	/** Trailing window (months) of pageview data to average. */
	PAGEVIEW_MONTHS: 24,
	/** Wikimedia project to query pageviews from. */
	PAGEVIEW_PROJECT: 'en.wikipedia',
	/**
	 * Per-decade cap on how many events get a pageviews lookup. The Timeline
	 * only surfaces the top 5 per decade, so this bounds API volume sharply
	 * (~TOP_PER_DECADE × decades calls per lifetime) without losing fidelity.
	 */
	TOP_PER_DECADE: 8,

	// ── Tier 2: `pickBestEvent` blend ─────────────────────────────────
	/** Weight of the (already pop-enriched) text significance. */
	W_PICK_TEXT: 0.55,
	/** Weight of the log-normalized sitelink breadth score. */
	W_PICK_SITELINK: 0.45,
	/** Sitelink count that saturates the (log-normalized) sitelink score. */
	SITELINK_CAP: 80,

	// ── Link score (fixes cross-article bias) ─────────────────────────
	/**
	 * Fixed global cap for the link-count score. Replaces the old per-article
	 * dynamic cap, which made identical events score differently depending on
	 * how link-dense their source year-article happened to be.
	 */
	GLOBAL_MAX_LINKS: 10,

	// ── Multiplicative boosts ─────────────────────────────────────────
	/** Boost for events appearing in both generic and country year articles. */
	GLOBAL_NOTABLE_BOOST: 1.5,
	/** Boost for events curated in Wikipedia's "On this day" feed. */
	CURATED_BOOST: 1.4,

	// ── Bias guards (Pantheon-style) ──────────────────────────────────
	/** Events newer than this many years from "now" get recency-damped. */
	RECENCY_WINDOW: 70,
	/** Multiplier applied to popScore for events inside the recency window. */
	RECENCY_DAMP: 0.85,
	/**
	 * Coefficient-of-variation threshold above which pageviews are treated as
	 * "flash in the pan" (one viral month) and popScore is damped.
	 */
	CV_DAMP_THRESHOLD: 2.0,
	/** Multiplier applied to popScore when CV exceeds the threshold. */
	CV_DAMP: 0.7,

	// ── Entity-type multipliers (Wikidata) ────────────────────────────
	/**
	 * Sitelinks of an event article reflect the event's notability; sitelinks
	 * of a person or place article are weaker evidence the event matters.
	 */
	ENTITY_MULT: Object.freeze({ event: 1.0, person: 0.3, place: 0.2, other: 0.5 }),

	// ── Penalties ─────────────────────────────────────────────────────
	/** Multiplier for events with no linked Wikipedia article (likely obscure). */
	NO_PAGE_PENALTY: 0.5,
});
