# ADR 0001: Data Store

| Prop     | Value |
|----------|-------|
| Status   | Accepted |
| Date     | 2026-09-30 |
| Roadmap  | BE.1 (unblocks BE.2, PS.1) |

## Context

Epoch is stateless today: `src/routes/+page.server.js` validates a character, pulls events from Wikipedia and returns the timeline without keeping anything. PHASE_1 adds persisted characters (M2) and accounts (M3), so it needs a store.

The data it will hold:

- **Character**: four scalar fields (`name`, `birthYear`, `deathYear`, `location`; see `src/lib/types.js`), owned by one user
- **Timeline**: derived output (events, lifetime summary, oral history) computed from Wikipedia at request time

The queries the roadmap actually needs:

| Task | Query |
|------|-------|
| PS.2 | Insert a character plus its timeline snapshot |
| PS.3 | List the current user's characters; load one by ID |
| AC.1 | Sign up, sign in, resolve the session to a user |
| AC.2 | Allow reads and writes only on rows the current user owns |

Each of these is a keyed lookup or an ownership filter. None of them traverse relationships.

Deployment is Vercel serverless (`@sveltejs/adapter-vercel`), so the store must be reachable over the network from short-lived functions.

## Options

### Supabase (Postgres)

- Covers AC.1 with Supabase Auth and AC.2 with Row-Level Security (`owner_id = auth.uid()`), so ownership is enforced by the database rather than scattered through app code
- A `jsonb` column holds the timeline snapshot without modelling every event as a row
- Works from Vercel functions over HTTP via `@supabase/supabase-js` / `@supabase/ssr`
- Can later hold a shared Wikipedia response cache, replacing the per-instance in-memory LRU in `src/lib/api-cache.js` that cold starts wipe out

### Neo4j (Aura)

- Only pays off for cross-character traversal: "which of my characters lived through the same event", elder chains in oral history, shared-event graphs
- No PHASE_1 task needs any of that
- Needs a separate auth provider, and ownership checks move into hand-written Cypher

### Plain Postgres (e.g. Neon)

- Same data model as Supabase with less vendor lock-in
- Auth and ownership become our job: a separate auth library, plus RLS written against our own session model or checks in every query

## Decision

Use **Supabase**.

The data is small and owner-scoped, and the hardest part of M3 is identity and ownership, which Supabase Auth and RLS already provide. Timelines are stored as `jsonb` snapshots on the character row (or a 1:1 table), so a saved character reopens exactly as it was, even if the scoring or Wikipedia later changes.

## Consequences

- **BE.2** designs the API around Supabase clients: a per-request server client in `hooks.server.js` carrying the user's session, so RLS applies to every query
- **PS.1** defines `characters` (scalar fields, `owner_id uuid references auth.users`) and the timeline snapshot as `jsonb`; the event-level shape stays in JS, not in the schema
- **Snapshot versioning**: the snapshot sits alongside `timeline_version int` and `generated_at timestamptz`. Bump `timeline_version` whenever the event shape or scoring changes (NR.2 and NR.3 will), so stale snapshots can be found and regenerated from the character's own input columns
- **Migration trigger**: move events into normalised rows (`jsonb_array_elements` into an `events` table) once a feature needs any of: cross-character event queries, a shared event catalogue, in-place edits to single events or aggregate stats across users. Until then jsonb stays
- **AC.2** becomes RLS policies plus tests, with no hand-written ownership checks in route code
- New env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (plus the service-role key server-side only if a task needs it)
- Local development needs either the Supabase CLI (`supabase start`, Docker) or a hosted dev project
- **Revisit** if a feature needs cross-character traversal (shared events, family trees of characters). The first step then is recursive CTEs in Postgres; Neo4j only if those prove inadequate
