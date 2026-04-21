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

## Act II — shipped summary

P11 (grammar pipeline, T41-T45), P12 (past/present/future display, T46-T49),
P13 (contextual keycaps, T50-T51), P14 (determinism proof, T52), P15
(release-quality polish, T53-T56) all landed before Act III. See
CHANGELOG.md for specifics.

## Dependencies

Act III (remaining, in execution order):
```
T68 (playtest logs) after T65/T66/T67 (shipped)
T69 (viewport screenshots) after the Clock UI lands (P28)
T70 (Lighthouse) after Pages deploy
T71 (a11y) after T70
T72 → T73 → T74 → T75 (Android full)
T72 unblocks T76 (iOS scaffold) → T77 → T78 (TestFlight)
T79 → T80 (persistence)
T81 (telemetry) independent
T82 → T83 (localization)
T84 → T85 → T86 (a11y beyond minimum) in parallel with T82
T87 → T88 (corpus v2)
T89 → T90 (opponent)
T91, T92, T93 (social)
T97 → T98 → T99 → T100 → T101 → T102 → T103 (railroad-clock + chord — P28)
T94 (repo audit) → T95 (security) → T96 (v0.1.0 release)
```

---

# Act III — ship, polish, and the platforms

P16 (CI gates, T57-T60) and P17 (release polish, T61-T67) are shipped.
Remaining work below is "the game is actually finished, installable,
and audited." No slices, no "v2," no follow-ups.

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

### P28 — Railroad-clock input + chord system (replaces PanelDeck + keycap row + contextual-surface hiding)

The in-game surface becomes a single interactive railroad-watch clock. Two concentric rings share a 12-slot geometry, one for directions (outer) and one for rhetorical actions (inner). A mechanical spade hand sweeps to the last-committed slot. Inputs are **tap** (single-slot) or **chord** (two slots held together), giving the game a compositional input language that doubles as its rhetorical surface.

The rationale: the prior PanelDeck / BezelPanel / chassis / rivet layering was machinery; the game is memory and argument, which the clock expresses directly (time, revolution, the mechanical inevitability of a circular argument). Chord inputs let the vocabulary scale without slot clutter.

**All slots are always visible.** Availability is communicated by shading only — enabled slots render in violet, disabled slots in near-black. This supersedes the prior `computeKeycapSurface` / contextual-hiding rule: buttons never appear or disappear, so the interface layout never jitters and the player always knows the full vocabulary. The diegetic tutorial (chord hints, T101) teaches the player *what* each slot does; the shading teaches *when* it is useful.

- [ ] **T97** `src/components/ui/railroad-clock.tsx` — the SVG interface. Geometry: 60-tick minute track on the rim, 12 hour positions shared by both rings, an outer ring of 4 direction slots (UP at 12, RIGHT at 3, DOWN at 6, LEFT at 9) with 8 decorative hour positions, an inner ring of 7 action wedges (LOOK/EXAMINE/QUESTION/ASK WHY/ACCEPT/REJECT/TRACE BACK) laid out at 51.4° stride, a spade hand pivoting from centre with spring easing. Disabled slots render near-black; enabled render violet; the active slot (last activated) renders bright violet + white rim. Static face, rotating hand only — labels never move, so legibility is rock-stable.
    - **Verify**: RTL test — 11 interactive slots reachable; clicking each dispatches exactly one `onCommit` with the correct slot id; hand rotation css-var updates; disabled slots refuse clicks. Visual snapshot committed under `docs/mockups/railroad-clock.png` at 600×600.

- [ ] **T98** Chord input detection — pointer-tracking in the clock. When a slot is pressed and a second slot is pressed within a short chord window, the two fire as a compound move. `Move = { kind: 'tap', slot } | { kind: 'chord', slots: [a, b] }`. Both rings participate; cross-ring chords are valid (e.g. `UP + ACCEPT` = walk committing).
    - **Verify**: unit test dispatches two rapid pointer-down events on distinct slots and asserts a single `onCommit({ kind: 'chord', … })`. A sequential non-chord fires two `{ kind: 'tap', … }` events.

- [ ] **T99** `Move` type through the engine — `parseCommand` / `reducer.ts` gain chord awareness. Chord semantics: a chord is a new first-class verb, not two-in-sequence. Unknown chords fall through to emitting both single-slot effects sequentially plus a connective narration phrase. Determinism gate (T52-style) extended to cover chord inputs in the 100-turn replay.
    - **Verify**: replay test — seeded session with 20 chord inputs replays byte-identical across two runs.

- [ ] **T100** RiTa-enriched chord templates — `scripts/build-grammars.ts` emits a new `chord_templates` section. Hand-author ≥12 meaningful chord templates covering the most analytically interesting pairs (EXAMINE+QUESTION = scrutinize; ACCEPT+REJECT = provisional; QUESTION+ASK WHY = deep interrogation; TRACE BACK+REJECT = disavow; LOOK+EXAMINE = survey; ACCEPT+TRACE BACK = endorse chain; direction+ACCEPT = committed walk; etc). Templates get the same RiTa POS pass as single-verb templates.
    - **Verify**: build output contains ≥12 chord-template entries; unit test asserts each chord key resolves to a distinct template (no dupes); manual playtest spot-check — a chord's prose reads compositional, not just "A. B." concatenation.

- [ ] **T101** Diegetic chord tutorial — new hint catalogue entries in `src/features/terminal/hints.ts`. First time the player is in a room where a chord would be optimal (e.g., a fallacy room where EXAMINE+QUESTION unlocks a distinct template), a hint fires: *"Two can be held at once."* One hint per chord category (movement-chord / action-chord / cross-ring chord). Each fires at most once per game.
    - **Verify**: hints-determinism test extended to cover the chord hints; 5-seed playtest log (linked under `docs/playtest/`) shows each chord hint fires exactly when it should.

- [ ] **T102** Retire the PanelDeck + BezelPanel / Chassis / Inlay / Rivet / HeadingPanel / MapPanel / PresentPanel / GlowCard / CompassRose in-game UI, AND delete `src/features/terminal/keycapSurface.ts` plus its test — the clock's always-visible shaded-enabled/disabled slot model supersedes contextual-hiding entirely. TerminalDisplay becomes: CrystalField backdrop → compact reading panel (title + prose + hint) → RailroadClock → nothing else. Seed/phrase metadata moves to a slide-out HudMenu (the earlier-planned hamburger) triggered from the reading panel corner.
    - **Verify**: `grep -r "BezelPanel\|PanelDeck\|HeadingPanel\|MapPanel\|PresentPanel\|GlowCard\|CompassRose\|keycapSurface" src/` returns zero hits outside of potentially-deleted files. `pnpm verify` green. Visual snapshot at desktop + portrait viewports committed under `docs/mockups/`.

- [ ] **T103** Release-gate the clock — re-run T67 bundle audit (clock geometry is JSX-heavy), T70 Lighthouse, T71 a11y (each clock slot has an `aria-label` and is keyboard-focusable as a fallback for assistive tech, even though the game is touch-first).
    - **Verify**: bundle ≤ 180 kB gzip; Lighthouse ≥ 95; axe clean.

### P29 — Final audit & release

- [ ] **T94** Repo convergence audit — every doc in `docs/` has current frontmatter and reflects shipped state. `CLAUDE.md` + `AGENTS.md` + `README.md` + `CHANGELOG.md` + `STANDARDS.md` all reviewed. Broken links fixed. `docs/STATE.md` reflects all completed tasks.
    - **Verify**: `find docs -name '*.md' | xargs grep -L '^status: current'` is empty; `markdown-link-check` passes on everything in `docs/`.
- [ ] **T95** Security scan — `pnpm audit` + `gh audit` + a secret scan (gitleaks) across the full history. No criticals. Any highs have a documented accepted-risk note.
    - **Verify**: all three tools output clean; any exceptions noted in `docs/SECURITY.md`.
- [ ] **T96** Cut `v0.1.0` — release-please PR merges, tag fires, web bundle deploys to Pages, signed Android APK attaches to the release, iOS TestFlight build is available. Announce in the repo README's "Play now" section.
    - **Verify**: the GitHub Releases page lists `v0.1.0` with three artifacts (web zip, APK, iOS ipa); the Pages URL resolves; the APK and IPA install and play on real devices; someone who has never seen this project can go from `README.md` to a playable game in under 3 minutes.

---

## Full-scope acceptance — the single definition of done

The project is complete when **all of the following are simultaneously true**:

1. Every task T01 through T103 is marked VERIFIED_DONE in the batch state.
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
