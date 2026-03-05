const BASE_URL = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';

/**
 * Common geographic aliases — maps location terms to additional search terms.
 * Keys and values should all be lowercase.
 * @type {Record<string, string[]>}
 */
const LOCATION_ALIASES = {
	'england': ['english', 'britain', 'british', 'united kingdom', 'uk', 'london', 'parliament'],
	'britain': ['british', 'england', 'english', 'united kingdom', 'uk', 'scotland', 'wales'],
	'united kingdom': ['uk', 'britain', 'british', 'england', 'english', 'scotland', 'wales'],
	'uk': ['united kingdom', 'britain', 'british', 'england', 'english'],
	'scotland': ['scottish', 'britain', 'british', 'united kingdom'],
	'wales': ['welsh', 'britain', 'british', 'united kingdom'],
	'ireland': ['irish'],
	'france': ['french', 'paris'],
	'germany': ['german', 'prussian', 'prussia', 'berlin'],
	'prussia': ['prussian', 'germany', 'german'],
	'italy': ['italian', 'rome', 'roman'],
	'spain': ['spanish', 'madrid'],
	'portugal': ['portuguese', 'lisbon'],
	'netherlands': ['dutch', 'holland', 'amsterdam'],
	'holland': ['dutch', 'netherlands'],
	'russia': ['russian', 'soviet', 'moscow', 'ussr'],
	'soviet union': ['soviet', 'russian', 'russia', 'ussr'],
	'ussr': ['soviet', 'russian', 'russia', 'soviet union'],
	'china': ['chinese', 'beijing', 'peking'],
	'japan': ['japanese', 'tokyo', 'edo'],
	'india': ['indian', 'delhi', 'mumbai', 'bombay', 'calcutta'],
	'united states': ['american', 'usa', 'us', 'america'],
	'usa': ['american', 'united states', 'us', 'america'],
	'america': ['american', 'united states', 'usa', 'us'],
	'us': ['american', 'united states', 'usa', 'america'],
	'canada': ['canadian'],
	'australia': ['australian'],
	'mexico': ['mexican'],
	'brazil': ['brazilian'],
	'egypt': ['egyptian', 'cairo'],
	'turkey': ['turkish', 'ottoman', 'istanbul', 'constantinople'],
	'ottoman': ['ottoman empire', 'turkey', 'turkish'],
	'greece': ['greek', 'athens'],
	'poland': ['polish', 'warsaw'],
	'austria': ['austrian', 'vienna', 'habsburg', 'austro-hungarian'],
	'hungary': ['hungarian', 'budapest', 'austro-hungarian'],
	'sweden': ['swedish', 'stockholm'],
	'norway': ['norwegian'],
	'denmark': ['danish'],
	'africa': ['african'],
	'asia': ['asian'],
	'europe': ['european'],
	'london': ['england', 'english', 'britain', 'british'],
	'paris': ['france', 'french'],
	'berlin': ['germany', 'german'],
	'rome': ['italy', 'italian', 'roman'],
	'new york': ['american', 'united states'],
	'washington': ['american', 'united states'],
	'tokyo': ['japan', 'japanese'],
	'beijing': ['china', 'chinese'],
	'moscow': ['russia', 'russian'],
	'vienna': ['austria', 'austrian', 'habsburg'],
	'istanbul': ['turkey', 'turkish', 'ottoman', 'constantinople'],
	'constantinople': ['turkey', 'turkish', 'ottoman', 'istanbul', 'byzantine'],
};

/**
 * Build a set of lowercase location search terms from the user's input.
 * Splits on commas, then expands each part using the alias table.
 *
 * @param {string} location
 * @returns {Set<string>}
 */
function expandLocationTerms(location) {
	const terms = new Set();
	const parts = location.toLowerCase().split(/,\s*/).map(s => s.trim()).filter(Boolean);

	for (const part of parts) {
		terms.add(part);

		// Check aliases for the whole part
		if (LOCATION_ALIASES[part]) {
			for (const alias of LOCATION_ALIASES[part]) {
				terms.add(alias);
			}
		}

		// Also check individual words (e.g. "New York City" → check "new york")
		const words = part.split(/\s+/);
		if (words.length > 1) {
			for (const word of words) {
				if (word.length > 2) terms.add(word);
			}
		}
	}

	return terms;
}

/**
 * Check whether an event is geographically relevant to the location terms.
 * Searches the event text and all associated page metadata.
 *
 * @param {RawEvent} event
 * @param {Set<string>} locationTerms
 * @returns {boolean}
 */
function eventMatchesLocation(event, locationTerms) {
	// Use event text and page titles/descriptions but NOT extracts,
	// which are too long and cause false positives from passing mentions.
	const searchable = [
		event.text,
		...(event.pages || []).flatMap(p => [p.title, p.description].filter(Boolean))
	].join(' ').toLowerCase();

	for (const term of locationTerms) {
		// Word-boundary match to avoid partial hits (e.g. "roman" in "Romanian")
		const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
		if (pattern.test(searchable)) return true;
	}
	return false;
}

/**
 * Fetch historical events from Wikipedia's "On This Day" API for a set of
 * dates, then filter to events that fall within the character's lifetime
 * AND are geographically relevant to their location.
 *
 * @param {number} birthYear
 * @param {number} deathYear
 * @param {string} location
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
export async function fetchEventsForLifetime(birthYear, deathYear, location) {
	const locationTerms = expandLocationTerms(location);

	// Sample dates spread across the calendar year (~every 10 days)
	const dateSamples = [
		[1, 3], [1, 13], [1, 23],
		[2, 2], [2, 12], [2, 22],
		[3, 4], [3, 14], [3, 24],
		[4, 3], [4, 13], [4, 23],
		[5, 3], [5, 13], [5, 23],
		[6, 2], [6, 12], [6, 22],
		[7, 2], [7, 12], [7, 22],
		[8, 1], [8, 11], [8, 21],
		[9, 1], [9, 11], [9, 21],
		[10, 1], [10, 11], [10, 21],
		[11, 1], [11, 11], [11, 21],
		[12, 1], [12, 11], [12, 21]
	];

	const results = await Promise.allSettled(
		dateSamples.map(([month, day]) => fetchOnThisDay(month, day))
	);

	/** @type {import('./types.js').HistoricalEvent[]} */
	const events = [];
	const seen = new Set();

	for (const result of results) {
		if (result.status !== 'fulfilled') continue;

		for (const event of result.value) {
			if (event.year < birthYear || event.year > deathYear) continue;
			if (!eventMatchesLocation(event, locationTerms)) continue;

			const key = `${event.year}:${event.text.slice(0, 60)}`;
			if (seen.has(key)) continue;
			seen.add(key);

			events.push({
				year: event.year,
				text: event.text,
				pageTitle: event.pages?.[0]?.title,
				pageUrl: event.pages?.[0]?.content_urls?.desktop?.page,
				characterAge: event.year - birthYear
			});
		}
	}

	events.sort((a, b) => a.year - b.year);
	return events;
}

/**
 * @typedef {Object} RawEvent
 * @property {number} year
 * @property {string} text
 * @property {Array<{title?: string, description?: string, extract?: string, content_urls?: {desktop?: {page?: string}}}>} [pages]
 */

/**
 * @param {number} month
 * @param {number} day
 * @returns {Promise<RawEvent[]>}
 */
async function fetchOnThisDay(month, day) {
	const url = `${BASE_URL}/events/${month}/${day}`;
	const res = await fetch(url, {
		headers: { 'User-Agent': 'GrandChronicle/0.1 (educational project)' }
	});

	if (!res.ok) return [];

	const data = await res.json();
	return data.events || [];
}
