import { filterEventText, scoreSignificance } from './event-filters.js';

const MEDIAWIKI_API_URL = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'GrandChronicle/0.1 (educational project; https://github.com/JasonWarrenUK/epoch)';

/** Default timeout for all Wikipedia API requests (ms). */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch with automatic retry on rate-limit (429) or server errors (5xx).
 * Uses exponential backoff: 1s, 2s, 4s.
 *
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} [retries=3]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, opts, retries = 3) {
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url, opts);
		if (res.ok || attempt >= retries || (res.status !== 429 && res.status < 500)) {
			return res;
		}
		await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
	}
}

/**
 * Maps location input terms to the Wikipedia country name used in
 * year-article titles (e.g. "1066 in England").
 * Keys are lowercase; values are title-case as used in Wikipedia.
 * @type {Record<string, string>}
 */
const LOCATION_TO_WIKI_COUNTRY = {
	'england': 'England', 'london': 'England', 'britain': 'England',
	'westminster': 'England', 'canterbury': 'England', 'york': 'England',
	'winchester': 'England', 'united kingdom': 'England', 'uk': 'England',
	'scotland': 'Scotland', 'edinburgh': 'Scotland', 'glasgow': 'Scotland',
	'wales': 'Wales', 'cardiff': 'Wales',
	'ireland': 'Ireland', 'dublin': 'Ireland',
	'france': 'France', 'paris': 'France', 'normandy': 'France',
	'germany': 'Germany', 'berlin': 'Germany', 'prussia': 'Germany',
	'italy': 'Italy', 'rome': 'Italy', 'florence': 'Italy',
	'venice': 'Italy', 'naples': 'Italy',
	'spain': 'Spain', 'madrid': 'Spain', 'castile': 'Spain',
	'portugal': 'Portugal', 'lisbon': 'Portugal',
	'netherlands': 'the_Netherlands', 'holland': 'the_Netherlands',
	'amsterdam': 'the_Netherlands',
	'russia': 'Russia', 'moscow': 'Russia',
	'greece': 'Greece', 'athens': 'Greece',
	'poland': 'Poland', 'warsaw': 'Poland',
	'austria': 'Austria', 'vienna': 'Austria',
	'hungary': 'Hungary', 'budapest': 'Hungary',
	'sweden': 'Sweden', 'stockholm': 'Sweden',
	'norway': 'Norway', 'denmark': 'Denmark',
	'turkey': 'Turkey', 'istanbul': 'Turkey',
	'china': 'China', 'beijing': 'China',
	'japan': 'Japan', 'tokyo': 'Japan',
	'india': 'India', 'delhi': 'India',
	'united states': 'the_United_States', 'usa': 'the_United_States',
	'america': 'the_United_States', 'us': 'the_United_States',
	'new york': 'the_United_States', 'washington': 'the_United_States',
	'canada': 'Canada', 'australia': 'Australia',
	'mexico': 'Mexico', 'brazil': 'Brazil',
	'egypt': 'Egypt', 'cairo': 'Egypt',
};

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
 * Pre-compile word-boundary RegExps for a set of location terms.
 * @param {Set<string>} locationTerms
 * @returns {RegExp[]}
 */
function compileLocationPatterns(locationTerms) {
	return [...locationTerms].map(
		term => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
	);
}

/**
 * Check whether an event is geographically relevant to the location terms.
 *
 * @param {string} text     The event text to search.
 * @param {string} [pageTitle]  Optional Wikipedia page title for extra matching.
 * @param {RegExp[]} locationPatterns  Pre-compiled patterns from compileLocationPatterns()
 * @returns {boolean}
 */
function eventMatchesLocation(text, pageTitle, locationPatterns) {
	const searchable = pageTitle ? `${text} ${pageTitle}` : text;

	for (const pattern of locationPatterns) {
		if (pattern.test(searchable)) return true;
	}
	return false;
}

/**
 * Fetch historical events from Wikipedia year articles for a character's
 * lifetime, filtered by location and scored by significance.
 *
 * @param {number} birthYear
 * @param {number} deathYear
 * @param {string} location
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
export async function fetchEventsForLifetime(birthYear, deathYear, location) {
	// Reject BCE / negative years — Wikipedia has no structured year articles for them
	if (birthYear < 1 || deathYear < 1) {
		return [];
	}

	const events = await fetchEventsFromYearArticles(birthYear, deathYear, location);

	/** @type {Map<string, import('./types.js').HistoricalEvent>} */
	const seen = new Map();

	for (const event of events) {
		const key = `${event.year}:${event.text.toLowerCase().trim()}`;
		if (!seen.has(key)) seen.set(key, event);
	}

	const deduped = [...seen.values()];
	deduped.sort((a, b) => a.year - b.year);
	return deduped;
}


/**
 * Resolve the user's location input to a Wikipedia country name
 * for year-article lookups (e.g. "London, England" → "England").
 *
 * @param {string} location
 * @returns {string | null}
 */
function resolveWikiCountry(location) {
	const parts = location.toLowerCase().split(/,\s*/).map(s => s.trim()).filter(Boolean);
	for (const part of parts) {
		if (LOCATION_TO_WIKI_COUNTRY[part]) return LOCATION_TO_WIKI_COUNTRY[part];
	}
	// Try individual words as well
	for (const part of parts) {
		for (const word of part.split(/\s+/)) {
			if (LOCATION_TO_WIKI_COUNTRY[word]) return LOCATION_TO_WIKI_COUNTRY[word];
		}
	}
	return null;
}

/**
 * Parse HTML from MediaWiki's parse API to extract event entries.
 * Year articles typically have `<ul><li>` lists in their Events section.
 *
 * @param {string} html
 * @param {number} year
 * @returns {import('./types.js').HistoricalEvent[]}
 */
function parseYearArticleEvents(html, year) {
	/** @type {import('./types.js').HistoricalEvent[]} */
	const events = [];

	// Match each <li> element (non-greedy to handle nested content)
	const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
	let match;

	while ((match = liPattern.exec(html)) !== null) {
		const liHtml = match[1];

		// Skip nested lists (sub-items within a list item)
		if (/<ul/i.test(liHtml)) continue;

		// Count wiki links before stripping HTML (significance signal)
		const linkCount = (liHtml.match(/<a[^>]+href="\/wiki\//gi) || []).length;

		// Extract the first link's title and href for the "Read more" feature
		const linkMatch = liHtml.match(/<a[^>]+href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/);
		const pageTitle = linkMatch ? decodeURIComponent(linkMatch[1]).replace(/_/g, ' ') : undefined;
		const pageUrl = linkMatch
			? `https://en.wikipedia.org/wiki/${linkMatch[1]}`
			: undefined;

		// Strip HTML tags to get plain text
		const text = liHtml
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&ndash;/g, '–')
			.replace(/&mdash;/g, '—')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
			.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
			.replace(/\s+/g, ' ')
			.trim();

		const cleanedText = filterEventText(text);
		if (cleanedText === null) continue;

		const significance = scoreSignificance(cleanedText, linkCount);
		events.push({ year, text: cleanedText, pageTitle, pageUrl, significance });
	}

	return events;
}

/**
 * Find the Events section index in a MediaWiki article's sections list.
 *
 * @param {string} pageTitle
 * @returns {Promise<number | null>}
 */
async function findEventsSection(pageTitle) {
	const params = new URLSearchParams({
		action: 'parse',
		page: pageTitle,
		prop: 'sections',
		format: 'json',
		redirects: '1',
	});
	const res = await fetchWithRetry(`${MEDIAWIKI_API_URL}?${params}`, {
		headers: { 'User-Agent': USER_AGENT },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) return null;

	const data = await res.json().catch(() => null);
	if (!data || data.error) return null;

	const sections = data.parse?.sections || [];
	const eventsSection = sections.find(
		(/** @type {{line: string}} */ s) => /^events$/i.test(s.line)
	);
	return eventsSection ? Number(eventsSection.index) : null;
}

/**
 * Fetch and parse events from a Wikipedia year article.
 *
 * @param {number} year
 * @param {string | null} wikiCountry
 * @returns {Promise<{events: import('./types.js').HistoricalEvent[], fromCountryArticle: boolean}>}
 */
async function fetchYearArticleEvents(year, wikiCountry) {
	// Try country-specific article first (e.g. "1066 in England").
	// The API uses redirects=1, so Wikipedia handles renamed countries
	// automatically (e.g. "1710 in England" → "1710 in Great Britain").
	if (wikiCountry) {
		const countryTitle = `${year}_in_${wikiCountry}`;
		const sectionIdx = await findEventsSection(countryTitle);
		if (sectionIdx !== null) {
			const events = await fetchParsedSection(countryTitle, sectionIdx, year);
			if (events.length > 0) {
				return { events, fromCountryArticle: true };
			}
		}
	}

	// Fall back to generic year article (e.g. "1066")
	const yearTitle = String(year);
	const sectionIdx = await findEventsSection(yearTitle);
	if (sectionIdx !== null) {
		const events = await fetchParsedSection(yearTitle, sectionIdx, year);
		return { events, fromCountryArticle: false };
	}

	return { events: [], fromCountryArticle: false };
}

/**
 * Fetch a specific section's parsed HTML from a Wikipedia article.
 *
 * @param {string} pageTitle
 * @param {number} sectionIndex
 * @param {number} year
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
async function fetchParsedSection(pageTitle, sectionIndex, year) {
	const params = new URLSearchParams({
		action: 'parse',
		page: pageTitle,
		prop: 'text',
		section: String(sectionIndex),
		format: 'json',
		redirects: '1',
	});
	const res = await fetchWithRetry(`${MEDIAWIKI_API_URL}?${params}`, {
		headers: { 'User-Agent': USER_AGENT },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) return [];

	const data = await res.json().catch(() => null);
	if (!data || data.error) return [];

	const html = data.parse?.text?.['*'] || '';
	return parseYearArticleEvents(html, year);
}

/**
 * Fetch events from Wikipedia year articles for every year in the character's
 * lifetime. Batches requests to avoid overwhelming the API.
 *
 * @param {number} birthYear
 * @param {number} deathYear
 * @param {string} location
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
async function fetchEventsFromYearArticles(birthYear, deathYear, location) {
	const wikiCountry = resolveWikiCountry(location);
	const locationTerms = expandLocationTerms(location);
	const locationPatterns = compileLocationPatterns(locationTerms);

	/** @type {import('./types.js').HistoricalEvent[]} */
	const allEvents = [];

	const years = [];
	for (let y = birthYear; y <= deathYear; y++) years.push(y);

	// Process in batches to respect API rate limits
	const BATCH_SIZE = 5;
	for (let i = 0; i < years.length; i += BATCH_SIZE) {
		const batch = years.slice(i, i + BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(year => fetchYearArticleEvents(year, wikiCountry))
		);

		for (let j = 0; j < results.length; j++) {
			const result = results[j];
			if (result.status !== 'fulfilled') continue;

			const { events, fromCountryArticle } = result.value;
			for (const event of events) {
				// Country-specific articles are already location-filtered.
				// Generic year articles need location matching.
				if (!fromCountryArticle) {
					if (!eventMatchesLocation(event.text, event.pageTitle, locationPatterns)) continue;
				}
				event.characterAge = event.year - birthYear;
				allEvents.push(event);
			}
		}

		// Delay between batches to avoid rate-limiting
		if (i + BATCH_SIZE < years.length) {
			await new Promise(r => setTimeout(r, 500));
		}
	}

	return allEvents;
}

