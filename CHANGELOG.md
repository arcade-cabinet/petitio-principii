# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-04-21)


### Features

* petitio principii — Act I + Act II complete ([7ea65ce](https://github.com/arcade-cabinet/petitio-principii/commit/7ea65ced37c6ebadb9160d0d697f9acddf75aafe))


### Bug Fixes

* **keycap:** match parsed verbs in usedVerbs lookup ('ask why' / 'trace back') ([#21](https://github.com/arcade-cabinet/petitio-principii/issues/21)) ([67490b7](https://github.com/arcade-cabinet/petitio-principii/commit/67490b797a6c32b57864e49c095b8404b4c63bca))

## [Unreleased]

### Added
- `.github/workflows/release.yml` — release-please-gated stage that builds a versioned web zip and Android debug APK on every release tag and attaches both to the GitHub Release (T58).

### Changed
- CI + CD workflows now pin Node to 22 — the Capacitor 8.x CLI requires Node ≥22, and the v0.1.0 APK job was failing on the older Node 20 (T57).

## [0.1.0] — pending

First playable release. Everything below is shipped on the `copilot/setup-monorepo-for-game` branch and will become 0.1.0 when merged to `main`.

### Added

#### Stack and scaffolding (T01–T08)
- React 19 + Vite 8 + Tailwind 4 + shadcn conventions. Biome for format/lint/import-sort. Vitest for tests with two projects (browser via `@vitest/browser-playwright`, node for `scripts/**`). pnpm 10.33.0 pinned via `packageManager`.
- Single `pnpm verify` command = check + typecheck + test + build; CI mirrors it byte-for-byte.
- Layered architecture with `@/*` path alias and per-layer barrels: `engine/`, `content/`, `world/`, `hooks/`, `features/`, `components/ui/`, `lib/`, `config/`, `design/`.
- Self-hosted typography via `@fontsource/*`: Yesteryear (incantation), VT323 (display + keycaps), DM Mono (commandline echo).
- Visual primitives: `CrystalField` (canvas memory-palace backdrop, the only place `Math.random` is allowed), `GlowingPanel` (luminous surface vocabulary), `KeyCap` (physical-key chrome).

#### Argument as koota ECS + Yuka AI (T09–T14, T25)
- `src/world/` — koota ECS layer. Traits: `IsPlayer`, `IsRoom`, `RoomId`, `Position`, `RhetoricalSpace`, `Exit`, `AudioTheme`, `OutputLine`, `TurnMark`, `Visited`, `CircleClosed`, `WasAccepted/Rejected/Questioned`, `HintsShown`.
- `PathfindingSystem` with Yuka `Graph` + `Dijkstra`; rhetorical cost weighting makes fallacies cheap.
- `ArgumentAgent` — a Yuka `StateMachine` with four states (Composed / Defensive / Seductive / Triumphant), `Think`-arbitrated. Every internal choice threads through a seeded RNG so same player acts = same transcript byte-for-byte.
- `useGame` / `useWorld` / `useAudio` — React hooks that own koota + Yuka + Howler lifecycles; reducer (`applyCommand`) stays pure with an explicit `WorldBridge` + `AudioSink` contract.
- `ArgumentMap` — SVG rail visualization of visited rooms with a pink closing-edge that draws when the player accepts in a circular/meta room.

#### Audio (T16, T21–T24)
- Howler-backed audio bus — SFX pooling, BGM fade, mute persisted across sessions.
- BGM: Clément Panchout "I want to believe" (2004) — full-length 100.8 s, libopus 96k at `public/audio/bgm.opus`.
- SFX: 16 curated Kenney CC0 effects in `public/audio/sfx/`, one per semantic event.
- `src/lib/audio-manifest.ts` — semantic `SfxKey` → asset URL.

#### Build-time text pipeline (T26–T28, T41–T45)
- RiTa (build-time only) validates hand-authored lexicons + tags a 35-fragment public-domain surrealist corpus (Carroll, Stein, Dada manifestos, Breton pastiche). Runtime never imports RiTa.
- `scripts/build-corpus.ts` emits three frozen artifacts: `src/content/generated/{corpus,surrealist,grammars}.json`, with thin `.ts` accessors re-exporting them.
- `src/lib/seeded-tracery.ts` — `withSeededRng(rng, fn)` wrapper over tracery-grammar's process-global `setRng`. Reentrant-safe via an internal stack; restores prior RNG on throw.
- `grammars.json` is the single source of truth for every piece of runtime text:
  - `descriptions.<type>.<act>` — 8 × 3 = 24 room-description rule families
  - `acks.{accepted,rejected,questioned}` — memory-conditional clauses
  - `incantation` — the new-game adj-adj-noun grammar
  - `agent.<state>.<verb>` — 4 × 3 = 12 argument-agent response families
  - `slots.{fragment,fragment_short,fragmentA,fragmentB}` — trimmed fragment vocabularies
- `chainDescription`, `generatePhrase`, and `ArgumentAgent.respondTo` all expand through Tracery under the seeded wrapper.

#### Display architecture (T46–T49)
- `docs/UX.md` formalizes a three-zone layout — PAST (compacted turn summaries, scrollable), PRESENT (current room title + latest description + latest response, aria-live polite), FUTURE (rhetorical verb keycaps + direction silhouettes).
- `TurnMark` trait groups `OutputLine` entities by turn id; `readTranscriptByTurn(world)` is the canonical projection.
- `TerminalDisplay` renders past/present from `state.transcript` grouped by `turnId`; `describeRoom()` no longer emits a trailing "Exits:" block (the keycap row owns direction surfaces).
- `compactTurn(turn)` — pure compactor from a full turn to a glyph + short label + full text; tested across every classification branch.
- Progressive onboarding hints — priority-ordered catalogue of 7 tips (first-look, first-examine, first-accept, first-question, first-reject, first-circular-room, first-trace-back). Each fires at most once per game via the `HintsShown` trait.

#### Contextual keycaps (T50–T51)
- `computeKeycapLayout(ctx)` — pure function from (room, turnCount, usedVerbs, circleClosed) to per-verb emphasis (calm / charged / primary) and per-direction state (available + alreadyTraversed). At most one primary per layout.
- `KeyCap` gains `emphasis` + `traversed` props. Primary adds the motion-safe violet pulse ring. Unavailable directions become disabled silhouettes (never hidden — keycaps never vanish, per `docs/UX.md` §1.3).

#### Mobile target (T29–T33, T37)
- Capacitor scaffold — `@capacitor/core`, `@capacitor/android`, plugin deps (`haptics`, `splash-screen`, `status-bar`). `capacitor.config.ts` with dynamic Vite `base` (relative paths for native WebView, `/petitio-principii/` for Pages).
- `android/` Gradle project committed (native scaffold via `npx cap add android`).
- CI `android-apk` job: JDK 21 Temurin + Android SDK, builds the debug APK and uploads as a PR artifact.

#### Determinism (T52)
- 100-turn scripted replay audit — two independent koota worlds + ArgumentAgents driven through a 100-input script produce byte-identical transcripts for the same seed. Different seeds produce different transcripts. This is the end-to-end gate the whole text pipeline exists to preserve.

#### Release polish (T53–T56)
- Generated corpora migrated to JSON + thin TS accessors; `pnpm verify-corpus` validates stability.
- Deprecated `src/design/gameConfig.ts` shim removed (was unused).
- `TerminalDisplay.test.tsx` — RTL three-zone projection tests (fresh game, multi-turn past/present split, all keycaps visible, direction silhouettes).
- `src/app/smoke.test.tsx` — end-to-end Playwright smoke (landing → click Begin → terminal renders → click LOOK → transcript mutates).

#### Governance + docs
- Root-level: `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `STANDARDS.md`.
- `docs/`: `STATE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `TESTING.md`, `DEPLOYMENT.md`, `LORE.md`, `VOICE.md`, `UX.md`, `MOBILE.md`, `pillars/`, `agentic/`, `developer/`, `plans/react-mobile-mvp.prq.md`.
- All GitHub Actions pinned to commit SHAs with `# vX.Y.Z` comments.
- `release-please` configured (`release-please-config.json` + `.release-please-manifest.json`); `dependabot.yml` weekly groupings.

### Architectural rules enforced
- Every random choice flows through `createSeededRandom(seed)` or the seeded Tracery wrapper. `Math.random` is reserved for the CrystalField backdrop.
- Cross-layer imports go through `@/<layer>` barrels.
- Runtime MUST NOT import `rita`. RiTa is build-time only; runtime consumes the frozen JSON artifacts.
- No stubs, no `// TODO`, no `pass` bodies. If it doesn't work, delete it.
- `pnpm verify` must pass locally before pushing. CI runs the same command.

### Pivoted away from (bootstrap choices reversed mid-PR)
- SolidJS → React 19.
- Phaser / RetroZone → custom `CrystalField` canvas backdrop.
- Tone.js synthesis → Howler + authored audio (BGM + SFX).
- Typewriter effect → direct render into the PRESENT zone with aria-live polite.
- Typed command input → tap-first keycap row (mobile-first per the original 17k prompt's intent).
