import { fail } from '@sveltejs/kit';
import { fetchEventsForLifetime } from '$lib/wikipedia.js';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const name = data.get('name')?.toString().trim();
		const birthYearStr = data.get('birthYear')?.toString();
		const deathYearStr = data.get('deathYear')?.toString();
		const location = data.get('location')?.toString().trim();

		if (!name || !birthYearStr || !deathYearStr || !location) {
			return fail(400, { error: 'Name, birth year, death year, and location are all required.' });
		}

		const birthYear = parseInt(birthYearStr, 10);
		const deathYear = parseInt(deathYearStr, 10);

		if (isNaN(birthYear) || isNaN(deathYear)) {
			return fail(400, { error: 'Birth and death years must be valid numbers.' });
		}

		if (birthYear >= deathYear) {
			return fail(400, { error: 'Death year must be after birth year.' });
		}

		if (deathYear - birthYear > 150) {
			return fail(400, { error: 'Lifespan cannot exceed 150 years.' });
		}

		const character = { name, birthYear, deathYear, location };

		try {
			const events = await fetchEventsForLifetime(birthYear, deathYear, location);
			return { character, events };
		} catch (err) {
			console.error('Wikipedia API error:', err);
			return fail(500, { error: 'Failed to fetch historical events. Please try again.' });
		}
	}
};
