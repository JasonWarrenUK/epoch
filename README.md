# Epoch

![Banner Image](static/banner.webp)

*See history through someone's eyes.*

Epoch is an interactive historical visualisation tool. Create a fictional character — give them a name, a birthplace, a lifetime — and discover what historical events they would have lived through. It transforms abstract history into personal narrative by pulling real events from Wikipedia and presenting them in a collapsible, browsable timeline.

## What It Does

- **Character creation** — name, birth year, death year, and location
- **Wikipedia integration** — fetches events from year-specific and country-specific Wikipedia articles
- **Significance ranking** — blends reader attention (Wikipedia pageviews, log-normalized), Wikidata sitelink breadth, editor-curated "On this day" anniversaries, named-event prefixes, and link density, with bias guards inspired by MIT's Pantheon and Skiena & Ward's "Who's Bigger?"
- **Two-level collapsible timeline** — decades collapse to years, years collapse to individual events; the birth decade starts expanded
- **Category badges** — events are tagged by type (conflict, upheaval, political, disaster, cultural)
- **Lifetime summary** — top events from childhood, adulthood, and old age
- **Oral history** — stories the character would have heard from elders at age 15
- **Content filtering** — strips sports results, malformed markup, citation fragments, and low-quality entries
- **API caching** — 24-hour TTL with batched requests to respect rate limits

## Current State

This is a working application. The core loop — create a character, fetch events, browse the timeline — is functional and polished.

- [x] SvelteKit frontend and server-side form actions
- [x] Wikipedia API integration with country-specific and generic fallbacks
- [x] Event parsing, filtering, and significance scoring
- [x] Collapsible timeline with decade/year grouping
- [x] Milestone highlighting (birth year, 18th birthday, death year)
- [x] Lifetime summary and oral history features
- [x] Light warm theme (ivory, saddlebrown, olive) with Playfair Display + Source Sans 3
- [x] Responsive layout for mobile and desktop
- [x] Error recovery (form input preserved on failure, one-click retry)
- [x] Test suite for event filtering and scoring
- [ ] Dedicated backend API (currently using SvelteKit server routes)
- [ ] Database for persisting characters and sessions
- [ ] User authentication and saved profiles

## Tech Stack

- **Framework**: [SvelteKit 2](https://svelte.dev/) with [Svelte 5](https://svelte.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/)
- **Data**: [Wikipedia MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page), [Wikidata API](https://www.wikidata.org/wiki/Wikidata:Data_access), [Wikimedia Pageviews REST API](https://wikimedia.org/api/rest_v1/), [Wikimedia "On this day" Feed API](https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day)
- **Testing**: [Vitest](https://vitest.dev/)
- **Build**: [Vite 6](https://vite.dev/)
- **Deployment**: [Vercel](https://vercel.com/) via [`@sveltejs/adapter-vercel`](https://svelte.dev/docs/kit/adapter-vercel)

## Development

```bash
npm install
npm run dev      # start dev server
npm run test     # run test suite
npm run build    # production build
```

## Deployment

The app deploys to Vercel using `@sveltejs/adapter-vercel`. Vercel
auto-detects SvelteKit, so connecting the repository and deploying is enough —
no extra configuration is required. The server-side form action runs as a
Vercel serverless function.

## License

[Apache 2.0](LICENSE)