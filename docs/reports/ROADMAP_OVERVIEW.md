# Epoch PHASE_1: Roadmap Overview

**11 tasks across 4 milestones.** Files: `.claude/roadmaps.json` (machine-readable), `docs/roadmaps/PHASE_1.md` (full task list with Mermaid dependency diagram).

---

## What we're building

Epoch's core loop (create a character, fetch events, browse the timeline) already works, per the README's current-state checklist. What's missing is everything that makes it persist beyond a single stateless request: a dedicated backend API, a database, and user accounts with saved profiles. PHASE_1 builds that stack.

Alongside the infrastructure work, the phase also covers a quality gap in the generated narrative itself: the relevance of the facts the significance-scoring pipeline chooses to surface, and how well those chosen events read together as a coherent timeline rather than a set of independently-scored entries. This work doesn't depend on the backend at all, so it's structured as a separate, parallel milestone.

The data-store choice (relational vs graph) is deliberately left open rather than presupposed. It's the first task in the phase and gates everything downstream that touches persistence.

## Milestone sequence and the reasoning behind it

**M1 — Backend Foundation.** Nothing else in the persistence/accounts track can start until the data store is chosen (`BE.1`), because schema design and API contracts both depend on which store they're targeting. The dedicated backend API (`BE.2`, `BE.3`) then replaces the current SvelteKit-only server actions, giving M2 and M3 something to build on.

**M2 — Persistence.** Schema design (`PS.1`) only needs the data-store decision, so it can start as soon as `BE.1` lands, in parallel with API design. Actually saving and loading characters (`PS.2`, `PS.3`) needs the backend API implemented first.

**M3 — Accounts.** Authentication (`AC.1`) needs the backend API. Tying saved profiles to a user (`AC.2`) needs both authentication and the save/load persistence work, since ownership has nothing to attach to until profiles can be saved at all.

**M4 — Narrative Quality.** Structured as an audit-then-fix sequence: first understand why irrelevant events get surfaced (`NR.1`), then tune the scoring (`NR.2`), then address how selected events read as a connected sequence rather than isolated entries (`NR.3`). This milestone has no dependency on the backend track and can run at any point in the phase.

## Decisions that shaped the structure

- **Data store left undecided on purpose.** Rather than presupposing Postgres/Supabase or Neo4j, `BE.1` is its own blocking task. The project's stack notes list RLS expertise (Postgres) as a strength and graph as the preferred data model in the abstract, but neither is obviously right for characters/sessions/timelines without deciding how that data will actually be queried.
- **Narrative Quality split out as its own milestone, not folded into a "polish" catch-all.** It's genuinely independent of the backend work, and forcing it into the same sequential chain would block content improvements on infrastructure work with no real dependency between them.
- **`AC.2` depends on `PS.2`, not `PS.3`.** Ownership only needs profiles to be saveable; listing/loading saved characters (`PS.3`) is not a prerequisite for attaching an owner to a save.

## External blockers (flag early)

None identified. No `externalGates` are recorded for this phase; all work is internal to the codebase and its dependency choices.
