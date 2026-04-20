---
title: React + Capacitor MVP — Petitio Principii
updated: 2026-04-20
status: current
domain: context
---

# Feature: React + Capacitor MVP

**Created**: 2026-04-20
**Version**: 2.88 (trimmed 2026-04-20)
**Timeframe**: extended through Act II (display, keycaps, grammar, hints)
**Priority**: P0 — mobile release via Capacitor, Pages deploy for web

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

```
T41 → T42 → T43 → T44 → T45
T46 → T47 → T48 (T49 can land alongside T48)
T50 → T51 (may land with T48 since both touch TerminalDisplay)
T41..T45 completion → T52 grep assertion passes
T53 any time (depends only on shipped content generation)
T54 after T53
T55 after T48+T51
T56 after T51 + T49
```

## Acceptance criteria summary (key ones)

- **T41**: `setRng` verified at `node_modules/tracery-grammar/tracery.js:864`; wrapper present and tested; no `Math.random` in runtime text generation.
- **T43**: `chainDescription` uses `grammar.flatten("#origin#")` not template-string splicing; RiTa-tagged POS info available to the grammar via generated JSON slots.
- **T48**: portrait mobile shows past drawer collapsed; "Exits: ..." text gone from `describeRoom`; present pane dominates the viewport.
- **T49**: hints fire at most once per id per game; `requestNewGame` resets; `pnpm test` has a determinism assertion.
- **T51**: keycaps never vanish; `emphasis` drives visual pulse; direction silhouettes fill missing-exit slots.
- **T52**: 100-turn replay is byte-identical; `grep "Math.random" src/` shows only decorative CrystalField hits.
- **T56**: E2E closes the circle and asserts the closing-edge is present.

## Out of scope (deferred follow-ups)

- iOS app submission (needs macOS + Xcode)
- Save/restore beyond "seeds as the save file" (seeds + action log → full replay)
- Multiplayer / social
- Localization
- Telemetry
- Surrealist corpus v2 — richer tagging, rhyme/meter-aware grammar picks
- Custom Yuka `SteeringBehavior` for an AI "opponent agent" that plays alongside the player (far future)

## Risks

- **Tracery rng is process-global** — every `flatten()` must be wrapped in `withSeededRng`, including inside the agent and chainer. Missing one breaks determinism. The T52 audit test catches this.
- **Grammar size** — 24 room grammars + 12 agent grammars + incantation might balloon the bundle. Keep each grammar small; rely on fragment pooling, not per-grammar inlining.
- **Past drawer on mobile** — if the tap-to-expand UX is awkward, pivot to swipe-down-to-reveal. T48 acceptance lets us iterate.
- **Hint priority edge cases** — a player who does three things in quick succession might see three hints consecutively. The 6s fade + queueing should handle this, but watch for noise in playtest.
