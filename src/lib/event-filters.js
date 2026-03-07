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

// ── Significance scoring ─────────────────────────────────────────

/** @type {Array<[RegExp, number]>} */
const KEYWORD_WEIGHTS = [
	// High significance (1.0)
	[/\b(war|revolution|independence|constitution|coronation|abdication|assassination|invasion|civil\s+war|coup|genocide)\b/i, 1.0],
	// Medium significance (0.5)
	[/\b(battle|treaty|siege|rebellion|revolt|uprising|reform|act\s+of\s+parliament|famine|plague|earthquake|fire|massacre|crusade|edict|decree)\b/i, 0.5],
	// Lower significance (0.25)
	[/\b(founded|established|charter|expedition|exploration|discovery|alliance|elected|annexed|proclaimed|abolished|surrendered|executed|crowned|signed|ratified)\b/i, 0.25],
];

/** Default link cap when no dynamic cap is provided. */
const DEFAULT_MAX_LINKS = 10;

/**
 * Compute a 0–1 significance score for an event.
 *
 * Combines three signals:
 * - **Keyword weight** (60%): Additive — matching multiple tiers stacks
 *   (capped at 1.0). A single tier-1 match saturates; two tier-2 matches
 *   combine to the same level.
 * - **Link count** (25%): Number of Wikipedia links, normalised against
 *   `maxLinks` (dynamic cap based on the article's highest link count,
 *   or DEFAULT_MAX_LINKS). Secondary signal only.
 * - **Text length** (15%): Longer descriptions suggest more notable events.
 *   Capped at 200 characters. Tiebreaker at best.
 *
 * @param {string} text       The cleaned event text.
 * @param {number} linkCount  Number of wiki links found in the original HTML.
 * @param {number} [maxLinks] Dynamic link cap (defaults to DEFAULT_MAX_LINKS).
 * @returns {number}          Score between 0 and 1.
 */
export function scoreSignificance(text, linkCount, maxLinks = DEFAULT_MAX_LINKS) {
	const linkScore = Math.min(linkCount / Math.max(maxLinks, 1), 1);
	const lengthScore = Math.min(text.length / 200, 1);

	let keywordScore = 0;
	for (const [pattern, weight] of KEYWORD_WEIGHTS) {
		if (pattern.test(text)) {
			keywordScore += weight;
		}
	}
	keywordScore = Math.min(keywordScore, 1);

	return keywordScore * 0.6 + linkScore * 0.25 + lengthScore * 0.15;
}
