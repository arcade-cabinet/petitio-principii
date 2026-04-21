---
title: Brainstorm Pipeline — Per-Cluster Source Synthesis
updated: 2026-04-21
status: current
domain: technical
---

# Brainstorm Pipeline — Per-Cluster Source Synthesis

> Each persona-to-be is grounded in a hand-curated **cluster** of 2-4
> public-domain literary sources that share period, milieu, or
> sensibility but differ enough that no single source dominates.
> The pipeline does for each cluster what the author cannot do by
> hand: extract style signatures, embed every sentence, emit a
> **synthesis brief** the author writes against. The authored prose
> is then checked back against the cluster's embedding space to
> flag passages that paraphrase any single source. The pipeline
> exists to ensure that the persona's voice is *ours*, produced by
> synthesis, not mimicry.

---

## 1. Why cluster, not corpus

The earlier version of this document framed the pipeline as a global
inspiration pile: scrape many sources, emit many cards. That is the
wrong tool for the pivot. Our problem is not lack of inspiration; it
is voice-grounding for twelve distinct detective-personas across
eras we can't all personally inhabit. A global pile retrieves nearest
neighbors; a cluster retrieves *from inside the voice we're trying
to write*.

Each persona gets its own cluster. Retrieval is cluster-scoped.
Synthesis briefs are per-cluster. The global corpus stops being a
retrieval target; it becomes a staging ground from which clusters
are drawn.

---

## 2. The ordering constraint (why this doc ships before persona finalization)

Pipeline-first, personas-after. The constraint is simple:

- The author cannot honestly finalize a persona against sources that
  haven't been synthesized.
- The pipeline's synthesis output *is* what the author writes against.
- Therefore the pipeline must run before persona authoring — and
  before we commit to the twelve.

`04-PERSONAS.md` now holds **source-cluster proposals**, not a
finalized cast. A slot is finalized only after a cluster synthesis
passes the gate in §7.

---

## 3. Source-cluster curation

### 3.1 What a good cluster looks like

A cluster is 2-4 public-domain sources that:

1. **Share a bounded context.** Same century ± 30 years, same
   cultural milieu, and/or same stated genre.
2. **Diverge along an authorial axis.** Two first-person memoirs by
   very different people, or a first-person diary paired with a
   third-person novel of the same milieu. Enough divergence that
   *no single source* can be mimicked without also excluding the
   others.
3. **Pass the PD test.** Every source in English (original or PD
   translation) and US-PD at the date of the corpus manifest.
4. **Have enough text to embed.** Minimum ~60,000 words combined,
   sentence-segmentable. Less than this and the cluster's embedding
   space is sparse and synthesis briefs come out thin.

### 3.2 Cluster curation is taste work

The pipeline cannot pick clusters. Humans pick clusters. The cluster
choices for the twelve slots are proposed in `04-PERSONAS.md` and
the specifics of any given cluster are subject to revision as the
pipeline runs and the synthesis brief reads back.

---

## 4. Pipeline stages

```
tools/brainstorm/
  fetch.ts            ← stage 1: fetch + cache PD sources
  normalize.ts        ← stage 2: clean, strip PG headers, sentence-split
  cluster.ts          ← stage 3: ingest cluster manifests → per-cluster corpora
  signature.ts        ← stage 4: extract style signature per source + per cluster
  embed.ts            ← stage 5: embed every sentence via local Ollama (mxbai-embed-large)
  synthesize.ts       ← stage 6: emit per-cluster synthesis brief markdown
  check.ts            ← stage 7: compare authored prose to cluster space; flag near-misses
```

### 4.1 Stage 1 — fetch

Same as the prior doc. Gutenberg IDs + cached local copies under
`tools/brainstorm/raw/`. Manifest at `tools/brainstorm/corpus-manifest.json`.

### 4.2 Stage 2 — normalize

Same as the prior doc. Strip PG headers/licenses, normalize
whitespace and punctuation, sentence-split via RiTa, emit
`tools/brainstorm/sentences/<author>/<work>.jsonl`.

### 4.3 Stage 3 — cluster ingest

```
tools/brainstorm/clusters/
  heian-court-women.cluster.json
  la-noir-1940s.cluster.json
  yukon-gold-rush.cluster.json
  ...
```

Each cluster manifest:

```json
{
  "id": "heian-court-women",
  "slot_hour": null,
  "title": "Heian Court Women's Prose",
  "context": {
    "period": "980-1020 CE",
    "milieu": "imperial court, Heian-kyō",
    "genre": "memoir / diary / novel"
  },
  "sources": [
    {
      "ref": "pillow-book-waley-1928",
      "role": "primary",
      "weight": 1.0
    },
    {
      "ref": "tale-of-genji-waley-1925",
      "role": "primary",
      "weight": 0.9
    },
    {
      "ref": "sarashina-diary-omori-doi-1920",
      "role": "counterweight",
      "weight": 0.6
    }
  ],
  "exclude": [
    "sections with explicit erotic content (author editorial choice for v1)"
  ],
  "notes": "Three voices, same century, same class, distinct temperaments."
}
```

`clusters/*.cluster.json` files are hand-authored. The pipeline
reads them; it does not generate them.

### 4.4 Stage 4 — style signature extraction

For each source AND for the cluster as a whole, compute:

- **Sentence-length distribution** (p10, p50, p90, max).
- **Vocabulary register**: Latinate % vs. Saxon %, type-token ratio.
- **Modal verb frequency** — surrogate for certainty/uncertainty
  register.
- **Dialogue-to-narration ratio**.
- **Sensory-channel mix**: visual / auditory / tactile / olfactory /
  kinesthetic percentages (keyword-driven heuristic).
- **POV prevalence**: 1st / 2nd / 3rd person percentages.
- **Tense prevalence**: present / past / past-perfect / future-perfect.
- **Signature bigrams / trigrams**: the phrases each source returns to.
- **Motif inventory**: tagged re-occurring subjects (weather, letters,
  lanterns, footprints, taxation …). Tag set is light-touch and
  extensible; the synthesis brief is the real output.

Output: `tools/brainstorm/signatures/<cluster-id>/signatures.json`

### 4.5 Stage 5 — embed

For each sentence in each cluster, embed with
`mxbai-embed-large` via local Ollama (1024-dim). Cache hash-keyed by
`sha256(sentence + model_id)` under
`tools/brainstorm/embeddings-cache.json`. Store vectors into
`authoring.db` per cluster table:

```sql
CREATE VIRTUAL TABLE cluster_sent_vec USING vec0(embedding float[1024]);
CREATE TABLE cluster_sent_meta (
  rowid      INTEGER PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  sentence_idx INTEGER NOT NULL,
  text       TEXT NOT NULL
);
```

`authoring.db` is not shipped to players (reiterated from the prior
version); it is a local tool database.

### 4.6 Stage 6 — synthesize (emit the per-cluster brief)

This is the new centerpiece. For each cluster, emit
`authoring/briefs/<cluster-id>.md`:

```markdown
# Synthesis Brief — Heian Court Women's Prose

## Context
…period, milieu, sources cited with PD basis…

## Shared Signature
- Median sentence length: 19 words (p10=8, p90=38).
- Vocabulary register: high Saxon/low Latinate (but note Waley's
  Latinate inflection in his translation).
- Sensory mix: visual 42% / auditory 18% / olfactory 9% / kinesthetic
  22% / tactile 9%.
- POV: 1st person dominates (72%).
- Tense: present + past-perfect cohabit; habitual-past prevalent.
- Signature bigrams shared across all sources: "it was the…",
  "I remember…", "the moon of…", "nothing of his reply…".

## Divergences
- *Pillow Book* returns to small seasonal observations
  ("beautiful things", "hateful things" — list-shaped entries).
- *Genji* returns to letters delayed, misread, not sent.
- *Sarashina* returns to dreams and disappointments.

## What the synthesis permits that no single source does
- You may write in list-shape, but with *Genji*'s stakes.
- You may write a dream, but with *Pillow Book*'s dry cataloging.
- You may write a failed letter-exchange, but with *Sarashina*'s
  inwardness.

## Forbidden registers
- Direct paraphrase of any `signature bigram` above a frequency
  threshold.
- Any passage whose nearest-source-neighbor is < 0.15 cosine distance
  — you are too close; revise.
- Erotic content (author editorial choice; see cluster manifest).

## Five seed passages for calibration
… five short excerpts from across the sources, cited, as reading
warm-up …

## Ten authorial questions to ask yourself
1. What is your detective doing when we first meet her? (Your
   answer should not be "investigating." It should be a small task.
   This is a cluster rule.)
2. What season is it? (This cluster places season-reference in ~80%
   of openings.)
3. …
```

The brief is markdown, human-read. The author keeps it open while
writing. The seed passages and authorial questions are generated
from the cluster's own content, not invented by the pipeline.

### 4.7 Stage 7 — sameness-check (the gate)

Once the author has written a case (SCENE file), `check.ts` runs the
author's prose against the cluster's embedding space:

```
pnpm brainstorm check scene/cases/02-a-cat-on-the-stairs.scene
```

For each authored prose block (room prose, clue prose, retort,
verdict), it computes:

1. Cosine distance to the nearest sentence in the cluster.
2. If `< 0.18` (very close): **fails**, with a diff showing the
   cluster sentence the block is shadowing. Author revises.
3. If `0.18 ≤ x < 0.25`: **warns**. Borderline. Author decides.
4. If `≥ 0.25`: clean. Written against the synthesis, not any one
   source.

This is the gate the case must pass before it merges.

Thresholds are tunable per cluster; start values above.

---

## 5. Author-facing surfaces

### 5.1 The brief

`authoring/briefs/<cluster-id>.md` is the primary surface. Authors
open it in their editor, leave it open, write the case against it.

### 5.2 CLI retrieval

```
pnpm brainstorm query --cluster heian-court-women "a forged poem exchange"
→ prints 10 nearest passages from the cluster sources only
  with {source, sentence-idx, text, cosine-distance}
```

### 5.3 CLI sameness-check

```
pnpm brainstorm check scene/cases/02-a-cat-on-the-stairs.scene
→ per-prose-block report, with FAIL/WARN/CLEAN status
```

### 5.4 (1.0+) editor plugin

A VS Code / Zed language client that calls `query` and `check`
inline while editing a SCENE file. Out of scope for beta.

---

## 6. Directory layout

```
tools/brainstorm/
  fetch.ts
  normalize.ts
  cluster.ts
  signature.ts
  embed.ts
  synthesize.ts
  check.ts
  cli.ts                              ← pnpm brainstorm {…} entry
  raw/                                ← .gitignore'd
  clean/                              ← .gitignore'd
  sentences/                          ← .gitignore'd
  signatures/                         ← checked in (small, informative)
  embeddings-cache.json               ← checked in
  clusters/*.cluster.json             ← checked in, hand-authored
  corpus-manifest.json                ← checked in
authoring/
  briefs/<cluster-id>.md              ← checked in, generated
  retrieval-logs/                     ← optional; author-kept notes
```

---

## 7. The cluster-sign-off gate

A cluster is "ready" to receive a persona when:

- [ ] Manifest exists and passes `cluster.ts` validation.
- [ ] All sources fetched, cleaned, normalized.
- [ ] Signatures extracted and emitted.
- [ ] Embedded; `authoring.db` populated.
- [ ] Synthesis brief emitted and read by at least one author.
- [ ] At least one retrieval query run against the cluster; results
      look well-scoped.
- [ ] The brief's "What the synthesis permits…" section contains at
      least 3 genuine authorial permissions (not platitudes).

Without that checklist cleared, the cluster is not finalized and no
case targeting it may be authored.

---

## 8. Relationship to `game.db`

`authoring.db` and `game.db` are separate databases with separate
schemas and separate lifecycles:

- `authoring.db` holds cluster content, cluster embeddings, author-
  facing retrieval indices. Not shipped. Local-only.
- `game.db` holds case content, runtime-ready embeddings, progress.
  Shipped to players.

Nothing from the brainstorm pipeline reaches the player's game.db
unless the author has written it into a SCENE file and it has passed
the sameness-check gate.

---

## 9. License discipline

The corpus manifest records for each source:
- Gutenberg ID (or other PD source).
- US-PD basis (year of author death, year of first publication,
  translator death-year for translated texts — critical for
  older-English translations like Waley and Giles).
- Included works (and excluded works with reason).

If a proposed source turns out to not be PD in the US at the date of
the manifest, the cluster is revised before the source is used. The
pipeline refuses to fetch sources not listed as US-PD in the manifest.

The brainstorm pile itself (the briefs, the retrieval outputs, the
check reports) is original authorial work product. Nothing
verbatim-copied from a source ever appears in a brief; signatures
and briefs synthesize.

---

## 9a. Content safety — human review is the gate

Period sources contain material this project will not reproduce in
any form visible to the author: period racist slurs, dialect
caricature, stereotyped ethnic speech, eugenic framings, colonial-
romance tropes. A blocklist-only filter is **not** a sufficient
safeguard — harmful phrasings mutate across sources and the machine
cannot catch them reliably.

The pipeline therefore requires **human review before any seed
material, retrieval output, or synthesis fragment is checked in**
under `authoring/`:

1. The **scrape → synthesize** path produces **drafts** under
   `authoring/briefs/<cluster-id>.md`. On first generation and on
   every regeneration, the author reviews the brief end-to-end
   before staging it.
2. **Retrieval output** (`pnpm brainstorm query`) is ephemeral —
   it prints to stdout, never writes to disk. Nothing retrieved is
   checked in unless the author quotes it into a brief, at which
   point it is subject to brief review.
3. A **blocklist filter** (racial/ethnic slurs, stereotyped
   dialect markers, known-problematic phrases per cluster) is
   applied at the **normalize** stage as a first-pass filter —
   its role is to reduce the volume of material the human reviews,
   not to certify safety. Any flagged sentence is written to
   `tools/brainstorm/flagged/<cluster-id>.jsonl` for audit.
4. The **author's review** is the certifying step. A brief is
   `status: generated` until a human marks it `status: reviewed`
   in the frontmatter. Downstream stages (embed, check, persona
   authoring) refuse `status: generated` briefs.

This is a soft gate enforced by culture + the check-in script
`tools/brainstorm/check-brief-reviewed.ts` (part of the pre-commit
hook). It is not a technical guarantee; the technical infrastructure
exists to support the human review, not to replace it.

---

## 10. One-time vs continuous

- **Fetch + normalize + cluster-ingest + signature + embed + synthesize**
  is one-time per cluster. Running it again is idempotent.
- **Query** is on-demand per author query.
- **Check** runs as part of every case PR; CI task wiring is a
  simple `pnpm brainstorm check <path>`.

There is no daily scheduled brainstorm run.

---

## 11. What the pipeline explicitly does NOT do

- It does **not** write prose for the author. No LLM generation.
  Retrieval only.
- It does **not** pick clusters. Humans pick.
- It does **not** ship anything to the player's browser or device.
- It does **not** cache anything about the author's prose outside
  the repo.
