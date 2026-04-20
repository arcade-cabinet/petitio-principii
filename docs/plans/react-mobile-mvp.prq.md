---
title: Petitio Principii — full implementation (no deferrals)
updated: 2026-04-21
status: current
domain: context
---

# Feature: Petitio Principii — full implementation

**Created**: 2026-04-20
**Revised**: 2026-04-21 (deferrals removed; full scope committed)
**Timeframe**: ships when every task below is VERIFIED_DONE — not before.
**Priority**: P0 across the board. Nothing is a slice, nothing is deferred, nothing is "v2." The game is not complete until everything in this document is merged, tested, screenshot-verified, played through on every supported platform, and released.

## Overview

Petitio Principii is a mind re-entering an argument it once made (see
[docs/LORE.md](../LORE.md)). React 19 + Tailwind 4 + shadcn UI over a
framework-agnostic engine + koota ECS + Yuka AI + Howler audio. Mobile-first
via Capacitor; web via GitHub Pages.

Canon in order of priority:
1. **Original 17k prompt** — PRNG-driven text adventure, memory-palace-in-the-night-sky, seed-reproducible, rhetorical spaces, fallacy encounters, circular endings, framework-agnostic engine.
2. **User amendments** — no CRT metaphor, no Solid, no Phaser/RetroZone, no typing input. React+Tailwind+shadcn, Capacitor, Yesteryear + VT323 typography, Howler + real audio, mobile-first. Build scripts emit JSON under `src/config/generated/` or `src/content/generated/`. RiTa + Tracery pipeline is the runtime text generator. UI must remain legible — "contextual" never means "cryptic."
3. **Creative direction** — motion is the narrator; argument-map visualizes the walk; surrealist chaining through Tracery grammars fed by RiTa's POS tags; **every random choice threads through one seed** that determinism can be proved for.

## Shipped (trimmed — tasks that have landed)

These were previously P1–P10; keeping a compact record so the plan stays
honest about what's already in main.

- **T01–T05** Stack migration — React 19, Tailwind 4, shadcn conventions, Vite dual-project vitest, reorganized layout (commits `77c5ff4`, `e8586c9`).
- **T03** `scripts/build-corpus.ts` node types (commit `f587d01`).
- **T06–T08** Visual primitives — `CrystalField`, `GlowingPanel`, `KeyCap` (commits `77c5ff4`, `e8586c9`).
- **T09** `ArgumentMap` + **T13** `ArgumentMapOverlay` (commit `5647e0c`).
- **T10** `NewGameIncantation` (commit `77c5ff4`).
- **T11** `TerminalDisplay` (commit `e8586c9`; will be reworked in T41–T44).
- **T14** `useGame` / `useWorld` / `useAudio` decomposition; pure reducer boundary (commit `e8586c9`).
- **T16** `useAudio` with Howler — SFX pooling, BGM fade, mute persisted (commit `e8586c9`).
- **T21** BGM encoded to `public/audio/bgm.opus` — full-length Panchout (commit `e8586c9`).
- **T22** SFX curated — 16 Kenney CC0 effects in `public/audio/sfx/` (commit `e8586c9`).
- **T23** `src/lib/audio-manifest.ts` — semantic `SfxKey` → asset URL (commit `e8586c9`).
- **T24** Howler bus wired to game events via reducer (commits `e8586c9`, `4697fbb`).
- **T25** Tone.js removed; Yuka AI argument-agent wired into reducer (commits `e8586c9`, `4697fbb`).
- **T26** Surrealist corpus via RiTa (Carroll, Breton, Dada — public domain) (commit `f587d01`).
- **T27** `src/content/chaining.ts` — seeded template chainer (commits `54fbdb4`, `4697fbb`).
- **T28** `describeRoom(room, { seed, visitCount, memory })` threaded through the reducer (commit `4697fbb`).
- **T29–T33** Capacitor scaffold — deps, `capacitor.config.ts`, `android/`, dynamic Vite base, safe-area CSS, `src/lib/mobile.ts` (commit `93a5083`).
- **T34–T35** Docs refresh — STATE, ARCHITECTURE, DESIGN, TESTING, LORE, VOICE, STANDARDS, agentic/agent-workflows (commits `f83cadc`, `aa54e15`).
- **T37** CI APK job in `.github/workflows/ci.yml` (commit `93a5083`).
- **Config split** — tunables live in `src/config/{game,rhetoric}.json` with a single typed `@/config` barrel; `RHETORICAL_FREQUENCIES` and `RHETORICAL_COST` Records retired (commit `5d56695`).

## Act II — remaining work

Everything below is new or reframed from the original T-series. Numbers
continue (T41+) so referencing earlier commits still works.

### P11 — Grammar pipeline (RiTa + Tracery actually running the show)

The goal: every piece of generated text in the runtime expands from a
Tracery grammar fed by RiTa's POS tags, driven by a **single seeded rng**
that determinism can be proved for.

- [ ] **T41** Verify `tracery-grammar` v2.8.4 responds to `tracery.setRng(fn)`. Confirmed API present at `node_modules/tracery-grammar/tracery.js:864`. Write a `src/lib/seeded-tracery.ts` thin wrapper:
    - `withSeededRng(rng, fn)` — sets the process-global rng, runs `fn`, restores prior rng. Synchronous; no async inside.
    - Guards against reentrancy (push/pop a stack if needed so nested flattens don't unseat each other).
    - Unit test: 1000 runs with same seed → identical output; different seeds → ≥ 95% unique. **Verify**: `pnpm test` green; `grep "Math.random" src/content` shows zero hits outside of seeded-tracery.
- [ ] **T42** Emit grammars as JSON from the build pipeline.
    - `scripts/sources/grammars.ts` — hand-authored Tracery grammars, typed. Per `(type, act)` entry, and one `incantation` entry for the new-game phrase.
    - Extend `scripts/build-corpus.ts` to:
      - Read the typed grammars source.
      - Inject POS-filtered lexicon slots (RiTa-emitted `nn` words into `#noun#`, `jj` into `#adjective#`, etc.) — the build picks which lexicon entries qualify for each slot.
      - Inject surrealist fragments as `#fragment#` / `#phrase#` slots.
      - Emit `src/content/generated/grammars.json` (and a small `.ts` accessor alongside `corpus.ts`/`surrealist.ts` for typed re-export).
    - `pnpm verify-corpus` diffs `grammars.json` too.
    - **Verify**: `pnpm build-corpus` regenerates; the JSON has `incantation` + 24 entries under `rooms.<type>.<act>` keys; each entry is a valid Tracery grammar object.
- [ ] **T43** Replace runtime template-picking in `src/content/chaining.ts` with Tracery expansions.
    - `chainDescription(room, { seed, visitCount, memory })` now:
      1. Derives a per-call rng from `createSeededRandom(seed ^ hashRoomId(room.id) ^ visitCount)`.
      2. Picks the right grammar entry by `(room.rhetoricalType, determineAct(...))`.
      3. Calls `withSeededRng(rng, () => grammar.flatten("#origin#"))`.
    - Memory-based acknowledgements become grammar slots (`#accepted-suffix#` → `""` or `"(Your acceptance is part of the room now.)"` depending on whether roomId ∈ memory.accepted).
    - Delete the hardcoded `TEMPLATES` record in `chaining.ts`.
    - **Verify**: existing chaining test still passes; new tests — (a) 1000 calls same (seed, room, visit) → identical text; (b) same seed different visit → reliably different; (c) RiTa-tagged plurals actually used when the grammar requests `#noun.plural#`.
- [ ] **T44** `generatePhrase` (the new-game incantation) uses the `incantation` grammar.
    - Replace the hand-written adj-adj-noun splice in `src/engine/core/NarrativeGenerator.ts` with `incantationGrammar.flatten("#phrase#")` under a seeded rng.
    - **Verify**: existing `generatePhrase.test.ts` still passes (determinism + "three words separated by spaces" invariant preserved).
- [ ] **T45** Agent response templates (in `src/engine/ai/argument-agent.ts`) move into the grammar JSON too.
    - One grammar per `(ArgumentStateId, verb)` → 4 × 3 = 12 entries under `agent.<state>.<verb>`.
    - `argument-agent.ts` loads them via the shared `@/content` accessor; `respondTo` calls `withSeededRng(this.rng, () => grammar.flatten("#origin#"))`.
    - Still framework-agnostic — `argument-agent` imports only from `yuka`, `engine/core` types, and the grammar JSON.
    - **Verify**: existing agent test passes; new test — same seed + same player acts = identical narration for 100 runs.

### P12 — Display architecture (past / present / future)

The transcript has been rendered as a single scrolling wall. It should
split into *what's happening now*, *what has happened*, *what you can do*.

- [ ] **T46** `docs/UX.md` — formalize the display spec.
    - Three-projection model: present (last turn's lines, large), past (earlier turns, dim collapsible drawer), future (the keycaps themselves).
    - Responsive breakpoints: portrait mobile (single column, past collapsed by default), landscape / tablet (two-column 65/35), desktop (same as landscape with more breathing room + always-visible past ledger).
    - "Three concrete actions always visible" rule — keycaps don't vanish; they *telegraph* via emphasis.
    - Onboarding hint system (below, T49).
- [ ] **T47** `TurnMark` trait on `OutputLine` entities, so the display can project past vs present.
    - `src/world/traits/index.ts` — add `TurnMark({ turnNumber: 0 })` trait, stamped by `appendOutput` callers when a new turn begins.
    - `src/world/index.ts` — extend `appendOutput(world, kind, text, opts?)` with an optional `{ turnNumber }`; add `readTranscriptByTurn(world) → Map<number, TranscriptEntry[]>`.
    - Reducer passes `state.turnCount + 1` to each append from a given verb; startGame's seed lines go under turn 0.
    - **Verify**: unit test — a 5-turn walk yields 6 turn-keyed groups in the projection; start lines are in turn 0.
- [ ] **T48** Rewrite `src/features/terminal/TerminalDisplay.tsx` to the past/present split.
    - **Present pane** — `state.transcript` entries where `turnNumber === state.turnCount` (or turn 0 if nothing has happened yet). Big, VT323 @ `clamp(1.1rem, 2.6vw, 1.35rem)`, full glow. Room title is a separate hero element above.
    - **Past drawer** — collapsed by default on portrait. A header strip: "▸ earlier — N turns". Tapping expands to a scrollable chronological list of past turns, each turn a visual block (echo + response group). Dim (`--color-dim`), 0.9rem, no glow. Collapses again on any new verb so the present is always the focus.
    - **No always-visible exit list inside room descriptions** — "Exits: NORTH — a corridor" is redundant once the direction keycaps encode the same info. Remove from `describeRoom` output; the keycaps replace it.
    - **Verify**: Playwright visual test (captured or written later) — on portrait viewport, past drawer is collapsed; on landscape, drawer is expanded and sits on the right.
- [ ] **T49** Progressive onboarding hints.
    - `src/engine/core/hints.ts` — pure function `computeHintToShow(state, memory, agent, hintsShown) → HintId | null`. Evaluates triggers in priority order (first-room → first-direction-available → first-fallacy → first-circular/meta → first-accept → first-question → first-trace-usable → first-map-≥4 → first-agent-out-of-composed → first-revisit). Priority-ordered so one hint shows at a time.
    - `src/world/traits/index.ts` — `HintsShown({ ids: "" })` trait on the player entity (comma-separated string — koota traits can't hold `Set` directly; the reducer parses/serializes).
    - Reducer — after each `applyCommand`, call `computeHintToShow`; if it returns an id not in `hintsShown`, mark it shown and surface on state as `state.activeHint: HintId | null`.
    - `src/features/terminal/HintLine.tsx` — single-line DM Mono at `--color-dim`, 0.85rem. Fades in 400ms, auto-fades after 6s or on next keypress. Never blocks input. Dismissable via tap.
    - Must NEVER hint twice for the same id in the same game; `requestNewGame` clears `HintsShown`.
    - **Verify**: unit test — same seed + same actions produce the same hint sequence; each id fires at most once.

### P13 — Contextual keycaps (emphasis, not disappearance)

- [ ] **T50** `src/engine/core/keycap-layout.ts` — pure function `computeKeycapLayout(state, memory, agentState, room) → { verbs: KeyDescriptor[]; directions: KeyDescriptor[] }`.
    - `KeyDescriptor = { id, label, shortcut, emphasis: "calm" | "charged" | "primary" }`.
    - Always returns the full rhetorical-verb set (LOOK, EXAMINE, QUESTION, ASK, ACCEPT, REJECT, TRACE). No hiding. Contextual logic only shifts `emphasis`:
      - `fallacy` / `circular` room → QUESTION + REJECT charged
      - `premise` / `definition` / `conclusion` → ACCEPT charged
      - `meta` → ACCEPT + QUESTION + REJECT all charged equally
      - `agentState === "Triumphant"` → ACCEPT becomes `primary`
    - Always returns compass-present directions only, plus a `present: boolean` for the ones the room lacks (UI renders a *silhouette* placeholder so the layout doesn't jump, not a gap).
    - **Verify**: table-driven test — for each (rhetoricalType, agentState) pair, assert expected emphasis distribution.
- [ ] **T51** Refactor `src/features/terminal/TerminalDisplay.tsx` keycaps to read `computeKeycapLayout`. The emphasis is passed to a new `<KeyCap emphasis="charged" />` prop; the keycap component's `pink-LED-pulse` visual treatment upgrades to full outer glow when `charged`, and to inner-pink-fill when `primary`.
    - Direction silhouettes: a dimmed outline variant of `<KeyCap>` for the `present: false` slots — same footprint, no touch target (aria-hidden).
    - **Verify**: snapshot or RTL assertion per room type that the expected cap has `data-emphasis="charged"`.

### P14 — Proof of determinism

- [ ] **T52** `src/engine/prng/seed-audit.test.ts` — a dedicated test that imports the engine, reducer, agent, and chainer, plays 100 turns of a fixed seed with a fixed action script, captures the full transcript, and asserts byte-for-byte equality across re-runs. Any `Math.random` in user-space is a bug and this test catches it.
    - Also grep-asserts: `grep -rn "Math.random" src/` returns only `CrystalField` (decorative).
    - **Verify**: test passes; grep assertion passes.

### P15 — Release-quality polish

- [ ] **T53** Move `src/content/generated/{corpus,surrealist}.ts` → `src/content/generated/{corpus,surrealist}.json` + a thin `.ts` accessor that imports them. Consistency with T42's grammars.json and the config principle. Bundle shrink expected: the giant `as const` literals drop a layer.
- [ ] **T54** Remove `src/design/gameConfig.ts` deprecation shim. Audit consumers; flip them to `@/config.GAME_CONFIG.<nested>` directly. Delete the shim.
- [ ] **T55** `src/features/terminal/__tests__/TerminalDisplay.test.tsx` — RTL. Verifies present pane, past drawer toggling, hint visibility rules, direction keycap presence/silhouette logic.
- [ ] **T56** Playwright E2E smoke test — boot → enter custom seed → walk 6 rooms → ACCEPT in a circular room → assert circle-closed ring + "Petitio Principii" win text. Headless Chromium.

## Dependencies

Act II (shipped):
```
T41 → T42 → T43 → T44 → T45
T46 → T47 → T48 (T49 lands alongside T48)
T50 → T51
T41..T45 completion → T52 grep assertion passes
T53 any time (depends only on shipped content generation)
T54 after T53
T55 after T48 + T51
T56 after T51 + T49
```

Act III (remaining, in execution order):
```
T57 (APK CI fix) → T58 (release pipeline audit) → T59 (CHANGELOG) → T60 (squash-merge PR #1)
T61 (verify-corpus grammars check) in parallel with T62/T63/T64 (UX polish)
T62, T63, T64, T65, T66, T67 all post-merge; can land in parallel PRs
T68 (playtest logs) after all P17 merged
T69 (viewport screenshots) after T62/T64/T66
T70 (Lighthouse) after Pages deploy from T60
T71 (a11y) after T70
T72 → T73 → T74 → T75 (Android full)
T72 unblocks T76 (iOS scaffold) → T77 → T78 (TestFlight)
T79 → T80 (persistence)
T81 (telemetry) independent
T82 → T83 (localization)
T84 → T85 → T86 (a11y beyond minimum) in parallel with T82
T87 → T88 (corpus v2)
T89 → T90 (opponent)
T91, T92, T93 (social) after T60
T94 (repo audit) → T95 (security) → T96 (v0.1.0 release)
```

## Act II — Acceptance criteria summary

- **T41**: `setRng` verified at `node_modules/tracery-grammar/tracery.js:864`; wrapper present and tested; no `Math.random` in runtime text generation.
- **T43**: `chainDescription` uses `grammar.flatten("#origin#")` not template-string splicing; RiTa-tagged POS info available to the grammar via generated JSON slots.
- **T48**: portrait mobile shows past drawer collapsed; "Exits: ..." text gone from `describeRoom`; present pane dominates the viewport.
- **T49**: hints fire at most once per id per game; `requestNewGame` resets; `pnpm test` has a determinism assertion.
- **T51**: keycaps never vanish; `emphasis` drives visual pulse; direction silhouettes fill missing-exit slots.
- **T52**: 100-turn replay is byte-identical; `grep "Math.random" src/` shows only decorative CrystalField hits.
- **T56**: E2E closes the circle and asserts the closing-edge is present.

---

# Act III — ship, polish, and the platforms

Act II proved the game can be written by an RNG-driven grammar and played
through a three-zone display. Act III is "the game is actually finished,
installable, and audited." No slices, no "v2," no follow-ups. Everything
below must land before we cut the first release tag.

### P16 — CI / release gates (nothing ships while these are red)

- [ ] **T57** Fix the Android APK CI job — Capacitor CLI requires Node ≥22 and the current workflow pins an older toolchain. Bump `setup-node` to Node 22 LTS across `ci.yml`, `release.yml`, `cd.yml`. Re-run the APK pipeline; confirm the artifact uploads.
    - **Verify**: PR #1 `Android debug APK` check goes green; the APK artifact is downloadable from the run.
- [ ] **T58** Audit the release pipeline end-to-end — `release-please` config + manifest exist and fire on push to `main`; `release.yml` produces versioned artifacts (web bundle + Android APK); `cd.yml` deploys the web bundle to Pages and publishes the APK as a GitHub release asset. If any of these are missing or wrong, fix them.
    - **Verify**: dry-run by squash-merging a no-op commit to `main`; a release-please PR opens; merging that PR emits a tag; the tag triggers `release.yml`; the resulting deploy reaches Pages + attaches the APK.
- [ ] **T59** `CHANGELOG.md` bootstrapped with the full T01→T56 history grouped by phase per Keep a Changelog 1.1.0. Release-please manifest points at `0.1.0` with the correct commit range.
    - **Verify**: `CHANGELOG.md` diff-validates against the squash-merged history; `release-please-config.json` + `.release-please-manifest.json` both lint.
- [ ] **T60** Squash-merge PR #1 to `main`. Delete the `copilot/setup-monorepo-for-game` branch. Confirm CI stays green on `main`.
    - **Verify**: `gh pr view 1` shows `MERGED`; `main` CI is green; `.release-please-manifest.json` reflects the new HEAD.

### P17 — Real polish (the "promised but skipped" items)

- [ ] **T61** `verify-corpus` script actually diff-fails on `grammars.json` drift — the current script is generic over `src/content/generated/`, but CI should *explicitly* exit non-zero if any of the three generated artifacts (`corpus.json`, `surrealist.json`, `grammars.json`) changes after running `build-corpus`. Wire into `pnpm verify`.
    - **Verify**: artificially mutate `grammars.json`, run `pnpm verify-corpus`, confirm exit 1 with a diff printed.
- [ ] **T62** T48 responsive past drawer — on portrait (≤ 640px) the past zone is **collapsed by default** to a single-line "▸ earlier — N turns" header; tap expands. Landscape (≥ 641px) keeps it expanded. The collapse state is *never* persisted across turns; opening the drawer is a deliberate act, not a setting.
    - **Verify**: RTL test with `matchMedia("(max-width: 640px)")` mocked true shows the header and no entries until expanded. At ≥ 641px the header is absent and entries render inline.
- [ ] **T63** T49 hint auto-fade via Motion One — hints currently append to the transcript and persist. Move them out of the transcript into a dedicated `<HintLine />` overlay in the PRESENT zone; fade in 400ms, auto-fade after 6s, tap to dismiss. `HintsShown` marks the id immediately (dismissal doesn't un-mark).
    - **Verify**: RTL test — hint appears, advances through a `vi.useFakeTimers()` + 6100ms, is gone; subsequent hint with a different id fires.
- [ ] **T64** T51 keycap visual upgrade — `charged` gets a subtle outer glow (drop-shadow), `primary` gets an inner-pink tint + the pulsing ring + stronger glow. Calm is opacity-only. Every emphasis level visually distinct at arm's length on a phone screen.
    - **Verify**: visual-regression screenshot in Playwright — three keycaps, one per emphasis, pixel-diffed against a checked-in baseline.
- [ ] **T65** T56 full E2E circle-close — extend the smoke test: scripted 12-turn session that ends with ACCEPT in a circular/meta room; assert (a) the argument-map SVG has a `data-testid="argument-map-closing-edge"` element; (b) the transcript contains "Petitio Principii"; (c) the BGM is no longer playing. Headless Chromium, no manual intervention.
    - **Verify**: Playwright test passes; run three times in a row, same outcome each time.
- [ ] **T66** Motion One integration — Motion is installed but currently unused at runtime. Wire it into:
    - room-title crossfade on movement (300ms),
    - the present-pane body crossfades on new verb (180ms),
    - argument-map closing edge: animate `stroke-dashoffset` from length to 0 over 900ms when `circleClosed` flips true.
    - All three honour `prefers-reduced-motion`.
    - **Verify**: RTL test observes the animation start event; reduced-motion media query short-circuits all three.
- [ ] **T67** Bundle audit — install `rollup-plugin-visualizer`, run against the prod build, confirm gzipped JS ≤ 180 kB (react + react-dom ≈ 50kB; koota + yuka + howler + tracery + our code must fit the remainder). If over, trim: lazy-load CrystalField's crystal generation, tree-shake unused Lucide icons.
    - **Verify**: `dist/assets/index-*.js` gzipped size check in CI via a simple bash guard in `verify`.

### P18 — Manual verification loop (playthrough + screenshots)

- [ ] **T68** Run `pnpm dev`, play through **five distinct seeds** for at least 15 turns each. For each playthrough, capture a JSON log of every command issued + every transcript line emitted, plus three PNG screenshots (early/mid/late). Commit the logs + screenshots to `docs/playtest/<seed>.{json,early.png,mid.png,late.png}`.
    - **Verify**: five seed directories exist under `docs/playtest/`; each has 1 log + 3 PNGs; logs show the grammar surfaced ≥ 5 different fragment slots across the run; no seed produced visibly broken prose ("a a the" / ungrammatical runs).
- [ ] **T69** Viewport screenshots at the three breakpoints — `portrait-phone` (393×852, iPhone 14), `landscape-tablet` (1024×768, iPad), `desktop` (1920×1080). For each, capture: landing screen, first room, mid-game with past drawer state-appropriate, circle-closed end screen. 12 PNGs total, committed under `docs/screenshots/`.
    - **Verify**: `docs/screenshots/` exists with 12 PNGs; each is annotated in a `README.md` with the viewport + game state it shows.
- [ ] **T70** Chrome DevTools Lighthouse audit (via MCP) on the deployed Pages URL — scores must be ≥ 95 for performance, accessibility, best practices, SEO. Log the report under `docs/audits/lighthouse-<date>.json`.
    - **Verify**: all four scores ≥ 95; any < 95 is a bug with a dedicated follow-up task before T70 closes.
- [ ] **T71** Axe a11y scan — automated accessibility audit over the landing + terminal views. Every violation is a real bug, not a suppression. Fix or rewrite whatever fails.
    - **Verify**: Axe report clean; screen-reader walk-through (VoiceOver or NVDA) of a 3-turn session produces coherent narration.

### P19 — Android packaging (full Capacitor ship)

- [ ] **T72** Build an Android debug APK locally — `pnpm cap-sync android` → `./gradlew assembleDebug` → sideload to a real device (or emulator). Confirm: splash screen appears, landing screen renders with correct fonts, BEGIN transitions into the terminal, verb keycaps fire, BGM plays, audio resumes after a foreground→background→foreground cycle.
    - **Verify**: `docs/playtest/android-apk-session.mp4` — 60-second screen recording of a real playthrough on hardware (or the emulator, if hardware is unavailable). Commit the file via git-lfs.
- [ ] **T73** Android release-signing — generate a release keystore, wire it into `release.yml` via GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), produce `app-release.apk` that's signed and aligned. Attach to every GitHub release.
    - **Verify**: the `0.1.0` release has a signed `app-release.apk`; `apksigner verify` passes against it.
- [ ] **T74** Capacitor plugin audit — `haptics` and `status-bar` are installed; wire them: ACCEPT in a circular room triggers a success haptic; REJECT triggers a warning haptic; the status bar is hidden in-game and visible in the landing screen (immersive mode). `@capacitor/splash-screen` configured with our palette (violet on ink).
    - **Verify**: manual device test shows haptic fires; status bar behaves correctly; splash matches the landing chrome visually.
- [ ] **T75** Capacitor `App` plugin — handle the Android back button. If in-game, pop to the landing screen (treat as "new game?" confirm prompt). If on landing, suspend via default OS behaviour.
    - **Verify**: device test — in-game back press prompts; landing back press exits.

### P20 — iOS (yes, iOS too — no deferral)

- [ ] **T76** Capacitor iOS scaffold — `npx cap add ios`, generate the Xcode project, update `capacitor.config.ts` with `ios.scheme` + `ios.bundleIdentifier`. Commit the iOS project tree.
    - **Verify**: `npx cap sync ios` runs clean; `npx cap open ios` boots Xcode without errors.
- [ ] **T77** iOS local build — requires macOS + Xcode. Build to Simulator (iPhone 16 Pro, iOS 18); confirm a full play session works: fonts, audio, haptics, safe-area insets (the notch/Dynamic Island doesn't clip the header). `docs/playtest/ios-simulator-session.mp4` committed (git-lfs).
    - **Verify**: 60s simulator recording; no layout jitter; audio plays.
- [ ] **T78** iOS signing + TestFlight — developer certificate, provisioning profile, `fastlane` lane for TestFlight upload wired into a new `.github/workflows/ios-release.yml`. This is the long pole; do it anyway.
    - **Verify**: a TestFlight build of `0.1.0` installed on a real iPhone; invite external tester; confirm they can install and launch. **This task is complete only when a non-developer has run the app on their own phone.**

### P21 — Persistence (seeds aren't enough)

- [ ] **T79** Save/restore via the seed + action-log model — `src/engine/core/replay.ts` records every raw command the player issues into an in-memory ring buffer; `saveGame()` serializes `{seed, actions[]}` to `localStorage` on every turn; `loadGame()` replays actions through `applyCommand` to reconstruct state. Delete-save via a UI button.
    - **Verify**: test — start a seed, play 20 turns, refresh browser, the game resumes at turn 20 with byte-identical transcript. Also: on Capacitor (Android + iOS) the save survives a full app kill + relaunch.
- [ ] **T80** Save-slot UI in the landing screen — below "Begin Argument," a "Resume" button appears if a save exists; tap resumes; a small "×" next to it purges the save.
    - **Verify**: RTL test — no save → no Resume button; save present → Resume button present; tapping × clears localStorage.

### P22 — Telemetry (opt-in, self-hosted, privacy-first)

- [ ] **T81** Self-hosted Plausible instance (or equivalent privacy-respecting analytics) — wire an opt-in banner on first launch (defaults to off); send page-view + `verb_used` + `circle_closed` events only. Nothing identifying, no IP logging, GDPR-safe. `docs/PRIVACY.md` covers the data model.
    - **Verify**: instance is live at an internal URL; events arrive; opt-out fully disables the beacon script.

### P23 — Localization

- [ ] **T82** `i18next` + JSON locale files for `en` (canon) + `es` + `fr`. Every player-facing string moves into locale files — including the grammar slots (surrealist fragments stay English since they're quotations of PD English/French-in-English-translation work; room template *structure* localizes, fragment *content* doesn't — document this in `docs/i18n.md`).
    - **Verify**: runtime language switch works; Spanish and French run a full 10-turn session each without English leaking.
- [ ] **T83** RTL (right-to-left) — add Arabic (`ar`) to prove the layout survives RTL. CSS logical properties (`inline-start`/`inline-end`) everywhere margins/padding currently use `left`/`right`.
    - **Verify**: Arabic locale renders with mirrored layout; argument map rail flows right-to-left; keycap order mirrors.

### P24 — Accessibility beyond the a11y minimum

- [ ] **T84** High-contrast mode — a `prefers-contrast: more` CSS branch that drops the glow and raises all type to WCAG AAA contrast against the panel background.
    - **Verify**: forced high-contrast screenshot at desktop viewport; automated contrast checker passes AAA.
- [ ] **T85** Dyslexia-friendly option — a user setting (landing screen + in-game menu) that swaps VT323 for an OpenDyslexic-family face. Typography only; the incantation stays Yesteryear.
    - **Verify**: toggle changes body font across past + present zones; persists via the save-system in T79.
- [ ] **T86** Text-size control — 3 steps (small / medium / large); affects body font in past + present zones; persists.
    - **Verify**: toggle updates CSS var; mid-layout doesn't break at any step.

### P25 — Surrealist corpus v2

- [ ] **T87** Richer POS tagging — the existing tagger is `CONTENT_POS_PREFIXES = ["nn","vb","jj","rb"]`. Add: noun-phrase boundaries (RiTa's `tokenize` + phrase detection), rhyme classes (RiTa.rhymes), syllable-stress patterns. Emit into `surrealist.json` so grammars can request `#fragment.iambic#` or `#fragment.rhymes-with-dream#`.
    - **Verify**: new test asserts the build output exposes ≥ 3 new tag dimensions.
- [ ] **T88** Rhyme/meter-aware grammar entries — 2 new entries per rhetorical type (24 total) that select fragments by meter when the adjacent line ends on a stressed syllable. This is where the surrealist voice starts to *feel composed*, not just stochastic.
    - **Verify**: manual playtest spot-check — seed-locked, re-enter same room, read aloud; the prose scans.

### P26 — Opponent agent (the "argument's advocate")

- [ ] **T89** Yuka `SteeringBehavior` for an "opposing" agent — lives alongside `argument-agent`, takes the player's most recent move, and proposes a counter-move via `Think` arbitration. Not a full AI opponent — a heckler. Narrates into a new kind of transcript line: `kind: "objection"`, styled in pink.
    - **Verify**: played through a 20-turn session, the opponent interjected at least 3 times, the interjections were grammatically distinct from the main agent's voice.
- [ ] **T90** Opponent arbitration tuning — the opponent should not drown the main agent. Rate-limit to at most one objection per 3 player turns, and never in a circular/meta room (the closing should be between the player and the argument, not the heckler).
    - **Verify**: determinism audit (a new T52-style test) confirms opponent interjections are themselves seed-deterministic.

### P27 — Multiplayer / social

- [ ] **T91** Shareable seed URLs — `/?seed=XXXX` on the deployed site loads the custom seed directly; the landing screen's "Share" button copies `window.location.origin + "/?seed=" + currentSeed`.
    - **Verify**: paste URL in incognito browser, land in the same seed, run the replay test, byte-identical opening.
- [ ] **T92** "Argument of the day" — a date-seeded shared experience. Every day at 00:00 UTC a new seed is derived from `hash(date)`; a landing-page banner ("Today's argument") links to it. Everyone playing that day plays the same argument.
    - **Verify**: date-seed derivation deterministic; banner updates at midnight UTC; two devices on the same date both load the same seed.
- [ ] **T93** Post-close share card — when the circle closes, present a shareable image (canvas-rendered) showing the argument map, the seed, and the win text. Copy/save/share.
    - **Verify**: image renders on Chromium + Safari + Android Webview; the seed in the image matches the seed played.

### P28 — Final audit & release

- [ ] **T94** Repo convergence audit — every doc in `docs/` has current frontmatter and reflects shipped state. `CLAUDE.md` + `AGENTS.md` + `README.md` + `CHANGELOG.md` + `STANDARDS.md` all reviewed. Broken links fixed. `docs/STATE.md` reflects all completed tasks.
    - **Verify**: `find docs -name '*.md' | xargs grep -L '^status: current'` is empty; `markdown-link-check` passes on everything in `docs/`.
- [ ] **T95** Security scan — `pnpm audit` + `gh audit` + a secret scan (gitleaks) across the full history. No criticals. Any highs have a documented accepted-risk note.
    - **Verify**: all three tools output clean; any exceptions noted in `docs/SECURITY.md`.
- [ ] **T96** Cut `v0.1.0` — release-please PR merges, tag fires, web bundle deploys to Pages, signed Android APK attaches to the release, iOS TestFlight build is available. Announce in the repo README's "Play now" section.
    - **Verify**: the GitHub Releases page lists `v0.1.0` with three artifacts (web zip, APK, iOS ipa); the Pages URL resolves; the APK and IPA install and play on real devices; someone who has never seen this project can go from `README.md` to a playable game in under 3 minutes.

---

## Full-scope acceptance — the single definition of done

The project is complete when **all of the following are simultaneously true**:

1. Every task T01 through T96 is marked VERIFIED_DONE in the batch state.
2. `pnpm verify` passes locally and in CI.
3. A v0.1.0 release tag exists on `main` with signed artifacts for web, Android, and iOS.
4. Five distinct seeds have been played to the circle-close end state and logged under `docs/playtest/`.
5. Twelve viewport screenshots exist under `docs/screenshots/`, one per (breakpoint × game-state) pair.
6. Lighthouse scores ≥ 95 on all four axes against the deployed Pages URL.
7. A non-developer has installed the TestFlight iOS build or the signed Android APK on their own device and played to circle-close unassisted.
8. Every review comment on every PR (not just PR #1) is resolved or actioned.
9. The README on the published `main` branch reflects shipped functionality with working "Play now" links.

Anything less is incomplete and does not ship.

## Risks (addressed in-scope, not deferred)

- **Tracery rng is process-global** — every `flatten()` must be wrapped in `withSeededRng`, including inside the agent and chainer. Missing one breaks determinism. T52 catches it.
- **Grammar size** — T67's bundle audit is the release gate; trim if needed.
- **iOS signing takes real-world identity** — Apple Developer Program account required. T78 assumes this is acquired. If not, the batch is blocked there until it is.
- **Playtest fatigue** — T68 requires actually playing the game, not skimming. Budget the time.
- **Opponent agent voice distinctness** — T89 can drift into mimicking the main agent. Reserve pink + objection-kind styling as the load-bearing differentiator.

## Non-negotiables

- No "slice." No "v2." No "deferred follow-up." If a task appears in this document, it ships.
- No task is done because code was written. A task is done when the **Verify** bullet was actually executed and its evidence exists (test pass, screenshot, recording, artifact URL).
- Manual verification requires evidence on disk — a playtest log, a screenshot, a video. "I played it and it seemed to work" is not evidence.
- Every release gate in P16 is blocking. The project does not ship while CI is red.
