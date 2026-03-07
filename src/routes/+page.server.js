import { fail } from '@sveltejs/kit';
import { fetchEventsForLifetime, fetchLifetimeSummary, fetchOralHistory } from '$lib/wikipedia.js';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const name = data.get('name')?.toString().trim();
		const birthYearStr = data.get('birthYear')?.toString();
		const deathYearStr = data.get('deathYear')?.toString();
		const location = data.get('location')?.toString().trim();

		/** Fields to return on validation failure so the form preserves user input. */
		const fields = { name, birthYear: birthYearStr, deathYear: deathYearStr, location };

		if (!name || !birthYearStr || !deathYearStr || !location) {
			return fail(400, { error: 'Name, birth year, death year, and location are all required.', ...fields });
		}

		const birthYear = parseInt(birthYearStr, 10);
		const deathYear = parseInt(deathYearStr, 10);

		if (isNaN(birthYear) || isNaN(deathYear)) {
			return fail(400, { error: 'Birth and death years must be valid numbers.', ...fields });
		}

		if (birthYear >= deathYear) {
			return fail(400, { error: 'Death year must be after birth year.', ...fields });
		}

		if (deathYear - birthYear > 150) {
			return fail(400, { error: 'Lifespan cannot exceed 150 years.', ...fields });
		}

		const character = { name, birthYear, deathYear, location };

		try {
			const [events, oralHistory] = await Promise.all([
				fetchEventsForLifetime(birthYear, deathYear, location),
				fetchOralHistory(birthYear, location),
			]);
			const lifetimeSummary = await fetchLifetimeSummary(events, birthYear, deathYear);
			return { character, events, oralHistory, lifetimeSummary };
		} catch (err) {
			console.error('Wikipedia API error:', err);
			return fail(500, { error: 'Failed to fetch historical events. Please try again.' });
		}
	}
};
