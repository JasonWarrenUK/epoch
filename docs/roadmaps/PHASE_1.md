# Epoch PHASE_1 Roadmap

This phase moves Epoch beyond a stateless SvelteKit demo: a dedicated backend, persisted characters, and user accounts, alongside independent work on the quality of the generated narrative itself.

**Critical path:** `BE.1 → BE.2 → BE.3 → PS.2 → AC.2`; the data-store decision gates everything backend-shaped, and `AC.2` (ownership of saved profiles) is the last task before accounts are usable end-to-end. `NR.1 → NR.2 → NR.3` runs independently and can proceed in parallel with the backend track.

---

## Milestone 1: Backend Foundation

**Goal:** Decide on a data store and stand up a dedicated backend API to replace SvelteKit-only server routes.

- [ ] **BE.1**: Decide data store: PostgreSQL/Supabase (relational, RLS) vs Neo4j (graph) vs other, based on how characters/sessions/timelines will actually be queried
- [ ] **BE.2**: Design dedicated backend API surface (routes/contracts) to replace the current SvelteKit server-side form actions _(blocked: depends on BE.1)_
- [ ] **BE.3**: Implement the backend API layer _(blocked: depends on BE.2)_

---

## Milestone 2: Persistence

**Goal:** Persist characters and their generated timelines/sessions to the chosen data store.

- [ ] **PS.1**: Design schema for characters and sessions (fields, relations to events/timeline data) _(blocked: depends on BE.1)_
- [ ] **PS.2**: Implement save character/timeline to persistent storage _(blocked: depends on PS.1, BE.3)_
- [ ] **PS.3**: Implement load/list saved characters _(blocked: depends on PS.2)_

---

## Milestone 3: Accounts

**Goal:** Add user authentication and tie saved profiles to authenticated users.

- [ ] **AC.1**: Implement user authentication _(blocked: depends on BE.3)_
- [ ] **AC.2**: Tie saved profiles to the authenticated user (ownership checks; Row-Level Security if the data store is Postgres/Supabase) _(blocked: depends on AC.1, PS.2)_

---

## Milestone 4: Narrative Quality

**Goal:** Improve the relevance of chosen facts and the coherence of timelines when read in aggregate. Independent of the backend/persistence work; can run in parallel.

- [ ] **NR.1**: Audit fact relevance in current event selection: identify patterns behind irrelevant or low-value events being surfaced
- [ ] **NR.2**: Tune significance/selection scoring for narrative relevance based on the audit findings _(blocked: depends on NR.1)_
- [ ] **NR.3**: Improve aggregate timeline coherence: how selected events read together as a connected narrative, not just individually scored entries _(blocked: depends on NR.2)_

---

## Dependency Diagram

```mermaid
graph LR
	classDef todo fill:#f6f6f6,stroke:#6f6f6f,color:#6f6f6f
	classDef blocked fill:#fff8f6,stroke:#e0002b,color:#e0002b,stroke-width:2px
	classDef paused fill:#fdf4ff,stroke:#b01fe3,color:#b01fe3,stroke-dasharray:4 3
	classDef deferred fill:#fff8f3,stroke:#ac5c00,color:#ac5c00,stroke-dasharray:2 4,font-style:italic
	classDef done fill:#e0ffd9,stroke:#008217,color:#008217
	classDef outOfScope fill:#f6f6f6,stroke:#e2e2e2,color:#e2e2e2,stroke-dasharray:2 2
	classDef mile fill:#e3f7ff,stroke:#007590,color:#007590,font-weight:bold
	classDef external fill:#fff9e5,stroke:#7d6f00,color:#7d6f00,stroke-dasharray:4 3,font-style:italic
	BE.1["BE.1: Decide data store: PostgreSQL/Supabase (r…"]
	BE.2["BE.2: Design dedicated backend API surface (rou…"]
	BE.3["BE.3: Implement the backend API layer"]
	M1["M1: Backend Foundation"]:::mile
	PS.1["PS.1: Design schema for characters and sessions…"]
	PS.2["PS.2: Implement save character/timeline to pers…"]
	PS.3["PS.3: Implement load/list saved characters"]
	M2["M2: Persistence"]:::mile
	AC.1["AC.1: Implement user authentication"]
	AC.2["AC.2: Tie saved profiles to the authenticated u…"]
	M3["M3: Accounts"]:::mile
	NR.1["NR.1: Audit fact relevance in current event sel…"]
	NR.2["NR.2: Tune significance/selection scoring for n…"]
	NR.3["NR.3: Improve aggregate timeline coherence: how…"]
	M4["M4: Narrative Quality"]:::mile
	BE.1 --> BE.2
	BE.1 --> PS.1
	BE.2 --> BE.3
	BE.3 --> M1
	BE.3 --> PS.2
	BE.3 --> AC.1
	PS.1 --> PS.2
	PS.2 --> PS.3
	PS.2 --> AC.2
	PS.3 --> M2
	AC.1 --> AC.2
	AC.2 --> M3
	NR.1 --> NR.2
	NR.2 --> NR.3
	NR.3 --> M4
	class BE.1,NR.1 todo
	class AC.1,AC.2,BE.2,BE.3,NR.2,NR.3,PS.1,PS.2,PS.3 blocked
```
