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

Anything in `@/engine` and `@/content` is pure TypeScript and gets a colocated `*.test.ts`. Run in a real browser via Vitest's Playwright provider to match the deploy target. Current coverage:

- `engine/core/ArgumentGraph.test.ts` — graph generation determinism and exit validity
- `engine/core/Parser.test.ts` — command aliases and fallback behaviour
- `engine/core/NarrativeGenerator.test.ts` — seeded phrase generation, describeRoom output
- `engine/prng/seedRandom.test.ts` — PRNG determinism and shuffle invariants
- `content/corpus/localCorpus.test.ts` — fallacy corpus derives from the canonical term list

### 2. Component — SolidJS rendering layer

Components in `@/terminal` render via `@solidjs/testing-library` against real DOM. Tests live in `components/__tests__/` next to their subject and exercise behaviour, not implementation.

- `terminal/components/__tests__/TerminalScreen.test.tsx` — renders output lines, shows title, exposes NEW GAME

### 3. Runtime — future E2E

Playwright-driven smoke test (planned): boot the app, pick a fixed seed, walk the argument, assert the circle closes. Not wired yet; see [STATE.md](STATE.md).

## What we don't mock

- **Not the browser.** Vitest runs in Chromium.
- **Not Phaser.** `StarfieldScene` is not unit-tested; it's decorative, and breakage shows up in the E2E once that's wired.
- **Not Tone.** `AudioSystem` is tested by inspection — the real audio graph is out-of-scope for vitest. The hook-points (`initAudio`, `disposeAudio`, `updateAudio`) have single responsibilities, so we test the trait queries that drive them, not the sound output.

## Running

```sh
pnpm test            # run once, CI-style
pnpm test:watch      # re-run on change
pnpm verify          # check + typecheck + test + build (mirrors CI)
```

If `pnpm verify` passes, CI passes. That's the invariant.
