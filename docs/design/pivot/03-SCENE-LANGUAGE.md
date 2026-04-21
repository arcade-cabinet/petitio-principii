---
title: SCENE — The Authoring Language
updated: 2026-04-21
status: current
domain: technical
---

# SCENE — The Authoring Language

> A purpose-built source format for detective memory-palace cases.
> Hand-written parser, no external grammar tool. Emits JSON IR that
> the db-builder normalizes + embeds + packs into `game.db`.

---

## 1. Why a DSL, not JSON/YAML

A case file declares a graph: rooms pointing at exits pointing at
rooms; clues pointing at claims via supports/contradicts; connections
requiring clues and yielding facts; verdicts requiring any of the
above. JSON makes the graph verbose and quotes-heavy; YAML makes it
whitespace-fragile. We want:

- **Named cross-references without quotes.** `supports claim:caller-was-here`
  reads cleanly; the parser validates the identifier exists.
- **Heredoc prose.** Room descriptions are paragraphs; triple-angle
  (`<<< ... >>>`) delimiters let authors write plain prose without
  escaping.
- **Tag lists as unquoted sets.** `tags { physical, indoor, warmth }`
  reads the way authors think.
- **Implicit "belongs to"**: a clue nested inside a room belongs to
  that room.
- **Comment syntax.** `# line comment` for authoring notes.

SCENE pays that ergonomic rent with ~800 lines of hand-written
tokenizer + parser.

---

## 2. Lexical grammar

- **Whitespace**: space, tab, CR, LF; insignificant except to
  terminate tokens.
- **Comments**: `#` to end of line. Ignored.
- **Identifiers**: `[a-z][a-z0-9-]*`. Case-sensitive, kebab-case
  convention.
- **Reference**: `<kind>:<id>` — e.g. `claim:caller-was-here`.
  `kind` is one of `clue|claim|fact|room|exit|verdict|connection|entity|persona|case`.
- **Tag**: `[a-z][a-z0-9-]*` inside a `tags { ... }` block, separated
  by commas.
- **Number**: `[0-9]+` or `0.[0-9]+` or `[0-9]+.[0-9]+`. Used for
  `hour`, thresholds.
- **String**: `"..."` with `\"` for escape. Used for short labels and
  display text.
- **Heredoc**: `<<<` opens, `>>>` closes. Content between is taken
  verbatim. Leading newline after `<<<` is stripped; common leading
  whitespace is stripped (same rules as Python textwrap.dedent).
- **Block**: `{ ... }`. Opens after a keyword + optional id.
- **List**: `[ elem, elem, ... ]`. Comma-separated. Trailing comma
  permitted. Elements are *strings*, *references*, *tags*, *numbers*,
  or *predicate-atoms* depending on context. The element type is
  fixed per keyword; the parser does not accept mixed-type lists.
  Examples:
    - string list: `phrases-in-prose [ "Evelyn", "her", "the woman" ]`
    - reference list: `from [ clue:receiver-warm, clue:perfume-faint ]`
    - predicate-atom list: `all: [ clue:receiver-warm, fact:she-was-alone ]`
    - number list: `intervals [ 0, 3, 7, 10 ]`
- **Keyword**: reserved words (see §3). Keywords are lowercase.

Operators:
- `->` exit target (`east -> hall`)
- `|` alternative in `on` clauses (`on examine thing:phone | thing:receiver`)
- `+` conjunction in `requires` / `connect from`
  (`from [ clue:receiver-warm, clue:perfume-faint ]`)

---

## 3. Top-level structure

```
case <id> {
  title       "..."
  hour        <0-11>
  one-line    "..."
  opens       room:<id>

  persona { ... }
  retorts { ... }

  named-entity <id> { ... }
  named-entity <id> { ... }

  room <id> { ... }
  room <id> { ... }
  ...

  connect <id> { ... }
  ...

  claim <id> "..."
  claim <id> "..."

  verdict <id> { ... }
  ...
}
```

Only one `case` per file. File names are `<hour>-<slug>.scene` by
convention: `00-midnight.scene`, `01-hollow-dawn.scene`, etc.

---

## 4. Block reference

### 4.1 `persona`

One per case. Persona is intrinsic to the case; not reusable.

```
persona {
  name         "Harrison Drake"
  era          "Los Angeles, 1946"

  biography <<<
    Discharged 1945. One lung half-useful since Anzio. Licensed as
    a private investigator in the state of California, June 1946,
    by lying on the health affidavit.
  >>>

  voice-notes <<<
    Short sentences. Dry. Never uses three words where two will cut.
    Similes drawn from weather, liquor, or machinery. Doesn't name
    women's clothing; notices how it hangs.
  >>>

  notices-first { physical-trace, posture, absence, weather }

  theme-chord {
    root        "A-flat-minor"
    intervals   [0, 3, 7, 10]        # minor-seventh
    instrument  "bowed-double-bass + muted-piano"
  }

  proximity-first  <<< Could feel this one sliding off the table. >>>
  proximity-middle <<< There's a version of this I didn't live. >>>
  proximity-late   <<< Somewhere she'd have said it quieter. >>>
  proximity-last   <<< This is it. I'm sure. That's the hell of it. >>>
}
```

### 4.2 `retorts`

A pool of in-voice lines. The runtime picks from this pool by knn
against tap-context for near-misses and idle beats.

```
retorts {
  retort {
    prose <<< Your own desk. The kind of mahogany that doesn't keep secrets. >>>
    tags { idle, furniture }
  }
  retort {
    prose <<< You want to ask about that, but the thought slips. >>>
    tags { near-miss }
  }
  retort {
    prose <<< Not everything that glitters is evidence. >>>
    tags { idle }
  }
  ...
}
```

Tags filter knn by role (`near-miss` vs `idle`).

### 4.3 `named-entity`

Declares a person, place, or object the player can tap in prose and
that isn't a clue or exit.

```
named-entity evelyn {
  kind         person
  display-name "Evelyn Carr"

  # Phrases as they appear in prose, used to seed hotspots at build.
  # The build scans prose for these and embeds each instance's context.
  phrases-in-prose [ "Evelyn", "Evelyn Carr", "she", "her", "the woman" ]

  # Verbs that apply when player taps one of these phrases.
  verbs { question, ask-why }
}
```

Pronouns like `she/her` are tricky — context-embedding usually
disambiguates correctly. Where it doesn't, the hotspot simply
doesn't fire (silent miss > firing wrong).

### 4.4 `room`

The central content unit.

```
room office {
  title "Your Office — 11:47 PM"

  prose <<<
    The phone had rung seven times before you answered.
    Seven felt like a number someone had counted.
  >>>

  # Spatial exits. `direction` uses the 10-direction set.
  exit east -> hall {
    prose "The door to the hall."
  }
  exit down -> alley {
    prose "You remember now — the fire escape. She must have gone that way."
    gate  { all: [ clue:receiver-warm ] }
  }

  # Clues. Nested under their home room.
  clue receiver-warm {
    on examine thing:phone | thing:receiver
    prose <<<
      The bakelite is still warm. She'd been holding it a while,
      counting rings.
    >>>
    hotspots [ "the phone", "the receiver", "bakelite" ]
    tags     { physical, indoor, warmth }
    supports claim:caller-was-here
  }

  clue perfume-faint {
    on examine thing:chair
    reveal { clue:receiver-warm }   # only surfaces after receiver-warm in file
    prose <<<
      Jasmine. Or something pretending to be. You remember the
      specific wrong-note.
    >>>
    hotspots [ "the chair", "jasmine", "perfume" ]
    tags     { olfactory, memory }
    supports  claim:it-was-evelyn
    contradicts claim:a-stranger
  }

  clue fire-escape-print {
    on examine thing:window
    reveal { clue:receiver-warm }
    prose <<<
      A half-print on the sill. Small. Heel, not sole.
    >>>
    hotspots [ "the sill", "the window", "half-print" ]
    tags     { physical, revealed, footprint }
    supports claim:she-left-via-escape
  }
}
```

`hotspots` is the phrase list the build uses to seed vec-tables.
Phrases must appear somewhere in the room's prose (parser validates
with a warning on mismatch — not an error, because phrasing may
differ from display).

`on` declares the verb+thing that makes this clue fire. `thing:` is
a tag that the build canonicalizes; it doesn't have to match a
declared named-entity.

### 4.5 `connect`

Combines clues/facts/claim-states into a new fact.

```
connect she-was-alone {
  from [ clue:receiver-warm, clue:perfume-faint ]
  yields fact:she-was-alone
  prose <<<
    Together: warm phone, fading jasmine. She was alone, and recent.
  >>>
}
```

When all `from` references are true in the case file, the connection
fires once; its prose posts to the transcript and `yields` becomes
true. Firing a connection is **manual** — the player must select two
clues in the Case File panel and tap TRACE BACK. The author has
authored the connection; the player performs it.

### 4.6 `claim`

One-liner form for claims — they rarely need more.

```
claim caller-was-here      "Someone used this phone tonight."
claim it-was-evelyn        "It was Evelyn, not a stranger."
claim a-stranger           "It was someone you don't know."
claim she-left-via-escape  "She left by the fire escape."
```

### 4.7 `verdict`

The endings.

```
verdict she-came-and-went {
  requires {
    all: [
      claim_state:it-was-evelyn       @ accepted,
      claim_state:she-left-via-escape @ accepted
    ]
  }
  moral  unsettled
  atmos  quiet
  prose <<<
    You close the case in the way you can close a case like this —
    which is to say, not really.
  >>>
  card-comment "I let that one go home."
}

verdict you-never-heard-the-phone {
  requires {
    all: [ claim_state:caller-was-here @ rejected ]
  }
  moral  mistaken
  atmos  hollow
  prose <<<
    The phone hadn't rung. You had. You'd been counting.
  >>>
  card-comment "I won't sleep on that one."
}

verdict she-was-here-and-gone-before-you-woke {
  requires {
    all: [
      fact:she-was-alone,
      examined:fire-escape-print
    ]
  }
  moral  vindicated
  atmos  warm
  prose <<<
    You let yourself remember why she came, and why she left,
    and the difference between those things.
  >>>
  card-comment "That one stays where I put it."
}
```

`@ accepted | rejected | left-open` attaches a required state to a
claim reference. `examined:<clue-id>` checks whether the player has
examined that clue at least once.

`card-comment` is the one-line persona-voice string that replaces the
case-card's flavor-line on the landing after this verdict is landed.
Per `02-LANDING.md` §4.

---

## 5. Predicates — `gate`, `reveal`, `requires`

All three use the same predicate grammar, emitted as JSON (see
`01-ARCHITECTURE-DB.md` §5).

```
# gate: "what must be true for this exit/clue/whatever to be available"
gate { all: [ clue:receiver-warm ] }

# reveal: shorthand for "this is a clue whose existence is gated" —
# mechanically identical to gate, stylistically separate for authors.
reveal { clue:receiver-warm }

# requires: "verdict/connection requirements"
requires {
  all: [
    clue:receiver-warm,
    any: [ fact:she-was-alone, claim_state:it-was-evelyn @ accepted ],
    none: [ fact:you-hallucinated-the-call ]
  ]
}
```

Primitives inside a predicate:
- `clue:<id>` — has the clue been discovered.
- `fact:<id>` — has the fact been formed.
- `claim_state:<id> @ <state>` — has the claim reached this state.
- `examined:<id>` — has the player examined this clue (stronger than
  just-discovered; some clues can be in the file without the player
  having opened them).
- `visited:<room-id>` — has the player entered this room.
- `visits_gte:<room-id>:<n>` — has the player entered this room N+ times.
- `examined_gte:<id>:<n>` — has the player examined this clue N+ times.

Combiners: `all: [...]`, `any: [...]`, `none: [...]`, nestable.

---

## 6. Validation / linting

The parser's second pass is a linter with these rules:

- Every reference (`clue:`, `claim:`, `fact:`, `room:`, `exit:`,
  `verdict:`, `connection:`, `entity:`) resolves to a declared
  identifier in the same case.
- Every `hotspots` phrase appears as a substring in the enclosing
  room's prose (warning on mismatch).
- Every room is reachable from `opens` (warning on orphans).
- Every clue's `supports` and `contradicts` claim exists (error on
  dangling).
- Every verdict is reachable by *some* combination of gate-passing
  choices (warning on unreachable verdicts — informational only;
  author may intend an impossible verdict as a joke or red herring).
- No verdict has `requires` that contradicts itself (e.g.
  `accept:X + reject:X`).
- Persona's `notices-first` tags intersect non-trivially with
  retort/clue tags (warning — "this persona won't notice what it's
  written for").
- Retort count is in author-specified bounds (default 40-120 —
  warning on either side).
- `hour` is unique across the 12 cases in `scene/cases/`.

Linter runs as part of the build and as a pre-commit hook.

---

## 7. Parser architecture

One pass, no backtracking. Recursive-descent. ~800 LOC estimate.

```
tools/build-game-db/parse/
  tokenizer.ts      ← character stream → token stream
  parser.ts         ← token stream → AST
  ast.ts            ← AST types
  normalize.ts      ← AST → IR (resolve refs, denest, flatten)
  lint.ts           ← IR linter
  index.ts          ← public: parseSceneFile(path) → IR
```

Error messages are the number-one user-experience concern. Every
error has:
- source path
- line + column
- single-line "here is what I expected" diagnostic
- multi-line excerpt with caret underline
- suggestion ("did you mean …?" on unresolved refs via Levenshtein)

---

## 8. Example: the full Midnight file

See `scene/cases/00-midnight.scene` (will be authored during the beta
pass). Sketched-not-authored contents are in this doc's examples.

---

## 9. Editor support

v1: textmate-grammar for VS Code (`tools/scene-syntax/`). Syntax
highlight + basic code folding. A language-server with goto-definition
for references is a nice-to-have for 1.0+.
