---
title: Architecture
updated: 2026-04-20
status: current
domain: technical
---

# Architecture

Petitio Principii is a single-page browser game organized as layered packages under `src/`. Each layer has a public barrel (`index.ts`) and internals that other layers never import directly.

## Layer map

```
┌──────────────────────────────────────────────────────────────┐
│ src/main.tsx  →  mounts <App/> on #root                      │
│ src/App.tsx   →  wires terminal + starfield via @/terminal   │
└────────────────────────┬─────────────────────────────────────┘
                         │
       ┌─────────────────┴─────────────────┐
       │                                   │
┌──────▼─────────┐                 ┌───────▼─────────┐
│ @/terminal     │                 │ @/render        │
│                │                 │                 │
│ Solid UI:      │                 │ Phaser scenes + │
│ TerminalScreen │                 │ RetroZone CRT   │
│ ModalNewGame   │                 │ overlay         │
│ composables/   │                 │                 │
└──────┬─────────┘                 └─────────────────┘
       │
       │  consumes
       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ @/engine         │   │ @/world          │   │ @/content        │
│                  │   │                  │   │                  │
│ Pure game logic: │   │ koota ECS:       │   │ Lexicon,         │
│ ArgumentGraph    │   │ traits, systems  │◄──│ templates,       │
│ Parser           │   │ (Audio, Path)    │   │ corpus, grammar  │
│ Narrative        │◄──│ buildWorld(graph)│   │                  │
│ GameState        │   │                  │   │                  │
└────────▲─────────┘   └──────────────────┘   └──────────────────┘
         │                                           │
         └───────────────────────────────────────────┘
                     engine consumes content

┌──────────────────┐
│ @/design         │   Design tokens + CSS.
│                  │   Imported by main.tsx (css) and terminal
│ THEME, TYPOGRAPHY│   (tokens). No other layer depends on design.
│ GAME_CONFIG      │
└──────────────────┘
```

Arrow = "may import from". Cycles are disallowed and will be caught by a future lint rule.

## Layer responsibilities

### `@/engine` — pure game logic

No DOM, no Phaser, no Tone, no Solid. Deterministic given a seed. Everything here is a pure function or a plain data type. Tests are synchronous unit tests.

Exports: `generateArgumentGraph`, `parseCommand`, `describeRoom`, `describeFallacy`, `generatePhrase`, `getHelpText`, `createInitialGameState`, `createSeededRandom`, `generateSeed`, `pickRandom`, `shuffleArray`, and the domain types (`Room`, `Exit`, `Direction`, `Passage`, `GameState`, `CommandVerb`, `ParsedCommand`).

### `@/content` — data + text generators

The canonical source of nouns, adjectives, rhetorical terms, room/passage/fallacy templates, and tracery grammars. Lexicon is data-only; grammar is a tracery-based generator seeded by the PRNG.

When content needs live POS or morphology work (pluralization, rhyming, syllable counting), that happens at **build time** via a `scripts/` runner using RiTa, emitting a frozen artifact under `src/content/generated/`. Runtime never calls into RiTa — shipping bundles stay small and deterministic.

### `@/world` — koota ECS

Owns the runtime world. `buildWorld(graph)` spawns one entity per room (`IsRoom` + `RoomId` + `RhetoricalSpace` + `AudioTheme`) plus the player (`IsPlayer` + `Position`). Systems:

- **`AudioSystem`** — Tone.js PolySynth that plays a chord derived from the current room's `AudioTheme`, triggered on room transition.
- **`PathfindingSystem`** — Yuka `Graph` + `Dijkstra` for shortest-path queries over the rhetorical graph. Edge weights come from the destination room's rhetorical type: fallacies and circular passages are *cheap* (rhetorically seductive), honest argumentation is expensive.

### `@/render` — Phaser layer

Phaser 4 game that renders the starfield backdrop. RetroZone applies a CRT shader overlay. `createPhaserGame(parent)` returns a `PhaserBundle` with a `destroy()` cleanup. The Solid terminal sits over this via CSS z-index.

### `@/terminal` — SolidJS UI

The actual teletype. `createGameEngine` is a Solid composable (not a hook) that owns game state, wires input through `parseCommand`, and runs the verb switch. `TerminalScreen` renders output with the typewriter effect; `ModalNewGame` handles seed selection.

### `@/design` — tokens + CSS

Theme colors, typography scales, and the `GAME_CONFIG` constants. Plus the `theme.css` and `crt.css` stylesheets. No logic — just values.

## The path alias

Only one alias: `@/*` → `src/*`. That's the boundary. `@/engine` is the engine barrel; never reach for `@/engine/core/ArgumentGraph` from outside the engine.

## Determinism

Seeded PRNG is threaded through every generator. The one exception is `StarfieldScene`, which uses `Math.random()` for twinkle positions — the stars are decoration, not argument state, and letting them vary per boot matches the "looking at the sky" aesthetic.

## Why this layout

PR #1 initially had a React-era `app/` vs `src/` split that duplicated responsibilities (`src/engine/content/lexicon/*` and `src/content/corpus/*` were both "content"). The current layout collapses that: **one game, one tree, one alias, clear layers**. See [docs/LORE.md](LORE.md) for the domain vocabulary these layers model.
