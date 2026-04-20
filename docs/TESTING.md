---
title: Testing
updated: 2026-04-20
status: current
domain: quality
---

# Testing

## Strategy

Three tiers, each catching what the one below can't.

### 1. Unit — pure-logic layer

Anything in `@/engine`, `@/content`, and `@/world` is pure TypeScript and gets a colocated `*.test.ts`. Vitest runs them in a real browser via the Playwright provider to match the deploy target.

Current coverage highlights:
- `engine/core/ArgumentGraph.test.ts` — graph generation determinism, exit validity, reproducibility across seeds
- `engine/core/Parser.test.ts` — command aliases (`n`/`north`/`go north`), fallback behaviour on unknown verbs
- `engine/core/NarrativeGenerator.test.ts` — seeded phrase generation, `describeRoom` output shape
- `engine/prng/seedRandom.test.ts` — PRNG determinism, shuffle invariants
- `content/corpus/localCorpus.test.ts` — fallacy corpus derives from the canonical term list (one term in → one entry out)
- `scripts/build-corpus.test.ts` — build-time RiTa pipeline: plurals non-empty, syllable counts > 0, timestamp ISO, POS rejection, stable re-render

### 2. Component — React rendering layer

Components in `@/components/ui` and `@/features` render via **@testing-library/react** against real DOM. Tests live under `__tests__/` next to their subject and exercise behaviour, not implementation.

- `features/terminal/__tests__/TerminalDisplay.test.tsx` — renders output lines, shows title, exposes NEW GAME, keyboard AND keycap both trigger onCommand, direction key disables when no exit in that direction

### 3. Runtime — E2E via Playwright (planned)

Boot the app, enter a fixed seed, walk six rooms, accept in a circular room, assert "Petitio Principii" win text + argument-map ring closed. Headless Chromium, < 30 s. Wired in T40; see the PRD.

## What we don't mock

- **Not the browser.** Vitest runs in Chromium.
- **Not Howler.** `useAudio` is exercised by the components that call it; we don't stub the Howl class — we assert user-visible audio state (muted/unmuted) where relevant. The actual audio graph is out of scope for vitest.
- **Not koota.** `useWorld` and `buildWorld` are tested with real koota queries; there is no point mocking an ECS.
- **Not Yuka.** Real `Graph` + `Dijkstra`; `PathfindingSystem.test.ts` validates shortest-path behaviour against fixture argument graphs.

## Running

```sh
pnpm test            # one-shot run, CI-style
pnpm test:watch      # re-run on change
pnpm verify          # check + typecheck + test + build (mirrors CI exactly)
```

If `pnpm verify` passes, CI passes. That's the invariant.

## Principles

- **Behaviour, not implementation.** Tests should survive a refactor that keeps the public API.
- **Real dependencies where possible.** Mocks accrue maintenance debt; prefer real koota / real RiTa / real Howler invocations where the test stays fast (<100ms) and reliable.
- **Determinism.** Every seeded test pins a seed. Flake is a bug.
- **Tests live next to code.** `foo.ts` + `foo.test.ts`, or `components/Foo.tsx` + `components/__tests__/Foo.test.tsx`.
