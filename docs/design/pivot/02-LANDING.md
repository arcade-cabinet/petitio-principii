---
title: Landing — Draggable Clock + Case File Panels
updated: 2026-04-21
status: current
domain: product
---

# Landing — Draggable Clock + Case File Panels

> The landing page *is* the case selector. A Victorian station-clock
> sits centered; its **hour hand is draggable**. As the player drags,
> case cards fade in and jiggle into two glass panels flanking the
> clock — six cases per side. The clock defaults to midnight; the
> first case is Midnight and is always the entry point on first visit.

---

## 1. Visual layout

```
 ┌──────────────────────────────────────────────────────────────┐
 │                                                              │
 │  ┌─────────────┐          ┌───────┐          ┌─────────────┐ │
 │  │   CASE 01   │          │   X   │          │   CASE 07   │ │
 │  │ ─────────── │          │       │          │ ─────────── │ │
 │  │  01 : 00    │          │  │    │          │  07 : 00    │ │
 │  │  HOLLOW     │          │  │    │          │  THE SEAL   │ │
 │  │  DAWN       │          │       │          │             │ │
 │  │ — Bierce    │          │  XII  │          │ — Gaboriau  │ │
 │  └─────────────┘          │       │          └─────────────┘ │
 │                           │       │                          │
 │  ┌─────────────┐          │       │          ┌─────────────┐ │
 │  │   CASE 02   │          │       │          │   CASE 08   │ │
 │  │  …          │          │       │          │  …          │ │
 │  └─────────────┘          │       │          └─────────────┘ │
 │                           │       │                          │
 │       (6 cards)           │ HERO  │       (6 cards)          │
 │                           │ CLOCK │                          │
 │  ┌─────────────┐          │       │          ┌─────────────┐ │
 │  │   CASE 06   │          │  VI   │          │   CASE 12   │ │
 │  └─────────────┘          │       │          └─────────────┘ │
 │                           └───────┘                          │
 │                                                              │
 │                  [ OPEN THE CASE ]                           │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
```

- **Left panel** holds cases 1-6 (hours 01:00 through 06:00).
- **Right panel** holds cases 7-12 (hours 07:00 through 12:00).
- **Centered clock** shows the currently-selected hour (default midnight = 12:00).
- Each panel is a **glass pane with a silver-inlay top header**:
  the header strip sits separated from the card bed by a fine silver
  line; the pane has subtle frosted translucence and a faint
  outer glow.
- A single **OPEN THE CASE** button, under the clock, enters the currently-
  selected case.

On mobile (portrait phones):
- Clock occupies the top ~50% of the viewport, smaller, still
  centered.
- Both panels become one horizontally-scrollable ribbon beneath the
  clock — 12 case cards in hour order. Dragging the clock highlights
  the matching card in the ribbon and scrolls it into view.

On landscape / tablet: desktop layout, scaled.

---

## 2. The clock

### 2.1 Anatomy

The existing hero clock (from `src/components/ui/hero-clock.tsx`) is
re-used structurally:

- Victorian station-clock face, Arabic numerals 1-12.
- Minute hand sweeps real-time (authentic tick).
- Hour hand is the **interactive control**.

Stays: the face, the numerals, the minute hand, the case, the
pediment, the silver styling.

Changes: the hour hand becomes draggable. Melt animation is removed
from the landing (it was for transitioning to the terminal; we now
transition via a different cross-fade — see §4).

### 2.2 Drag interaction

- **Default position**: 12:00 (midnight). The hand points straight up.
- **Grab**: mouse-down or touch-start on the hour-hand (or within a
  generous radius around it). Grabbed state lifts the hand out of
  its normal tint to a pale-gold accent, and slightly enlarges the
  hand tip.
- **Drag**: hand follows the cursor/touch around the clock face,
  computed as `atan2(dy, dx)` relative to the clock's center.
- **Snap**: on release, the hand snaps to the nearest hour (nearest
  30° wedge). Snap uses a cubic easing (200 ms) so it feels like the
  hand settles rather than jumps.
- **Direction-locked**: you can drag clockwise or counter-clockwise;
  there is no winding constraint. Midnight and noon both read as
  12:00 (the game does not distinguish them — only one set of 12
  cases exists).

### 2.3 What the drag does

For every hour the hand passes *through* during a drag, the matching
case card **fades in + jiggles** into its panel position. "Jiggle" is
a short (120 ms) spring-damped translate-Y-rotate-Z animation: 2 px
down, -3 deg rotate, then rest. Feel: a card being nudged into place
with a fingertip.

As the hand settles, the currently-selected card gets an accent
outline and a subtle levitation (1 px translate-Y-up, shadow softens).

If the player drags past the same hour twice (e.g. rotates a full
turn), the card fades in once and stays. Subsequent passes don't
re-jiggle the same card — that would be visual noise.

### 2.4 Always-anchored to midnight at first boot

Per §1, default position is midnight. Reason: Midnight is the story's
starting register. The player doesn't have to go find it; it's where
the clock lives when they arrive. This is also why "the first case"
and "the unlocked-by-default case" are the same case — they're the
case whose hour is the default.

---

## 3. The case cards

### 3.1 Contents of a card

```
┌──────────────────────────────┐
│ ~~~ 04 : 00 ~~~            ▲ │  ← silver-inlay header strip
├──────────────────────────────┤
│                              │
│  THE TUNDRA POST             │
│                              │
│  — Nikolai Semyonov          │
│    Arkhangelsk region, 1902  │
│                              │
│  "A dog barks and does not   │
│   stop."                     │
│                              │
└──────────────────────────────┘
```

- **Header strip**: hour (e.g. "04 : 00"), a tiny status indicator
  (▲ unlocked, ■ locked, ✓ completed at least once).
- **Body**: title, persona display-name + era, one-line flavor.
- Card corners: subtle silver rounded corners, 2 px radius.
- Glass surface: translucent over the panel background; faint
  noise texture overlay (1% opacity) to avoid plasticky uniformity.

Lock states:
- **Unlocked** (beta = only Midnight): full color, normal contrast.
- **Locked**: desaturated, body text reads *"— coming soon"*, header
  shows ■ instead of ▲.
- **Completed** (any ending reached): full color + small ✓ in the
  header strip. A completion indicator like a tally mark per ending
  reached would be a nice 1.0+ polish item (not v1).

### 3.2 Interaction

- Hovering a card (desktop) lifts it 2px and fades its glow up.
- Tapping a card selects it — equivalent to dragging the clock hand
  to that hour. The hand animates to the card's hour over 400 ms.
- Tapping an unlocked card a *second time* (or tapping OPEN) enters
  the case.
- Tapping a locked card does nothing mechanically; the card jiggles
  very slightly with a desaturated flash (not a negative-feedback
  buzz, just an acknowledgement). Persona era is still legible so the
  player knows what they're waiting for.

---

## 4. Entering a case

Sequence when OPEN is tapped on an unlocked case:

1. Selected case's card **expands and slides** toward the clock until
   it occludes the clock face (700 ms, ease-out-expo).
2. The card's body dissolves into white-ink, then fades to the
   terminal's dark-ink background (300 ms).
3. In the fade, the lazy-loaded db + embedding runtime initialize.
4. The terminal mounts with the first room's prose already rendered
   (no "loading…" state visible to the player). Minute hand stops
   being visible because the terminal overlays it.
5. A single persona-voice line echoes into the PAST zone: e.g.
   *"And another one."* (persona-specific; authored with the case).

Leaving a case (NEW GAME or a verdict landed, player taps back to
clock):

1. Terminal fades to silver-grey.
2. Landing fades in with the card **sealed**: the card's header now
   shows ✓; its body text changes from the flavor-line to a one-line
   *persona comment* authored per-verdict-valence (e.g. for a
   `mistaken/hollow` verdict: *"I won't sleep on that one."*). The
   card text carries the weight of the ending.

The card comment is **authored by the case author** per verdict. 6
verdicts × 12 cases × one comment each = ~72 lines, 12 of which
cover beta. Trivial authoring burden.

---

## 5. Files touched

- `src/components/ui/hero-clock.tsx` — gains draggable-hour-hand mode
  (prop-gated). Existing dual-mode: `mode="landing"` for the dragger;
  `mode="face"` for the purely-decorative in-terminal display (if we
  keep it; we probably don't in the pivot).
- `src/features/landing/` — new directory.
  - `LandingShell.tsx` — the two-panel layout + centered clock.
  - `CasePanel.tsx` — one glass pane (left or right).
  - `CaseCard.tsx` — a single card.
  - `useLandingState.ts` — hook with selected hour, unlock state,
    completion state (driven by the db but able to stub for tests).
- `public/landing-cards.json` — build artifact with 12 card specs.

No changes to the terminal layout. The case-file panel inside the
terminal is covered in `00-PIVOT-DETECTIVE.md` §4.

---

## 6. Accessibility

- Hour hand is keyboard-operable: Tab focuses it; ArrowLeft /
  ArrowRight steps by 30°; Enter commits to the nearest hour and
  highlights the card; Space (or Enter while a card is selected) is
  OPEN.
- Screen reader: clock has `role="slider"`, `aria-valuemin=1`,
  `aria-valuemax=12`, `aria-valuenow=<current hour>`. Reads as
  "clock hand, 12 o'clock, midnight case selected: A Voice Before Dawn
  by Harrison Drake."
- Each card is a keyboard-focusable button with a descriptive
  `aria-label` covering hour + title + persona + lock state.
- Reduced-motion: jiggles become instant fades; card slide-in
  becomes instant; drag still works, snap is instant.

---

## 7. What's removed from the current landing

- The daily-seed UI (today's seed text, incantation, regenerate,
  custom seed, copy-link).
- Any reference to "seed" in player-facing copy.
- The text-size + dyslexic-font switches move into a settings sheet
  accessible from the clock's cased pediment (small gear icon), so
  the main landing remains visually clean.
