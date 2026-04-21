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
T109 (two hand-crafted worlds woven by seed — P28) — foundational; supersedes large parts of T104-T108
T104/T105/T106/T107/T108 — scope narrows once T109 lands (only fill gaps T109 doesn't cover)
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

- [ ] **T104** **Full pipeline coverage — every runtime string flows through the grammar pipeline.** The earlier claim (T43/T45) that text generation is pipeline-driven is partially true. The surrealist chainer + triumphant-state agent responses DO flow through Tracery under seeded RNG. Everything else is still hardcoded string literals:
    - **`src/engine/core/reducer.ts`** — movement blocks ("You cannot go that way. The argument has no passage in that direction."), TRACE BACK ("You trace back through the argument.", "You cannot trace back further."), QUIT refusal, INVENTORY response, NEW GAME banner. ~8 literal sentences emitted by the reducer on miss paths.
    - **`src/engine/core/NarrativeGenerator.ts`** — the fallacy-naming fallback ("You sense a logical error here, but cannot quite name it."). The help-text block. The `describeExamineFor` template.
    - **`src/hooks/use-game.ts`** — the opening narration banner ("You find yourself at the threshold of an argument." / "The premise smells faintly of tautology.").
    - **`src/features/terminal/hints.ts`** — every hint's prose.
    - **`src/content/templates/roomTemplates.ts`** — the hand-authored "static" room descriptions emitted when `describeRoom` is called without a seed. This path is hit on every `LOOK` in the reducer.
    - **`src/content/templates/fallacyTemplates.ts`** — hand-written fallacy encounters.

    **Scope of fix** — add grammar entries for every category above into `scripts/build-grammars.ts` → `grammars.json`. Every runtime emission site calls `grammar.flatten()` under a seeded rng. The seed inputs (turn count, verb, room context) are already available at every call site. New grammar keys: `reducer.movement.blocked`, `reducer.trace.blocked`, `reducer.trace.walk`, `agent.opening`, `hints.<id>`, `fallacy.fallback`, `examine.<rhetoricalType>`, `room.<rhetoricalType>.static`. Room `description` field becomes optional (or removed) since it's now generated. The hint catalogue stays as the priority-ordered predicate list, but `hint.text` becomes a grammar key — the reducer flattens to get the actual prose per-turn, so the same hint id may read differently across seeds (reinforces the "you are navigating an argument, not reading UI copy" principle).

    Determinism gate (T52-style) extended: the 100-turn replay must now cover reducer-emitted text, hint text, and opening narration — all seed-locked. The `grep "\"[A-Z][a-z]+.*\\.\"\\s*[,)]" src/engine src/hooks src/features` audit must return **zero hits** outside of tests, dev logs, UI chrome strings, and the grammar source files themselves.

    **Verify**: (1) the grep audit returns zero prose-sentence hits in runtime code. (2) 1000-turn determinism test passes byte-identically across runs, covering all new grammar-driven emission points. (3) A 5-seed playthrough (T68) shows the same hint id produces different prose across different seeds. (4) The opening narration varies across seeds — 10 seeds, 10 distinct openings that all convey the same beat.

- [ ] **T105** **Pacing model — determine and tune playthrough length.** Right now `generateArgumentGraph(seed)` emits some number of rooms per seed with no stated target. No one has measured "how long is a game" or tuned the arc shape (setup → complication → recognition → close). The graph generator needs an explicit target of **20-40 turns** to circle-close for a default-seed game, with the distribution normalized across seeds. Add `docs/PACING.md` documenting: the room-count distribution, the mean/median turns-to-circle across 100 sampled seeds, the "three-act" structure target (turns 1-N opening, N-M deepening, M+ closing), the ACCEPT-count required to trigger the close.
    - **Verify**: (1) `scripts/pacing-audit.ts` runs 1000 seeds through a headless scripted player (TRACE BACK + ACCEPT in circle) and reports turns-to-close histogram. (2) The 10th/90th percentile spread is ≤ 2x (so the game isn't wildly variable in length). (3) Median turns-to-close lands inside the 20-40 target. (4) docs/PACING.md committed with the histogram + rationale.

- [ ] **T106** **Room depth projection into 3D-sensed space.** The memory-palace tradition is explicitly three-dimensional — you walk *into* a place, things are *above*, *below*, *behind* you. Our rooms currently read as a single flat paragraph, which breaks the conceit. Each room generation gets a **layered spatial description**:
    - **Volume**: ceiling type + floor type + wall treatment — emitted via grammar slots `#ceiling#`, `#floor#`, `#wall#` per rhetorical-type family (e.g. premise = marble-columned → high coffered ceiling + mosaic floor + axiom-engraved walls; fallacy cellar = stone-vaulted → low damp ceiling + cold flag floor + cobwebbed shelving).
    - **Foreground / midground / background** — three sentences per room, each grammatically distinct: something you *touch* (fg), something you *see across the space* (mg), something you *only glimpse at the edge* (bg). The PRESENT panel renders them as three short paragraphs so the player's eye moves through the volume.
    - **Implicit vertical axis** — the compass tick positions at 12 and 6 map to "look up" / "look down" as well as N/S navigation. When the player commits UP or DOWN (chord or direct tap), the prose adds a fourth spatial line drawing attention to the ceiling or floor of the current room.

    Scope: extend the grammar JSON schema with the new `volume` / `fg` / `mg` / `bg` keys per rhetorical type. Update `chainDescription` to emit the 3+1 layered sentences in order. Extend `roomTemplates` to carry volume seeds, not full paragraphs. Update `docs/UX.md` with the PRESENT panel's new three-paragraph layout.
    - **Verify**: (1) every room rendered under `LOOK` returns 3 distinct spatial layers + volume line. (2) A blind-read test — given two room descriptions at the same rhetoricalType but different seeds, a reader can identify "high ceiling" vs "low ceiling" + "wide" vs "tight" vs "vaulted" variance. (3) The 5-seed playthrough in T68 logs capture the 3D reading and a tester can draw a rough floor-plan from the prose.

- [ ] **T107** **The blackboard test — the world must hold together as a map.** Adventure and Zork work because if a player draws what they've walked on a blackboard, a world emerges: "the Troll Room is two rooms west of Living Room; downstairs is the Cellar." Today the graph is bidirectional (go N from A, go S to return) but rooms know nothing diegetic about their neighbours. They read as isolated paragraphs, not connected places.

    The world-test: hand a player pencil and paper after 15 turns; can they draw a map that (a) matches the graph we generated, (b) labels rooms correctly, and (c) notes what connects each pair? If no, we don't pass.

    Scope: **geographic awareness** woven into generation.
    - Rooms carry a **neighbour profile** — for each exit, a grammar slot tokenizing the target room's landmark ("↕ an arch opening into the Premise Hall's columned gloom" / "↕ a cellar stairwell smelling of stored fallacy"). Generated at graph construction, stamped into the Room record; available to `chainDescription` as `#exit.<direction>#` slots.
    - **Persistent landmarks** — a handful of fixed rhetorical rooms have *always-the-same* spatial signatures across all seeds: the Circular Atrium is always central and always has 4+ exits; the Chamber of Self-Reference is always the meta-closer; the Premise Hall is always tall + columned. Not the seed-varying ones, but the load-bearing waypoints. Document the fixed set in `docs/GEOGRAPHY.md`.
    - **Distance awareness** — each room's description can reference the distance to a memorable waypoint: "three rooms behind you lies the Fallacy Cellar" (derived from shortest-path at runtime).
    - **Directional leakage** — rooms diegetically mention their neighbours: "the wall to your west bears similar inscriptions; you suspect the Premise Hall lies just through it." This leaks the graph into the text so the blackboard starts filling in.
    - The compass hand spinning to indicate LAST heading reinforces this geography; the player's internal map is kept in sync by the visual.

    Update `scripts/build-grammars.ts` to include the `#exit.<dir>#` and `#distance-to-<landmark>#` slot patterns. Extend `ArgumentGraph` construction to stamp neighbour profiles on each Room at generation time. Extend `chainDescription` to weave one neighbour reference into every room body unless the room has only one exit.
    - **Verify**: (1) a fresh player plays 15 turns on an unseen seed, draws a pencil map; compare to the actual graph — matches in both topology (right number of rooms, right edges) and labels (player names rooms consistently). (2) A scripted test drives 20 rooms and asserts every room body contains at least one directional-phrase from a tokenized set of neighbour-reference templates. (3) `docs/GEOGRAPHY.md` documents the persistent landmarks + their fixed spatial signatures; a test asserts the 3 waypoints render consistently across 100 seeds.

- [ ] **T108** **Strange little gnomes — ambient figures that inhabit the argument.** Adventure has the axe-throwing dwarf; Zork has grues; the Hitchhiker's Guide has Marvin. Ambient characters don't drive the plot, they make the world *peopled* — small repeating encounters with menace, whimsy, and memory. Petitio Principii has none yet. The argument feels uninhabited.

    The cast (seeded, probabilistic per-room encounters; each has a small stable repertoire of response templates; each is remembered across revisits so their lines shift):
    - **The Tautologist** — a small figure who lives in circular/meta rooms. Every visit she is finishing the same sentence ("…and therefore it is true because it is true, *as I was saying*"). Offers advice rephrased each time.
    - **The Strawmen** — pipe-puppet figures who appear in objection spaces. They mirror arguments back malformed; their speeches cite things the player didn't say.
    - **The Scholar-Mouse** — premise rooms. Cites an authority the player has never heard of to support the room's axiom. Usually misattributes the quote.
    - **The Chorus of Mumbling Footnotes** — a low shared mutter in conclusion balconies. You catch fragments of famous dismissed rebuttals drifting up from below.
    - **The Figure Behind the Mirror** — meta spaces only. Never turns around. Makes observations about the player's own history that are unsettlingly accurate (references their accepted/rejected/questioned count, their current path length).

    Scope: new entity trait `InhabitedBy({ id: GnomeId, lastSeenTurn: number, linesShown: string })` stamped on rooms at generation time by `ArgumentGraph` (probabilistic per rhetoricalType). `src/engine/ai/gnomes.ts` — pure-function `respondFromGnome(id, context, rng)` returning a line flattened from the gnome's Tracery grammar. Rooms with a gnome append one gnome line to their description (after the 3D spatial layers from T106). Encounters are seeded so the same seed always places the same gnome in the same room, but the *line* rotates based on `lastSeenTurn` vs current turn (memory leak).

    The Figure Behind the Mirror is a special case: her lines consume `state.memory` (accepted/rejected/questioned sets) and produce commentary specific to the player's path. E.g., "you rejected three premises between here and the atrium; you are building a no." Draws on `ChainingMemory` already in the engine. This is the most effortful gnome because her lines need to hold up under arbitrary play histories — seed ≥ 12 template variants that cover thin-memory / heavy-reject / heavy-accept / heavy-question / circle-closed.

    The gnomes need `docs/BESTIARY.md` documenting each one: appearance, behaviour, room affinities, sample lines. The point is that an attentive player starts to *know* them — "oh, the Tautologist is here again, she's farther along in her sentence this time."
    - **Verify**: (1) `grammars.json` contains a `gnomes.<id>` section per cast member, each with ≥ 8 line variants. (2) Determinism audit extended: gnome presence + line choice byte-identical across runs of the same seed. (3) A 5-seed playthrough captures every gnome at least once across the seeds; each encounter's line is distinct from the prior encounter in the same seed. (4) The Mirror Figure's lines verifiably reflect the player's memory state (scripted test with controlled memory profile, assert the commentary matches). (5) `docs/BESTIARY.md` committed with all five gnomes described.

- [ ] **T109** **Two hand-crafted worlds woven by seed — the foundational map model.** The current architecture is 100% PRNG: surrealist fragments + Tracery grammars generate every piece of prose per seed. This gives infinite variety but nothing anchors: no landmark a second player would recognize, no "remember when you walked through…", no load-bearing hand-authored story structure. Adventure and Zork work because someone *designed* their worlds — every room a deliberate choice, every dead-end a considered trap.

    **New model: two fully-authored worlds, combined per seed by weaving.**

    - **World A** — fully hand-crafted. ~40 rooms with a coherent identity (working title: *The Subterranean Library* — library basement / archive / cellar catacombs, the argument made as an underground descent). Edges hand-placed. Gnomes hand-placed. Prose hand-written, including the connective "you move north" lines, the dead-end responses, the examine bodies. False starts and backtracking designed as playable content. An attentive solo playthrough of World A alone takes hours.
    - **World B** — fully hand-crafted. ~40 rooms with a contrasting identity (working title: *The Celestial Court* — high vaulted atrium, observatories, mirrored chambers, the argument made as an ascent through crystal). Edges hand-placed. Gnomes hand-placed. Prose hand-written. Equally playable standalone.
    - **Connection node set** — ~12 rooms that exist in both worlds at equivalent rhetorical positions (Circular Atrium is in A and in B, each hand-authored differently; same for Premise Hall, Fallacy Cellar/Fallacy Observatory, etc.). These are the *weave-anchors*.
    - **Weaving**: per seed, the PRNG starts at a random connection-node and takes a ~30-room walk. At each step, the PRNG decides whether to remain in the current world or hop across a connection-node to the sibling world. Result: 30 rooms, every one of them hand-crafted, but the order and which-world-at-each-cell varies per seed. No two seeds produce the same walk; every seed produces a walk that reads as designed, not procedural.
    - **Tracery demotion**: surrealist fragments become **texture** — inscriptions on walls, overheard lines, objects the player can EXAMINE — not primary prose. The hand-crafted room body is the load-bearing text; Tracery fills slots the author marked as `#surrealist-inscription#` / `#overheard#`.

    Scope: major content undertaking. Breakdown:
    - `src/content/worlds/a.ts` — World A as a typed module: rooms, exits, gnome placements, prose bodies, connection-node markings.
    - `src/content/worlds/b.ts` — World B, same shape.
    - `src/engine/core/WorldWeaver.ts` — takes (worldA, worldB, seed) → a single `WeavedGraph` of 30 rooms. Maintains "which world am I in" state per cell; hops on connection-nodes per seeded rng.
    - `src/engine/core/ArgumentGraph.ts` — keep its current type shape; the weaver outputs this type so the rest of the engine is untouched.
    - `docs/WORLDS.md` — author-facing doc describing both worlds' identities, their connection-node set, their gnome rosters, their design intents (what argument each one makes; what emotional arc).
    - Retire surrealist-primary generation from the prose pipeline — it becomes slot-filler for author-marked positions only.

    This supersedes substantial parts of T104-T108:
    - T104 (full pipeline coverage) narrows to "the 20% of prose that's grammar-driven is pipeline-driven" — the 80% is authored.
    - T105 (pacing) — median turns-to-close is tuned by authoring hands, not a generator knob.
    - T106 (3D depth) — the hand-written prose *is* 3D because authors wrote it that way.
    - T107 (blackboard test) — passes trivially because Worlds A and B are drawn on paper before code.
    - T108 (gnomes) — authored per-world, placed by hand in specific rooms.

    - **Verify**: (1) World A playable standalone via a `?world=a` url param, full 40-room solo tour holds together; tester reads it aloud and reports coherent voice + discoverable throughline. (2) World B same. (3) 10 seeded weaves produce 10 distinct walks; all 10 playable start-to-close; manual review by a reader unfamiliar with the project confirms each reads as a designed walk, not a random tour. (4) Blackboard test (from T107) passes when a player draws a map after a seeded playthrough — the drawn map is correctly labelled with World A + World B rooms even though they were braided. (5) **Narrative density test** — every room has at least one of: a memorable description, a gnome encounter, a meaningful dead-end, a callback to another room, a pun or turn of phrase that someone would quote. Zork's test: can you describe any single room to a friend in a way that makes them want to visit it? Apply to every authored room. (6) **Voice audit** — blind-read test — given 10 random rooms, a tester can correctly assign each to World A or World B from the prose alone ≥ 90% of the time. The worlds have distinct authorial voices. (7) `docs/WORLDS.md` committed with full design of both worlds + connection-node table + voice guidelines.

- [ ] **T110** **Room groups — multi-room puzzles via Koota traits.** Today every room is a standalone entity; nothing expresses "these 5 rooms form a single puzzle space." Adventure's Twisty Little Maze, Zork's Flood Control Dam 3, the Coal Mine sequence all work because the authors modelled *groups* of rooms sharing state and a solution condition. Koota ECS is the right substrate for that.

    New traits:
    - `PuzzleGroup({ id, kind, rooms: RoomId[], binding: 'world-locked' | 'world-bridging', worlds?: ('A' | 'B')[], bridgeNodes?: RoomId[], state: JSON })` — attached to a synthetic group entity; `kind` selects the mechanic; `binding` decides whether the group must stay inside one authorial world or is specifically designed to span both; `state` holds puzzle progress.
    - `RoomMembership({ groupId })` — stamped on each member room pointing back.
    - Room-scoped LOOK/EXAMINE/MOVE handlers consult the group's `kind` + `state` before emitting prose.

    **Two binding modes** for groups, each unlocking a different authoring power:

    - **`world-locked`** — all member rooms come from the same world (A or B). Preserves coherence when the puzzle's mechanic depends on a unified authorial voice: the Twisty Little Maze's "all alike" prose only works if a single author wrote every room's similar-but-different body; the Flood Control Dam's valve/water semantics need a consistent physics. When the weaver lands in a member of a world-locked group, it suppresses cross-world hopping for the duration — the walk stays in that world until the group's exit condition fires. Then weaving resumes.
    - **`world-bridging`** — members are drawn from both worlds deliberately. The puzzle IS the player recognizing that A and B are aspects of the same underlying rhetorical problem. A `dual-premise-test` group has one premise-encounter authored in World A and a sibling encounter authored in World B; the solution depends on seeing them as the same move dressed differently. The Figure Behind the Mirror gnome becomes a natural bridging group — she appears in meta rooms of both A and B, and her memory-aware commentary accumulates across both. The weaver, entering a bridging group, *guarantees* traversal of members from both worlds before the exit condition; hops between A-members and B-members happen via the group's own `bridgeNodes`, not the general connection-node pool. The blackboard-map a player draws will show this group crossing the A/B boundary — and that IS the puzzle.

    Puzzle-group kinds native to our rhetorical setting:
    - **`circular-trap`** (world-locked) — 3-5 rooms where every exit routes back into the group. Solution: ACCEPT from within. The group's state records `recognized: bool`; the LOOK prose leaks progressively more circularity hints across visits.
    - **`false-premise-cascade`** (world-locked) — accepting any premise in group members sets a group flag; a later conclusion room in the group renders differently per accumulated flags.
    - **`regress-spiral`** (world-locked) — ASK WHY walks deeper (within-group) into further member rooms; only TRACE BACK from a sufficient depth exits the group. `maxDepthReached` in state.
    - **`mirror-gallery`** (world-bridging) — the Figure Behind the Mirror gnome (T108) follows the player across A and B member rooms; her commentary cross-references visits to any member in either world. Solution: acknowledge a specific accusation she makes.
    - **`self-reference-recursion`** (world-locked) — the Chamber of Self-Reference as a 4-room terminal recursion; WorldWeaver keeps the braid inside the group until the player explicitly navigates out via a specific sequence.
    - **`dual-premise-test`** (world-bridging) — two sibling premise rooms, one in World A and one in World B, hand-authored to present the same logical move under opposing aesthetics. Solution: the player must REJECT one and ACCEPT the other (either order) to exit the group — recognizing they are the same move in different clothing. Fails the exit if the player ACCEPTs or REJECTs both.
    - **`twisty-little-maze`** (world-locked) — explicit homage: 5-7 rooms of near-identical prose with remembered-not-visible exits. Solution: EXAMINE produces a droppable "marker" item; marker-drop + revisit reveals the real exit. The Koota group tracks `markers: Map<RoomId, Direction>` and `lastActualRoom: RoomId`.

    Integration with T109 weaving: a PuzzleGroup is a single weavable unit. Once the PRNG lands in a room that's part of a group, the walk stays within the group until the group's exit condition fires, then weaving resumes. This reproduces Adventure's "you're in the maze for a while, you solve it, you come out" pacing natively.

    Authoring: each of World A and World B gets 2-3 puzzle groups hand-authored in `src/content/worlds/a.ts` / `b.ts`. Groups register their `kind`, member rooms, and any puzzle-state initializer.
    - **Verify**: (1) Koota integration test — PuzzleGroup trait round-trips correctly; state mutations persist across room re-entries within the same session. (2) Each of the 5 `kind`s has a dedicated scripted test walking through a hand-authored example group and asserting the solution condition fires at the right beat. (3) A 5-seed playthrough log (in T68) captures at least one puzzle-group encounter per seed; the player's session transcript shows the group's narrative shape (entry → working through → solution → exit). (4) `docs/WORLDS.md` extended with a PUZZLE GROUPS section listing each kind + each authored instance per world.

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

1. Every task T01 through T110 is marked VERIFIED_DONE in the batch state.
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
