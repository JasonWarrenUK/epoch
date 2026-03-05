const BASE_URL = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';

/**
 * Common geographic aliases — maps location terms to additional search terms.
 * Keys and values should all be lowercase.
 * @type {Record<string, string[]>}
 */
const LOCATION_ALIASES = {
	// ── England & Britain (MVP focus) ──────────────────────────────────
	'england': [
		'english', 'britain', 'british', 'united kingdom', 'uk',
		// Major cities & seats of power
		'london', 'westminster', 'canterbury', 'york', 'winchester',
		'oxford', 'cambridge', 'bristol', 'norwich', 'lincoln',
		'durham', 'chester', 'bath', 'exeter', 'gloucester',
		'worcester', 'salisbury', 'coventry', 'nottingham', 'leicester',
		'dover', 'hastings', 'shrewsbury', 'warwick', 'stafford',
		// Regions & historical kingdoms
		'wessex', 'mercia', 'northumbria', 'east anglia', 'kent',
		'sussex', 'essex', 'cornwall', 'devon', 'yorkshire',
		'lancashire', 'norfolk', 'suffolk', 'somerset', 'surrey',
		// Historical & cultural terms
		'anglo-saxon', 'anglo-norman', 'norman', 'plantagenet',
		'tudor', 'stuart', 'angevin', 'danelaw',
		'parliament', 'magna carta',
		'archbishop of canterbury', 'tower of london',
		'king of england', 'queen of england',
	],
	'london': [
		'england', 'english', 'britain', 'british',
		'westminster', 'tower of london', 'parliament',
	],
	'britain': [
		'british', 'england', 'english', 'united kingdom', 'uk',
		'scotland', 'scottish', 'wales', 'welsh',
	],
	'united kingdom': ['uk', 'britain', 'british', 'england', 'english', 'scotland', 'wales'],
	'uk': ['united kingdom', 'britain', 'british', 'england', 'english'],
	'scotland': ['scottish', 'britain', 'british', 'united kingdom', 'edinburgh', 'glasgow'],
	'wales': ['welsh', 'britain', 'british', 'united kingdom', 'cardiff'],
	'ireland': ['irish', 'dublin'],

	// ── Continental Europe ─────────────────────────────────────────────
	'france': ['french', 'paris', 'normandy', 'norman', 'burgundy', 'aquitaine'],
	'germany': ['german', 'prussian', 'prussia', 'berlin', 'holy roman empire'],
	'prussia': ['prussian', 'germany', 'german'],
	'italy': ['italian', 'rome', 'roman', 'venice', 'venetian', 'florence', 'naples', 'papal'],
	'spain': ['spanish', 'madrid', 'castile', 'castilian', 'aragon'],
	'portugal': ['portuguese', 'lisbon'],
	'netherlands': ['dutch', 'holland', 'amsterdam'],
	'holland': ['dutch', 'netherlands'],
	'russia': ['russian', 'soviet', 'moscow', 'ussr'],
	'soviet union': ['soviet', 'russian', 'russia', 'ussr'],
	'ussr': ['soviet', 'russian', 'russia', 'soviet union'],
	'greece': ['greek', 'athens', 'byzantine', 'byzantium'],
	'poland': ['polish', 'warsaw'],
	'austria': ['austrian', 'vienna', 'habsburg', 'austro-hungarian'],
	'hungary': ['hungarian', 'budapest', 'austro-hungarian'],
	'sweden': ['swedish', 'stockholm'],
	'norway': ['norwegian'],
	'denmark': ['danish'],
	'turkey': ['turkish', 'ottoman', 'istanbul', 'constantinople'],
	'ottoman': ['ottoman empire', 'turkey', 'turkish'],

	// ── Rest of world ──────────────────────────────────────────────────
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
	'africa': ['african'],
	'asia': ['asian'],
	'europe': ['european'],

	// ── City shortcuts ─────────────────────────────────────────────────
	'paris': ['france', 'french'],
	'berlin': ['germany', 'german'],
	'rome': ['italy', 'italian', 'roman', 'papal'],
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
 * Generate date samples spread ~every 5 days across the calendar year.
 * @returns {Array<[number, number]>}
 */
function generateDateSamples() {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	/** @type {Array<[number, number]>} */
	const samples = [];
	for (let m = 0; m < 12; m++) {
		for (let d = 1; d <= daysInMonth[m]; d += 5) {
			samples.push([m + 1, d]);
		}
	}
	return samples;
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

	// Sample dates spread across the calendar year (~every 5 days)
	const dateSamples = generateDateSamples();

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
