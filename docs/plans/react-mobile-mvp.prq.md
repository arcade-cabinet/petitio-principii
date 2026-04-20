---
title: React + Capacitor MVP — Petitio Principii
updated: 2026-04-20
status: current
domain: context
---

# Feature: React + Capacitor MVP

**Created**: 2026-04-20
**Version**: 2.88
**Timeframe**: 1 week (batched autonomous execution)
**Priority**: P0 — replaces Solid scaffold, targets mobile via Capacitor

## Overview

Petitio Principii pivots to a React 19 + Tailwind 4 + shadcn stack with a primary target of mobile (iOS + Android via Capacitor). The game is a wall of seed-deterministic text with buttons — which means UI and motion carry the whole weight of making it feel alive. No literal CRT; a luminous display surface. No typing; keycap HUD. Phaser and RetroZone are out; Solid is out; we replace procedural Tone.js sounds with real authored audio from `/Volumes/home/assets/Audio` via Howler.

Canon in order of priority:
1. **Original 17k prompt** — PRNG-driven text adventure, memory-palace-in-the-night-sky, seed-reproducible, rhetorical spaces, fallacy encounters, circular endings, framework-agnostic engine.
2. **User amendments** — kill CRT metaphor, kill Solid, kill Phaser, kill RetroZone, kill typing input. React+Tailwind+shadcn, Capacitor, Yesteryear + VT323 typography, Howler + real audio, mobile-first.
3. **My creative direction** — motion is the narrator, panel chrome mutates with rhetorical type, argument map visualizes the player's journey as geometry, surrealist text chaining via RiTa build-time pipeline.

## Tasks

### P1 — Stack migration (blocking everything else)

- [ ] **T01** Install React 19 + Tailwind 4 + shadcn stack, remove Solid ecosystem
- [ ] **T02** Configure Vite React plugin, Tailwind 4 plugin, tsconfig JSX react-jsx
- [ ] **T03** Fix `scripts/build-corpus.ts` node type resolution (TS language server)
- [ ] **T04** Rewrite `vite.config.ts` with React + Tailwind + dual vitest projects
- [ ] **T05** Reorganize source: `src/app/`, `src/components/ui/`, `src/features/`, `src/hooks/`, `src/lib/`

### P2 — Visual primitives (shadcn-style, palette-mapped)

- [ ] **T06** `components/ui/crystal-field.tsx` — canvas backdrop, silver strokes + violet glow + pink shatter
- [ ] **T07** `components/ui/glowing-panel.tsx` — orbiting dot, rotating ray, corner line traces, tonal variants
- [ ] **T08** `components/ui/keycap.tsx` — inset-shadow key with LED, variant-tonal chrome
- [ ] **T09** `components/ui/argument-map.tsx` — breadcrumb geometry of visited rooms, colored by rhetorical type, closes visibly when circle completes

### P3 — Feature compositions

- [ ] **T10** `features/new-game/NewGameIncantation.tsx` — landing panel with Yesteryear incantation + seed + actions
- [ ] **T11** `features/terminal/TerminalDisplay.tsx` — in-game display with streaming output, current room as breathing hero
- [ ] **T12** `features/terminal/KeyRow.tsx` — decomposed keycap HUD (verbs + directions), context-aware glow (ACCEPT pink in circular rooms, QUESTION glow in fallacy rooms)
- [ ] **T13** `features/terminal/ArgumentMapOverlay.tsx` — tiny always-visible strip above display

### P4 — Engine bridge

- [ ] **T14** `hooks/use-game-engine.ts` — React port of createGameEngine; owns koota World lifetime; bridges BEGIN click to audio init
- [ ] **T15** `hooks/use-haptics.ts` — Capacitor Haptics wrapper, web fallback = no-op
- [ ] **T16** `hooks/use-audio.ts` — Howler-backed BGM + SFX bus, volume/mute state, respects prefers-reduced-motion

### P5 — Theatrical motion

- [ ] **T17** Panel reveal choreography — landing dissolves into in-game display as one continuous motion (Motion React)
- [ ] **T18** Directional transitions — moving north rotates/unfurls text; directions are kinesthetic
- [ ] **T19** Rhetorical chrome — panel mutates per-room-type (premise clean, fallacy jitter, circular stuck-orbit, meta doubled-outline)
- [ ] **T20** Spell-cast verb feedback — ACCEPT in circular room triggers crystal-shatter-inward + text dissolve/reform

### P6 — Audio (Howler + real assets)

- [ ] **T21** Encode `/Volumes/home/assets/Audio/Music/Clement Panchout _ I want to believe _ 2004.wav` → `public/audio/bgm.ogg` (ffmpeg -c:a libvorbis -q:a 5, loopable)
- [ ] **T22** Curate SFX pack: copy selected files from `Interface Sounds/Audio/`, `UI Audio/Audio/`, `Sci-Fi Sounds/Audio/` to `public/audio/sfx/`
- [ ] **T23** `lib/audio-manifest.ts` — typed manifest mapping game events → SFX filenames
- [ ] **T24** Wire Howler bus: BGM starts on first user gesture (seed submit), looping at -14 LUFS; SFX layer on keypresses and rhetorical transitions
- [ ] **T25** Remove `tone` dependency, delete `world/systems/AudioSystem.ts` Tone integration; replace with Howler-driven `useAudio` subscriber to game events

### P7 — Surrealist chaining (elevates the text)

- [ ] **T26** Extend `scripts/build-corpus.ts` to include public-domain surrealist fragments (Carroll *Jabberwocky*, Breton *Manifeste du surréalisme* excerpts, Dada declarations) with POS tagging
- [ ] **T27** `content/chaining.ts` — seeded Markov/template chainer that consumes the surrealist fragments and produces room-description variations on each visit (deterministic per seed + roomId + visitCount)
- [ ] **T28** Thread chainer through `describeRoom` so revisiting a room yields subtly different phrasing (memory is unstable)

### P8 — Mobile (Capacitor)

- [ ] **T29** Install `@capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen`
- [ ] **T30** `capacitor.config.ts` + `android/` + `ios/` scaffolds via `npx cap init` + `npx cap add`
- [ ] **T31** Vite `base: "./"` when `CAPACITOR=true` (dynamic in `vite.config.ts`)
- [ ] **T32** Safe-area handling in `globals.css` (env(safe-area-inset-*) already present; audit every fixed-position element)
- [ ] **T33** Status bar + splash screen configured to match ink/violet palette

### P9 — Governance / CI

- [ ] **T34** Update `docs/STATE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/TESTING.md`, `STANDARDS.md` to reflect the new stack (drop Solid/Phaser/RetroZone references)
- [ ] **T35** Update `docs/agentic/agent-workflows.md` (currently says "SolidJS + Phaser", false)
- [ ] **T36** CI workflow already mirrors local via `pnpm verify` — confirm it still passes end-to-end
- [ ] **T37** Android debug APK job in `ci.yml` (per global standards) — upload as PR artifact

### P10 — QA

- [ ] **T38** Port 41+ existing unit tests (engine, world, content) unchanged — they're framework-agnostic
- [ ] **T39** Rewrite 1 component test (`TerminalScreen.test.tsx`) for React Testing Library
- [ ] **T40** Add Playwright smoke test: boot → seed → move → accept → completes circle → new game

## Dependencies

```
T01,T02,T03,T04 (P1) → T05 (P1)
T05 → T06,T07,T08,T09 (P2) [parallel]
T05 → T14,T15,T16 (P4) [parallel]
T06,T07,T08 → T10,T11,T12,T13 (P3)
T14,T16 → T17,T18,T19,T20 (P5)
T21,T22 → T23 → T24 → T25 (P6 serial; T21 depends on NAS mount)
T26 → T27 → T28 (P7 serial)
T29 → T30 → T31,T32,T33 (P8 serial)
T01..T28 → T34,T35 (docs)
all → T36,T37 (CI)
T11,T12 → T39 (component test depends on final shape)
T11,T12,T14 → T40 (E2E depends on full loop)
```

## Acceptance Criteria

### T01 — Stack migration
- `package.json` has `react@19`, `react-dom@19`, `@vitejs/plugin-react`, `tailwindcss@4`, `@tailwindcss/vite`, `tw-animate-css`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `motion`, `@fontsource/yesteryear`, `@fontsource/vt323`, `@fontsource/dm-mono`
- `package.json` does NOT have `solid-js`, `vite-plugin-solid`, `@solidjs/testing-library`, `phaser`, `retrozone`, `tone`
- `pnpm install` succeeds
- **Verify**: `grep -E "solid-js|phaser|retrozone|tone" package.json` returns empty

### T02 — Vite + tsconfig
- `vite.config.ts` uses `@vitejs/plugin-react` and `@tailwindcss/vite`
- `tsconfig.json` has `"jsx": "react-jsx"`, no `"jsxImportSource"` remnant
- **Verify**: `pnpm typecheck` passes

### T03 — build-corpus node types
- `scripts/build-corpus.ts` resolves `node:fs`, `node:path`, `node:url`, `process` without diagnostics in both the IDE and `tsc -p tsconfig.node.json`
- Either add `scripts/` to the root `tsconfig.json` excludes AND ensure `tsconfig.node.json` owns it, OR merge into one tsconfig with node types at root — whichever avoids double-typing
- **Verify**: `pnpm typecheck` passes with zero errors

### T04 — vite.config.ts
- Has dual vitest projects: `browser` (Playwright) + `scripts` (node env)
- React and Tailwind plugins both loaded
- `@/*` alias → `src/*`
- **Verify**: `pnpm test` runs both projects and all tests pass

### T05 — Directory layout
- `src/app/` contains `main.tsx` + `App.tsx`
- `src/components/ui/` contains shadcn-style primitives (crystal-field, glowing-panel, keycap, argument-map)
- `src/features/` contains `new-game/` + `terminal/` feature compositions
- `src/hooks/` contains React hooks
- `src/lib/utils.ts` has `cn` helper
- Old `src/terminal/` directory is deleted
- `index.html` script src points at `/src/app/main.tsx`
- **Verify**: `find src -type d` shows the expected layout; `pnpm build` succeeds

### T06 — CrystalField
- Canvas component, pointer tracks mouse, pointerdown shatters 40 shards
- Palette: silver strokes (`hsla(240, 100%, 87%)`) with violet shadow; pink shatter shards
- DPR-aware, resizes on window resize, passive listeners, respects `prefers-reduced-motion`
- **Verify**: Renders, no console errors; screenshot shows crystalline strokes from cursor in Chrome DevTools

### T07 — GlowingPanel
- Orbiting dot, rotating conic-gradient ray, 4 corner line traces, interior vignette
- `tone="active" | "calm"` prop with different speeds
- Accepts children
- **Verify**: Two instances (one active, one calm) visibly differ in orbit speed

### T08 — KeyCap
- Props: `label`, `icon?`, `onPress`, `variant`, `disabled`, `shortcut?`, `aria-label?`
- Inset shadow chrome, pink LED pip top-right, VT323 label, 52px min touch target
- Disabled state renders without shadow, 40% opacity, no-cursor
- **Verify**: Clicking a verb key calls `onPress`; disabled key doesn't

### T09 — ArgumentMap
- Small SVG rail, one node per visited room, colored by rhetorical type
- Connects sequential visits with faint silver line
- When player is in a `circular` or `meta` room that matches a prior room id, the connecting edge between them draws bright pink → visible "circle closed" moment
- **Verify**: After 6 moves in a test graph, 6 nodes show; the 6th back to room[0] → closing edge lights

### T10 — NewGameIncantation
- Yesteryear "Petitio Principii" title
- Yesteryear phrase + VT323 seed display
- Three actions: Begin Argument, Regenerate, Custom Seed (with numeric form)
- `onBegin` fires the user gesture that awaits `initAudio()` before `onStart`
- **Verify**: Tapping BEGIN on iOS Safari triggers AudioContext state === "running"

### T11 — TerminalDisplay
- Header with game title + NEW GAME button
- Current room title as Yesteryear hero (breathing slot)
- Output stream in VT323 with fade-in mask at top
- Auto-scrolls to bottom on new output
- Keyboard parity: n/s/e/w/l/x/q/t/b/arrow keys trigger onCommand
- **Verify**: All existing commands work via both keycaps and keyboard

### T12 — KeyRow
- Verbs row (Look/Examine/Question/Ask/Accept/Reject/Trace) + directions row
- Direction keys auto-disable when no exit in that direction exists in current room
- In circular/meta rooms: ACCEPT keycap pink LED
- In fallacy rooms: QUESTION keycap pink LED
- **Verify**: Visiting a fallacy room toggles the QUESTION key's LED color

### T13 — ArgumentMapOverlay
- Renders ArgumentMap at top of the screen between header and display
- Receives turn history from game state
- **Verify**: After moves, the overlay reflects path

### T14 — useGameEngine
- Returns `{ state, startGame, submitCommand, requestNewGame }`
- `startGame` awaits `initAudio()`, builds koota world, builds Yuka pathfinding cache
- `submitCommand` routes every verb exactly as the Solid version did
- `requestNewGame` disposes audio and resets state
- **Verify**: All 42 engine/world tests still pass; new test for useGameEngine hook passes

### T15 — useHaptics
- Wraps `@capacitor/haptics` Impact/Notification APIs
- Web fallback: no-op silently (check for `Capacitor.isNativePlatform()`)
- **Verify**: Importing it in web mode doesn't throw; on Android device, button press triggers vibration

### T16 — useAudio
- Exposes `playSfx(key)`, `playBgm()`, `stopBgm()`, `toggleMute()`
- Howler instances pooled (one `Howl` per SFX file loaded once)
- BGM loops at -14 LUFS, fades in 2s, fades out on `requestNewGame`
- Respects `prefers-reduced-motion` → half volume
- **Verify**: Play/pause BGM without clicks; rapid SFX triggers don't stack beyond 3 voices

### T17 — Panel reveal choreography
- Landing → in-game is one continuous Motion transition (not a swap)
- CrystalField briefly pulses extra shards at panel center on BEGIN
- **Verify**: Video capture shows no flash/pop between screens

### T18 — Directional transitions
- North → output container slides from top, 200ms ease-out
- South → slides from bottom; east/west from sides; up/down with scale
- **Verify**: Each direction verb triggers the matching choreography in the browser

### T19 — Rhetorical chrome
- Panel data-attribute `data-rhetoric={type}` drives CSS variants:
  - premise/conclusion/definition: calm default
  - fallacy: panel corner lines jitter 4-6Hz
  - circular: orbiting dot and rotating ray have locked angular velocity (visually stationary relative to each other)
  - meta: second outline ring appears behind the panel, 4px offset
- **Verify**: Navigating into each room type visibly changes the chrome

### T20 — Spell-cast verb feedback
- ACCEPT in circular/meta room → CrystalField shatter-inward burst (40 shards aimed at panel center) + text fade+reform
- REJECT → panel chrome flashes pink 100ms
- TRACE → panel outputs reverse in-place before reveal of new room
- **Verify**: Completing the circle produces the shatter; visible in a screen recording

### T21 — BGM encoding
- `public/audio/bgm.ogg` exists, **full-length** (no trimming, no loop editing)
- Source: `/Volumes/home/assets/Audio/Music/Clement Panchout _ I want to believe _ 2004.wav`
- Encoded: `ffmpeg -i "<source.wav>" -c:a libvorbis -q:a 5 public/audio/bgm.ogg`
- Duration matches source within ±50ms; bundle size is not a gating concern here
- Looping is Howler's job at runtime (`{ loop: true }`); do not pre-concatenate
- **Verify**: `ffprobe -i public/audio/bgm.ogg` reports Vorbis codec and duration within 50ms of the source; Howler plays it without console errors

### T22 — SFX curation
- `public/audio/sfx/` contains: `click.ogg`, `press.ogg`, `confirm.ogg`, `back.ogg`, `deny.ogg`, `reveal.ogg`, `glass.ogg`, `glitch.ogg`, `forcefield.ogg`, `compute.ogg` — exact mapping in T23
- All files ≤ 50KB each (ogg Vorbis)
- **Verify**: `ls public/audio/sfx/ | wc -l` ≥ 10

### T23 — Audio manifest
- `src/lib/audio-manifest.ts` exports typed `SFX_MANIFEST` mapping semantic event → asset URL
- Event keys: `ui.press`, `ui.release`, `ui.confirm`, `ui.deny`, `ui.back`, `rhetoric.accept`, `rhetoric.reject`, `rhetoric.question`, `rhetoric.trace`, `rhetoric.examine`, `room.enter.premise`, `room.enter.fallacy`, `room.enter.circular`, `room.enter.meta`, `circle.closed`
- **Verify**: TypeScript typecheck passes; every key maps to a file that exists under `public/audio/sfx/`

### T24 — Howler bus wiring
- `useAudio` hook subscribes to game events
- First user gesture (BEGIN click) starts BGM + resumes AudioContext
- Every `submitCommand` invocation triggers the right SFX from the manifest
- Room transitions trigger `room.enter.<type>`
- Circle-closing accept triggers `circle.closed`
- **Verify**: Manual: play a full game with headphones, every keypress and room entry has audio feedback

### T25 — Remove Tone
- `tone` removed from `package.json`
- `src/world/systems/AudioSystem.ts` deleted; its consumers rewired to `useAudio`
- `@/world` barrel no longer exports audio functions
- **Verify**: `grep -r "from \"tone\"" src/` returns empty; tests pass

### T26 — Surrealist corpus
- `scripts/build-corpus.ts` extended with a second source: `scripts/sources/surrealist-fragments.ts` containing public-domain quotes (ensure each quote has a `{source, year, publicDomain: true}` field)
- Fragments POS-tagged and syllable-counted via RiTa
- Emitted to `src/content/generated/surrealist.ts` alongside the existing corpus
- **Verify**: `pnpm build-corpus` regenerates; `src/content/generated/surrealist.ts` has ≥ 20 fragments with POS tags

### T27 — Chaining engine
- `src/content/chaining.ts` exports `chainDescription(seed, roomId, visitCount)` returning a string
- Uses a seeded Markov/template chainer over the surrealist corpus + the canonical rhetorical terms
- Same (seed, roomId, visitCount) always produces the same output (deterministic)
- Different visitCount for same (seed, roomId) produces different (but consistent) outputs
- **Verify**: Unit test asserts reproducibility and variation

### T28 — Thread chainer through describeRoom
- `describeRoom(room, visitCount?)` returns either the base description or a chained one depending on visitCount
- `useGameEngine` tracks per-room visit counts and passes through
- **Verify**: Revisiting a room in a playthrough produces different output than the first visit

### T29 — Capacitor deps
- `package.json` has `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`
- **Verify**: `pnpm install` succeeds

### T30 — Capacitor scaffolds
- `capacitor.config.ts` at repo root with `appId: "com.arcadecabinet.petitioprincipii"`, `appName: "Petitio Principii"`, `webDir: "dist"`
- `android/` directory created by `npx cap add android`
- iOS may be scaffolded later (macOS-only concern, defer if iOS SDK absent)
- **Verify**: `npx cap doctor` passes for android

### T31 — Dynamic Vite base
- `vite.config.ts`: `base: process.env.CAPACITOR === "true" ? "./" : process.env.GITHUB_PAGES === "true" ? "/petitio-principii/" : "/"`
- **Verify**: `CAPACITOR=true pnpm build` produces a `dist/index.html` with relative asset paths

### T32 — Safe-area audit
- All fixed-position elements use `env(safe-area-inset-*)` padding
- Test on iPhone notch simulation (Chrome DevTools device mode)
- **Verify**: No UI elements clipped by notch/home indicator

### T33 — Status bar + splash
- Capacitor `StatusBar` configured to `Style.Dark` with background `#05010a`
- Splash screen background `#05010a`, logo Petitio Principii in Yesteryear, 2s auto-hide
- **Verify**: Built Android APK shows the splash and ink-colored status bar

### T34-T35 — Docs refresh
- `docs/STATE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/TESTING.md`, `STANDARDS.md`, `docs/agentic/agent-workflows.md`, `README.md` all reference React + Tailwind 4 + shadcn + Capacitor + Howler
- No remaining references to Solid, Phaser, RetroZone, Tone
- All frontmatter `updated:` bumped to today's date
- **Verify**: `grep -ri "SolidJS\|Phaser\|RetroZone\|tone\.js" docs/ STANDARDS.md README.md` returns empty

### T36 — CI green
- `pnpm verify` runs check → typecheck → test → build all green
- **Verify**: GitHub Actions run on this branch reports success

### T37 — Android APK in CI
- `ci.yml` adds a job using `setup-java@v4` Temurin 21, `setup-android@v3`, `npx cap sync android`, `cd android && ./gradlew assembleDebug`
- APK uploaded as artifact
- **Verify**: CI artifact download contains `app-debug.apk`

### T38 — Engine tests preserved
- All 42+ existing tests under `src/engine/`, `src/world/`, `src/content/`, `scripts/` still pass unchanged
- **Verify**: `pnpm test` shows 42+ tests passing

### T39 — Component test rewrite
- `src/features/terminal/__tests__/TerminalDisplay.test.tsx` uses `@testing-library/react`
- Asserts: renders output lines, header title visible, keyboard and keycap both trigger onCommand, direction key disabled when no exit
- **Verify**: Test passes

### T40 — Playwright E2E
- `tests/e2e/smoke.spec.ts` — boots the app, enters a custom seed, walks 6 rooms, accepts in a circular room, confirms "Petitio Principii" win text
- Runs headless Chromium, completes in < 30s
- **Verify**: `pnpm test:e2e` passes

## Technical Notes

- **Audio licensing**: confirm Clement Panchout tracks are licensed for use in this project; keep the license text alongside the encoded asset. Kenney UI packs (UI Audio, Interface Sounds, Sci-Fi Sounds) are CC0 per their `License.txt` — no issues.
- **BGM loop seam**: `I want to believe` may not loop cleanly; run a 500ms crossfade at Howler level or pre-edit the tail in ffmpeg if audible.
- **RiTa surrealist corpus**: ensure every fragment is explicitly public domain (pre-1929 US for safety); include source attribution in the generated file.
- **Motion library**: using `motion` (formerly Framer Motion) for React. Alternative considered: `@motionone/react` — lighter but less composable. Go with `motion` unless bundle size forces a rethink.
- **shadcn CLI**: we're not running `npx shadcn init` because we don't need most primitives; `components.json` is hand-written to signal the convention and enable future `shadcn add` calls.
- **Capacitor web fallback**: the game must still work as a pure web deploy (GitHub Pages). All Capacitor APIs go through a thin wrapper that detects `Capacitor.isNativePlatform()` and no-ops on web.

## Risks

- **BGM loop seam on the full-length track** — "I want to believe" was composed as a piece, not an infinite loop, so Howler's `{ loop: true }` may produce an audible seam at the tail → head boundary. If it's jarring, handle at runtime (Howler's `fade` on `onend` to crossfade into a second `Howl` instance of the same file) rather than re-cutting the asset.
- **Playwright in CI with Capacitor** — the E2E test targets web only; Capacitor builds are separate CI matrix rows.
- **iOS scaffolding needs Xcode** — defer T30's iOS half until someone has a Mac with Xcode; Android covers the MVP.
- **Surrealist chaining quality** — early chains may read as noise not surrealism; expect iteration. Keep a fallback to the hand-authored descriptions when chainer output scores below a legibility threshold.
- **Reduced motion** — full rhetorical chrome may violate accessibility if not gated. Every motion primitive must check `prefers-reduced-motion` and degrade gracefully.

## Out of scope (follow-ups)

- iOS App Store submission
- Multiplayer / social (not in brief)
- Save/restore state (implicit; seeds are the save file)
- Localization
- Analytics / telemetry
