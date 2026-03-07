/**
 * @module event-filters
 * Content-quality filters for Wikipedia event text.
 *
 * Each predicate returns `true` when the text should be **rejected**.
 * `filterEventText` is the single entry-point that cleans then filters.
 */

// ── Cleaning (transforms, does not reject) ───────────────────────

const CITATION_RE = /\[\d+\]|\[citation needed\]|\[note \d+\]|\[[a-z]\]/gi;

/**
 * Strip citation / reference artifacts left over from HTML stripping.
 * @param {string} text
 * @returns {string}
 */
export function cleanCitations(text) {
	return text.replace(CITATION_RE, '').replace(/\s+/g, ' ').trim();
}

// ── Rejection predicates ─────────────────────────────────────────

const SECTION_LEAK_RE = /^(births?|deaths?|died|born|obituaries|references?|see also|notes?|sources?|bibliography)\s*[:–—-]/i;

/**
 * Reject section-header text that leaked into the Events list.
 * @param {string} text
 * @returns {boolean}
 */
export function isSectionLeak(text) {
	return SECTION_LEAK_RE.test(text);
}

const DATE_ONLY_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*[–—-]?\s*$/i;

/**
 * Reject entries that are only a date with no event content.
 * @param {string} text
 * @returns {boolean}
 */
export function isDateOnly(text) {
	return DATE_ONLY_RE.test(text);
}

/**
 * Reject entries with orphaned wiki/HTML markup artifacts.
 * @param {string} text
 * @returns {boolean}
 */
export function hasMalformedMarkup(text) {
	if (/[{}]/.test(text)) return true;
	if ((text.match(/\|/g) || []).length > 1) return true;
	// Excessive unmatched square brackets (after citation cleaning)
	if ((text.match(/[\[\]]/g) || []).length > 2) return true;
	return false;
}

/**
 * Reject entries where >50% of non-whitespace characters are digits.
 * @param {string} text
 * @returns {boolean}
 */
export function isMostlyNumeric(text) {
	const stripped = text.replace(/\s/g, '');
	if (stripped.length === 0) return true;
	const digitCount = (stripped.match(/\d/g) || []).length;
	return digitCount / stripped.length > 0.5;
}

const DATE_PREFIX_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*[–—-]\s*/i;

/**
 * Reject entries with fewer than 4 words after stripping an optional
 * leading date prefix. Catches name-only or context-free fragments.
 * @param {string} text
 * @returns {boolean}
 */
export function isTooFewWords(text) {
	const body = text.replace(DATE_PREFIX_RE, '');
	const words = body.split(/\s+/).filter(w => w.length > 0);
	return words.length < 4;
}

/**
 * Reject if text is under 20 characters.
 * @param {string} text
 * @returns {boolean}
 */
export function isTooShort(text) {
	return text.length < 20;
}

const SPORTS_RE = /\b(cricket|football|soccer|baseball|rugby|tennis|golf|horse\s*rac(?:e|ing)|boxing|rowing|polo|yacht|regatta|cup\s+final|fa\s+cup|championship\s+match|test\s+match|grand\s+prix|olympics?|olympic\s+games)\b/i;

/**
 * Reject sports events — results, matches, and competitions.
 * @param {string} text
 * @returns {boolean}
 */
export function isSportsEvent(text) {
	return SPORTS_RE.test(text);
}

// ── Pipeline ─────────────────────────────────────────────────────

const FILTERS = [isSectionLeak, isDateOnly, hasMalformedMarkup, isMostlyNumeric, isTooFewWords, isTooShort, isSportsEvent];

/**
 * Clean and filter a single event's text.
 * Returns the cleaned text if it passes all quality checks, or `null`
 * if the event should be rejected.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function filterEventText(text) {
	const cleaned = cleanCitations(text);
	if (cleaned.length === 0) return null;

	for (const filter of FILTERS) {
		if (filter(cleaned)) return null;
	}

	return cleaned;
}

// ── Named-event detection ────────────────────────────────────────

/**
 * Pattern for Wikipedia's named-event prefix convention.
 * Matches: "Gunpowder Plot: ...", "Peace of Cateau Cambrésis – ...",
 *          "Nine Years' War: ..."
 * Requires at least two capitalized words (or "X of Y" pattern) before
 * a colon or dash separator to avoid false positives on plain sentences.
 */
const NAMED_EVENT_RE = /^(?:[A-Z][A-Za-z']+(?:\s+(?:of|the|in|at|on|and|de|du|des|la|le))?(?:\s+|(?=[:–—])))+[:–—]\s/;

/**
 * Detect whether text starts with a named event pattern.
 * Wikipedia editors only name events that are independently notable.
 * @param {string} text
 * @returns {boolean}
 */
export function hasNamedEventPrefix(text) {
	return NAMED_EVENT_RE.test(text);
}

// ── Significance scoring ─────────────────────────────────────────

/** @type {Array<[RegExp, number, string]>} */
const KEYWORD_WEIGHTS = [
	// High significance (1.0)
	[/\b(war|civil\s+war|invasion|genocide)\b/i, 1.0, 'conflict'],
	[/\b(revolution|independence|coup)\b/i, 1.0, 'upheaval'],
	[/\b(constitution|coronation|abdication|assassination)\b/i, 1.0, 'political'],
	// Medium significance (0.5)
	[/\b(battle|siege|massacre|crusade)\b/i, 0.5, 'conflict'],
	[/\b(treaty|edict|decree|act\s+of\s+parliament)\b/i, 0.5, 'political'],
	[/\b(rebellion|revolt|uprising|reform)\b/i, 0.5, 'upheaval'],
	[/\b(famine|plague|earthquake|fire)\b/i, 0.5, 'disaster'],
	// Lower significance (0.25)
	[/\b(founded|established|charter|expedition|exploration|discovery)\b/i, 0.25, 'cultural'],
	[/\b(alliance|elected|annexed|proclaimed|abolished|surrendered|executed|crowned|signed|ratified)\b/i, 0.25, 'political'],
];

/** Default link cap when no dynamic cap is provided. */
const DEFAULT_MAX_LINKS = 10;

/**
 * Detect the dominant keyword category for an event.
 * Returns the category of the highest-weight matching keyword, or null.
 * @param {string} text
 * @returns {string | null}
 */
export function detectCategory(text) {
	let bestCategory = null;
	let bestWeight = 0;
	for (const [pattern, weight, category] of KEYWORD_WEIGHTS) {
		if (pattern.test(text) && weight > bestWeight) {
			bestWeight = weight;
			bestCategory = category;
		}
	}
	return bestCategory;
}

/**
 * Compute a 0–1 significance score for an event.
 *
 * Combines five signals:
 * - **Named event prefix** (30%): Wikipedia editors name notable events
 *   (e.g. "Gunpowder Plot: ..."). Strongest editorial signal.
 * - **Link count** (25%): Number of Wikipedia links, normalised against
 *   `maxLinks`. Proxy for connectedness.
 * - **Text length** (15%): Longer descriptions suggest more coverage.
 *   Capped at 200 characters.
 * - **Parent structure** (15%): Parent events with sub-events are
 *   structurally more important. Scales with child count.
 * - **Keywords** (15%): Additive keyword matching, demoted from 60%.
 *   Tiebreaker only — can't distinguish famous from obscure.
 *
 * Child events receive a 0.5x penalty on the final score.
 *
 * @param {string} text       The cleaned event text.
 * @param {number} linkCount  Number of wiki links found in the original HTML.
 * @param {object} [opts]     Scoring options.
 * @param {number} [opts.maxLinks]    Dynamic link cap (defaults to 10).
 * @param {boolean} [opts.isParent]   Whether this is a parent event with sub-events.
 * @param {boolean} [opts.isChild]    Whether this is a child sub-event.
 * @param {number} [opts.childCount]  Number of child sub-events (for parents).
 * @returns {number}          Score between 0 and 1.
 */
export function scoreSignificance(text, linkCount, opts = {}) {
	const { maxLinks = DEFAULT_MAX_LINKS, isParent = false, isChild = false, childCount = 0 } = opts;

	// Named event prefix: binary 0 or 1
	const namedScore = hasNamedEventPrefix(text) ? 1 : 0;

	// Link count: normalised against article max
	const linkScore = Math.min(linkCount / Math.max(maxLinks, 1), 1);

	// Text length: normalised at 200 chars
	const lengthScore = Math.min(text.length / 200, 1);

	// Parent structure: parents with more children are more significant
	const structureScore = isParent ? Math.min(childCount / 5, 1) : 0;

	// Keywords: demoted to tiebreaker
	let keywordScore = 0;
	for (const [pattern, weight] of KEYWORD_WEIGHTS) {
		if (pattern.test(text)) {
			keywordScore += weight;
		}
	}
	keywordScore = Math.min(keywordScore, 1);

	let score = namedScore * 0.30
		+ linkScore * 0.25
		+ lengthScore * 0.15
		+ structureScore * 0.15
		+ keywordScore * 0.15;

	// Penalty for child events: they are sub-events of something bigger
	if (isChild) score *= 0.5;

	return score;
}
