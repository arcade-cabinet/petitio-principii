---
title: State
updated: 2026-04-20
status: current
domain: context
---

# State

Snapshot of what's shipped, what's in progress, and what's next. Bump `updated` whenever this file changes meaningfully.

## Shipped (PR #1)

- Project scaffold: TypeScript + SolidJS + Phaser 4 + RetroZone + koota + Tone + Yuka
- Deterministic seeded PRNG (Mulberry32)
- `engine` layer: argument graph generation, command parser, narrative generator, room/passage/state types
- `content` layer: lexicon (nouns, adjectives, rhetorical terms), templates (rooms, passages, fallacies), corpus (local fallacy reference)
- `world` layer: koota world factory, traits for rooms/exits/audio, audio system (Tone.js), pathfinding system (Yuka Dijkstra)
- `render` layer: Phaser 4 `StarfieldScene` with RetroZone CRT overlay
- `terminal` layer: SolidJS `TerminalScreen`, `InputLine`, `TextLine`, `ModalNewGame`, `StarfieldBackground`, composables (`createGameEngine`, `createTypewriterEffect`)
- CI mirrors local via `pnpm verify` — single command, no drift
- Governance: Biome (formatter + linter + import-sort), pinned pnpm, pinned GitHub Actions SHAs

## In progress

- Wire `world` into `createGameEngine` so audio actually plays on room transition
- Connect TRACE command to Yuka Dijkstra pathfinding
- Build-time RiTa pipeline: lint lexicon entries for POS/pluralization, emit frozen corpus under `src/content/generated/`

## Next up

- Absurdist corpus integration (Lewis Carroll, Breton, Dadaist manifestos — public domain) as a second grammar source alongside `tracery`
- Procedurally-generated fallacy rooms with full explanatory passages (derived from `RHETORICAL_TERMS` + RiTa)
- Save/restore via `localStorage` (seed + turn history is enough to replay)
- E2E smoke test via Playwright: boot → seed → move → accept → completes circle

## Hard rules

- Every random choice flows through `createSeededRandom(seed)`. Non-deterministic `Math.random()` is reserved for decorative visuals only (see `StarfieldScene`).
- Cross-layer imports go through `@/<layer>` barrels. No reaching into a layer's internals from outside.
- `pnpm verify` must pass locally before pushing. CI runs the same script — it exists to catch environment drift, not to be the first run.
- All GitHub Actions pinned to SHAs with `# vX.Y.Z` comments. Never `@vN`.
