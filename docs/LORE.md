---
title: Lore
updated: 2026-04-20
status: current
domain: creative
---

# Lore

> **The conceit:** The player is a mind re-entering an argument it once made, haunted by the shape of its own reasoning, discovering that every path of justification leads back to the premise it was trying to prove.

---

## The locus

Not a palace. A **mnemonic**. An act of remembering in motion.

The player's consciousness is inside an argument they once had — or are still having, or cannot stop having; time is unclear here. Each "room" is a **thought the mind keeps returning to**. Each "passage" is an **inference, a lateral move, a sleight of hand the mind once used to justify itself**.

The spatial metaphor isn't arbitrary. It's the classical **method of loci** — Cicero and Quintilian taught orators to anchor each step of a speech to a room in an imagined building, so they could *walk through* their arguments during delivery. *Petitio Principii* inverts the trick: the rooms exist **because arguments need architecture to feel solid**. Strip the building away and the argument collapses into what it actually was — a circle.

## Three bindings: debate ↔ memory

### 1. Arguments are *remembered*, not made

The player is never constructing the argument for the first time. They are *re-traversing* one they already concluded. That is why every room is already furnished, every passage already named, every seed reproducible. The seed determines which prior argument of yours you're remembering tonight. **REGENERATE** → remember a different one. **CUSTOM SEED** → specify an argument exactly.

### 2. Rhetorical moves ARE memory operations

| Verb | Literal meaning in the fiction |
|------|--------------------------------|
| `LOOK` | Glance over the memory as a whole |
| `EXAMINE` | Recall this thought in more detail — the description deepens |
| `QUESTION` | Doubt the memory — the room trembles, because memories get uncertain under scrutiny |
| `ASK WHY` | Trace causation — but every cause you find is another premise of your own |
| `ACCEPT` | Reconsolidate — the memory re-solidifies and the argument gets stronger |
| `REJECT` | Try to forget — but memories don't work that way; the premise persists, just differently |
| `TRACE BACK` | Follow the thread to its source (Yuka Dijkstra toward the circle) |
| `INVENTORY` | "You are carrying nothing but your preconceptions." Literal. |

### 3. Memory is unstable and self-reinforcing

Every revisit re-reads the room. Details you ACCEPTED grow prominent. Details you REJECTED fade. Details you QUESTIONED get *defended* — the argument shores itself up against your doubt. This is memory consolidation in computational form: **the more you engage with a thought, the more of *you* it contains**.

Runtime mechanism: each room entity in koota carries traits you've assigned through play (`WasAccepted`, `WasQuestioned`, `WasTracedThrough`, `VisitCount`). The RiTa/Tracery runtime grammar conditions on those traits — same seed, same player actions, same text. But different players' walks through the same seed produce different readings of the same rooms.

---

## The journey — three acts, no guide

The player is never told this structure. They discover it by playing.

### Act I — "I remember this place."

The opening rooms are lucid. EXAMINE gives clear descriptions. The argument introduces its premises. Exits go in four confident directions. The game feels like *Adventure*. You have HELP. You can LOOK.

This is the *method of loci* working as designed — the palace holds. You are walking through an orderly chain of reasoning.

### Act II — "Wait, I've been here before."

Rooms start referring to each other. A `conclusion` balcony says "this follows from what you saw in the Premise Hall" — and if you trace back to the Premise Hall, the premise has subtly shifted to make the conclusion follow. TRACE BACK sometimes leads to rooms you haven't visited yet, because the argument is **assuming its own conclusion**. Fallacy rooms get rhetorically cheaper in the Dijkstra weights (they already are, by design) — you find yourself drawn to them. The memory is becoming unreliable in a way that *feels reasonable*. That's the fallacy in action.

### Act III — "Oh."

Eventually you reach a `circular` or `meta` room whose description is **the premise you started with, worded slightly differently**. You can ACCEPT — and the game closes: the argument-map ring locks shut, the audio resolves, the crystal field shatters inward. Or you can REJECT and keep moving — but the next room absorbs your rejection as "a necessary dialectical moment" and the circle still closes. There is no WIN state. There is only the realization that *petitio principii* was never something happening **in** the game; it was the **shape of** the game itself.

---

## The voice

Second person. The mind addressing itself.

Never *"the argument says"* — always implicit, as if your own past reasoning is narrating to you. Tone: dignified, a little tired, faintly amused at its own stubbornness. The game never breaks the fourth wall to *explain* what it is doing. It just *is* the thing it's describing.

See [VOICE.md](VOICE.md) for concrete examples per rhetorical room type and per act.

---

## Why this is the right lore

Every system is **load-bearing** under this conceit:

- **ECS (koota)** — memories have addressable state. Rooms, passages, and transcript lines all carry traits that play assigns. Without an ECS, the "memory is unstable and self-reinforcing" mechanic degenerates to a pile of flags.
- **Graph search (Yuka Dijkstra)** — the argument has graph structure; TRACE BACK needs pathfinding through weighted edges (rhetorical cost). Fallacies are cheap; honest argumentation is expensive. The player's gravitational pull toward the circle is *encoded in the math*.
- **Generative text (RiTa + Tracery)** — memory is generative, not retrieved. Room descriptions are re-read each visit, with `VisitCount` + trait state threading into the grammar. Same seed + same acts → identical text (reproducibility). Different walks → genuinely different reads of the same rooms.
- **Audio (Howler + Panchout + Kenney)** — remembering has a *feel*. Each rhetorical type has a tonal centre; dissonance climbs toward fallacy and circular; the BGM *I Want to Believe* runs under the whole thing because that title **is** the fallacy in six words.
- **Crystal-field backdrop** — starlight is what memory looks like from inside. Strokes extend from the cursor because attention is what makes memory crystallize. Shatter on click because memory *shatters* when you press it hard.
- **Mobile form factor** — tapping at a surface in the dark, like pressing on the glass of a memory you can't quite enter. No keyboard because you are not *typing into* the memory; you are *pressing against* it.

Nothing here is decoration. Every primitive is a metaphor operating at full intensity.

---

## What the game is NOT

- **Not a puzzle.** No "correct" path. Accept, reject, trace, question — all are valid, all lead to the circle in different tonalities.
- **Not an encyclopedia.** Fallacy names are real; the *content* of each room is surrealist nonsense (Lewis Carroll, Breton, Dada). We are not teaching logic — we are playing with the shape of argumentation.
- **Not a branching narrative.** Same seed → same argument → same circle. Branching is a fiction of the illusion of choice inside an argument that was already decided.
- **Not procedural content.** The seed is deterministic. What varies is your *reading* of it, which is exactly what the game is about.

See [DESIGN.md](DESIGN.md) for the structural spec of rhetorical types and their mechanics.
