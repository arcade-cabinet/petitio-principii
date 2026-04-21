---
title: Architecture — game.db as Single Source of Truth
updated: 2026-04-21
status: current
domain: technical
---

# Architecture — `game.db` as Single Source of Truth

> One SQLite file per player. Ships with every authored case's
> content and embeddings baked in at build time (note: in the beta
> release only the Midnight case is fully authored; the seed db still
> contains the schema + empty shells for the other 11 hours so the
> landing can render them as locked). Gains progress and settings as
> the player plays. Follows the established arcade-cabinet pattern
> (grailguard, marmalade-drops): **`@capacitor-community/sqlite`**
> is the single API on BOTH web and native. On web the plugin uses
> its `jeep-sqlite` web-component adapter (which is sql.js-backed
> internally); on mobile it's the native iOS/Android sqlite plugin.
> We **never import sql.js or wa-sqlite directly** — the Capacitor
> plugin is the only surface the runtime knows about. sqlite-vec
> ships as a native extension on mobile and through jeep-sqlite's
> extension path on web.

---

## 1. One database, three roles

`game.db` holds three categories of data:

1. **Content tables** — rooms, clues, claims, connections, verdicts,
   personas, retorts, hotspot vectors. Written at build time;
   read-only at runtime.
2. **Progress tables** — which cases started, which clues discovered,
   which claims committed, transcript. Read/write at runtime.
3. **Settings** — volume, dyslexic font, text size, etc. Read/write
   at runtime; stored as key-value rows in a single `settings` table
   (see §4.4).

One file, one schema, one connection at boot.

---

## 2. Seeding flow

```
first launch:
  if (no user game.db exists in @capacitor-community/sqlite storage):
    fetch('/game.db')                    # shipped seed (content only)
    write to persistent storage
  open user game.db readwrite

subsequent launches:
  open existing user game.db readwrite
```

The shipped seed is ~30-50 MB (content + embeddings for 12 cases).
Users carry their own copy; it grows marginally as progress tables
populate (<5 MB at completion).

### 2.1 Migrations

The seed db ships with `schema_version = N` in the settings table.
On open, if the user's db has version < N, the migration runner:

1. Loads `public/game.db` (the new seed).
2. For each migration step `M.sql` in `src/lib/db/migrations/` from
   user's version to N:
   - `M.sql` is a script that runs against the *user db*. It can
     `DROP TABLE`, `CREATE TABLE`, `ALTER TABLE`, or **copy rows
     from the seed db** via `ATTACH`:
     ```sql
     ATTACH DATABASE 'seed.db' AS seed;
     DELETE FROM rooms;
     INSERT INTO rooms SELECT * FROM seed.rooms;
     DETACH DATABASE seed;
     ```
3. After all steps: `UPDATE settings SET value=N WHERE key='schema_version'`.

This lets us ship new cases / hotspot corrections to existing players
without wiping their progress. The content tables get reset from seed
every migration; the progress tables persist untouched (unless a
migration explicitly modifies them).

---

## 3. Client library

- **Both web and native**: `@capacitor-community/sqlite`. One API,
  one import, one set of bindings. Under the hood:
  - **Web**: the plugin's `jeep-sqlite` web component. `jeep-sqlite`
    is backed by `sql.js` internally — we do **not** import sql.js
    ourselves. Persistence via OPFS on modern browsers; IndexedDB
    fallback on older engines. Total web bundle (plugin wrapper +
    jeep-sqlite + sql.js WASM) is ~600 KB gzipped, lazy-loaded
    after the landing paints.
  - **Native (iOS/Android)**: the plugin's native sqlite backend.
    db file lives in app-private storage. sqlite-vec linked as a
    native extension via the plugin's extension-loading API.
- `sqlite-vec` extension for vector search (~80 KB). Available on
  web through jeep-sqlite's extension path (loaded as a WASM
  addon alongside sql.js), and on native through the Capacitor
  plugin's extension API. Neither path requires a custom sqlite
  build.

### 3.1 Abstraction

A single thin wrapper around the Capacitor plugin. Same code path on
web and native — the plugin's own web/native dispatch (jeep-sqlite
vs. native sqlite) happens below our wrapper, invisibly.

```ts
// src/lib/db.ts
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

export interface GameDb {
  run(sql: string, params?: unknown[]): Promise<ResultSet>;
  vecSearch(table: string, query: Float32Array, k: number): Promise<VecHit[]>;
  close(): Promise<void>;
}

export async function openGameDb(): Promise<GameDb> {
  // On web only: register the jeep-sqlite web component + initialize
  // the WASM store. No-op on native (the plugin handles it).
  if (Capacitor.getPlatform() === "web") {
    await import("jeep-sqlite/loader").then((m) => m.defineCustomElements(window));
    await CapacitorSQLite.initWebStore();
  }
  // Same API on both platforms from here on.
  const conn = await new SQLiteConnection(CapacitorSQLite).createConnection(
    "game",
    /*encrypted*/ false,
    "no-encryption",
    /*version*/ 1,
    /*readonly*/ false
  );
  await conn.open();
  await conn.loadExtension("sqlite-vec"); // same call path web + native
  return wrap(conn);
}
```

One interface, one code path. The web/native branch is a single
initialization line at startup — everything after is platform-
agnostic.

### 3.2 First-paint concern

The Capacitor plugin's web bundle (plugin wrapper + jeep-sqlite +
sql.js WASM) is ~600 KB + `sqlite-vec` ~80 KB. The landing page's
current first-paint budget is 180 KB gzipped (2.25 KB headroom
post-pivot stash). **Solution: lazy-load the db after landing
renders.**

- The landing page doesn't need the db. It needs 12 case-card
  metadata (hour, title, persona name, era, one-line, lock state).
  That fits in a 4 KB static JSON at `/public/landing-cards.json`,
  emitted by the build alongside `game.db`.
- The db (+ sqlite-vec + the seed) loads only when the player
  commits to entering a case (taps a case card). Loading happens
  during the case-card → terminal transition animation, which is
  ~1.5s on the current design — plenty for the Capacitor plugin's
  web initialization + db fetch from service-worker cache.

### 3.3 Lazy load wiring

```
landing-cards.json               ← 4KB static, always
public/game.db                   ← 30-50MB, fetched on first case-entry
src/lib/db.ts                    ← dynamic import('@capacitor-community/sqlite') on first call
```

Cached by the service worker; subsequent loads are instant.

---

## 4. Schema

All table names are lowercase-with-underscores. Text columns use
UTF-8. Floats are stored as 4-byte blobs in vec0 virtual tables.

### 4.1 Content tables (read-only at runtime, written by build)

```sql
CREATE TABLE personas (
  id            TEXT PRIMARY KEY,     -- e.g. 'harrison-drake'
  case_id       TEXT NOT NULL,        -- personas belong to cases
  display_name  TEXT NOT NULL,
  era           TEXT NOT NULL,
  biography     TEXT NOT NULL,
  voice_notes   TEXT NOT NULL,
  notices_first TEXT NOT NULL,        -- JSON array of tags
  theme_chord   TEXT NOT NULL,        -- JSON: {root, intervals, instrument}
  proximity_first  TEXT NOT NULL,
  proximity_middle TEXT NOT NULL,
  proximity_late   TEXT NOT NULL,
  proximity_last   TEXT NOT NULL
  -- NOTE: personas.case_id is a plain column with an index, NOT a
  -- foreign key. The FK direction is `cases.persona_id → personas.id`
  -- only; making both FK'd creates a circular NOT-NULL dependency
  -- that can't be inserted in a single statement. The build's
  -- insert order is personas-first, then cases, so the forward FK
  -- from cases to personas is valid; the reverse link is expressed
  -- by denormalized `personas.case_id` + index.
);
CREATE INDEX personas_by_case ON personas(case_id);

CREATE TABLE cases (
  id         TEXT PRIMARY KEY,          -- e.g. 'midnight'
  hour       INTEGER NOT NULL,          -- 0..11
  title      TEXT NOT NULL,
  one_line   TEXT NOT NULL,             -- for landing card
  persona_id TEXT NOT NULL,
  opens_room TEXT NOT NULL,             -- id of entry room
  FOREIGN KEY (persona_id) REFERENCES personas(id)
);

CREATE TABLE rooms (
  id          TEXT NOT NULL,
  case_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  prose       TEXT NOT NULL,            -- the paragraph(s) the player reads
  rhetorical  TEXT,                     -- optional hint for audio tint
  PRIMARY KEY (id, case_id),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE exits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      TEXT NOT NULL,
  from_room    TEXT NOT NULL,
  to_room      TEXT NOT NULL,
  direction    TEXT NOT NULL,           -- 'north' | 'northeast' | … | 'down'
  prose        TEXT NOT NULL,
  gate_when    TEXT,                    -- nullable JSON predicate (see §5)
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE clues (
  id           TEXT NOT NULL,
  case_id      TEXT NOT NULL,
  room_id      TEXT NOT NULL,
  prose        TEXT NOT NULL,
  on_verb      TEXT NOT NULL,           -- 'examine' | 'question' | 'ask' | …
  on_thing     TEXT,                    -- nullable; tag token or object id
  reveal_when  TEXT,                    -- nullable JSON predicate
  tags         TEXT NOT NULL,           -- JSON array
  PRIMARY KEY (id, case_id),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE claims (
  id       TEXT NOT NULL,
  case_id  TEXT NOT NULL,
  text     TEXT NOT NULL,
  PRIMARY KEY (id, case_id),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE clue_supports (
  case_id  TEXT NOT NULL,
  clue_id  TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  PRIMARY KEY (case_id, clue_id, claim_id)
);

CREATE TABLE clue_contradicts (
  case_id  TEXT NOT NULL,
  clue_id  TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  PRIMARY KEY (case_id, clue_id, claim_id)
);

CREATE TABLE connections (
  id       TEXT NOT NULL,
  case_id  TEXT NOT NULL,
  prose    TEXT NOT NULL,
  yields   TEXT NOT NULL,               -- fact id introduced when requirements met
  PRIMARY KEY (id, case_id)
);

CREATE TABLE connection_requires (
  case_id       TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  kind          TEXT NOT NULL,          -- 'clue' | 'fact' | 'claim_state'
  ref_id        TEXT NOT NULL,
  ref_state     TEXT,                   -- for claim_state: 'accepted'|'rejected'|…
  PRIMARY KEY (case_id, connection_id, kind, ref_id)
);

CREATE TABLE facts (
  id      TEXT NOT NULL,
  case_id TEXT NOT NULL,
  text    TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE TABLE verdicts (
  id              TEXT NOT NULL,
  case_id         TEXT NOT NULL,
  prose           TEXT NOT NULL,
  moral_valence   TEXT NOT NULL,        -- vindicated|unsettled|complicit|mistaken|evaded
  atmos_valence   TEXT NOT NULL,        -- quiet|cold|warm|bitter|hollow
  PRIMARY KEY (id, case_id)
);

CREATE TABLE verdict_requires (
  case_id    TEXT NOT NULL,
  verdict_id TEXT NOT NULL,
  kind       TEXT NOT NULL,             -- 'clue' | 'fact' | 'claim_state' | 'examined'
  ref_id     TEXT NOT NULL,
  ref_state  TEXT,
  PRIMARY KEY (case_id, verdict_id, kind, ref_id)
);

CREATE TABLE retorts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id  TEXT NOT NULL,
  prose    TEXT NOT NULL,
  tags     TEXT NOT NULL                -- JSON array
);

CREATE TABLE named_entities (
  id             TEXT NOT NULL,
  case_id        TEXT NOT NULL,
  kind           TEXT NOT NULL,         -- 'person'|'place'|'object'
  display_name   TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);
```

### 4.2 Vector tables (read-only at runtime)

Separate vec0 table per source kind, for clean semantics and simpler
queries.

```sql
-- Runtime hotspot resolution. 384-dim; embedded at build time with
-- all-MiniLM-L6-v2 (browser-shippable via onnxruntime-web).
CREATE VIRTUAL TABLE hotspot_vec_mini USING vec0(embedding float[384]);

-- Authoring-time retrieval (brainstorm pile, retort quality ranking).
-- 1024-dim; embedded with mxbai-embed-large.
CREATE VIRTUAL TABLE hotspot_vec_mxbai USING vec0(embedding float[1024]);

CREATE TABLE hotspot_meta (
  rowid          INTEGER PRIMARY KEY,
  case_id        TEXT NOT NULL,
  room_id        TEXT NOT NULL,
  target_kind    TEXT NOT NULL,         -- 'clue' | 'exit' | 'entity'
  target_ref_id  TEXT NOT NULL,
  phrase         TEXT NOT NULL,         -- as-written phrase
  context        TEXT NOT NULL          -- sentence-scoped context the build embedded
);

CREATE VIRTUAL TABLE retort_vec USING vec0(embedding float[384]);
CREATE TABLE retort_meta (
  rowid     INTEGER PRIMARY KEY,
  case_id   TEXT NOT NULL,
  retort_id INTEGER NOT NULL,           -- FK to retorts.id
  kind      TEXT NOT NULL               -- 'hit' | 'near-miss' | 'idle'
);
```

Near-miss retorts are pre-tagged at authoring time so the runtime
doesn't have to disambiguate roles.

### 4.3 Progress tables (read/write at runtime)

```sql
CREATE TABLE progress_case (
  case_id        TEXT PRIMARY KEY,
  started_at     INTEGER NOT NULL,
  last_opened_at INTEGER NOT NULL,
  verdict_id     TEXT,                  -- nullable; id of verdict landed on
  endings_found  TEXT NOT NULL          -- JSON array of verdict_ids ever landed on
);

CREATE TABLE progress_clue (
  case_id        TEXT NOT NULL,
  clue_id        TEXT NOT NULL,
  discovered_at  INTEGER NOT NULL,
  PRIMARY KEY (case_id, clue_id)
);

CREATE TABLE progress_fact (
  case_id   TEXT NOT NULL,
  fact_id   TEXT NOT NULL,
  formed_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, fact_id)
);

CREATE TABLE progress_room (
  case_id        TEXT NOT NULL,
  room_id        TEXT NOT NULL,
  first_visit_at INTEGER NOT NULL,
  visit_count    INTEGER NOT NULL,
  PRIMARY KEY (case_id, room_id)
);

CREATE TABLE progress_claim (
  case_id   TEXT NOT NULL,
  claim_id  TEXT NOT NULL,
  state     TEXT NOT NULL,              -- 'pending'|'accepted'|'rejected'|'left-open'
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, claim_id)
);

CREATE TABLE transcript (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    TEXT NOT NULL,
  turn       INTEGER NOT NULL,
  kind       TEXT NOT NULL,             -- 'echo'|'narration'|'title'|'hint'|…
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX transcript_case_turn ON transcript(case_id, turn);
```

### 4.4 Settings (one row key-value)

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Seeded rows:
--   ('schema_version', '1')
--   ('volume_sfx',      '0.8')
--   ('volume_bgm',      '0.6')
--   ('muted',           'false')
--   ('dyslexic_font',   'false')
--   ('text_size',       'medium')
```

### 4.5 Full-text search (detective's notebook)

```sql
CREATE VIRTUAL TABLE progress_clue_fts USING fts5(
  prose,
  content=''                            -- external-content mode
);
```

The case-file panel offers a search input; it queries `progress_clue_fts`
joined to `progress_clue` + `clues.prose`. Free cabinet feature.

---

## 5. Gating predicates (JSON-in-a-column)

Exits, clues, connections, and verdicts can all be gated on arbitrary
combinations of world state. Authoring expresses this in SCENE
language; the parser emits JSON into the `*_when` columns.

```json
// simple: single clue required
{ "all": [ { "clue": "receiver-warm" } ] }

// 'all of these'
{ "all": [ { "clue": "receiver-warm" }, { "fact": "she-was-alone" } ] }

// 'any of these'
{ "any": [ { "claim_state": "it-was-evelyn", "eq": "accepted" },
           { "claim_state": "a-stranger",    "eq": "rejected" } ] }

// negation
{ "none": [ { "fact": "you-hallucinated-the-call" } ] }

// nested
{ "all": [
    { "clue": "receiver-warm" },
    { "any": [ { "examined": "fire-escape" }, { "visited": "alley" } ] }
]}
```

A single small predicate evaluator in `src/engine/case/gates.ts` reads
these against progress tables.

---

## 6. Build pipeline

```
scene/                              ← authored DSL source
  cases/
    midnight.scene                  ← one case per file
    01-hollow-dawn.scene
    …

tools/build-game-db/
  parse.ts                          ← DSL tokenizer + parser
  normalize.ts                      ← resolve refs, lint, emit IR
  embed.ts                          ← batch-embed prose via local Ollama
  pack.ts                           ← write IR + embeddings to game.db

public/game.db                      ← build artifact, shipped to players
public/landing-cards.json           ← tiny metadata for first-paint
```

### 6.1 Embedding — two models, two purposes

Two embedding models are used because the browser can't run Ollama
and can't practically load mxbai-embed-large (too big for a web
client).

- **Build-time quality model:** `mxbai-embed-large` via local Ollama.
  1024-dim. Used at build time for:
  - Authoring retrieval against the brainstorm pile (see
    `05-BRAINSTORM-PIPELINE.md`).
  - Quality ranking of retort pools (flag near-duplicates).
- **Runtime model:** `all-MiniLM-L6-v2` via `onnxruntime-web` (~80
  MB ONNX). 384-dim. Used at runtime for:
  - Tap-context embedding.
  - knn against `hotspot_vec_mini`.

The build embeds every hotspot phrase/context **twice** — once with
each model — and stores them in the two vec tables.

### 6.2 Embeddings cache

`build/embeddings-cache.json` keyed by `sha256(text + model_id)` →
`[float]`. Checked in. Build only re-embeds on text changes. CI can
run the build without Ollama as long as the mxbai half of the cache
is intact; cache miss in CI is a hard fail with a message telling
the author to rebuild locally. The MiniLM half is computable from
`onnxruntime-node` deterministically so CI can compute fresh MiniLM
embeddings if needed.

### 6.3 Schema versioning

Every schema change bumps `schema_version`. Each bump ships with a
`M.sql` migration under `src/lib/db/migrations/`.

---

## 7. Data flow at runtime

```
player taps word
  ↓
capture (word + sentence-context) → MiniLM embed → Float32Array
  ↓
-- hotspot_vec_mini is a vec0 virtual table with only the `embedding`
-- column; metadata (case_id, room_id, target) lives in hotspot_meta
-- keyed by rowid. Join on rowid to filter by case_id + room_id.
SELECT hm.rowid, hm.target_kind, hm.target_ref_id, hm.phrase
  FROM hotspot_vec_mini hv
  JOIN hotspot_meta hm ON hm.rowid = hv.rowid
 WHERE hm.case_id = ? AND hm.room_id = ?
 ORDER BY vec_distance_cosine(hv.embedding, ?) ASC
 LIMIT 1
  ↓
if cosine_similarity < 0.75:
   silent miss — verb panel stays default
else if 0.75 <= cosine_similarity < 0.80:
   near-miss — pick retort (kind='near-miss') via knn, append to transcript
else (>= 0.80):
   verb panel becomes context-sensitive for that target
```

The SQL itself operates on cosine **distance** (0 identical, 2
opposite). The thresholds above express cosine **similarity** for
human readability. Code uses `vec_distance_cosine` and inverts as
`sim = 1 - dist/2`.

---

## 8. Audio bed driven by verdict valence

Per `00-PIVOT-DETECTIVE.md` §2.5, each verdict has two valence tags.
When a player lands a verdict, the audio engine cross-fades the BGM
to a stem chosen by the tag pair.

- 5 moral × 5 atmospheric = 25 possible pairs.
- We don't author 25 stems. We author **5 moral loops** and **5
  atmospheric pads**, layer them, mix by tag strength.
- Per-persona theme-chord lays over everything; unchanged during the
  verdict cross-fade (the persona is always the persona).

Audio assets live under `public/audio/beds/{moral,atmos}/{tag}.opus`.
The audio engine's existing `<Howl/>` pipeline extends to support
layered beds.

---

## 9. Save format

Save files are literally the user's `game.db`. To export a save:
copy the db file. To import: copy it back. No separate serialization
layer.

For cross-device sync (post-v1): the db is sqlite-standard and can
be diffed/merged with CRDT tools. Out of scope for launch.

---

## 10. Testing

- **Unit**: db-bound logic gets an in-memory Capacitor-sqlite-web fixture seeded
  from a tiny golden `tests/fixtures/tiny-case.db`.
- **Integration**: full build → spin up a test db → drive the
  reducer through a scripted tap trail → assert transcripts.
- **Embedding determinism**: embeddings are deterministic given the
  same model + input; cache-hash-keyed cache ensures CI is
  reproducible. A test asserts `SELECT count(*) FROM hotspot_vec_mini`
  equals the sum of all hotspot phrases across all cases.
- **Maestro**: the smoke flow lives through the pivot; it now opens
  the landing, drags the clock, enters the Midnight case, taps a
  known hotspot, asserts the verb panel shows expected verbs.
