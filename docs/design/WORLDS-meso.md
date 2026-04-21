---
title: Worlds — Meso Design
updated: 2026-04-20
status: current
domain: creative
---

# Worlds — Meso Design

> Macro named the two worlds and set the voice; meso turns identity into
> structure. This document commits to regions, connection-nodes, hinge
> sentences, puzzle groups, gnome ecology, pacing, and a closing-chamber
> count + reachability plan. Everything specified here is a commitment
> the micro layer (room bodies, exits, Zod schema) must satisfy.

Prerequisites — read first: [WORLDS-macro.md](./WORLDS-macro.md). This
doc assumes macro's identity, voice, hinge-register, and four-
obligation closing-chamber contract. Where macro said *what*, meso
says *how many* and *where*.

Nothing here specifies individual room bodies. Rooms arrive in
`WORLDS-micro.md`. What arrives **here** is the skeleton — the thing
micro authors against.

---

## 1. Budget accounting

Macro §4 committed to two different room counts: **~40 authored rooms
per world** (the content pool each world commits to) and **~30-room
woven walk per seed** (what a single playthrough traverses). Meso
first divides the ~40 into line-items, then sketches the ~30-room walk
as a function of the pool.

### 1.1 Per-world budget (the pool)

Each world authors **40 rooms** exactly. The breakdown is:

| Line-item | Count | Role |
|---|---|---|
| Body rooms | 26 | The substantive prose rooms — premises, conclusions, objections, fallacies, analogies, definitions, meta. The bulk of the voice. |
| Connection-node rooms | 10 | Rooms authored in both worlds at rhetorically-equivalent positions (see §4). Each is authored *twice* — once in A's voice, once in B's voice — but occupies **one** slot in each world's 40-room budget. The hinge sentence is shared. |
| Closing chambers | 4 | One closing chamber per path-pattern (Acceptor / Rejector / Questioner / Tracer, per macro §5.1). Distinct rooms, distinct bodies, distinct titles; same region cluster. |
| **Total per world** | **40** | |

Two important accounting rules this reveals:

- **Puzzle-group rooms are NOT additional.** A `twisty-little-maze`
  room is a body room that also carries `RoomMembership` in a puzzle
  group (per T110). It counts once, in the body-room line. Puzzle
  groups consume allocation from the body-room pool; they do not
  extend the budget. §6 enumerates exactly which rooms are claimed.
- **Connection-node rooms count once per world.** The Premise Hall
  exists in A and in B, each authored separately, but each occupies
  one slot in its own world's 40. The hinge-sentence table (§5) is
  the bookkeeping artifact that keeps the two renderings aligned.

### 1.2 Per-seed walk (the traversal)

A braided walk is ~30 rooms long. From the ~40+~40 combined pool, the
PRNG traverses roughly 30 rooms in a blended ordering. Body-room
visits, connection-node crossings, and puzzle-group traversals all
contribute to the 30 count; the walk terminates in a closing chamber.

Expected per-seed composition (mean across 100 seeds; individual
seeds vary). The three categories below partition the ~30 rooms —
each room is in exactly one category, so the counts sum cleanly:

| Element | Per-walk count | Notes |
|---|---|---|
| Body / puzzle-group rooms visited | ~24 | The substantive prose rooms — both standalone bodies and bodies that also carry puzzle-group membership (per §1.1 accounting rule, a puzzle-group room IS a body room). Distributed across both worlds per the crossing pattern; ~5 of these are inside an engaged puzzle group on the typical walk. |
| Connection-nodes crossed (and rendered) | ~5 | Each crossing is a voice-event (macro §3.5). ~3 crossings per walk is the minimum to earn the braid label; ~7 is the upper end before the crossings drown the reading. The PRNG actually *visits* a few more nodes than it crosses (a node visited without a crossing roll renders one world's body and the player passes through); only crossings are voice-events. |
| Closing chamber | 1 | The final room; one of the 8 chambers (4 per world). |
| **Total per walk** | **~30** | |

A 30-room walk averages ~15 rooms in each world (give or take the
crossing pattern). That's roughly **38% of each world's authored
pool per seed**; the remaining ~25 rooms in each world are the
replay budget. Across two replays, a player will see most of one
world; across five, most of both.

---

## 2. Regions — World A, *The Subterranean Library*

A reads as **descent**. Five named regions form a spine from the
entrance (at the top of the stair) to the Reading Rooms (at the
bottom of the descent, where closings live). Side regions branch off
the spine; a seed may or may not visit them.

### 2.1 The spine

```
  [Antechamber of Admission]       ← entry region; shallow; Act I
          ↓  (down the first stair)
  [The Stacks]                     ← premise region; Act I → II
          ↓  (deeper; sometimes laterally)
  [The Archive of Private Papers]  ← objection / definition region; Act II
          ↓  (through a locked case)
  [The Cellar]                     ← fallacy / circular region; Act II → III
          ↓  (to the very bottom)
  [The Reading Rooms]              ← closing chambers; Act III terminal
```

### 2.2 Region-by-region specification

**Region A.1 — The Antechamber of Admission** (5 body rooms + 2
connection-nodes = 7 rooms total)

- **Rhetorical palette**: premise, definition. The mind admits
  the argument it once made; the first assumptions are laid down
  here.
- **Mood**: candle light is brightest here; the stair down is barely
  visible through the far arch. The amber light will narrow as the
  descent proceeds.
- **Connection-nodes**: *Premise Hall (A)*, *Definition Antechamber
  (A)*. Both authored here; see §5 for their hinge sentences.
- **Act alignment**: opening turns (1–4). A's Act I rooms.
- **Notable body rooms** (micro layer authors the prose): *The
  Coat-Check of Past Selves* (where you realise the coat you are
  hanging up is the one you wore last time); *The Ledger Alcove*
  (a ledger is open on a reading stand, in your hand); *The Card
  Catalogue* (every drawer contains a card describing you).
- **Exits out**: down, to the Stacks. No other region exits.

**Region A.2 — The Stacks** (6 body rooms + 3 connection-nodes = 9
rooms total)

- **Rhetorical palette**: premise, analogy. A long corridor of
  shelves thickening with the argument's supporting material; the
  Scholar-Mouse (§7) lives here.
- **Mood**: paper smell sharpens. Light is the color of old
  vellum. Footfalls muffle. The stair down to the Archive is at the
  end of the long corridor and to the left.
- **Connection-nodes**: *Analogy Gallery (A)*, *Scholar-Mouse Lectern
  (A)*, *Conclusion Balcony (A)*. The lectern is a connection-node
  because a Scholar-Mouse also appears at the equivalent B lectern
  in the Terrace; the Conclusion Balcony sits at the Stacks' far end
  as the *"therefore"* into which the Stacks' premises are read.
- **Act alignment**: later Act I, bleeding into Act II.
- **Notable body rooms**: *The Shelf That Agrees With You* (every
  book here supports the premise, all in your handwriting); *The
  Misshelved Corner* (a book that contradicts is wedged at the
  back); *The Rolling-Ladder Aisle* (a ladder that rolls when you
  step on it, revealing a different shelf every visit).
- **Puzzle-group member**: the `regress-spiral` group has its first
  room here — *The Footnote-Within-A-Footnote*, where ASK WHY
  descends to a deeper stack.
- **Exits out**: down and forward, to the Archive.

**Region A.3 — The Archive of Private Papers** (5 body rooms + 2
connection-nodes = 7 rooms total)

- **Rhetorical palette**: objection, definition. Where your own
  past objections have been filed — and answered by a hand that is
  also yours.
- **Mood**: colder than the Stacks. Dust. The papers here are
  brittle; handling them is like admitting something. The Figure
  Behind the Mirror (§7) appears here in an angled glass.
- **Connection-nodes**: *Objection Cloister (A)*, *Meta-Observatory
  (A)* — the latter is where the Mirror Figure bridges into B.
- **Act alignment**: Act II.
- **Notable body rooms**: *The Mending Table* (where torn objections
  are patched by someone you don't see); *The Sealed Drawer*
  (labelled in your hand, *not for re-reading*); *The Margin
  Correspondence* (a file of arguments between your left-hand and
  right-hand writing).
- **Puzzle-group member**: the `regress-spiral` group continues
  here (ASK WHY goes one stack deeper); the `mirror-gallery`
  bridging group begins here.
- **Exits out**: down, to the Cellar. A back-route up returns to
  the Stacks.

**Region A.4 — The Cellar** (5 body rooms + 2 connection-nodes = 7
rooms total)

- **Rhetorical palette**: fallacy, circular. The warmest region
  (the Cellar always is); where the fallacies live and the
  circular rooms begin to make themselves felt. The Tautologist
  (§7) lives down here.
- **Mood**: damp. Candles gutter. The air is older. A drain in
  the floor of every room suggests something flows out that you
  cannot see.
- **Connection-nodes**: *Fallacy Cellar (A)*, *Circular Atrium (A)*.
- **Act alignment**: Act II bleeding into III.
- **Notable body rooms**: *The Jarred Fallacies* (shelves of jars,
  each labelled with a fallacy, some with the lid loose); *The
  Low Archway* (you duck to enter, though the arch was tall last
  time); *The Drain Room* (the inscription on the drain grate is
  the premise).
- **Puzzle-group member**: the `twisty-little-maze` group claims
  5 rooms in the Cellar (the catacomb under the Cellar proper);
  see §6.
- **Exits out**: down, to the Reading Rooms.

**Region A.5 — The Reading Rooms** (4 closing chambers + 1
connection-node = 5 rooms total; these are end-rooms; they have no
onward exits)

- **Role**: closing chambers. Four of them, one per path-pattern
  (macro §5.1). See §8.
- **Mood**: each chamber is a low alcove lit by a single candle,
  with a single open volume. The reader is expected to be alone.
  Identical basic furniture across all four chambers — the
  differences are in which room of your walk the Librarian's
  margin-note names, and in whether the book closes softly or
  slightly more slowly.
- **Connection-node**: *The Reading Room itself* is a connection-
  node whose B-twin is the Inner Observatory region's atrium. See
  §5.
- **Notable chambers** (by path-pattern; authored fully in micro):
  *The Reading Room of Yeses* (Acceptor), *The Reading Room of
  Noes* (Rejector), *The Reading Room of Margins* (Questioner),
  *The Reading Room of Returned Pages* (Tracer).

**Side region A.6 — The Catacomb (Twisty Little Maze)** (5 body
rooms, all puzzle-group members; share 1 connection-node with the
Cellar proper)

- This is a puzzle-group region, claimed entirely by the
  `twisty-little-maze` kind. It sits under the Cellar; entry is
  from a specific Cellar room; exit requires the marker-drop
  solution. The 5 rooms are near-identical on first read; their
  differences emerge through the solution.
- Not part of the A.1→A.5 spine; visited only if the seed enters
  it. A seed may skip A.6 entirely (~30% of seeds do).
- Covered in §6 under the `twisty-little-maze` entry.

### 2.3 World A total

| Region | Body rooms | Connection-nodes | Closing chambers | Total |
|---|---|---|---|---|
| A.1 Antechamber of Admission | 5 | 2 | — | 7 |
| A.2 The Stacks | 6 | 3 | — | 9 |
| A.3 The Archive of Private Papers | 5 | 2 | — | 7 |
| A.4 The Cellar | 5 | 2 | — | 7 |
| A.5 The Reading Rooms | — | 1 | 4 | 5 |
| A.6 The Catacomb (puzzle) | 5 | 0 (entered via A.4)* | — | 5 |
| **A totals** | **26** | **10** | **4** | **40** |

\* A.6 is a side region reached by a non-hinge doorway from an A.4
body room (per §6, the `twisty-little-maze` entry room in A.4);
it does not own a connection-node of its own. All 10 of A's
connection-nodes are on the spine (A.1–A.5).

Connection-nodes per the hinge table (§5.2): A.1 carries 2 (nodes
#1, #2), A.2 carries 3 (nodes #3, #4, #8), A.3 carries 2 (nodes
#5, #6), A.4 carries 2 (nodes #7, #9), A.5 carries 1 (node #10).
Sum: 2 + 3 + 2 + 2 + 1 = 10.

Total: 26 body + 10 connection + 4 closing = **40**. Holds.

---

## 3. Regions — World B, *The Celestial Court*

B reads as **ascent**. Five named regions form a spine from the
entrance (at the foot of the grand stair) to the Inner Observatories
(at the crown of the ascent). Side regions branch off.

### 3.1 The spine

```
  [Antechamber of Findings]     ← entry region; low hall; Act I
          ↑  (up the first stair)
  [The Terrace]                 ← premise / conclusion region; Act I → II
          ↑  (crossing the open sky)
  [The Observatories]           ← analogy / definition region; Act II
          ↑  (through a mirrored door)
  [The Hall of Mirrors]         ← meta / circular region; Act II → III
          ↑  (to the crown)
  [The Inner Observatories]     ← closing chambers; Act III terminal
```

### 3.2 Region-by-region specification

**Region B.1 — The Antechamber of Findings** (5 body rooms + 2
connection-nodes = 7 rooms total)

- **Rhetorical palette**: premise, objection. A low public hall
  where findings are ceremonially entered; the Strawmen (§7) walk
  in pairs here, mirroring arguments back malformed.
- **Mood**: pale and tall; cold marble; echoes returning in a
  count. The air is clear and formal. Sound is long.
- **Connection-nodes**: *Premise Hall (B)*, *Objection Cloister
  (B)*. (These are the B-twins of the A nodes.)
- **Act alignment**: opening turns (1–4). B's Act I.
- **Notable body rooms**: *The Registry* (a book where findings are
  entered in a hand not yours); *The Gavel Rest* (a gavel on a
  pedestal, warm); *The Calling of the Assembled* (a long hall
  where a list is being read; you cannot hear the names but you
  recognize the cadence).
- **Puzzle-group member**: the `circular-trap` group has its
  antechamber here — *The Room Where The Finding Is Read Aloud*.
- **Exits out**: up, to the Terrace.

**Region B.2 — The Terrace** (6 body rooms + 2 connection-nodes = 8
rooms total)

- **Rhetorical palette**: premise, conclusion. An open terrace
  running the length of the court; the Chorus of Mumbling Footnotes
  (§7) lives in the stairwells below. This is where conclusions
  are mounted on their plinths.
- **Mood**: sunlight through glass. Wind that has no source. The
  Chorus is faint from the stairwells; you cannot quite make out
  what they are dismissing.
- **Connection-nodes**: *Conclusion Balcony (B)*, *Scholar-Mouse
  Lectern (B)* — the lectern's B-twin, where a mouse no one can
  see misattributes the quote aloud.
- **Act alignment**: later Act I bleeding into Act II.
- **Notable body rooms**: *The Mounted Therefores* (a row of
  plinths, each with a *therefore* but no premise visible); *The
  Stairwell Below* (where the Chorus mutters); *The Open Air*
  (a section of terrace with no railing, though you feel no fall).
- **Puzzle-group member**: the `circular-trap` group continues
  here — two Terrace rooms route back into B.1.
- **Exits out**: up, to the Observatories.

**Region B.3 — The Observatories** (5 body rooms + 3 connection-
nodes = 8 rooms total)

- **Rhetorical palette**: analogy, definition. A cluster of glass
  domes, each trained on a different analogy; telescopes point at
  mirrors, at charts, at each other.
- **Mood**: cold and bright. Glass creaks in the temperature. The
  Figure Behind the Mirror (§7) is seen first here, in a reflection
  you cannot catch directly.
- **Connection-nodes**: *Analogy Gallery (B)*, *Definition
  Antechamber (B)*, *Meta-Observatory (B)* — the latter sits at the
  region's heart as the observatory trained inward on itself (its
  A-twin sits in A.3, the Archive of Private Papers).
- **Act alignment**: Act II.
- **Notable body rooms**: *The Dome Trained On Itself* (a telescope
  pointing at its own lens); *The Chart of Equivalences* (a paper
  covered in *A :: B :: C* pairings, none of which resolve); *The
  Mirror Antechamber* (where the Mirror Figure's first reflection
  appears).
- **Puzzle-group member**: the `mirror-gallery` bridging group
  begins here (the Mirror Figure's first B-side appearance).
- **Exits out**: up, to the Hall of Mirrors. A back-route down
  returns to the Terrace.

**Region B.4 — The Hall of Mirrors** (6 body rooms + 2 connection-
nodes = 8 rooms total)

- **Rhetorical palette**: meta, circular. The climactic region
  before closing; where the argument is shown to itself and finds
  itself pleasing. The Tautologist (§7) appears here on her B-side
  visits — you catch a woman in the mirror finishing a sentence
  you cannot quite hear.
- **Mood**: cold glass on every wall. Light reflects between
  mirrors without diminishing. Your own reflection is three steps
  behind you in one glass, three steps ahead in another.
- **Connection-nodes**: *Fallacy Observatory (B)* (the B-twin of
  A's Fallacy Cellar — same semantic role, opposite posture),
  *Circular Atrium (B)*.
- **Act alignment**: Act II bleeding into III.
- **Notable body rooms**: *The Facing Mirrors* (two mirrors facing
  each other; the reflection goes on forever, and a finding is
  entered at each remove); *The Half-Silvered Door* (you see the
  room beyond and your own face in the same plane); *The Mirror
  That Speaks in the First-Person-Plural* (a mirror that says *we
  find it so* and then is silent).
- **Puzzle-group member**: the `self-reference-recursion` group
  claims 4 rooms here (the Chamber of Self-Reference); see §6.
- **Exits out**: up, to the Inner Observatories.

**Region B.5 — The Inner Observatories** (4 closing chambers + 1
connection-node = 5 rooms total; end-rooms, no onward exits)

- **Role**: closing chambers. Four of them, one per path-pattern.
- **Mood**: each chamber is a pale dome with a single inverted
  telescope trained at the floor. Identical basic furniture across
  all four chambers; the difference is in which room of your walk
  the assembled voice names, and in whether the shutter closes or
  is left ajar.
- **Connection-node**: *The Inner Observatory atrium* — B-twin of
  A's Reading Rooms atrium.
- **Chambers** (by path-pattern; authored fully in micro): *The
  Observatory of Yeses* (Acceptor), *The Observatory of Noes*
  (Rejector), *The Observatory of Margins* (Questioner), *The
  Observatory of Returned Findings* (Tracer).

**Side region B.6 — The Chamber of Self-Reference (recursion
puzzle)** (4 body rooms, all puzzle-group members; share 1
connection-node with B.4)

- A puzzle-group region claimed entirely by the
  `self-reference-recursion` kind. The weaver keeps the braid
  inside the group until the player navigates out via a specific
  sequence (per T110). Four rooms that each describe the others.
- Not part of the B.1→B.5 spine; visited only if the seed enters
  it. A seed may skip B.6 entirely (~30% do).
- Covered in §6 under the `self-reference-recursion` entry.

### 3.3 World B total

| Region | Body rooms | Connection-nodes | Closing chambers | Total |
|---|---|---|---|---|
| B.1 Antechamber of Findings | 5 | 2 | — | 7 |
| B.2 The Terrace | 6 | 2 | — | 8 |
| B.3 The Observatories | 5 | 3 | — | 8 |
| B.4 The Hall of Mirrors | 6 | 2 | — | 8 |
| B.5 The Inner Observatories | — | 1 | 4 | 5 |
| B.6 Chamber of Self-Reference (puzzle) | 4 | 0 (entered via B.4)* | — | 4 |
| **B totals** | **26** | **10** | **4** | **40** |

\* B.6 is a side region reached by a non-hinge doorway from a B.4
body room (per §6, the `self-reference-recursion` entry room in
B.4); it does not own a connection-node of its own. B.6 is 4 rooms
rather than A.6's 5 because T110's `self-reference-recursion` spec
is 4 rooms (vs. `twisty-little-maze`'s 5).

Connection-nodes per the hinge table (§5.2): B.1 carries 2 (nodes
#1, #5), B.2 carries 2 (nodes #4, #8), B.3 carries 3 (nodes #2,
#3, #6), B.4 carries 2 (nodes #7, #9), B.5 carries 1 (node #10).
Sum: 2 + 2 + 3 + 2 + 1 = 10.

Total: 26 body + 10 connection + 4 closing = **40**. Holds.

The counts are deliberately **near-symmetric** between A and B —
same region count (5 spine + 1 side), same *total* body-room count
(26), same connection-node count (10), same closing-chamber count
(4). Per-region body counts differ by at most one room (A.4 has 5
body rooms where B.4 has 6; A.6 has 5 where B.6 has 4), reflecting
the fact that T110's `twisty-little-maze` kind uses 5 rooms and
`self-reference-recursion` uses 4. The rooms "recovered" by B.6's
smaller puzzle-group footprint are returned to B.4, which gives the
Hall of Mirrors an extra meta-room slot — appropriate, since B.4 is
the climactic region before ascent to closing.

The near-symmetry is what makes the blackboard test (T107) work:
a player's map of a braided walk should show corresponding A and B
regions at corresponding levels of descent/ascent.

---

## 4. The architecture of the braid

Before the connection-node table itself, the geometry that makes
crossings structural rather than arbitrary.

### 4.1 The two spines are mirror images at the region level

World A descends 5 levels, entry at the top. World B ascends 5
levels, entry at the bottom. The **spine-level** correspondence is
direct — region N in A sits at the same ordinal depth as region N
in B, measured outward from the entry:

| A-region (descent depth) | B-region (ascent depth) | Shared moment in the argument |
|---|---|---|
| A.1 Antechamber of Admission | B.1 Antechamber of Findings | First premises laid down. Act I. |
| A.2 The Stacks | B.2 The Terrace | Premises elaborated, conclusions first stated. Act I → II. |
| A.3 The Archive | B.3 The Observatories | Objections filed; definitions examined. Act II. |
| A.4 The Cellar | B.4 The Hall of Mirrors | Fallacies and circularity emerge. Act II → III. |
| A.5 The Reading Rooms | B.5 The Inner Observatories | Closing chambers. Act III terminal. |

**Nodes, however, are not always level-matched.** The hinge table
(§5.2) places individual connection-nodes where each role reads
most naturally in each world, which sometimes means a node's A-side
and B-side sit at different levels. Examples:

- Node #2 *Definition Antechamber* is in A.1 (you define as you
  admit) and in B.3 (you define as you rule on).
- Node #5 *Objection Cloister* is in A.3 (objections are filed
  privately) and in B.1 (objections are ceremonially mirrored back
  in the antechamber).

These offsets are *features*, not bugs: when the PRNG crosses at
such a node, the player hops not just between worlds but between
descent-ascent levels, which makes the braid more surprising. Of
the 10 nodes: **7 are level-matched** (#1, #4, #6, #7, #8, #9,
#10) and **3 are level-offset** (#2, #3, #5). The mix is
deliberate — a braid made entirely of level-matched nodes would
read as too orderly; a braid made entirely of level-offset nodes
would disorient. 7-to-3 delivers structure with surprises.

### 4.2 Crossings happen at connection-nodes only

A hop A↔B occurs if and only if the PRNG lands on a connection-node
and the seed's rng rolls for a crossing. There is no other mechanism
for world-switching. This keeps the braid structurally honest: every
voice-event (macro §3.5) sits on an enumerated hinge.

### 4.3 Typical walk shape

A 30-room seed will cross between 3 and 7 times. The mean is ~5.
Each crossing is felt; the hinge sentence re-surfaces each time in
the receiving world's voice. A walk with fewer than 3 crossings
fails to register as a braid; a walk with more than 7 saturates the
voice-event and numbs the crossings. The density curves in §8 are
tuned to keep 90% of seeds in the 3–7 range.

---

## 5. Connection-node set + the hinge-sentence table

Ten connection-nodes. Each occupies one slot in each world's 40-room
budget (so the combined pool commits 20 rooms to nodes — 10 in A, 10
in B, authored separately). Each carries **one hinge sentence**,
grammatical in both registers, present verbatim in both renderings.

### 5.1 Selection principle

The 10 nodes were selected to satisfy three constraints:

1. **Rhetorical coverage.** Each of the 8 rhetorical types (premise,
   conclusion, definition, analogy, fallacy, circular, objection,
   meta) is represented by at least one node. Two types — premise
   and meta — are represented by two nodes each, because both are
   load-bearing to the circle-closing mechanic.
2. **Region distribution.** Nodes spread across all 5 spine regions
   per world, with ~2 per region — except the terminal regions (A.5,
   B.5) which carry only 1 node (#10, shared), and one mid-region
   per world carries 3 due to the catchment-bias around node #10's
   approach (A.2 = 3 nodes; B.3 = 3 nodes). Every region has at
   least one node, so a seed crossing between worlds does so at a
   meaningful region boundary rather than mid-region.
3. **Spatial fingerprint shareability.** Each node has a geometry
   that reads naturally in both registers (a hall of columns, a
   balcony over an expanse, a drum-shaped atrium). Nothing here
   requires A-specific features (candle smell) or B-specific
   features (vaulted acoustics) to make sense.

### 5.2 The hinge-sentence table

Format: **A-name** / *B-name* | A-region / B-region | rhetorical role
| **hinge sentence** (shared verbatim).

Each hinge sentence below has been written to be grammatical in
both the Librarian's hush and the Court's vault, to contain no
first-person pronouns, and to avoid voice-specific verbs (per macro
§3.5's "What the hinge is NOT").

| # | A-name / B-name | A-region / B-region | Role | Hinge sentence |
|---|---|---|---|---|
| 1 | **Premise Hall (A)** / *Premise Hall (B)* | A.1 / B.1 | Premise (entry) | *Seven columns. Seven entrances. Nothing more is needed here.* |
| 2 | **Definition Antechamber (A)** / *Definition Antechamber (B)* | A.1 / B.3 | Definition | *The word means what the room means.* |
| 3 | **Analogy Gallery (A)** / *Analogy Gallery (B)* | A.2 / B.3 | Analogy | *Every pair is hung at the same height.* |
| 4 | **Scholar-Mouse Lectern (A)** / *Scholar-Mouse Lectern (B)* | A.2 / B.2 | Premise (cited) | *The citation has been made; the source is not in the room.* |
| 5 | **Objection Cloister (A)** / *Objection Cloister (B)* | A.3 / B.1 | Objection | *The objection has been walked around and returned to its place.* |
| 6 | **Meta-Observatory (A)** / *Meta-Observatory (B)* | A.3 / B.3 | Meta | *Whatever is looking into this room is in this room.* |
| 7 | **Fallacy Cellar (A)** / *Fallacy Observatory (B)* | A.4 / B.4 | Fallacy | *The mistake is cheaper than the correction.* |
| 8 | **Conclusion Balcony (A)** / *Conclusion Balcony (B)* | A.2 / B.2 | Conclusion | *Therefore. The plinth is in the centre.* |
| 9 | **Circular Atrium (A)** / *Circular Atrium (B)* | A.4 / B.4 | Circular | *The premise is the same premise it was.* |
| 10 | **Reading Rooms Atrium (A)** / *Inner Observatories Atrium (B)* | A.5 / B.5 | Closing (terminal) | *Something has been agreed to in this room.* |

### 5.3 How the hinges read in context

Each hinge sentence is spoken identically in both worlds, but sits
inside a body authored in the receiving world's register. Two
worked examples (full room prose in micro; the excerpts below show
only the hinge in its surrounding sentence):

*Premise Hall (A), excerpt:*

> …you step down into the hall. Your coat was already on the peg.
> **Seven columns. Seven entrances. Nothing more is needed here.**
> You remember agreeing.

*Premise Hall (B), excerpt:*

> …you rise into the hall. A finding has been entered already.
> **Seven columns. Seven entrances. Nothing more is needed here.**
> We will not have disagreed.

The sentence is identical. The voice around it has swung. That is
the braid landing in prose, per macro §3.5.

### 5.4 How closings re-surface the hinges

Per macro §5.1 obligation 3, each closing chamber re-surfaces the
hinge of **the last connection-node the player crossed** before
reaching the closing. The closing does not name the node; it speaks
its hinge sentence in the closing-world's register. If the player
crossed node #9 (Circular Atrium) last, the closing contains:

- In A's Reading Room: *The premise is the same premise it was.*
  The book closes on that sentence.
- In B's Inner Observatory: *The premise is the same premise it
  was.* A finding has been entered on that sentence.

Same words. Opposite surrender.

---

## 6. Puzzle-group blueprint

T110 specifies 7 puzzle-group kinds. Meso commits to **5 groups
total across both worlds**: 2 world-locked in A, 2 world-locked in
B, 1 world-bridging. The remaining 2 kinds (`false-premise-cascade`
and `dual-premise-test`) are **deferred** — not authored in the
first pass of the worlds, kept in reserve for a second authoring
pass once the first five are proven in playtest.

Per T110's rule: a `PuzzleGroup` entity binds rooms; the weaver
suppresses cross-world hopping within world-locked groups and
*guarantees* cross-world traversal within bridging groups.

### 6.1 World A, world-locked groups (2)

**A-PG-1: `regress-spiral` — The Footnote Regression** (3 rooms,
claimed from A.2 and A.3)

- **Rooms**: *The Footnote-Within-A-Footnote* (A.2), *The Index
  Card That Refers To Another Index Card* (A.3), *The Marginalium
  Beneath the Marginalium* (A.3).
- **Mechanic** (per T110): `ASK WHY` walks the player one room
  deeper into the group; only `TRACE BACK` from sufficient depth
  (≥ 2) exits. `state.maxDepthReached` tracks progress.
- **Narrative justification**: A's palette is naturally regressive
  — scholarly footnotes cite other footnotes that cite other
  footnotes. The recursion is the argument.
- **Entry**: seeded; any Stacks room can reveal the footnote that
  begins the regression.
- **Exit**: TRACE BACK from *The Marginalium Beneath the Marginalium*
  returns the player to the Stacks, having added +1 *regressive
  visits* to the transcript (a trait the Tracer path-pattern
  weights on).

**A-PG-2: `twisty-little-maze` — The Catacomb** (5 rooms, all of
A.6)

- **Rooms**: A.6.1 through A.6.5 (named in micro). On first read,
  all five bodies describe *the same low brick chamber with three
  unmarked doors and a drain in the floor*, with one-word
  variations that the player does not consciously notice.
- **Mechanic**: exits appear random on first traversal. `EXAMINE`
  produces a *droppable ink stamp*; stamping a room and
  re-entering reveals that room's real exit. `state.markers:
  Map<RoomId, Direction>` and `state.lastActualRoom: RoomId`
  track the solution.
- **Narrative justification**: A homage to Adventure's maze. In A
  this reads as *a catacomb under the library where the books
  were sent to die*; the near-identical-prose conceit (Zork's
  "all alike") works because a single author has written all five
  with deliberate parallel syntax.
- **Entry**: from A.4's *The Low Archway*. On entry, the weaver
  sets `state.markers = {}` and keeps the braid inside A.6 until
  exit condition.
- **Exit**: stamp 3 of the 5 rooms and re-enter any stamped room;
  the real exit back to the Cellar appears. Without stamps, the
  exits continue to loop.

### 6.2 World B, world-locked groups (2)

**B-PG-1: `circular-trap` — The Finding That Reads Itself** (3
rooms, claimed from B.1 and B.2)

- **Rooms**: *The Room Where The Finding Is Read Aloud* (B.1),
  *The Hall Where The Finding Is Posted* (B.2), *The Stairwell
  Where The Finding Echoes* (B.2 → B.1).
- **Mechanic** (per T110): every exit from a member room routes
  back to the group. Solution: `ACCEPT` from within any member.
  `state.recognized: bool` flips on first ACCEPT; closings reflect
  the flip.
- **Narrative justification**: B's ceremonial register naturally
  supports a chamber whose finding is the finding's own re-entry.
  The third room's *echoes* are each the same finding in different
  syllable-counts.
- **Entry**: seeded; any B.1 or B.2 room can route in on a
  specific PRNG roll.
- **Exit**: `ACCEPT` from a member room; returns the player to
  wherever the group was entered from, with `state.recognized =
  true` influencing the closing's path-pattern calculation.

**B-PG-2: `self-reference-recursion` — The Chamber of Self-
Reference** (4 rooms, all of B.6)

- **Rooms**: B.6.1 *The Room That Describes This Room*, B.6.2
  *The Room That Describes The Previous Room*, B.6.3 *The Room
  That Describes The Next Room*, B.6.4 *The Room That Describes
  All Of These Rooms*.
- **Mechanic** (per T110): the weaver keeps the braid inside the
  group until the player enters the rooms in the specific
  sequence (1→3→2→4). Any other order resets `state.progress`.
- **Narrative justification**: the terminal recursion. B's palette
  is naturally reflexive — mirrors describing mirrors — and the
  4-room structure lets each room hold a different relation to the
  others (self, prior, posterior, all). The correct sequence is
  not arbitrary: it corresponds to the four tenses of the future-
  plural-self's ratification (present, past-perfect, future-
  perfect, pluperfect-perfect).
- **Entry**: from B.4's *The Facing Mirrors*.
- **Exit**: correct sequence completes `state.progress`; the next
  move returns the player to B.4 with `state.unlocked = true`
  stamped on the group.

### 6.3 Bridging group (1)

**AB-PG-1: `mirror-gallery` — The Figure Behind the Mirror** (4
rooms, 2 in A and 2 in B — spans connection-node #6)

- **Rooms**: A-side: A.3.x *The Angled Glass*, A.3.y *The Mending
  Table's Mirror*. B-side: B.3.x *The Mirror Antechamber*, B.4.y
  *The Half-Silvered Door*.
- **Mechanic** (per T110): the Figure Behind the Mirror gnome
  (§7) appears in every member room. Her commentary accumulates
  across visits in either world — she references rooms from the
  other world's member set if the player has visited them. The
  weaver *guarantees* traversal of members from both worlds
  before the exit condition fires (per T110's bridging rule). Hops
  A↔B happen via the group's own `bridgeNodes` (specifically
  connection-node #6), not the general connection-node pool.
- **Solution**: the Figure makes an accusation specific to the
  player's memory state (accepted-count, rejected-count, etc.);
  the player must `ACCEPT` the accusation from any member room.
  Solution fires `state.acknowledged = true`; the Mirror Figure
  appears one more time in the closing chamber to confirm.
- **Narrative justification**: this is T110's marquee bridging
  group. The Figure is the player seen from outside both worlds —
  the self that watches both the past-singular self and the
  future-plural self commit the argument. A bridging group for a
  bridging gnome.
- **Entry**: seeded; any A.3 or B.3 member room can enter.
- **Exit**: player ACCEPTs the accusation, or reaches a closing
  chamber without doing so (in which case the Figure's closing
  appearance calls out the unacknowledged accusation and marks
  the walk as a Questioner's walk).

### 6.4 Deferred puzzle kinds

Two kinds from T110 are not authored in the first pass:

- **`false-premise-cascade`** — accepting any premise in member
  rooms sets a flag; a later conclusion room renders differently
  per accumulated flags. Deferred because the cascade mechanic
  requires conclusion-room authoring to thread through 4+ flag
  states, which risks diluting Act II's prose density. Candidate
  for a second-pass addition in A.3 or B.2 after playtest
  confirms the first five puzzles hold.
- **`dual-premise-test`** — two sibling premise rooms, one in A
  and one in B, presenting the same logical move under opposing
  aesthetics; solution requires REJECT one, ACCEPT the other.
  Deferred because this mechanic has the highest prose-craft bar
  (both rooms must make the logical equivalence legible without
  stating it) and we should not author it until the simpler
  bridging group (`mirror-gallery`) is playtested. Candidate for
  second-pass addition anchoring a third connection-node.

### 6.5 Puzzle-group totals

| Group | Kind | Binding | Rooms | Claimed from |
|---|---|---|---|---|
| A-PG-1 | `regress-spiral` | world-locked (A) | 3 | A.2 (1) + A.3 (2) |
| A-PG-2 | `twisty-little-maze` | world-locked (A) | 5 | A.6 (5) |
| B-PG-1 | `circular-trap` | world-locked (B) | 3 | B.1 (1) + B.2 (2) |
| B-PG-2 | `self-reference-recursion` | world-locked (B) | 4 | B.6 (4) |
| AB-PG-1 | `mirror-gallery` | world-bridging | 4 | A.3 (2) + B.3 (1) + B.4 (1) |
| **Totals** | | | **19 rooms across groups** | **(body-room pool; no budget extension)** |

Of the 26 body rooms per world: A contributes 10 to groups (A-PG-1
= 3, A-PG-2 = 5, AB-PG-1 A-side = 2); B contributes 9 to groups
(B-PG-1 = 3, B-PG-2 = 4, AB-PG-1 B-side = 2). The remaining body
rooms (16 in A, 17 in B) are non-group rooms, authored
independently.

---

## 7. Gnome ecology

T108 specifies 5 gnomes. Meso commits each to a world affinity,
region affinities, and (where applicable) a puzzle-group anchor.

### 7.1 The cast, placed

| Gnome | World affinity | Primary regions | Bridging? | Puzzle-group anchor |
|---|---|---|---|---|
| The **Scholar-Mouse** | A (primary) | A.2 The Stacks; lectern also in B.2 | A-leaning with a single B cameo | none (atmospheric) |
| The **Tautologist** | A (primary) | A.4 The Cellar; reflection in B.4 | A-leaning with a single B cameo | none (she haunts closings) |
| The **Strawmen** | B (only) | B.1 Antechamber of Findings | no | none (atmospheric) |
| The **Chorus of Mumbling Footnotes** | B (only) | B.2 The Terrace (stairwells below) | no | none (atmospheric) |
| The **Figure Behind the Mirror** | Bridging (A + B equally) | A.3, B.3, B.4 | yes | **AB-PG-1** (anchors the `mirror-gallery` group) |

### 7.2 Affinity rationale

- **Scholar-Mouse in A, not B.** She misattributes authorities;
  this reads naturally in A's archive-of-your-own-writing register
  (she misattributes things to authors whose names are in your
  card catalogue). Her B cameo is at the Scholar-Mouse Lectern
  connection-node (§5, node #4) — the single room where a mouse
  no one sees misattributes aloud, which reads differently in B's
  ceremonial register (the citation is made by the *assembled*,
  not by a visible scholar).
- **Tautologist in A, reflection in B.** Her repeating sentence
  ("…and therefore it is true because it is true, *as I was
  saying*") is quintessentially singular-past — World A's register.
  In B.4's Hall of Mirrors, she is visible only as a reflection,
  finishing her sentence behind the glass. That reflection is
  her bridging moment; she never physically crosses.
- **Strawmen in B only.** Their malformed-argument mirroring is a
  tribunal trope — the thing a ceremonial court does to positions
  it is about to rule against. In A's private archive, they would
  be out of register (A is not adversarial; A colludes with you).
- **Chorus of Mumbling Footnotes in B only.** Their fragments of
  "famous dismissed rebuttals" are a B-register conceit — the
  public dismissals of argument, not the private filing. In A,
  dismissed rebuttals go into the Archive of Private Papers, not
  a chorus.
- **Figure Behind the Mirror, bridging.** She is T108's designated
  bridging gnome. Her commentary references accepted/rejected/
  questioned counts — a cross-world accumulation. She anchors
  AB-PG-1; her memory is the puzzle.

### 7.3 How the gnomes interact with closings

A closing chamber may contain **at most one gnome appearance**,
consistent with the closing-chamber's synthesis duty. The rules:

- **Tautologist** appears in A's closing chambers on Acceptor and
  Questioner walks (her sentence finishes during the closing in
  those cases). She does not appear in Rejector or Tracer closings.
- **Strawmen** may appear in B's closings on Rejector walks only —
  a malformed reflection of the player's refusals.
- **Figure Behind the Mirror** appears in *any* closing chamber
  of *either* world if the player entered AB-PG-1 but did not
  solve it. This is her terminal callback.
- **Scholar-Mouse** and **Chorus** do not appear in closings.

---

## 8. Pacing density curve

The ~30-room woven walk maps onto macro's three-act rhythm (Act I
turns 1–4, Act II turns 5–12, Act III turn 13+). Meso's density
curve specifies which regions contribute to which act, how
connection-nodes cluster, and where puzzle groups land.

> **Note — turns vs rooms:** Macro's act boundaries are defined in
> *turns* (player inputs), while meso's density table below uses
> *rooms visited*. The two counts diverge because a single room can
> consume multiple turns (LOOK, EXAMINE, puzzle dwell, backtracking),
> and some turns produce no room transition at all. Empirically, ~5
> rooms fall in Act I (turns 1–4) because early rooms generate more
> LOOK turns per room; Act II and III compress to closer to 1 turn
> per room as the player becomes fluent. The room ranges below are
> calibrated to this expected compression curve.

### 8.1 Density curve, per-walk expected

| Phase | Expected room count | Regions active | Connection-nodes available | Puzzle-groups possible |
|---|---|---|---|---|
| **Act I** (rooms 1–5) | 5 | A.1 / B.1 (entry); sometimes A.2 / B.2 | Nodes #1, #2, #8 (entry + early) | None (groups are Act II+) |
| **Act II** (rooms 6–20) | ~15 | A.2–A.4, B.2–B.4; side regions A.6, B.6 reachable | Nodes #3–#7 (mid-walk hinges) | All 5 groups reachable; expected 1 engaged per walk |
| **Act III** (rooms 21–30) | ~10 | A.4–A.5, B.4–B.5 (terminal regions) | Nodes #9, #10 (circular + closing) | Bridging group (AB-PG-1) still active if not solved |

### 8.2 Connection-node density pattern

Crossings are bursty-then-settled. The typical walk:

1. **Entry crossing** (rooms 1–3). One or zero crossings in Act I;
   the player establishes a primary world. Node #1 or #2 is
   usually the entry node.
2. **Middle crossings** (rooms 6–18). 2–4 crossings in Act II. The
   voice-event peaks here; the player learns the braid is a
   braid.
3. **Late crossing** (rooms 20–28). 1 crossing in Act III,
   typically node #9 (Circular Atrium) or node #10 (the terminal
   closing atrium). This is the crossing whose hinge sentence
   surfaces in the closing chamber.

Target: **3 ≤ crossings ≤ 7 in ≥ 90% of seeds**. Seeds outside this
range are not invalid, but the design is tuned for this window.

### 8.3 Puzzle-group density pattern

- **Act I**: no puzzle-group engagements. Groups are discoverable
  only from Act II onward.
- **Act II**: seed-determined entry to 0 or 1 groups. World-locked
  groups (A-PG-1, A-PG-2, B-PG-1, B-PG-2) are each reachable with
  ~30% probability per seed; bridging (AB-PG-1) with ~45%
  probability (because it straddles two worlds' entry points).
- **Act III**: the bridging group may still be unresolved and
  carry through; no new groups open.

### 8.4 Rhetorical pacing

Macro's DESIGN.md rhetorical type distribution maps to meso regions:

| Type | A region | B region | Expected visits per walk |
|---|---|---|---|
| premise | A.1, A.2 | B.1, B.2 | ~5 |
| conclusion | A.2 | B.2 | ~3 |
| definition | A.1, A.3 | B.3 | ~3 |
| analogy | A.2, A.3 | B.3 | ~3 |
| objection | A.3 | B.1 | ~3 |
| fallacy | A.4 | B.4 | ~3 |
| circular | A.4 | B.4 | ~2 |
| meta | A.3 | B.3, B.4 | ~3 |
| closing | A.5 | B.5 | 1 |
| **Total** | | | ~26 non-closing + 1 closing ≈ ~27–30 |

Pacing honors the Dijkstra-rhetorical-cost rules from DESIGN.md:
fallacy rooms are the path of least resistance, so Act II's middle
rooms drift naturally into A.4 / B.4; honest-argument rooms cost
more, so Act I holds longer at A.1 / B.1.

---

## 9. Closing-chamber count and variation strategy

### 9.1 The commitment

**4 closing chambers per world. 8 total across both worlds. Each
chamber is tuned to a distinct path-pattern.**

This resolves the macro §5.3 deferral by choosing the "family of
distinct chambers per pattern" option over the "conditional prose
inside fewer chambers" alternative.

| World | Path-pattern | Chamber name (authoring shell) |
|---|---|---|
| A | Acceptor | The Reading Room of Yeses |
| A | Rejector | The Reading Room of Noes |
| A | Questioner | The Reading Room of Margins |
| A | Tracer | The Reading Room of Returned Pages |
| B | Acceptor | The Observatory of Yeses |
| B | Rejector | The Observatory of Noes |
| B | Questioner | The Observatory of Margins |
| B | Tracer | The Observatory of Returned Findings |

### 9.2 Why distinct chambers per pattern (vs. conditional prose)

Three reasons, in order of load-bearing-ness:

1. **The four obligations (macro §5.1) are heavy.** Each closing
   must acknowledge the path, name the pattern, re-surface the
   hinge sentence, and re-read the premise. Doing four distinct
   jobs inside one shell of conditional prose produces a shell
   that reads as generic-when-stripped. Distinct chambers let
   each closing be load-bearing from first sentence.
2. **Replay value.** 8 distinct closings across 2 worlds means a
   player encounters 1 of 8 on their first run. It takes
   thoughtful replays to see all 8; a casual player will hit 3–4
   across several seeds. This matches the macro §5.3 guidance
   (enough variants that three replays do not exhaust).
3. **Authoring tractability.** Writing one excellent closing for
   the Acceptor's Reading Room is a discrete, scoped task a human
   author can complete in one sitting. Writing one closing that
   conditionally becomes all four requires branching prose that
   collapses under its own weight — the worst of both worlds
   (pun acknowledged).

### 9.3 Budget cost of 4 closings per world

4 closings × 2 worlds = 8 rooms committed to terminal prose. Each
world's 40-room budget already accounted for this in §1.1 and §2.3 /
§3.3. No budget reshuffling required.

### 9.4 Mapping from path-pattern to chamber

The engine's path-pattern classifier (macro §6 Engine requirement 2)
computes the dominant-verb class from the transcript. Canonical
thresholds (meso owes these to T99 per macro §6):

| Pattern | Dominant-verb threshold |
|---|---|
| Acceptor | ≥ 40% of rhetorical-verb events are ACCEPT |
| Rejector | ≥ 40% of rhetorical-verb events are REJECT |
| Questioner | ≥ 40% of rhetorical-verb events are QUESTION / ASK WHY |
| Tracer | ≥ 30% of rhetorical-verb events are TRACE BACK |

Ties are broken by priority order: Tracer > Questioner > Rejector >
Acceptor (the Tracer is the rarest and most structurally
interesting, so its threshold is lower and its priority highest).
A walk with no clear dominant pattern defaults to the Acceptor's
chamber (the most common baseline).

### 9.5 The four obligations, per chamber

Each of the 8 chambers, regardless of world or pattern, honors the
four §5.1 obligations. Example matrix — how obligation 1 (acknowledge
path) surfaces per chamber:

| Chamber | Path-acknowledgement flavor |
|---|---|
| A Acceptor | Margin-note names 2 rooms the player accepted in (e.g., "the Premise Hall's third column, the Analogy Gallery's western pair"). |
| A Rejector | Margin-note names 2 rooms the player rejected in; the right-column handwriting *defends* those rejections. |
| A Questioner | Margin-note cites 2 rooms the player questioned; each question is now entered as marginalia in the player's hand. |
| A Tracer | Margin-note marks the book's first page as *returned to three times*; names those three rooms. |
| B Acceptor | Finding naming 2 rooms the player accepted in; the finding *adds* those to its supporting body. |
| B Rejector | Finding naming 2 rooms the player rejected in; the refusals are read aloud and then entered as *dialectical contributions*. |
| B Questioner | Finding citing 2 rooms the player questioned; the questions stand as evidence of the court's openness. |
| B Tracer | Finding naming 2 rooms the player TRACE-BACK'd from; the tracing itself has been entered as a *supplementary ascent*. |

Similar matrices exist (and will be authored in micro) for
obligations 2–4.

---

## 10. ≥ 99% natural reachability plan

Macro §5.4 requires ≥ 99% natural reachability of some closing
chamber within the turn budget. The remaining ≤ 1% is handled by
the engine fallback (macro §6 requirement 4). This section explains
why the meso geometry delivers the 99% bar.

### 10.1 The turn budget

A seeded walk runs for **≤ 40 turns** before the engine fallback
fires. 30 rooms is the mean walk length (§1.2); 40 is the cap. The
~10-turn margin is slack for backtracking, puzzle-group dwell, and
dead-end exploration.

### 10.2 Geometric reachability

Four structural properties of the meso map deliver the 99% bar:

1. **Every region has a gravitational pull toward closings.** Both
   spines are linear: A descends toward A.5; B ascends toward B.5.
   Dijkstra weights (DESIGN.md's rhetorical-cost system) are tuned
   so that every region's *cheapest* exit is one step closer to
   its closing cluster. A random-walk bias on cheap edges produces
   a monotonic drift toward A.5 or B.5 over ≥ 20 rooms.
2. **No region cluster exceeds depth 4** (where *depth* is
   edges-from-entry, counting the entry room as depth 0). The
   deepest dead-end chain (A-PG-2 The Catacomb and B-PG-2 The
   Chamber of Self-Reference) has 5 and 4 rooms respectively;
   A-PG-2's 5 rooms span depths 0–4, and B-PG-2's 4 rooms span
   depths 0–3. Both have a guaranteed exit (A-PG-2 exit via
   marker; B-PG-2 exit via correct sequence). No region permits
   an infinite loop outside a puzzle group.
3. **Connection-node #10 is a universal basin.** The Reading Rooms
   Atrium / Inner Observatories Atrium connection-node is accessible
   from every Act III region (A.4, A.5, B.4, B.5). Any walk that
   reaches Act III has a closing-chamber exit available within 2
   rooms. Act III is explicitly the terminal act.
4. **Puzzle groups have bounded dwell.** Every puzzle group has a
   hard exit condition that fires within a provably-finite number
   of moves (per T110 state-machine spec). The longest expected
   dwell is AB-PG-1 (the bridging `mirror-gallery`) at ~6 rooms;
   the others dwell ≤ 5 rooms. Groups cannot absorb the budget.

### 10.3 The failure modes meso is guarding against

Three ways a walk could fail to reach a closing within 40 turns:

- **Stuck in a puzzle group**: mitigated by §10.2 property 4.
- **Stuck in a connection-node oscillation** (hopping A↔B without
  making spine progress): the PRNG's per-crossing roll is weighted
  *against* consecutive crossings on the same node; after a
  crossing, the next 2 rooms cannot re-cross via that node.
- **Stuck in Act II** (playing with middle-region content without
  descending): the Dijkstra weights' monotonic bias makes this
  statistically unlikely, but not impossible. The fallback (macro
  §6) catches this 1% case.

### 10.4 Reachability math (sketch; precise bounds in the weaver task)

Given:
- Mean walk length 30 rooms
- Max walk length 40 rooms
- Act III entered by room 20 in ≥ 95% of seeds (from the monotonic
  bias)
- Closing-cluster accessible within 2 rooms of any Act III room
- Puzzle-group dwell bounded at 6 rooms

The expected failure mode is a seed that simultaneously delays Act
III entry past room 20 *and* burns its remaining turn budget in a
puzzle group's longest-dwell tail. The two events are roughly
independent under the PRNG, and each is rare on its own; their
conjunction is the source of the ≤ 1% fallback population. Meso
does not promise a precise closed-form bound — the geometry above
is the *target* the weaver tunes to, not the proof.

The weaver task (T99 per macro §6) owes the empirical bound: a
**10,000-seed simulation sweep** verifying ≥ 99% natural closure;
the failing < 1% are surfaced as test fixtures for the fallback
router (macro §6 Engine requirement 4). If the sweep returns < 99%
naturally, meso re-tunes density curves and connection-node
placement until the bar is met.

---

## 11. Meso-to-micro handoff

Micro (`WORLDS-micro.md`) will consume this document and produce:

- **52 body-room bodies** (26 × 2 worlds).
- **20 connection-node bodies** (10 nodes × 2 worlds; each is a
  distinct authoring pass, the hinge sentence is shared).
- **8 closing-chamber bodies** (4 × 2 worlds), each honoring the
  four §5.1 obligations.
- **5 puzzle-group spec blocks** (A-PG-1, A-PG-2, B-PG-1, B-PG-2,
  AB-PG-1), including entry/exit conditions, state schema, and
  per-room prose variations.
- **5 gnome repertoires** (§7), including per-region line counts,
  memory-dependent variation for the Figure Behind the Mirror, and
  closing-chamber appearance rules.
- **A Zod schema sketch** validating the above at build time,
  including the `ConnectionNodeRoom` variant (two world-keyed
  bodies + shared hinge) and the `ClosingChamber` variant (four
  obligation slots + world + path-pattern + region).
- **3-4 fully-authored sample rooms per world** in the final JSON/
  TS shape (macro deferral §6 micro).

Micro does not modify meso's commitments (region names, counts,
hinge sentences, puzzle-group placements, gnome ecology, pacing
curves, closing-chamber count). Any proposed change to a meso
commitment returns to this document for review.

---

## 12. What meso does not answer

These are deliberate deferrals to micro:

- **Individual room bodies** — the prose for each of the 52 body
  rooms, 20 connection-node renderings, 8 closing chambers, and
  puzzle-group variations. This is micro's core labor.
- **Exit directions per room** — whose north / south / east / west
  connects to what. The regions and spines here are topological;
  micro commits them to the cardinal directions that best honor
  each room's geometry.
- **Verb-response bodies** — what EXAMINE, QUESTION, ASK WHY, etc.
  produce in each room. Micro authors per macro's VOICE.md
  examples and the voice tables in macro §3.
- **The Zod schema sketch itself** — deferred to micro per macro §6
  micro deferrals.
- **Authored prose for the two deferred puzzle kinds** — the
  `false-premise-cascade` and `dual-premise-test` groups remain
  unscoped pending second-pass authoring.

And to later engineering tracks:

- **The weaver's PRNG weights and oscillation-prevention math** —
  specified conceptually here (§4, §10); precise bounds and
  implementation in T99 per macro §6.
- **The path-pattern classifier thresholds** — proposed here in §9.4
  (40% / 40% / 40% / 30% with Tracer-first tie-breaking); precise
  tuning in T100 per macro §6 (classifier lives in reducer).
- **The engine fallback router** — specified conceptually here
  (§10.3 failure-mode catchment); implementation in T99.

---

## 13. The meso commitments

Short list of the things meso has committed to. Any change to any
of these requires amending this document (and may cascade to
macro):

1. **40 rooms per world**, broken down as 26 body + 10 connection-
   node + 4 closing.
2. **5 regions per world** plus 1 side region each for a puzzle
   group. Body-room totals match (26 each); per-region body counts
   differ by at most one room to accommodate the differing puzzle-
   group sizes (`twisty-little-maze` = 5 rooms, `self-reference-
   recursion` = 4 rooms).
3. **10 connection-nodes** enumerated in §5.2, each with a single
   hinge sentence written to be grammatical in both registers.
4. **5 puzzle groups**: 2 world-locked in A, 2 world-locked in B,
   1 world-bridging. Two T110 kinds deferred to second pass.
5. **5 gnomes placed** per §7.1: 2 A-resident, 2 B-resident, 1
   bridging. Each gnome's closing-chamber appearance rules are
   spelled out.
6. **4 closing chambers per world**, distinct per path-pattern, 8
   total. Distinct chambers chosen over conditional prose.
7. **Path-pattern classifier thresholds** proposed at §9.4 for the
   engine to implement.
8. **≥ 99% natural reachability** by geometric design (§10),
   leaving ≤ 1% to the engine fallback.

Once these 8 commitments hold on the page, the micro layer can
begin writing bodies.
