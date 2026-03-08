# Epoch — Project Notes for Claude

## Documentation Workflow

After making changes that affect the project's features, architecture, or tech stack, check whether these files need updating:

- **README.md** — project description, feature list, current state, tech stack
- **PLAN.md** — UX/aesthetics design plan
- **docs/notes.md** — tech stack notes

If a session involved significant changes (new features, removed features, refactors, dependency changes), update the relevant docs before finishing.

## Development

```bash
npm run dev      # start dev server
npm run test     # run tests
npm run build    # production build
```

## Project Structure

- `src/lib/wikipedia.js` — Wikipedia API integration (event fetching, parsing, scoring)
- `src/lib/event-filters.js` — content-quality filtering pipeline
- `src/lib/event-filters.test.js` — test suite
- `src/lib/api-cache.js` — API response caching
- `src/lib/components/` — Svelte components (Timeline, CharacterForm, EventCard)
- `src/routes/+page.server.js` — server-side form actions
- `src/routes/+page.svelte` — main page
