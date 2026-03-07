import { filterEventText, scoreSignificance, detectCategory } from './event-filters.js';

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
 * Only used as a last resort when no country-specific article is available.
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
 * Compute the lifetime summary — the most significant event from each
 * life phase (childhood, adulthood, old age), using article-size
 * tiebreaking for the top candidates in each phase.
 *
 * @param {import('./types.js').HistoricalEvent[]} events
 * @param {number} birthYear
 * @param {number} deathYear
 * @returns {Promise<import('./types.js').LifetimeSummaryPhase[]>}
 */
export async function fetchLifetimeSummary(events, birthYear, deathYear) {
	const lifespan = deathYear - birthYear;
	const adulthoodStart = Math.min(18, lifespan);
	const oldAgeStart = Math.min(60, lifespan);

	/** @param {number} minAge @param {number} maxAge */
	const eventsInRange = (minAge, maxAge) =>
		events.filter(e => {
			const age = e.year - birthYear;
			return age >= minAge && age <= maxAge;
		});

	/** @type {Array<{label: string, minAge: number, maxAge: number}>} */
	const phases = [];
	if (adulthoodStart > 0) phases.push({ label: 'Childhood', minAge: 0, maxAge: adulthoodStart - 1 });
	if (oldAgeStart > adulthoodStart) phases.push({ label: 'Adulthood', minAge: adulthoodStart, maxAge: oldAgeStart - 1 });
	if (lifespan >= oldAgeStart) phases.push({ label: 'Old age', minAge: oldAgeStart, maxAge: lifespan });

	/** @type {import('./types.js').LifetimeSummaryPhase[]} */
	const results = [];
	const usedTitles = new Set();
	const usedCategories = new Set();

	for (const phase of phases) {
		const phaseEvents = eventsInRange(phase.minAge, phase.maxAge);

		// Penalise same-title and same-category events from prior phases
		const adjusted = phaseEvents.map(e => {
			let penalty = 1;
			if (e.pageTitle && usedTitles.has(e.pageTitle)) penalty *= 0.3;
			const cat = e.category ?? detectCategory(e.text);
			// Only penalise same-category if the event isn't highly significant.
			// Major events (e.g. WWI, WWII) bypass the penalty.
			if (cat && usedCategories.has(cat) && (e.significance ?? 0) < 0.6) {
				penalty *= 0.5;
			}
			if (penalty === 1) return e;
			return { ...e, significance: (e.significance ?? 0) * penalty };
		});

		const best = await pickBestEvent(adjusted);
		if (best) {
			results.push({ label: phase.label, event: best });
			if (best.pageTitle) usedTitles.add(best.pageTitle);
			const bestCat = best.category ?? detectCategory(best.text);
			if (bestCat) usedCategories.add(bestCat);
		}
	}

	return results;
}

/** Age at which the character meets an elder. */
const MEETING_AGE = 15;
/** Age of the elder when they meet the character. */
const ELDER_AGE = 70;
/** Events from the elder's life are limited to this age. */
const ELDER_EVENT_MAX_AGE = 30;

/**
 * Fetch "oral history" events — stories passed down through personal encounters.
 *
 * Layer 1: When the character was 15, they met a 70-year-old who lived through
 *          the most significant event of their youth (under 30).
 * Layer 2: That elder, at 15, met *their* own 70-year-old, and heard about
 *          that person's most significant youthful event.
 *
 * @param {number} birthYear
 * @param {string} location
 * @returns {Promise<import('./types.js').OralHistoryLayer[]>}
 */
export async function fetchOralHistory(birthYear, location) {
	/** @type {import('./types.js').OralHistoryLayer[]} */
	const layers = [];

	const elderBirthYear = birthYear - (ELDER_AGE - MEETING_AGE);
	const layer1 = await fetchMostSignificantEvent(
		elderBirthYear,
		elderBirthYear + ELDER_EVENT_MAX_AGE - 1,
		location,
	);
	if (!layer1) return layers;

	layers.push({
		label: 'You met an old person who lived through\u2026',
		elderBirthYear,
		event: layer1,
	});

	const elder2BirthYear = elderBirthYear - (ELDER_AGE - MEETING_AGE);
	const layer2 = await fetchMostSignificantEvent(
		elder2BirthYear,
		elder2BirthYear + ELDER_EVENT_MAX_AGE - 1,
		location,
	);
	if (!layer2) return layers;

	layers.push({
		label: 'They told you about someone who\u2026',
		elderBirthYear: elder2BirthYear,
		event: layer2,
	});

	return layers;
}

/**
 * Wikidata item IDs for entity type classification.
 * Used to distinguish events from people/places in scoring.
 */
const WIKIDATA_EVENT_TYPES = new Set([
	'Q1190554',  // occurrence / event
	'Q1656682',  // event
	'Q178561',   // battle
	'Q131569',   // treaty
	'Q35127',    // legislation
	'Q8065',     // natural disaster
	'Q7864918',  // armed conflict
	'Q124757',   // riot
	'Q175331',   // rebellion
	'Q12184',    // pandemic
	'Q188055',   // siege
	'Q209715',   // massacre
	'Q5107',     // continent (not event, but not person either)
	'Q10931',    // revolution
	'Q12144794', // political crisis
	'Q208450',   // coup d'état
	'Q18643',    // military operation
	'Q184199',   // famine
	'Q15283424', // diplomatic conference
	'Q569500',   // peace treaty
	'Q83267',    // civil war
]);

const WIKIDATA_PERSON_TYPES = new Set([
	'Q5',        // human
	'Q15632617', // fictional human
]);

const WIKIDATA_PLACE_TYPES = new Set([
	'Q515',      // city
	'Q6256',     // country
	'Q486972',   // human settlement
	'Q3624078',  // sovereign state
	'Q82794',    // geographic region
	'Q35657',    // state/province
]);

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';

/**
 * @typedef {Object} WikidataInfo
 * @property {number} sitelinks  Number of language editions with an article.
 * @property {'event'|'person'|'place'|'other'} entityType  Classified type.
 */

/**
 * Batch-fetch Wikidata info (sitelinks + entity type) for a list of Wikipedia page titles.
 * Uses a single API call (up to 50 titles). Returns a Map of title → WikidataInfo.
 *
 * @param {string[]} titles
 * @returns {Promise<Map<string, WikidataInfo>>}
 */
async function fetchWikidataInfo(titles) {
	/** @type {Map<string, WikidataInfo>} */
	const info = new Map();
	if (titles.length === 0) return info;

	const params = new URLSearchParams({
		action: 'wbgetentities',
		sites: 'enwiki',
		titles: titles.slice(0, 50).join('|'),
		props: 'sitelinks|claims',
		format: 'json',
	});

	try {
		const res = await fetchWithRetry(`${WIKIDATA_API_URL}?${params}`, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok) return info;

		const data = await res.json().catch(() => null);
		const entities = data?.entities;
		if (!entities) return info;

		for (const entity of Object.values(entities)) {
			const e = /** @type {any} */ (entity);
			if (e.missing !== undefined) continue;

			// Get English Wikipedia title for mapping back
			const enTitle = e.sitelinks?.enwiki?.title;
			if (!enTitle) continue;

			// Count sitelinks
			const sitelinkCount = e.sitelinks ? Object.keys(e.sitelinks).length : 0;

			// Classify entity type from P31 (instance of)
			const p31Claims = e.claims?.P31 || [];
			const p31Ids = p31Claims.map(
				(/** @type {any} */ c) => c.mainsnak?.datavalue?.value?.id
			).filter(Boolean);

			let entityType = /** @type {'event'|'person'|'place'|'other'} */ ('other');
			for (const id of p31Ids) {
				if (WIKIDATA_EVENT_TYPES.has(id)) { entityType = 'event'; break; }
			}
			if (entityType === 'other') {
				for (const id of p31Ids) {
					if (WIKIDATA_PERSON_TYPES.has(id)) { entityType = 'person'; break; }
				}
			}
			if (entityType === 'other') {
				for (const id of p31Ids) {
					if (WIKIDATA_PLACE_TYPES.has(id)) { entityType = 'place'; break; }
				}
			}

			info.set(enTitle, { sitelinks: sitelinkCount, entityType });
		}
	} catch {
		// Non-critical — fall back to significance-only ranking
	}

	return info;
}

/**
 * Batch-fetch article byte sizes from Wikipedia for a list of page titles.
 * Uses a single API call (up to 50 titles). Returns a Map of title → size.
 * Kept as fallback if Wikidata is unavailable.
 *
 * @param {string[]} titles
 * @returns {Promise<Map<string, number>>}
 */
async function fetchArticleSizes(titles) {
	/** @type {Map<string, number>} */
	const sizes = new Map();
	if (titles.length === 0) return sizes;

	const params = new URLSearchParams({
		action: 'query',
		titles: titles.slice(0, 50).join('|'),
		prop: 'info',
		format: 'json',
		redirects: '1',
	});

	try {
		const res = await fetchWithRetry(`${MEDIAWIKI_API_URL}?${params}`, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok) return sizes;

		const data = await res.json().catch(() => null);
		const pages = data?.query?.pages;
		if (!pages) return sizes;

		for (const page of Object.values(pages)) {
			if (/** @type {any} */ (page).length) {
				sizes.set(/** @type {any} */ (page).title, /** @type {any} */ (page).length);
			}
		}
	} catch {
		// Non-critical — fall back to significance-only ranking
	}

	return sizes;
}

/** Number of top candidates to consider for Wikidata-based ranking. */
const TOP_CANDIDATES = 10;

/** Sitelink count that saturates the sitelink score. */
const SITELINK_CAP = 80;

/**
 * Entity-type multiplier — adjusts sitelink score based on whether the
 * linked article is about an event, person, or place.
 *
 * Events get full weight (their sitelinks reflect the event's notability).
 * People get 0.3x (a famous person doesn't make a trivial event significant).
 * Places get 0.2x (geographic links are context, not the event).
 * Other/unknown get 0.5x.
 *
 * @param {'event'|'person'|'place'|'other'} entityType
 * @returns {number}
 */
function entityTypeMultiplier(entityType) {
	switch (entityType) {
		case 'event': return 1.0;
		case 'person': return 0.3;
		case 'place': return 0.2;
		default: return 0.5;
	}
}

/**
 * Pick the most significant event from a list. Uses Wikidata sitelinks
 * (language editions) as the primary notability signal, weighted by
 * entity type to distinguish event articles from person/place articles.
 *
 * Final score: textSignificance * 0.4 + wikidataScore * 0.6
 * where wikidataScore = (sitelinks / cap) * entityTypeMultiplier
 *
 * Falls back to article byte size if Wikidata returns no results.
 *
 * @param {import('./types.js').HistoricalEvent[]} events
 * @returns {Promise<import('./types.js').HistoricalEvent | null>}
 */
async function pickBestEvent(events) {
	if (events.length === 0) return null;

	events.sort((a, b) => (b.significance ?? 0) - (a.significance ?? 0));
	const candidates = events.slice(0, TOP_CANDIDATES);

	// Batch-fetch Wikidata info for the top candidates
	const titlesToFetch = candidates
		.map(e => e.pageTitle)
		.filter(/** @type {(t: string | undefined) => t is string} */ (t) => !!t);

	const wikidataInfo = await fetchWikidataInfo(titlesToFetch);

	// If Wikidata returned nothing, fall back to article sizes
	const useWikidata = wikidataInfo.size > 0;
	const articleSizes = useWikidata ? new Map() : await fetchArticleSizes(titlesToFetch);

	let best = candidates[0];
	let bestScore = -1;

	for (const event of candidates) {
		const sig = event.significance ?? 0;
		let externalScore = 0;

		if (useWikidata && event.pageTitle) {
			const wd = wikidataInfo.get(event.pageTitle);
			if (wd) {
				const rawSitelinkScore = Math.min(wd.sitelinks / SITELINK_CAP, 1);
				externalScore = rawSitelinkScore * entityTypeMultiplier(wd.entityType);
			}
		} else if (!useWikidata && event.pageTitle) {
			// Fallback: article byte size (original approach)
			const articleSize = articleSizes.get(event.pageTitle) ?? 0;
			externalScore = Math.min(articleSize / 50_000, 1);
		}

		// Wikidata/external signal is dominant (60%), text heuristics secondary (40%)
		let finalScore = sig * 0.4 + externalScore * 0.6;

		// Events with no linked article are likely obscure
		if (!event.pageTitle) finalScore *= 0.5;

		if (finalScore > bestScore) {
			bestScore = finalScore;
			best = event;
		}
	}

	return best;
}

/**
 * Fetch events for a year range and return the single most significant one.
 *
 * @param {number} fromYear
 * @param {number} toYear
 * @param {string} location
 * @returns {Promise<import('./types.js').HistoricalEvent | null>}
 */
async function fetchMostSignificantEvent(fromYear, toYear, location) {
	if (fromYear < 1) return null;

	const events = await fetchEventsFromYearArticles(fromYear, toYear, location);
	return pickBestEvent(events);
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
/**
 * Strip HTML tags and decode common HTML entities.
 * @param {string} html
 * @returns {string}
 */
function stripHtmlAndDecode(html) {
	return html
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
}

/**
 * Words that suggest a wiki link points to an event rather than a person/place.
 * Used by smart link extraction to prefer event-type articles.
 */
const EVENT_LINK_WORDS = /\b(battle|war|siege|treaty|act|fire|revolution|revolt|rebellion|massacre|plague|famine|earthquake|crusade|invasion|coup|riot|mutiny|expedition|crisis|incident|affair|scandal|disaster|catastrophe|edict|decree|charter|concordat|armistice|capitulation|restoration|reformation|schism|inquisition|coronation|abdication|assassination|execution|purge|exodus|migration)\b/i;

/**
 * Words that suggest a wiki link points to a person (deprioritise).
 */
const PERSON_LINK_WORDS = /^(king|queen|prince|princess|duke|earl|lord|lady|sir|saint|pope|emperor|empress|count|baron|bishop|archbishop|cardinal|captain|admiral|general|colonel|major)\b/i;

/**
 * Extract all wiki links from an HTML fragment.
 * @param {string} html
 * @returns {Array<{slug: string, title: string}>}
 */
function extractAllWikiLinks(html) {
	const links = [];
	const pattern = /<a[^>]+href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/g;
	let m;
	while ((m = pattern.exec(html)) !== null) {
		links.push({
			slug: m[1],
			title: decodeURIComponent(m[1]).replace(/_/g, ' '),
		});
	}
	return links;
}

/**
 * Extract the best wiki link from an HTML fragment — prefer links that
 * represent the *event itself* over links to people or places.
 *
 * Strategy (prioritised):
 * 1. Among the first 3 links (likely the subject), prefer event-type titles
 * 2. Among ALL links, prefer event-type titles (but with lower confidence)
 * 3. Among the first 3 links, prefer non-person titles
 * 4. Fall back to the very first link
 *
 * The "first 3 links" heuristic addresses the problem where an event merely
 * *mentions* a famous event in passing (e.g. "...attempted to rekindle the
 * Civil War...") — the Civil War link appears late in the text and shouldn't
 * define this event's identity.
 *
 * @param {string} html
 * @returns {{ pageTitle?: string, pageUrl?: string }}
 */
function extractBestWikiLink(html) {
	const links = extractAllWikiLinks(html);
	if (links.length === 0) return {};

	const makeResult = (/** @type {{slug: string, title: string}} */ l) => ({
		pageTitle: l.title,
		pageUrl: `https://en.wikipedia.org/wiki/${l.slug}`,
	});

	// "Early" links are the first 3 — most likely to describe the event's subject
	const earlyLinks = links.slice(0, 3);

	// Pass 1: event-type word in an early link (strongest signal)
	const earlyEventLink = earlyLinks.find(l => EVENT_LINK_WORDS.test(l.title));
	if (earlyEventLink) return makeResult(earlyEventLink);

	// Pass 2: event-type word in any link (weaker — could be incidental mention)
	// Only use if the event text is short (< 100 chars stripped), meaning the
	// event IS about that topic rather than just mentioning it
	const strippedLen = html.replace(/<[^>]+>/g, '').length;
	if (strippedLen < 100) {
		const anyEventLink = links.find(l => EVENT_LINK_WORDS.test(l.title));
		if (anyEventLink) return makeResult(anyEventLink);
	}

	// Pass 3: first non-person early link
	const earlyNonPerson = earlyLinks.find(l => !PERSON_LINK_WORDS.test(l.title));
	if (earlyNonPerson) return makeResult(earlyNonPerson);

	// Pass 4: first non-person link anywhere
	const anyNonPerson = links.find(l => !PERSON_LINK_WORDS.test(l.title));
	if (anyNonPerson) return makeResult(anyNonPerson);

	// Pass 5: fall back to first link
	return makeResult(links[0]);
}

/**
 * Extract top-level <li> items from HTML using depth tracking.
 * Only yields depth-0 items with their full inner HTML (including nested lists).
 * @param {string} html
 * @returns {string[]}
 */
function extractTopLevelListItems(html) {
	const items = [];
	const openTag = /<li[^>]*>/gi;
	const closeTag = /<\/li>/gi;

	// Find all <li> and </li> positions
	/** @type {Array<{pos: number, type: 'open' | 'close', end: number}>} */
	const tokens = [];
	let m;
	while ((m = openTag.exec(html)) !== null) {
		tokens.push({ pos: m.index, type: 'open', end: m.index + m[0].length });
	}
	while ((m = closeTag.exec(html)) !== null) {
		tokens.push({ pos: m.index, type: 'close', end: m.index + m[0].length });
	}
	tokens.sort((a, b) => a.pos - b.pos);

	let depth = 0;
	let contentStart = -1;

	for (const token of tokens) {
		if (token.type === 'open') {
			if (depth === 0) {
				contentStart = token.end; // start of inner content
			}
			depth++;
		} else {
			depth--;
			if (depth === 0 && contentStart >= 0) {
				items.push(html.slice(contentStart, token.pos));
				contentStart = -1;
			}
		}
	}

	return items;
}

function parseYearArticleEvents(html, year) {
	// Two-pass approach: first extract events with raw link counts,
	// then score using a dynamic link cap based on the article's max.

	/** @type {Array<{text: string, pageTitle?: string, pageUrl?: string, linkCount: number, isParent: boolean, isChild: boolean, childCount: number}>} */
	const raw = [];

	const topLevelItems = extractTopLevelListItems(html);

	for (const liHtml of topLevelItems) {
		const hasNestedList = /<ul/i.test(liHtml);

		if (hasNestedList) {
			// PARENT EVENT: extract text before the nested <ul>
			const parentHtml = liHtml.replace(/<ul[\s\S]*$/i, '');
			const parentText = stripHtmlAndDecode(parentHtml);
			const parentLinkCount = (parentHtml.match(/<a[^>]+href="\/wiki\//gi) || []).length;

			// Count child <li> items
			const childUlMatch = liHtml.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
			const childLiCount = childUlMatch
				? (childUlMatch[1].match(/<li/gi) || []).length
				: 0;

			// Process parent text through filter
			const cleanedParent = filterEventText(parentText);
			if (cleanedParent) {
				const { pageTitle, pageUrl } = extractBestWikiLink(parentHtml);
				raw.push({
					text: cleanedParent,
					pageTitle,
					pageUrl,
					linkCount: parentLinkCount,
					isParent: true,
					isChild: false,
					childCount: childLiCount,
				});
			}

			// Also extract children (marked as child events)
			if (childUlMatch) {
				const childLiPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
				let childLi;
				while ((childLi = childLiPattern.exec(childUlMatch[1])) !== null) {
					// Skip deeply nested children
					if (/<ul/i.test(childLi[1])) continue;

					const childText = stripHtmlAndDecode(childLi[1]);
					const cleanedChild = filterEventText(childText);
					if (!cleanedChild) continue;

					const childLinkCount = (childLi[1].match(/<a[^>]+href="\/wiki\//gi) || []).length;
					const { pageTitle, pageUrl } = extractBestWikiLink(childLi[1]);
					raw.push({
						text: cleanedChild,
						pageTitle,
						pageUrl,
						linkCount: childLinkCount,
						isParent: false,
						isChild: true,
						childCount: 0,
					});
				}
			}
			continue;
		}

		// FLAT EVENT (no nested list)
		const linkCount = (liHtml.match(/<a[^>]+href="\/wiki\//gi) || []).length;
		const text = stripHtmlAndDecode(liHtml);
		const cleanedText = filterEventText(text);
		if (cleanedText === null) continue;

		const { pageTitle, pageUrl } = extractBestWikiLink(liHtml);
		raw.push({ text: cleanedText, pageTitle, pageUrl, linkCount, isParent: false, isChild: false, childCount: 0 });
	}

	// Dynamic cap: normalise link counts relative to the most-linked event
	const maxLinks = raw.length > 0
		? Math.max(...raw.map(e => e.linkCount))
		: 1;

	return raw.map(({ text, pageTitle, pageUrl, linkCount, isParent, isChild, childCount }) => {
		const significance = scoreSignificance(text, linkCount, { maxLinks, isParent, isChild, childCount });
		const category = detectCategory(text) ?? undefined;
		return /** @type {import('./types.js').HistoricalEvent} */ (
			{ year, text, pageTitle, pageUrl, significance, isParent, isChild, category }
		);
	});
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
 * Boost events that also appear in the generic year article (e.g. "1660").
 * Events listed in the global article are editorially selected as world-
 * historically notable — a very strong significance signal.
 *
 * Uses fuzzy matching: if a country-specific event's pageTitle matches
 * any link in the generic article's events, it gets a 1.5x significance boost.
 *
 * @param {import('./types.js').HistoricalEvent[]} countryEvents
 * @param {number} year
 */
async function boostGloballyNotableEvents(countryEvents, year) {
	const yearTitle = String(year);
	const sectionIdx = await findEventsSection(yearTitle);
	if (sectionIdx === null) return;

	const genericEvents = await fetchParsedSection(yearTitle, sectionIdx, year);
	if (genericEvents.length === 0) return;

	// Build a set of all page titles and significant text fragments from the generic article
	const globalTitles = new Set();
	const globalTextFragments = [];
	for (const ge of genericEvents) {
		if (ge.pageTitle) globalTitles.add(ge.pageTitle.toLowerCase());
		// Also extract key phrases (first ~60 chars of text, lowercased)
		const fragment = ge.text.toLowerCase().slice(0, 60);
		globalTextFragments.push(fragment);
	}

	// Boost country events that match
	for (const event of countryEvents) {
		let isGlobal = false;

		// Match by shared page title (most reliable)
		if (event.pageTitle && globalTitles.has(event.pageTitle.toLowerCase())) {
			isGlobal = true;
		}

		// Match by text similarity (fallback for different links to same event)
		if (!isGlobal) {
			const eventFragment = event.text.toLowerCase().slice(0, 60);
			for (const gf of globalTextFragments) {
				// Check if they share significant overlap (>50% of shorter fragment)
				const shorter = Math.min(eventFragment.length, gf.length);
				if (shorter > 20) {
					// Simple check: do they share a substantial substring?
					const words = eventFragment.split(/\s+/).filter(w => w.length > 3);
					const matchingWords = words.filter(w => gf.includes(w));
					if (matchingWords.length >= 3) {
						isGlobal = true;
						break;
					}
				}
			}
		}

		if (isGlobal && event.significance !== undefined) {
			event.significance *= 1.5;
		}
	}
}

/**
 * Historical country name transitions for Wikipedia article titles.
 * Wikipedia uses different article names for different eras
 * (e.g. "1660 in England" vs "1720 in Great Britain" vs "1820 in the United Kingdom").
 *
 * Each entry maps a base country name to an array of {name, from, to} periods.
 * @type {Record<string, Array<{name: string, from: number, to: number}>>}
 */
const COUNTRY_NAME_TRANSITIONS = {
	'England': [
		{ name: 'England', from: 0, to: 1706 },
		{ name: 'Great_Britain', from: 1707, to: 1800 },
		{ name: 'the_United_Kingdom', from: 1801, to: 9999 },
	],
	'Scotland': [
		{ name: 'Scotland', from: 0, to: 1706 },
		{ name: 'Great_Britain', from: 1707, to: 1800 },
		{ name: 'the_United_Kingdom', from: 1801, to: 9999 },
	],
	'Wales': [
		{ name: 'Wales', from: 0, to: 1706 },
		{ name: 'Great_Britain', from: 1707, to: 1800 },
		{ name: 'the_United_Kingdom', from: 1801, to: 9999 },
	],
	'Ireland': [
		{ name: 'Ireland', from: 0, to: 1800 },
		{ name: 'the_United_Kingdom', from: 1801, to: 1921 },
		{ name: 'Ireland', from: 1922, to: 9999 },
	],
};

/**
 * Get the Wikipedia article country name variants for a given year.
 * Returns an array of names to try, with the most specific first.
 * Falls back to the base country name if no transitions are defined.
 *
 * @param {string} wikiCountry  The base country name (e.g. "England")
 * @param {number} year
 * @returns {string[]}  Country name variants to try (e.g. ["Great_Britain", "England"])
 */
function getCountryVariants(wikiCountry, year) {
	const transitions = COUNTRY_NAME_TRANSITIONS[wikiCountry];
	if (!transitions) return [wikiCountry];

	// Find the matching era
	const match = transitions.find(t => year >= t.from && year <= t.to);
	if (!match) return [wikiCountry];

	// Return the era-appropriate name first, then the base name as fallback
	// (in case Wikipedia has inconsistent coverage)
	const variants = [match.name];
	if (match.name !== wikiCountry) variants.push(wikiCountry);
	return variants;
}

/**
 * Fetch and parse events from a Wikipedia year article.
 *
 * @param {number} year
 * @param {string | null} wikiCountry
 * @returns {Promise<{events: import('./types.js').HistoricalEvent[], fromCountryArticle: boolean}>}
 */
async function fetchYearArticleEvents(year, wikiCountry) {
	// Try country-specific article(s). Some countries changed names over time
	// (e.g. England → Great Britain after 1707 → United Kingdom after 1801).
	// Wikipedia uses different article titles for each era, and redirects
	// are inconsistent, so we try all applicable variants for the year.
	if (wikiCountry) {
		const countryVariants = getCountryVariants(wikiCountry, year);

		/** @type {import('./types.js').HistoricalEvent[]} */
		let countryEvents = [];
		for (const variant of countryVariants) {
			const countryTitle = `${year}_in_${variant}`;
			const sectionIdx = await findEventsSection(countryTitle);
			if (sectionIdx !== null) {
				const events = await fetchParsedSection(countryTitle, sectionIdx, year);
				if (events.length > 0) {
					countryEvents = events;
					break;
				}
			}
		}

		if (countryEvents.length > 0) {
			// Cross-reference with the generic year article to boost
			// events that are globally notable (appear in both articles).
			await boostGloballyNotableEvents(countryEvents, year);
			return { events: countryEvents, fromCountryArticle: true };
		}

		// When we have a country, don't fall back to generic year articles.
		// Generic articles contain worldwide events that are mostly irrelevant
		// and impossible to filter reliably by location keywords.
		return { events: [], fromCountryArticle: false };
	}

	// No country resolved — use generic year article as last resort
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

