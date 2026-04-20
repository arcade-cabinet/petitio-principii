# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Layered architecture with `@/*` path alias and per-layer barrels (`engine`, `content`, `world`, `design`, `render`, `terminal`)
- `src/world/` koota ECS layer with `IsPlayer`, `IsRoom`, `RoomId`, `Position`, `RhetoricalSpace`, `Exit`, `AudioTheme` traits
- `AudioSystem` that plays a Tone.js chord on room transition, modulated by the room's `AudioTheme.dissonance`
- `PathfindingSystem` with Yuka `Graph` + `Dijkstra` for shortest-path queries; rhetorical cost weighting makes fallacies cheap
- `buildWorld(graph)` factory that populates a koota world from an engine `ArgumentGraph`
- Governance docs: `docs/STATE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/TESTING.md`, `docs/LORE.md`, `STANDARDS.md`
- `pnpm verify` script (check → typecheck → test → build); CI runs this single command

### Changed
- Collapsed `app/` directory into `src/` — `app/render` → `src/render`, `app/terminal` → `src/terminal`
- Renamed React-era `hooks/` → `composables/` and `useGameEngine`/`useTypewriterEffect` → `createGameEngine`/`createTypewriterEffect` to match SolidJS idioms
- Consolidated `src/engine/content/{lexicon,templates}` into `src/content/{lexicon,templates}` so content lives in one place
- `tsconfig.json`: removed `composite`, `emitDeclarationOnly`, `noEmit: false` that were spilling `.d.ts` files into the source tree; now pure typecheck (`noEmit: true`)
- `vite.config.ts`: single `@/*` alias replaces `@src/*` / `@app/*`
- CI workflows pinned to action commit SHAs; single verify step mirrors local `pnpm verify`

### Removed
- Stale `.d.ts` compiler output scattered across `src/` (43 files)
- Empty `app/` directory
- `src/engine/content/` (merged into `src/content/`)
- `tsconfig.app.json` (absorbed into `tsconfig.json`)

## [0.1.0] — 2026-04-20

Initial bootstrap (PR #1) — see commit history for details.
