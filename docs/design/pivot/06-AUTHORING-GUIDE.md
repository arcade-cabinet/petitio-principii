---
title: Authoring Guide — Writing a Case
updated: 2026-04-21
status: current
domain: creative
---

# Authoring Guide — Writing a Case

> This is the guide for the human author (you, or a future
> collaborator) writing a new case from nothing. It reads as
> instruction, not as spec: "how do I actually sit down and write
> one of these." It is narrative on purpose. Spec-level detail lives
> in [03-SCENE-LANGUAGE.md](./03-SCENE-LANGUAGE.md).

---

## 1. Start with the cluster, then the voice, then the crime

A case is 90% a voice and 10% a puzzle. A voice is 90% **against** a
source-cluster synthesis and 10% yours to contribute. Start where
the work starts.

1. **Read the cluster's synthesis brief** at
   `authoring/briefs/<cluster-id>.md`. Read it slowly. Read the
   seed passages. Answer the ten authorial questions. Keep it open
   on your desk.
2. **Read one source in the cluster end-to-end.** Not to mimic it —
   to soak. Pick the source whose voice most surprises you.
3. **Now pick a person who is awake at this hour** inside the
   milieu the cluster names. That person is the detective.
4. **Write a single paragraph of their interior monologue** with
   nothing happening in it. No crime yet. Just them, in their
   place, at that hour, noticing something.
5. **Run `pnpm brainstorm check`** on that paragraph. It checks
   your paragraph against the cluster's embedding space. Goal:
   nearest cluster-sentence cosine distance ≥ 0.25. If your
   paragraph fails (< 0.18), you wrote too close to one source;
   revise. If it warns (0.18–0.25), consider revising. If it
   passes, the synthesis is happening. You have a starting voice.

This first paragraph is not part of the case file. It's the
paragraph the author keeps on their desk. Every time a line of
prose in the case is wrong, reread the brief, then reread this
paragraph.

**Read the test above strictly.** The sameness-check is not an
ornament. A case whose prose lives within 0.18 of any one cluster
source is a case that is paraphrasing, not synthesizing — and it
will read to readers as a cheap imitation of its nearest source.
The pipeline fails such prose on purpose. Revise until it passes.

---

## 2. The persona block

Once the voice is there, convert it into a persona block (the
`persona { ... }` in the SCENE file). The fields are:

- **name** — a name that fits the era and the character.
- **era** — city + decade (`"Los Angeles, 1946"`, `"Arkhangelsk
  region, 1902"`). Specific enough to google-check idiom.
- **biography** — three sentences. What they do; what they've lost;
  what they do about the loss. The last clause is the most
  important one.
- **voice-notes** — five bullets that any future collaborator
  reading your case should be able to recognize as yours. Syntax
  habits. Vocabulary restrictions. Rhythm. Subjects the persona
  dwells on.
- **notices-first** — a list of tags (`physical-trace`, `testimony`,
  `posture`, `absence`, …). Different personas notice different
  things; this list drives the embedding index that picks in-voice
  retorts.
- **theme-chord** — a root, an interval stack, an instrument. If
  you don't know music theory, write "a single note on a lone
  cello" and move on — the audio pass will interpret.
- **proximity-first / middle / late / last** — four one-liners the
  detective delivers after reaching an ending. First ending sounds
  *like the detective has suspected this was only one of several
  readings*. Last ending sounds *like there's nothing left behind
  the door*. Read these back in order and they should sound like a
  person relaxing into certainty, or giving up. Both readings are
  fine.

Write the persona block before any room. If you find yourself
writing a clue whose voice doesn't match the persona, the fix is
almost always *go back and reread the voice-notes*.

---

## 3. The shape of a case

A case has:

- **8-12 rooms** (loci of memory — not necessarily enclosed spaces;
  a dockyard is fine, a patch of tundra is fine).
- **~30 clues** across those rooms.
- **8-12 claims** — the specific propositions the detective might
  conclude.
- **3-5 connections** — authored combinations of clues that form
  facts.
- **6-9 verdicts** — the endings. Not all endings are *positive*; a
  good case has at least one ending where the detective got it
  *wrong* and may not know they did.
- **~80 retorts** in-voice.

Author in this order:

1. Persona.
2. **One paragraph: what is the memory of this case about?** Not for
   the game — for your desk. If you can't summarize in one
   paragraph, the case isn't ready to write.
3. The first room (the `opens` room). The detective's first
   sentence in this room is the *first* thing the player will read.
   Spend time on it.
4. The last room (the one containing the closing gestures). Write
   it next, before the middle. Knowing where you're walking to
   makes the middle honest.
5. Claims. Write the 8-12 things the detective might come to
   believe. Keep them declarative and short.
6. Verdicts. Each verdict is: a **valence pair** (moral + atmos), a
   **requirements predicate**, a **short prose block** in the
   persona's voice at the moment of closing, and a **card-comment**
   (the one-line that will replace the case-card's flavor-line on
   the landing afterward).
7. Middle rooms. Walk from the first room toward the last, adding
   rooms as the investigation requires. Each room carries 2-4 clues.
   Each clue belongs to the room it's in; clues reference claims by
   name.
8. Connections. Pick 3-5 places where two (or three) clues
   *together* say something neither says alone. Write the
   connection's prose as the detective's thought in the moment of
   recognition.
9. Retorts. Write ~80 short lines in the persona's voice.
   Categorize them: most are `idle`, a smaller fraction are
   `near-miss` (the kind a player triggers by tapping a word that
   doesn't quite hit any hotspot). The `near-miss` retorts are the
   funniest to write — they're the detective's internal "almost,
   not quite."

---

## 4. Rooms-as-remembered

When you write a room, write it **as memory**, not as place.
Specific tools for this:

### 4.1 Let the room change between visits

A room can have a *reveal-gated clue* — a detail that only surfaces
on second (or later) visit, once some other clue is in the case
file. This is not a puzzle-lock; it's memory. The detective *did
not see* the fire-escape print on the sill the first time — not
because it wasn't there, but because the fire escape did not yet
matter. On second visit, holding the fact that the caller was warm-
handed, the memory now includes the heel-print.

Use this liberally. It is the *Clue* (1985) mechanic, it is how
memory works, and it is the detective genre's native loop.

### 4.2 Write the prose to be tap-interactive

Every word in the prose can become a hotspot. The `hotspots` list on
each clue is the set of phrases that, when tapped (or anywhere near-
tapped in meaning), triggers that clue.

- **Name things you want the player to be able to ask about.**
- **Use unusual nouns.** Chairs are fine; *bentwood armchair* is
  more hit-able because its embedding is more distinctive.
- **Don't write like a text-adventure with nouns in all caps.** Just
  write normal prose; the tap model figures it out.

### 4.3 Use pronouns and periphrasis

The engine resolves *"she"* to the right entity by context-embedding.
Don't repeat proper nouns defensively. Write naturally; the vector
search will disambiguate.

### 4.4 Let some words lead nowhere

Every word is tappable. Many won't resolve to a hotspot. That's
*right* — it's the whole point of the hidden-hotspot design. If
every word resolved, the game would lose its readerly feel. Most
taps should miss softly; meaningful words that matter should hit.

---

## 5. Clues — format and voice

A clue has:

- **id** (kebab-case).
- **on** — the verb-plus-thing that reveals it. Usually
  `examine thing:<tag>`. Can alternate (`| thing:<other>`).
- **reveal** — optional predicate gating whether the clue exists at
  all this visit.
- **prose** — the detective's interior voice, 1-3 sentences. Should
  feel like a note in the detective's mind, not a description to a
  reader.
- **hotspots** — phrases as they appear in the room's prose.
- **tags** — descriptive tags for knn retrieval and for predicate
  filters.
- **supports** / **contradicts** — claim references.

Write clue prose **in second-person-detective-interior**:

```
prose <<<
  The bakelite is still warm. She'd been holding it a while,
  counting rings.
>>>
```

Not:

```
prose <<<
  You notice that the telephone receiver is warm, which indicates
  that someone has been holding it recently.
>>>
```

The first lands because the detective is inside the beat. The
second lands because a textbook is writing one.

---

## 6. Claims — short and falsifiable

A claim is a proposition that might be true. It should be:

- **One sentence, in the detective's voice.**
- **Either-or-able.** The player will either accept it, reject it,
  or leave it open. Claims that can't bear a verdict confuse the
  case-file UI.

Good: *"It was Evelyn, not a stranger."*
Bad: *"Something about the caller."*

---

## 7. Connections — the author's judgment

Connections are where the game earns its replay. Two clues, taken
together, yield a fact that neither clue implies alone. Examples:

- Receiver-warm + perfume-faint → **she-was-alone** (because the
  combination of fresh warmth and fading jasmine narrows the
  window).
- Fire-escape-print + absent-neighbor-dog → **she-left-before-midnight**
  (because the dog barks at strangers and wasn't barking).

Avoid connections that are mere redundant restatements ("A and B
together mean A-and-B"). Every connection should feel like *the
detective just had a thought*. If you can't write that thought in
two sentences of persona-voiced prose, the connection is weak.

Limit: 3-5 per case. More and the inference-graph becomes
combinatorial noise.

---

## 8. Verdicts — multiple, valenced, discoverable by play

The case needs **6-9 verdicts**. More feels luxurious, less feels
thin. Write them as follows:

### 8.1 Two axes per verdict

Pick one from each:

**moral:** `vindicated | unsettled | complicit | mistaken | evaded`
**atmos:** `quiet | cold | warm | bitter | hollow`

Good cases have a spread. Don't write five `vindicated/warm` endings
and one `mistaken/cold`. The shape of a case's verdict-space is part
of the case's meaning.

### 8.2 `requires` predicate

Use the smallest predicate that expresses *the trail that led here*.
Avoid overloading `requires` to work around absent mechanics. If a
verdict wants something the predicate grammar can't express, the
predicate grammar is probably missing a primitive — file an
engineering issue.

### 8.3 Verdict prose

150-250 words. **Lift one voice rule from the persona's notes and
break it deliberately** — verdicts are moments of shift; a persona
who speaks in short sentences all game should deliver their verdict
in one long one, or vice versa. Readers feel the break.

### 8.4 Card-comment

One line, post-verdict, that will sit on the case-card on the
landing forever after the player lands this verdict. Write these
last and write them short. *"That one stays where I put it."*
*"I won't sleep on that."* *"Some of it I made up."*

---

## 9. Retorts — in-voice ambient fill

The engine selects retorts by knn to fill dead air: a tap that
almost-but-not-quite lands a hotspot, an idle moment, a room visited
after every clue is gathered. Retorts save the author from having to
write reaction lines for every tap; instead you author a pool and
the engine fetches whatever fits.

Guidelines:

- **Length**: 1-2 sentences. Anything longer is a retort that should
  have been a clue.
- **Variety**: mix observational (`idle` tag), self-critical
  (`near-miss` tag), and pure atmosphere (`idle` tag, tagged also
  with a mood like `night`, `weather`).
- **Count**: aim ~80. Less than 40 and retorts repeat too often;
  more than 120 and the knn space thins.
- **No spoilers**: retorts must never contain information that
  would short-circuit a hotspot-gated reveal. The engine has no way
  to check this; the author has to.

---

## 10. The two gates before a case ships

A case passes **both** gates or it does not ship.

### 10.1 Sameness-check gate (mechanical)

```
pnpm brainstorm check scene/cases/<your-case>.scene
```

Every authored prose block must score `CLEAN` (cosine distance
≥ 0.25 to nearest cluster sentence). Warnings (0.18–0.25) require
author judgment and must be acknowledged in the PR description.
Failures (< 0.18) block the merge. No exceptions.

### 10.2 Blind-read gate (human)

Hand three paragraphs from the case to a reader who has not played
the game. Ask which cluster they are from (or which era / milieu if
they don't know your cluster). A reader who cannot tell they are
from a *specific* voice — distinct, yours, not Wikipedia-generic —
means the voice is not there and the case needs another pass.

The blind-read is the harder of the two gates. A prose block can
pass the sameness-check and still fail the blind-read (meaning:
it is distinct from the cluster's sources but without a voice of
its own). The sameness-check stops you paraphrasing; the blind-read
demands that you invent.

Both gates are mandatory.

---

## 11. Technical checklist before merging a case

- [ ] Cluster manifest has passed the sign-off gate
      ([05-BRAINSTORM-PIPELINE.md §7](./05-BRAINSTORM-PIPELINE.md)).
- [ ] Synthesis brief for this cluster exists at
      `authoring/briefs/<cluster-id>.md` and has been reread
      during authoring.
- [ ] `pnpm brainstorm check scene/cases/<case>.scene` passes with
      zero failures. Warnings are acknowledged in the PR description.
- [ ] `pnpm build-scene <path>` succeeds without linter warnings
      (or warnings are explicitly waived in the PR description).
- [ ] The case has ≥ 6 verdicts, spread across at least 3 distinct
      `moral` tags and at least 3 distinct `atmos` tags.
- [ ] Every claim is used in at least one verdict's `requires`
      predicate.
- [ ] Every clue eventually supports (or contradicts) at least one
      claim.
- [ ] The `opens` room has an exit to somewhere, and every room is
      reachable from `opens` by some combination of choices.
- [ ] Retort pool has at least 40 entries.
- [ ] Blind-read test has been performed with at least one human
      who has not read the cluster's source material.
- [ ] Maestro smoke flow `walk-<case-id>.yaml` exists and passes
      against the built APK on a booted emulator.

---

## 12. A word on deadlines

Don't ship a case you don't believe in. A thin case drags the game
down more than a missing case does. The clock has 11 locked cards
at beta; a player seeing a "— coming soon" is an invitation, not a
failure. A bad case is a refutation.
