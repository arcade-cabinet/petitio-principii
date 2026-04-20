---
title: UX
updated: 2026-04-21
status: current
domain: product
---

# UX — the shape of reading

> A wall of text is a wall of text. The argument doesn't have a map; it has a
> shape. That shape is time.

The terminal display is the game's only window on the argument. Everything
else (the argument-map overlay, the keycaps) exists in service of it. This
document specifies how the display turns the transcript — which will grow
unboundedly across a session — into a surface a player can still read after
the fifth room.

The target is **not** a chat log. The target is a reading surface where
**the player's attention always rests on the present**, the **recent past**
remains retrievable without scrolling, and the **future** (what's about to
happen) is telegraphed by the keycap row.

---

## 1. The three zones

The display is divided into three vertical zones, in this top-to-bottom
order:

```
┌───────────────────────────────────────────────┐
│  PAST   (compact, dim, scrollable upward)     │  ← ≤ 30% height
│  ─────────────────────────────────────────    │
│                                               │
│  PRESENT (large, luminous, center-focus)      │  ← flexes to fill
│                                               │
│  ─────────────────────────────────────────    │
│  FUTURE (keycap row + direction silhouettes)  │  ← ≤ 25% height
└───────────────────────────────────────────────┘
```

### 1.1 PAST — the compacted memory

The PAST is a scrollable rail of **compacted** turn summaries. A "turn" is
every transcript block emitted between two player inputs — description +
response + any spacer lines.

- Styling: `VT323`, `0.85rem`, `var(--color-dim)`, line-height 1.3.
- One-line summary per turn, truncated with an ellipsis at ~72 chars.
  - Movement: `→ The Rotunda`
  - Verb: `? Rotunda · you questioned`
  - Terminal: `✓ accepted (circle closed)`
- Prefix glyphs (`→ ? ✓ ✗ ·`) give the rhetorical shape of the walk at a
  glance — they echo the argument-map node colors.
- Scroll is opt-in (scroll wheel / touch drag); on every new turn the view
  **pins to the bottom** so the most recent compacted turn is always flush
  against the present zone.
- When the past is empty (turn 0), this zone collapses to zero height and
  the present fills the space.

### 1.2 PRESENT — the breathing slot

The PRESENT is the current room — and **only** the current room. This is
what the player is inside of.

- Top slot: the room's title in `Yesteryear` at `clamp(1.4rem, 3vw, 1.8rem)`
  with the violet/pink dual text-shadow already used in the reference
  glowing-card.
- Middle: the **latest description paragraph** — flattened from the grammar
  at (seed × roomId × visitCount × memory). The description grows taller
  as the player revisits (Acts II→III accrue ack clauses), but the layout
  never adds a second paragraph to the PRESENT zone. Each arrival
  overwrites.
- Below the description: the **latest agent response**, if any — the result
  of the player's most recent verb in this room. Same visual weight as the
  description; separated by a thin `var(--color-panel-edge)` rule.
- No "Exits:" line inside the prose. Exits are communicated by the keycap
  silhouettes in the FUTURE zone (T51). A description that says "you see
  two arches, east and west" is fine — narrative — but a literal
  `Exits: EAST, WEST` menu is forbidden here. T48 strips it from
  `describeRoom()`.
- The PRESENT zone scrolls **internally** only if the description + response
  overflow its height — never as a side-effect of transcript growth.

### 1.3 FUTURE — the telegraphed next act

The FUTURE zone is two rows:

1. **Rhetorical verbs** (Look, Examine, Question, Ask Why, Accept, Reject,
   Trace Back) — always visible, always present. Emphasis varies (T50):
   - `primary` — the verb most plausibly useful here (pulse + violet ring).
   - `charged` — available and meaningful (normal).
   - `calm` — technically available, unlikely to matter (dim).
   Keycaps **never vanish** — fewer keycaps was the wrong direction. The
   palette decides what the player notices, not the count.
2. **Directions** — N/S/E/W/Up/Down/Back/Fwd. Unavailable directions
   become **silhouettes**: the keycap still occupies its grid slot (so the
   layout doesn't jitter when exits change), but the label dims, the icon
   drops its opacity, and the cap becomes unpressable. T51.

Directions the player has **already traversed** pick up a subtle trailing
glow in the argument-map color of the destination room — a one-bit hint
that "you came from here." This is the UX half of the argument-map's
geometry.

---

## 2. Turn anatomy

The reducer emits multiple `OutputLine` entities per player input. The UI
layer projects them into the zones above. A single turn, in the transcript
model, is a **contiguous range of output lines** stamped with a shared turn
id; T47 adds the `TurnMark` trait that makes this projection trivial.

```
turn 17:
  kind: echo   "> question"
  kind: title  "The Rotunda of Seven Entrances"
  kind: line   "The floor says so: the slithy toves did gyre..."
  kind: line   "The rotunda pauses, briefly. The assumption remains."
  kind: spacer ""
```

The PAST compactor takes a turn and yields exactly one summary line,
deterministically. Compaction rules, by priority:

1. If the turn contains an `echo` of a movement verb (`north`, `south`, …,
   `back`, `forward`) → `→ <room-title>` where the title is the *new*
   current room (the post-movement one).
2. If the turn contains an `echo` of a rhetorical verb (`accept`, `reject`,
   `question`, `ask why`) → `<glyph> <room-title> · you <verb>ed` where
   the glyph is the verb's argument-map color-glyph.
3. If the turn contains no echo (system-emitted turn — start of game,
   hint) → the first non-title line, truncated.

**Key invariant:** the compactor reads only from the transcript. It never
re-invokes the grammar. That keeps determinism tight (a turn compacts the
same way on every re-render) and keeps runtime cost proportional to the
length of the transcript, not the depth of generation.

---

## 3. Responsiveness

### Portrait / ≤ 640px (phone)

- PAST: 5 lines visible, scroll for more. Header = `Petitio Principii`
  shrinks to `1.6rem`.
- PRESENT: fills the middle, body font `1rem`.
- FUTURE: verbs wrap to 2 rows; directions wrap to 2 rows. Keycaps are
  `48×48px` minimum (WCAG touch target).

### Landscape / 640–1024px (tablet)

- PAST: 8 lines visible.
- PRESENT: same; body `1.1rem`.
- FUTURE: verbs on one row, directions on one row.

### Desktop / > 1024px

- PAST: 10 lines visible. Argument-map overlay stays above the PAST zone
  with full horizontal space for the rail.
- PRESENT: body `clamp(1.1rem, 1.5vw, 1.25rem)`.
- FUTURE: verbs + directions fit on a single row without wrapping.

Nothing is hidden behind a hamburger. Every control the player can act on
is visible at every breakpoint. The only thing that changes is density.

---

## 4. Accessibility

- `aria-live="polite"` on the PRESENT zone so screen readers announce new
  descriptions and responses, but don't interrupt.
- `aria-atomic="true"` on the PRESENT so the description + response are
  read as one unit, not fragment-by-fragment.
- Every keycap has a visible label (letter or icon) AND an `aria-label`
  (full verb). Disabled direction silhouettes announce as
  `aria-disabled="true"` with a `title` of "not available here."
- Keyboard parity (already live): N/S/E/W, Arrows, U/D, L, X, Q, T, B.
  T51 adds `A` (accept), `R` (reject), `?` (ask why).
- Reduced-motion honoured via `motion-safe:` Tailwind modifiers on the
  pulse ring and any future transition effects.

---

## 5. What this replaces

Before T47/T48 the terminal emits every transcript line into a single
scrollable `<div>`. The result "works" but degrades to a chat log after a
dozen turns — the present gets lost, the player scrolls to find it.

After these tasks, the transcript keeps growing (so determinism tests still
operate on the full event log), but the UI **projects** it into past +
present every render. The koota world is the authoritative store; the UI
is a pure function of the store.

---

## 6. Rollout

| Task | Work |
|------|------|
| T47  | `TurnMark` trait added at the reducer boundary. `readTranscriptByTurn()` projection in `src/world/index.ts`. Tests guarantee each player input begins a new turn. |
| T48  | `TerminalDisplay` rewrites to read by-turn. PAST compactor lives in `src/features/terminal/compactTurn.ts` (pure, testable). `describeRoom()` loses the trailing `Exits: …` block. |
| T49  | Progressive onboarding hints (one per id, via `HintsShown` trait) emit into the PRESENT zone below the response on first-encounter turns. |
| T50  | `computeKeycapLayout` pure function — (context → keycap emphasis map). |
| T51  | TerminalDisplay keycaps consume layout; direction silhouettes. |
| T55  | RTL test covering the three-zone projection under a 10-turn scripted session. |

---

## 7. Non-goals

- **No animated transitions between turns.** The present replaces the
  present. Players should feel the *new* room, not watch the old one slide
  out.
- **No pagination of the PAST.** Scroll works; pagination adds a click
  without adding clarity.
- **No compact / expand toggle.** The layout is the compaction. Adding a
  toggle means both layouts must be designed well; only one needs to be.
- **No multi-panel split.** The argument-map is already a second surface;
  a third split would saturate attention.
