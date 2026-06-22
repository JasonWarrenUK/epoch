# Notes

## Tech Stack

### Frontend

- Svelte 5

### Backend

- SvelteKit 2
- Production adapter: `@sveltejs/adapter-vercel` (deploys to Vercel; the
  server-side form action runs as a serverless function)

### API

- Wikipedia MediaWiki API — year-article events, sections, article sizes
- Wikidata API (`wbgetentities`) — sitelink counts + entity-type classification
- Wikimedia Pageviews REST API — `/metrics/pageviews/per-article/...` monthly series
- Wikimedia "On this day" Feed API — `/feed/v1/wikipedia/en/onthisday/events/{MM}/{DD}`

## Significance scoring model

Goal: rank events by **human-perceived** significance, not just text heuristics.
Informed by MIT's Pantheon (Historical Popularity Index) and Skiena & Ward's
"Who's Bigger?" — combine breadth (language editions) and depth (pageviews) on a
log scale, then correct for bias.

Signals and where they live:

- **`event-filters.js`** — pure, deterministic text scoring (`scoreSignificance`)
  plus two new helpers: `popScore` (log-normalized pageviews → 0–1) and
  `blendPopularity` (combines text + popularity; returns text score unchanged
  when popularity data is missing, so ranking still works offline).
- **`wikipedia.js`** — network enrichment:
  - `fetchPageviews` — per-article monthly pageviews (the strongest attention
    proxy), cached `pageviews:{title}`, log-normalized, with coefficient-of-
    variation damping for "flash in the pan" spikes and recency damping.
  - `fetchOnThisDay` — editor-curated anniversaries, cached `onthisday:{MM}:{DD}`;
    a title+year match applies a curated boost (`CURATED_BOOST`).
  - `enrichSignificance` — bounded to the top `TOP_PER_DECADE` events per decade
    (the Timeline only shows ~5/decade), blends pageviews into
    `event.significance`, and re-applies structural boosts.
  - `pickBestEvent` — log-normalizes Wikidata sitelinks (breadth axis) and
    combines with the pop-enriched text score.
- **`significance-config.js`** — all weights, caps, and damping factors
  (`SIG_CONFIG`) live here for one-place tuning.

Every network call degrades gracefully (returns null/empty, negative-cached), so
a failed or offline fetch falls back to text-only ranking.
