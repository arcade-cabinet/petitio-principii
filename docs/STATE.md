---
title: State
updated: 2026-04-20
status: current
domain: context
---

# State

Snapshot of what's shipped, what's in progress, and what's next. Bump `updated` whenever this file changes meaningfully.

## Shipped

- Project scaffold: TypeScript + React 19 + Vite + Tailwind 4 + shadcn conventions
- Biome for formatting, linting, import-sort; pnpm pinned via `packageManager`
- Single `pnpm verify` command = check + typecheck + test + build; CI mirrors it
- All GitHub Actions pinned to commit SHAs
- Layered architecture with `@/*` path alias and per-layer barrels:
  - `engine/` — pure game logic: PRNG, argument graph, parser, narrative generator, **reducer** (`applyCommand` takes explicit WorldBridge + AudioSink)
  - `content/` — lexicon, templates, corpus, tracery grammar + frozen `GENERATED_CORPUS` from RiTa build-time pipeline
  - `world/` — koota ECS: traits (`IsRoom`, `RoomId`, `RhetoricalSpace`, `AudioTheme`, `Exit`, `IsPlayer`, `Position`, `OutputLine`) + systems (`PathfindingSystem` via Yuka `Graph`+`Dijkstra`)
  - `components/ui/` — shadcn-style primitives: `CrystalField`, `GlowingPanel`, `KeyCap`
  - `features/` — compositions: `NewGameIncantation`, `TerminalDisplay`
  - `hooks/` — React hooks: `useGame` (composition), `useWorld` (koota+yuka lifecycle), `useAudio` (Howler bus)
  - `lib/` — `cn()` helper, `audio-manifest` (semantic SfxKey → asset URL)
- **Transcript as koota entities** — every line is an `OutputLine` entity; React keys on entity ids (stable, no array-index keys). Per-line traits become possible: future `IsAccepted`, `IsChallenged` etc.
- Build-time RiTa pipeline emits frozen corpus under `src/content/generated/`; `pnpm build-corpus` regenerates, `pnpm verify-corpus` diff-fails on staleness
- Audio via **Howler** + authored assets:
  - BGM: Clément Panchout "I want to believe" (2004), full-length 100.8 s, libopus 96k, `public/audio/bgm.opus`
  - SFX: 16 curated Kenney CC0 effects in `public/audio/sfx/`, one per semantic event in the manifest
- Typography: self-hosted **Yesteryear** (incantation), **VT323** (display + keycaps), **DM Mono** (commandline echo) via `@fontsource/*`
- Governance docs: STATE / ARCHITECTURE / DESIGN / TESTING / STANDARDS / LORE / VOICE, all frontmatter'd; CHANGELOG.md, release-please config, dependabot.yml

## In progress

- Yuka AI argument-agent (StateMachine `Composed → Defensive → Seductive → Triumphant`), replacing the reducer's hardcoded verb responses with state-conditioned narration
- Capacitor Android scaffold + CI APK job
- Argument-map overlay (visible breadcrumb geometry that closes when the circle closes)
- Surrealist chaining: public-domain fragments (Carroll, Breton, Dada) emitted to a second frozen corpus via RiTa; runtime seeded Markov chainer threads through `describeRoom`

## Next up

- Motion-driven theatricality: panel reveal choreography, directional transitions, rhetorical chrome variants per room type
- Capacitor iOS scaffold (deferred — needs macOS + Xcode)
- Playwright E2E smoke test: boot → seed → walk → complete circle
- Dev experience: source-map-explorer-style bundle audit to keep gz < 150 kB

## Hard rules

- Every random choice flows through `createSeededRandom(seed)`. Non-deterministic `Math.random()` is reserved for decorative visuals (the CrystalField backdrop only).
- Cross-layer imports go through `@/<layer>` barrels. No reaching into a layer's internals from outside.
- `pnpm verify` must pass locally before pushing. CI runs the same script.
- All GitHub Actions pinned to SHAs with `# vX.Y.Z` comments. Never `@vN`.
- Runtime MUST NOT import `rita`. RiTa is build-time only; runtime consumes the frozen `GENERATED_CORPUS`.
- No stubs, no `// TODO`, no `pass` bodies. If it doesn't work, delete it.
