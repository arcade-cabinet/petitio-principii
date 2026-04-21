---
title: Brainstorm Pipeline — Public-Domain Mystery Corpus → Inspiration Cards
updated: 2026-04-21
status: current
domain: technical
---

# Brainstorm Pipeline — Public-Domain Mystery Corpus → Inspiration Cards

> RiTa and Tracery move from runtime prose generators to **authoring-
> time inspiration generators**. A one-shot build step scrapes a
> curated list of public-domain mystery texts, runs them through
> corpus-analysis to extract repeating shapes (detection moves, scene
> transitions, dialogue tags, red-herring patterns, victim-archetypes),
> and emits a pile of **seed cards** the author reads when stuck.

No output of this pipeline is shipped to players. Nothing it produces
appears at runtime. The pile lives under `authoring/brainstorm/` and
is read by the author during case-writing.

---

## 1. The corpus

Starting list of public-domain sources (Project Gutenberg IDs where
known). Goal: ~30 source texts across ~15 authors, spanning
Victorian-through-Prohibition mystery fiction. All PD in the US.

| Author | Works | Purpose |
|---|---|---|
| Arthur Conan Doyle | Holmes canon (PG 108, 244, 2097, 2852, 834, 1661) | Method-of-detection templates |
| Edgar Allan Poe | Dupin trilogy, "The Gold-Bug" | Early ratiocination, mood |
| Wilkie Collins | *The Moonstone*, *The Woman in White* | Multi-narrator, domestic |
| Maurice Leblanc | Arsène Lupin (PG 6053 and others) | Antihero, con-games |
| G. K. Chesterton | Father Brown | Moral-psychological deduction |
| R. Austin Freeman | Thorndyke | Forensic procedure |
| Jacques Futrelle | Thinking Machine | Problem-of-the-week shape |
| Anna Katharine Green | *The Leavenworth Case*, *Behind Closed Doors* | American domestic mystery |
| E. W. Hornung | Raffles | Antihero POV |
| Baroness Orczy | *Old Man in the Corner* | Armchair detective frame |
| Mary Roberts Rinehart | *The Circular Staircase*, *The Man in Lower Ten* | Female POV, HIBK |
| Charles Dickens | *The Mystery of Edwin Drood* | Unfinished — suggestive gaps |
| Sax Rohmer | Fu-Manchu (with caveats, see §1.1) | Atmospheric pulp |
| Ambrose Bierce | *In the Midst of Life*, *Can Such Things Be?* | Dry caustic register |
| Jack London | Yukon tales | Gold-rush register |
| Anton Chekhov | *The Schoolmaster and Other Stories* | Provincial melancholy |

### 1.1 Curation caveats

- Rohmer, Doyle, and other era works contain period racist content.
  The pipeline's **normalizer step** (§3) flags and excludes
  passages that contain any of a blocklist of racial/ethnic slurs or
  stereotyped dialect. The extracted seed cards must not carry that
  language into the author's inspiration pile.
- The author reading the pile can also mark any card `rejected`;
  rejected cards are moved to `authoring/brainstorm/rejected/`
  and never re-surfaced.

---

## 2. Fetch step

```
tools/brainstorm/fetch-corpus.ts

for each source in corpus-list.json:
  gutenberg-fetch <pg-id> → raw/<author>/<work>.txt
  strip PG header + license + front/back matter
  normalize whitespace, curly quotes, em-dashes
  → clean/<author>/<work>.txt
```

Sources are cached in `raw/`. Re-runs are idempotent. License files
are preserved; the output never contains Gutenberg boilerplate but
the attribution trail is kept in `corpus-manifest.json`.

---

## 3. Normalize step

```
tools/brainstorm/normalize.ts

for each clean/*:
  split into sentences via RiTa.sentences()
  for each sentence:
    if contains any item in BLOCKLIST:
      skip (log to blocked-count.json)
    else:
      append to sentences/<author>/<work>.jsonl
      with {author, work, chapter, sentence-index, text}
```

---

## 4. Extract step — five card flavors

```
tools/brainstorm/extract.ts

for each sentence in sentences/**:
  classify into one or more card flavors (§4.1-5)
  for each match, emit a card stub into cards/<flavor>/
```

### 4.1 Detection-move cards

Sentences that describe *an act of noticing*. Heuristic: contain
verbs of observation (`noticed, observed, remarked, saw, perceived,
marked, remarked upon`) and a concrete noun within 6 words.

Card fields:
```yaml
flavor: detection-move
source: doyle-study-in-scarlet/ch-3/s-142
observation-verb: remarked
object-of-observation: the chalk mark above the letter-rack
persona-fit: [harrison-drake, matilda-shaw, sister-imogen]
```

### 4.2 Scene-transition cards

Sentences that move the narrative from one location to another.
Heuristic: verbs of motion + location noun, sentence-initial
position.

```yaml
flavor: scene-transition
source: leblanc-813/ch-7/s-9
from: the anteroom
to: the library
device: "a door opened by a servant who did not know he was doing it"
```

### 4.3 Dialogue-tag cards

Speaker-attribution fragments. Useful for persona voice calibration —
each tag shows an era's idiom.

```yaml
flavor: dialogue-tag
source: green-leavenworth/ch-9/s-44
tag: "she said, smiling the smile of a woman who is already winning"
era: 1880s
persona-fit: [marguerite-bierce, armand-gaboriau]
```

### 4.4 Red-herring shapes

Passages where an earlier suggestion turns out wrong. Hard to extract
mechanically; heuristic: find consecutive chapter-pairs where an
assertion in ch-N is contradicted in ch-M. Low-precision, high
author-value. Accept false positives in this extractor.

### 4.5 Victim / suspect / witness archetypes

Named-entity spans with the longest surrounding description,
clustered by role. Roles inferred from verbs used for them
(victims get past-tense passive; suspects get present-tense active).

---

## 5. Embed step

```
tools/brainstorm/embed.ts

for each card:
  text = summary-of-the-card
  embed with mxbai-embed-large (local Ollama)
  write embedding to authoring.db (not game.db) → vec0 table
```

`authoring.db` is a separate SQLite lives in `authoring/` and is
never shipped. It indexes all brainstorm cards + all authored case
content (rooms, clues, retorts, claims) for **authoring-time
retrieval**.

Authoring retrieval use cases:
- "I'm writing the fire-escape clue. Give me 10 cards near its
  context." → knn on card embeddings.
- "This retort I just wrote is too close to an existing one." →
  knn on current case's retorts to check for near-duplicates.
- "Is this case's overall voice diverging from the persona's
  voice-notes?" → center-of-mass comparison between the case's
  prose and the persona's voice-notes block.

---

## 6. Author-facing surfaces

### 6.1 Markdown pile

The primary surface is `authoring/brainstorm/` — a directory of
per-flavor markdown files:

```
authoring/brainstorm/
  detection-moves/
    doyle/
      study-in-scarlet.md   ← one card per section, in markdown
    …
  scene-transitions/
  dialogue-tags/
  red-herring-shapes/
  archetypes/
```

An author flips through files when stuck. Random access via editor
search. No UI required.

### 6.2 CLI retrieval tool

```
pnpm brainstorm retrieve "a warm receiver, someone had been holding it"
→ prints 10 nearest cards with source + flavor
```

Implemented as `tools/brainstorm/cli.ts`. Embeds the query via local
Ollama, knn-searches `authoring.db`, prints cards.

### 6.3 (1.0+) Inline editor plugin

A VS Code extension that calls the CLI and shows results in a panel
while the author edits a SCENE file. Out of scope for beta.

---

## 7. Build artifacts

| Path | Purpose | Shipped? |
|---|---|---|
| `tools/brainstorm/raw/` | Cached fetched sources | No (in `.gitignore`) |
| `tools/brainstorm/clean/` | Cleaned sources | No |
| `tools/brainstorm/sentences/` | Sentence-split .jsonl | No |
| `authoring/brainstorm/` | Human-readable markdown cards | **Yes, checked in** |
| `authoring.db` | Vec-indexed authoring db | No (locally built) |
| `authoring/brainstorm/rejected/` | Author-rejected cards | Yes |

Cards are checked in because (a) they're the authoring surface and
(b) they're small text — the whole pile is <50 MB.

---

## 8. One-time vs continuous

- **Fetch + clean + normalize + extract** is one-time per corpus
  addition. Running it again just re-populates stable card files.
- **Embed** is one-time per card or when the embedding model
  changes. Cache keyed by `sha256(card-text)`.
- **Retrieve** (CLI) is on-demand per author query.

There is no daily / scheduled brainstorm run. Once the pile exists,
it is the pile.

---

## 9. License safety

All sources in §1 are PD in the US as of the corpus date. The
manifest records for each source:
- Gutenberg ID
- US PD basis (year of author death, year of first publication)
- Included works
- Excluded works (if any, with reason)

If a new source is added that is only PD in some jurisdictions,
it is tagged accordingly and not bundled into `authoring/brainstorm/`
unless explicitly approved.
