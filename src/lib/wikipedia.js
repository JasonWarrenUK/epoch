const BASE_URL = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';

/**
 * Fetch historical events from Wikipedia's "On This Day" API for a set of
 * dates, then filter to events that fall within the character's lifetime.
 *
 * @param {number} birthYear
 * @param {number} deathYear
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
export async function fetchEventsForLifetime(birthYear, deathYear) {
	// Sample dates spread across the calendar year
	const dateSamples = [
		[1, 15], [2, 12], [3, 21], [4, 9], [5, 18], [6, 28],
		[7, 4], [8, 6], [9, 1], [10, 14], [11, 9], [12, 25]
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

			const key = `${event.year}:${event.text.slice(0, 60)}`;
			if (seen.has(key)) continue;
			seen.add(key);

			events.push({
				...event,
				characterAge: event.year - birthYear
			});
		}
	}

	events.sort((a, b) => a.year - b.year);
	return events;
}

/**
 * @param {number} month
 * @param {number} day
 * @returns {Promise<import('./types.js').HistoricalEvent[]>}
 */
async function fetchOnThisDay(month, day) {
	const url = `${BASE_URL}/events/${month}/${day}`;
	const res = await fetch(url, {
		headers: { 'User-Agent': 'GrandChronicle/0.1 (educational project)' }
	});

	if (!res.ok) return [];

	const data = await res.json();

	return (data.events || []).map((/** @type {any} */ e) => {
		const page = e.pages?.[0];
		return {
			year: e.year,
			text: e.text,
			pageTitle: page?.title,
			pageUrl: page?.content_urls?.desktop?.page
		};
	});
}
