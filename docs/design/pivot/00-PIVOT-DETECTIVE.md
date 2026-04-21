---
title: Pivot — Detective Memory-Palace CYOA
updated: 2026-04-21
status: current
domain: creative
---

# Pivot — Detective Memory-Palace CYOA

> The game is no longer about walking a philosophical argument. It is
> about a detective asleep, dreaming the cases they already solved, and
> re-investigating them inside the unreliable geometry of memory. The
> title *Petitio Principii* holds: every case is the detective begging
> their own question — solving a problem whose answer they already
> carry.

This document is the north star. All other pivot docs refer back to it.

---

## 1. The elevator pitch

Twelve cases. One per hour on the face of a Victorian clock. At
midnight the game opens on the first case; the player drags the
hour-hand to choose any case they've unlocked. Each case has its own
**detective** — its own persona, era, voice, biography, pithy remarks
— and each case is re-authored in that detective's voice from first
word to last.

In play, the detective walks a memory of the case: rooms (dockyards,
casino floors, empty tundra, a specific table at a specific bar) that
render in the persona's prose. The player taps *any word* in the prose
— no affordance, no hint — and the game uses runtime embedding
queries to interpret which of the authored hotspots the player meant.
Verbs surface contextually for whatever the tap resolved to.

Clues accumulate in a case file. Clues connect into facts. Claims can
be accepted, rejected, or left uncommitted. Multiple endings exist per
case; different clue trails unlock different endings. Nothing is
revealed about undiscovered endings except a diegetic proximity-cue
from the detective on case-close. Replay is the game.

---

## 2. Design commitments (non-negotiable)

### 2.1 Memory, not history

The detective is **remembering**, not re-enacting. Rooms are
**loci of memory**, not scenes. That has three consequences:

- **Rooms are not stable between visits.** A detail that wasn't in the
  room the first time can appear the second time — because since the
  last visit, the detective has learned something that makes the
  detail meaningful. The room was always that way *in the memory*;
  only now has the memory surfaced it.
- **Movement is unlocking, not traversal.** An exit may be gated by
  what's in the case file, not as a lock-and-key mechanic but as a
  diegetic recognition: *you didn't remember the fire escape was
  there until you remembered why she called.*
- **Memory can be unreliable on purpose.** A clue's prose may subtly
  differ between visits. Noticing the difference is evidence — about
  the case *and* about the detective. One case in the 12 centers
  this explicitly; others use it as texture.

### 2.2 Zero runtime PRNG

No shuffles, no template chains, no procedural rhetoric, no
RiTa/Tracery at runtime. Every word the player reads was written by a
person. RiTa and Tracery migrate to **authoring-time** tools (see
`docs/design/pivot/05-BRAINSTORM-PIPELINE.md`).

### 2.3 Every case is fully authored, fully bundled

A case ships with its persona, its rooms, its clues, its claims, its
connections, its verdicts, its retort pool, its audio tint — all in
one source file in the SCENE language. Nothing is shared across
cases. Cross-case persona reuse is explicitly forbidden to prevent
voice bleed.

### 2.4 Multiple endings, discoverable only by play

Every case has **several** verdict endings. Some endings have a
single tight path; most have multiple paths. Undiscovered endings
are never enumerated — not by count, not by title. After any ending,
the detective (in-voice) delivers a **proximity cue** whose
phrasing tells the player roughly how many endings remain, without
quantification:

- Many remain: *"I could feel this one was going to slip sideways on me."*
- About halfway: *"There's a version of this I didn't live."*
- One remains: *"And somewhere, she'd have said it differently."*
- All found: *"This is the last way this could have gone. I'm sure of it."*

Each persona authors 4 proximity cues; the phrasing is theirs, the
positions are standard.

### 2.5 Verdict valence is two-axis, fine-grained

Verdicts are tagged on two orthogonal axes. Authoring cost is one
pick-from-list per axis per verdict; that's it. Audio, animation, and
the case-card face on the clock respond to both axes.

**Moral axis:** `vindicated | unsettled | complicit | mistaken | evaded`
**Atmospheric axis:** `quiet | cold | warm | bitter | hollow`

Twenty-five possible combinations. Each reads distinctly. Authors pick
per verdict.

### 2.6 No PRNG means no daily seed

The existing landing-page daily-seed UI goes away. Replaced by the
draggable clock and the case-file cards (see `02-LANDING.md`).

---

## 3. Input model — words as tap surfaces

The single biggest interaction-design commitment. Restated:

> **Every word in every paragraph is tappable. Nothing visually
> distinguishes active words from inert ones. The text is the text.**

When the player taps a word, the engine:

1. Captures the tapped word plus its **sentence-scoped context**
   (falling back to ±8 words if the sentence is a fragment or very
   long).
2. Embeds that context at runtime (local mxbai-embed-large via the
   build-baked vector tables — see `01-ARCHITECTURE-DB.md`).
3. knn-searches the current room's authored hotspot vectors.
4. If the best hit exceeds **cosine similarity 0.80** (tunable), the
   verb panel renders the verbs that apply to that hotspot's target
   (a clue, a named entity, an exit, a claim).
5. If the best hit is in **0.75–0.80** the tap is a "near-miss": the
   verb panel stays in its default state but the transcript picks up
   a **diegetic miss-line** from the persona's retort pool (selected
   by knn against the tapped context). Example: *"You want to ask
   about that, but the thought slips."*
6. If the best hit is **below 0.75**, silent miss. Verb panel stays in
   default.

Implications:

- Reading carefully *is* playing.
- No cheat-sheet tap-everything gameplay.
- Synonyms, periphrasis, pronoun resolution all handled by embeddings.
- Authors write each hotspot phrase *as it appears in the room's prose*;
  the build extracts its context and embeds it once. No alternative-
  phrasing enumeration needed.

### 3.1 Verb panel becomes a verb-fountain

The verb panel renders **only the verbs that apply to the current
selection.** Button labels read as **full sentences** (SCUMM-style):
*"EXAMINE the fire escape"*, not abstract *"EXAMINE"*.

Always-available verbs (LOOK re-reads the room; TRACE BACK forms a
connection from selected clues; NEW GAME) live in a separate
persistent strip beneath the contextual row.

### 3.2 Two targeting surfaces, one verb panel

The same verb panel is driven by two input surfaces:

1. **Tap any word in the Present-zone prose** → hotspot resolution as
   above.
2. **Tap a card in the Case File panel** (a clue, claim, fact) →
   verbs for that card (e.g. ACCEPT/REJECT for claims, TRACE BACK
   between two selected clues).

Same UI, two input surfaces, one sentence-grammar input model.

### 3.3 Keyboard-a11y

- **Tab** moves focus between paragraphs.
- **Arrow** moves focus word-by-word within the focused paragraph
  (or card-to-card within the focused panel).
- **Enter** selects.
- **Space** on a word triggers the tap equivalent.
- Focus indicator is **visible only on keyboard focus** (via
  `:focus-visible`) — touch and mouse users never see a per-word
  affordance.

---

## 4. The existing UI mostly doesn't change

The current terminal layout survives the pivot intact:

- **Heading panel** (compass rose + room count) — unchanged.
- **Present panel** (current room prose) — unchanged skeleton; prose
  content is now the persona-voiced room-as-remembered.
- **Argument-map panel** → renamed **CASE FILE**. Same data flow
  (derive from koota world + reducer). New renderer: clue-board with
  card-shaped Clues / Claims / Facts and edges between them.
- **SCUMM 4-group verb panel** — unchanged in shape. The group labels
  OBSERVE / CHALLENGE / COMMIT / MEMORY already map onto detective
  actions. Specific verbs may relabel per context (EXAMINE the thing,
  QUESTION the witness, ACCEPT the claim).
- **Up/Down keycaps** — unchanged.
- **Hero clock** — lives on the landing only; does not appear in the
  in-case view.

The landing does change — see `02-LANDING.md`.

---

## 5. What survives from the prior direction

- The koota ECS world, reducer, transcript, and save state model.
- The 10-direction spatial primitive (cardinals + diagonals + up/down).
- The hero-clock component (modified; see `02-LANDING.md`).
- The SCUMM verb panel.
- The audio engine (SFX manifest + BGM) — gains verdict-valence-driven
  cross-fade, see §2.5 and `01-ARCHITECTURE-DB.md`.
- Capacitor mobile scaffolding.
- The Maestro flows + emulator smoke script (now smoke-tests the new
  input model).

## 6. What is deleted

- `src/engine/core/ArgumentGraph.ts`'s PRNG weave — replaced by
  `src/engine/case/loader.ts` which loads from `game.db`.
- `src/content/templates/*` — already removed.
- `src/content/worlds/*` (the 80 authored rooms of Subterranean
  Library + Celestial Court, if not already salvaged).
- `src/content/grammar.ts`, `src/content/chaining.ts`,
  `src/content/generated/*` — runtime uses deleted. Tracery +
  RiTa move to `tools/brainstorm/` for authoring only.
- The daily-seed UI on the landing.
- Any place where `generateArgumentGraph(seed)` is still called.

---

## 7. Scope

- **Beta release:** 1 case fully authored for the Midnight slot
  (cluster: hard-boiled noir 1929-1934, per
  [04-PERSONAS.md](./04-PERSONAS.md)). 11 case cards visible on the
  landing as locked / "coming soon." Full engine, full SCENE DSL
  parser, full build pipeline, full authoring guide, full
  per-cluster synthesis pipeline.
- **1.0 release:** as many cases as pass the sameness-check gate
  with voice we can honestly stand behind. 12 is the target; fewer
  is acceptable if a cluster's synthesis brief reads thin. Each
  case is independent. No meta-arc; 12 is just how many hours are
  on a clock. Slots whose clusters don't ratify render locked with
  a one-line "this hour could not be written with the voice it
  deserved" note — honesty over completionism.

## 7a. Ordering of the work

The pivot's implementation order is:

1. **Brainstorm pipeline first** — per-cluster synthesis is a
   prerequisite for honest persona authoring
   ([05-BRAINSTORM-PIPELINE.md](./05-BRAINSTORM-PIPELINE.md)).
2. **Cluster manifests land** for all slots we intend to fill; each
   passes the cluster-sign-off gate.
3. **Midnight case authored** against its cluster's synthesis brief;
   passes the sameness-check gate.
4. **Engine / DSL parser / game.db builder** land in parallel with
   step 3.
5. **Landing overhaul** lands after the midnight case is playable.
6. **Additional cases** authored one at a time, each gated on its
   own cluster + sameness-check.

Rationale: we cannot honestly finalize persona voices against
sources we haven't synthesized. The pipeline produces the synthesis
briefs that the personas are written against. Attempting to fix the
persona cast before running the pipeline is guessing with the
pipeline's clothes on.

## 8. Non-goals (stated so nothing creeps in)

- Multiplayer.
- Cloud saves.
- Dynamically-generated cases.
- User-authored cases in-game (authoring lives in a companion tool).
- Crossover mechanics between cases.
- Live AI / LLM at runtime. All generation happens at build time; the
  runtime has zero network dependency and zero per-session AI cost.

---

## 9. Related docs

| Doc | Purpose |
|---|---|
| [01-ARCHITECTURE-DB.md](./01-ARCHITECTURE-DB.md) | game.db schema; build pipeline; embedding; client libs |
| [02-LANDING.md](./02-LANDING.md) | Draggable clock + case-file panels on the landing |
| [03-SCENE-LANGUAGE.md](./03-SCENE-LANGUAGE.md) | DSL spec, keywords, parser plan |
| [04-PERSONAS.md](./04-PERSONAS.md) | The 12 personas, bios, voice notes |
| [05-BRAINSTORM-PIPELINE.md](./05-BRAINSTORM-PIPELINE.md) | Public-domain mystery scrape → inspiration cards |
| [06-AUTHORING-GUIDE.md](./06-AUTHORING-GUIDE.md) | Narrative-register guide for writing a case |
