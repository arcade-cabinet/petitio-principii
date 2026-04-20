---
title: Architecture
updated: 2026-04-20
status: current
domain: technical
---

# Architecture

Petitio Principii is a single-page game organized as layered packages under `src/`. Each layer has a public barrel (`index.ts`) and internals that other layers never import directly. The UI is a thin React shell over a framework-agnostic game engine.

## Layer map

```
┌───────────────────────────────────────────────────────────────┐
│ src/app/main.tsx  →  React root mounts <App/> into #root      │
│ src/app/App.tsx   →  useGame() composition + CrystalField bg  │
└─────────────────────────────┬─────────────────────────────────┘
                              │
             ┌────────────────┴─────────────────┐
             │                                  │
   ┌─────────▼──────────┐                ┌──────▼─────────────┐
   │ @/features/…       │                │ @/components/ui/…  │
   │                    │                │                    │
   │ NewGameIncantation │                │ CrystalField       │
   │ TerminalDisplay    │                │ GlowingPanel       │
   │ ArgumentMapOverlay │                │ KeyCap             │
   │                    │                │ ArgumentMap        │
   └─────────┬──────────┘                └────────────────────┘
             │
             │   consumes
             ▼
   ┌────────────────────┐
   │ @/hooks/…          │
   │                    │
   │ useGame            │  wires engine + world + audio
   │ useWorld           │  owns koota + yuka lifecycle
   │ useAudio           │  Howler bus
   └──────┬─────────────┘
          │  calls  @/engine/applyCommand(state, raw, bridge, audio)
          │         which is framework-agnostic (WorldBridge + AudioSink)
          ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │ @/engine         │   │ @/world          │   │ @/content        │
   │                  │   │                  │   │                  │
   │ reducer          │   │ koota ECS        │   │ lexicon,         │
   │ ArgumentGraph    │   │ traits + systems │◄──│ templates,       │
   │ Parser           │   │ (PathfindingSys) │   │ corpus, grammar, │
   │ Narrative        │◄──│ buildWorld       │   │ GENERATED_CORPUS │
   │ GameState        │   │ appendOutput     │   │                  │
   │ audio-effects    │   │ readTranscript   │   │                  │
   │ AI agent         │   │                  │   │                  │
   └────────▲─────────┘   └──────────────────┘   └──────────────────┘

   ┌────────────────────┐   ┌────────────────────────────────────┐
   │ @/design           │   │ @/lib                              │
   │                    │   │                                    │
   │ globals.css        │   │ cn(), audio-manifest (SfxKey→URL)  │
   │ design tokens      │   │ mobile.ts (Capacitor boot)         │
   └────────────────────┘   └────────────────────────────────────┘
```

Arrow = "may import from." Cycles are disallowed.

## Layer responsibilities

### `@/engine` — pure game logic

No DOM, no React, no Howler, no koota. Deterministic given a seed. Everything is a pure function or a plain data type.

- **`applyCommand(state, raw, bridge, audio) → GameState`** — the verb reducer. Takes a `WorldBridge` (move player, append transcript line, find trace target) and an `AudioSink` (playSfx). Never touches koota or Howler directly — the hook that wires it (`useGame`) provides the bridges.
- **`ArgumentGraph`**, **`Parser`**, **`NarrativeGenerator`**, **`GameState`**, **`TranscriptEntry`**, PRNG (`createSeededRandom` / Mulberry32).
- **`audio-effects`**: the `SfxKey` intent vocabulary — engine emits semantic keys; UI's audio manifest maps them to files.
- **`ai/argument-agent`** (in progress): Yuka-backed `StateMachine` for the argument-as-opponent — replaces hardcoded response text with state-conditioned narration.

### `@/content` — data + text generators

Canonical nouns, adjectives, rhetorical terms, room/passage/fallacy templates, tracery grammars. The **build-time RiTa pipeline** (`scripts/build-corpus.ts`) POS-validates the lexicon, pluralizes, computes syllables, and emits a frozen `src/content/generated/corpus.ts` re-exported as `GENERATED_CORPUS`. Runtime never imports `rita`.

Surrealist chaining (in progress) adds a second generated corpus of public-domain fragments and a runtime seeded Markov chainer threaded through `describeRoom`.

### `@/world` — koota ECS

Owns the runtime world.

- `buildWorld(graph)` spawns one entity per room (`IsRoom` + `RoomId` + `RhetoricalSpace` + `AudioTheme`) plus the player (`IsPlayer` + `Position`).
- `appendOutput(world, kind, text)` spawns an `OutputLine` entity per transcript line — React keys on the koota entity id, making lines addressable gameplay state.
- `readTranscript(world)` projects OutputLine entities (sorted by ordinal) to a plain array for the UI.
- `PathfindingSystem` — Yuka `Graph` + `Dijkstra` for shortest-path queries over the rhetorical graph. Edge weights come from destination rhetorical type: fallacies and circular passages are *cheap* (rhetorically seductive), honest argumentation is expensive.

### `@/hooks` — React lifetime

- **`useGame`** — composition: holds `GameState`, delegates to the engine's `applyCommand`, translates the reducer's `WorldBridge` calls into `useWorld` operations and `SfxKey` emissions into `useAudio` calls. Thin.
- **`useWorld`** — owns the koota World + Yuka pathfinding cache across startGame / requestNewGame. Implements the engine's `WorldBridge` interface.
- **`useAudio`** — Howler-backed bus. Module-level `Howl` cache for SFX, singleton BGM with fade-in, mute preference in localStorage, prefers-reduced-motion damping.

### `@/components/ui` — shadcn-style primitives

- **`CrystalField`** — full-screen canvas. Silver strokes from the pointer, violet shadow, pink shatter shards on pointerdown. Palette-mapped. DPR-aware, respects prefers-reduced-motion.
- **`GlowingPanel`** — the reusable luminous surface (orbiting pink dot, rotating violet ray, silver corner lines, inner vignette). `tone="active"|"calm"` varies the orbit speed.
- **`KeyCap`** — the HUD key primitive (inset shadow chrome, pink LED pip, VT323 label, 52px touch target). Variants: `direction` / `verb` / `meta`. Disabled state renders without shadow at 40% opacity.
- **`ArgumentMap`** (in progress) — SVG rail of visited rooms colored by rhetorical type; closes visibly when the circle closes.

### `@/features` — compositions

- **`NewGameIncantation`** — landing panel. Yesteryear title + phrase, VT323 seed; three actions (Begin / Regenerate / Custom seed).
- **`TerminalDisplay`** — in-game view. GlowingPanel(active) wraps header + room title + streaming output. Below it, two rows of `KeyCap`s (rhetorical verbs + directions, directions auto-disable based on current exits).

### `@/design` — tokens + CSS

`globals.css` defines the full palette (ink / panel / silver / violet / pink), font families (Yesteryear / VT323 / DM Mono), glow vocabulary, keyframes, safe-area handling via `#root` padding. No logic.

### `@/lib`

- **`cn()`** — tailwind class merge helper
- **`audio-manifest.ts`** — semantic `SfxKey` → asset URL map + `sfxForVerb` / `sfxForRhetoricalType` resolvers
- **`mobile.ts`** — Capacitor boot (status-bar + splash), no-op on web

## The path alias

Only one: `@/*` → `src/*`. Cross-layer imports go through `@/<layer>` barrels; internals stay private to their layer.

## Determinism

Every random choice threads through `createSeededRandom(seed)`. The one exception is `CrystalField`, which uses `Math.random()` for strokes and shards — they're decorative, not game state.

## Audio path

Semantic key is the contract between engine and UI:

```
engine.applyCommand()              audio.playSfx("rhetoric.accept")
        │                                      │
        ▼                                      ▼
 AudioSink (engine interface)         useAudio (React hook)
        │                                      │
        └──────── wired by useGame ────────────┘
                                               │
                                               ▼
                           audio-manifest.SFX_MANIFEST["rhetoric.accept"]
                                       → "/audio/sfx/rhetoric-accept.ogg"
                                               │
                                               ▼
                                   Howler plays a pooled instance
```

The engine never sees a filename. Swapping SFX = editing one map.

## Why this layout

PR #1 initially shipped a SolidJS scaffold with Phaser + RetroZone for the backdrop. That stack carried too much weight for what is fundamentally a UI-driven text adventure. The pivot (see `docs/plans/react-mobile-mvp.prq.md`) replaced Solid with React, Phaser with a direct canvas component (`CrystalField`), RetroZone with Tailwind CSS tokens, Tone with Howler + authored audio. The layered `@/*` structure survived; the UI below it is new.
