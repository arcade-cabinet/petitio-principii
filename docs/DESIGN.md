---
title: Design
updated: 2026-04-20
status: current
domain: product
---

# Design

## What the game IS

A short, repeatable, seeded text adventure that simulates navigating a long-winded philosophical argument. The player reads, types commands, and eventually realizes the argument's conclusion is identical to its premise — that they have completed a circle of begging the question.

Every run is a single argument. Different seeds produce different nonsense but the same rhetorical shape.

## What the game IS NOT

- **Not a puzzle game.** There is no "correct" path. Accepting, rejecting, and tracing are all legitimate responses. The game observes what you did and narrates accordingly.
- **Not an encyclopedia.** The fallacy names and rhetorical terms are real; the content of each argument is surrealist nonsense. We are not teaching logic — we are playing with the shape of argumentation.
- **Not a branching narrative.** Rooms are generated procedurally per seed; the narrative is emergent from the order you visit them.

## Aesthetics

- **Visual:** old CRT teletype terminal overlaid on a memory-palace-in-the-night-sky backdrop. Twinkling silver stars against deep purples and blacks. Soft, slightly-out-of-focus phosphor glow on the text.
- **Auditory:** quiet, room-aware ambient pads. Each rhetorical space has a tonal centre; fallacies and circular rooms drift toward dissonance. Audio punctuates movement, not frame time.
- **Textual:** terse teletype output. Monospace (DM Mono / IBM Plex Mono). Uppercase room titles. Unicode dashes. No emoji, no ASCII art beyond section separators.

## Input

Commands are verb-led and accept many aliases:

| Intent | Canonical | Aliases |
|---|---|---|
| Move | `north`, `south`, ... | `n`/`s`/... or `go north` |
| Observe | `look` | `l` |
| Interrogate | `examine` | `x`, `inspect` |
| Doubt | `question` | `q`, `ask why` |
| Inquire | `ask` | |
| Concede | `accept` | `agree` |
| Deny | `reject` | `deny`, `refuse` |
| Unwind | `trace` | `trace back` |
| Meta | `help`, `new game`, `quit` | `?`, `h` |

Unknown input is silently treated as `examine` with the raw tokens as args — the game does not lecture the player for typing the wrong verb.

## The rhetorical types

Rooms belong to one of eight rhetorical categories, each with signature audio, colour bias, and narrative behaviour:

| Type | Disposition | Audio centre | What happens here |
|---|---|---|---|
| `premise` | stable | A3, clean | Opening assertions — things "given" without justification |
| `conclusion` | resolute | E4, clean | Claims that follow "therefore" |
| `definition` | clean | C4, slight waver | Fixes what a word means (often circularly) |
| `analogy` | ambiguous | D4, gentle waver | Reasons by resemblance (often a stretch) |
| `objection` | challenging | C♯4, tense | Pushes back on the previous step |
| `meta` | reflective | G♯4, pensive | The argument talks about itself |
| `fallacy` | tense | B♭3, dissonant | Invites a specific logical mistake |
| `circular` | unresolved | B3, heavily dissonant | Curves back to where the argument began |

Lower rhetorical cost in the Yuka graph = rhetorically seductive. Fallacy rooms are the path of least resistance; honest argumentation costs more. Accepting the argument in a `circular` or `meta` room is the implicit win condition — not because the player "solved" anything, but because they completed the figure.

## Pillars

See [pillars/narrative-and-nonsense.md](pillars/narrative-and-nonsense.md) for the philosophical stance on using surrealist corpora over encyclopedic ones.
