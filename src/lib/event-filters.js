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

// ── Pipeline ─────────────────────────────────────────────────────

const FILTERS = [isSectionLeak, isDateOnly, hasMalformedMarkup, isMostlyNumeric, isTooFewWords, isTooShort];

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
