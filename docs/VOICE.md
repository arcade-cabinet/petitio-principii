---
title: Voice
updated: 2026-04-20
status: current
domain: creative
---

# Voice

Concrete examples of in-game narration for every rhetorical room type, across the three acts of [LORE.md](LORE.md). This document is the reference generators (RiTa / Tracery chain templates) should write toward.

## Principles

1. **Second person.** Always addresses "you." Never "the argument says." The mind is narrating to itself.
2. **No fourth-wall breaks.** Never acknowledge the player, the screen, the seed, the "game." The mind does not know it is inside a game.
3. **Confident syntax, slipping certainty.** Act I is lucid. Act II hedges. Act III folds in on itself.
4. **Rhetorical vocabulary is real; content is surrealist.** The terms (*premise*, *syllogism*, *enthymeme*, *ad hominem*) are used correctly. What they describe is Dadaist.
5. **No emoji. No ASCII art beyond `==` for titles.** Monospace and Yesteryear do the work.

---

## Act I — "I remember this place." (turns 1–4 roughly)

### premise
> **== The Premise Hall ==**
>
> You stand in the Premise Hall. Columns of unjustified assumptions rise into darkness, each engraved with a statement that seemed obvious when you first set it down. One reads: *the lobster telephone is a natural consequence of nocturnal geometry*. You remember agreeing.

### conclusion
> **== The Conclusion Balcony ==**
>
> You step onto a balcony over nothing in particular. A statement is mounted on a plinth at the centre: *therefore the watch melts*. You cannot see what it follows from, yet the balcony is comfortable. You set down your coat.

### definition
> **== The Definition Antechamber ==**
>
> Brass dictionaries line the walls. The one on the lectern defines *nocturnal* as "that which is sometimes nocturnal." You decide this is sufficient. The chamber seems to think so too.

### analogy
> **== The Analogical Gallery ==**
>
> Paintings along the wall are hung in pairs. The curator has written *just as X is to Y* between each pair. You never meet the curator. You trust the arrangement.

---

## Act II — "Wait, I've been here before." (turns 5–12 roughly)

### premise (revisited after accept)
> **== The Premise Hall ==**
>
> You stand in the Premise Hall. The column you accepted last time is now centred, slightly taller than the others. Its engraving reads the same words in firmer type. The ones you rejected are there too, you think, behind the ones you accepted.

### fallacy
> **== The Fallacy Cellar ==**
>
> You descend into the Cellar. It is warmer here than the rest of the palace. Someone has left out a syllogism with the middle term missing; you find you already know how to complete it. You have always known how to complete it.

### objection
> **== The Objection Cloister ==**
>
> Monks walk the cloister in slow circles, reading from small books. Each book contains your own objections to the argument, phrased by someone else, answered by someone else, in a hand that is almost your own.

### analogy (revisited after question)
> **== The Analogical Gallery ==**
>
> You return. The curator's notes between the paintings are denser now, more certain. One pair that you questioned previously now has a paragraph beneath it defending the resemblance. You recognize the prose style.

---

## Act III — "Oh." (circular / meta rooms, late turns)

### circular
> **== The Circular Atrium ==**
>
> A rotunda with seven entrances and no exits, though you entered through one of them. The inscription on the floor reads: *the lobster telephone is a natural consequence of nocturnal geometry*. You recognize the phrase. You brought it here. You will find it here again.

### meta
> **== The Meta-Observatory ==**
>
> An observatory whose telescope is trained inward. Through the eyepiece you see yourself in the Premise Hall, setting down the assumption that will become the conclusion on the balcony that will justify this observatory. The mind remembers the argument it is currently making.

### meta (upon ACCEPT — the circle closes)
> You accept the argument.
>
> The conclusion you have accepted is identical to the premise from which you began.
>
> You have completed the circle. *Petitio Principii*.
>
> The argument was always about itself.

### circular (upon REJECT — the circle still closes)
> You reject the argument.
>
> The argument absorbs your rejection as a necessary dialectical moment and continues. The inscription on the floor is unchanged. You remember having rejected this before, and you remember rejecting the memory of having rejected it, and you suspect this too is part of the argument.

---

## Per-verb response templates

### QUESTION (act-dependent)

**Act I** — straightforward doubt, easily dismissed:
> You question the assumption. The room pauses, briefly. The assumption remains.

**Act II** — doubt generates reinforcement:
> You question the assumption. The room answers: *"the question itself presupposes what it questions."* You find this compelling. You remember finding this compelling.

**Act III** — doubt becomes the argument's ally:
> You question the assumption. The argument records your question among its premises. The question will later be cited as evidence that the conclusion is open to scrutiny, therefore sound.

### ASK WHY

> You ask: *why?*
>
> A voice that sounds like yours, older, says: *"because it follows."*
>
> You ask: *follows from what?*
>
> The voice says: *"from the premise."*
>
> You do not ask the next question.

### TRACE BACK (when the target is `circular` and `shortest = 1`)

> You trace back through the argument. You do not travel.
>
> You are already where you were going.

---

## Ending tones

### Player accepts in circular room (the expected end)

The closing narration should feel like resignation and recognition, not defeat. The argument has been *completed*, not *won*. The text above is canonical; audio resolves to the tonic of the current room's AudioTheme; the argument-map ring visibly locks shut (see DESIGN.md).

### Player accepts in meta room (a more lucid end)

> You accept the argument.
>
> You have been the argument. The argument has been you.
>
> There was no one else here.

### Player loops indefinitely without accepting

No explicit end. The game keeps running. Rooms gradually converge in tone — every room starts to sound like a circular room. The argument-map's edges all become pink. This is a valid play pattern and should not be framed as failure.

---

## Writing rules for generator templates

1. **Every template takes seed + roomId + visitCount + traitMask.** No template produces identical output for (same-seed, same-room, same-visit).
2. **Keep surrealist content from a fixed corpus.** Public-domain fragments (Carroll, Breton, Dada, pre-1929 US). Do not generate fresh surrealism — curate it.
3. **Rhetorical vocabulary must be used correctly.** A "petitio principii" is not a synonym for a fallacy in general; it is a specific one. RiTa's build-time POS check enforces the lexicon; the curator enforces the rhetoric.
4. **No NPCs.** Voices that speak to you are always *your own voice in another register*. Describe it that way or not at all.
5. **Descriptions are < 80 words.** You are not writing prose. You are composing a breath.
