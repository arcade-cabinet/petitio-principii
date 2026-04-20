---
title: Standards
updated: 2026-04-20
status: current
---

# Standards

Non-negotiable rules. Apply to every PR, every file, every commit.

## Code

- **TypeScript strict.** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. No `any` without a justifying comment.
- **Single path alias: `@/*` → `src/*`.** Cross-layer imports go through `@/<layer>` barrels. Internals of one layer are private to that layer.
- **Biome is the single source of style truth.** Run `pnpm check` before committing. Import sorting is enforced (organizeImports).
- **Determinism.** Every random choice threads through `createSeededRandom(seed)`. `Math.random()` is reserved for decorative visuals (stars, twinkle) — not game state.
- **No stubs, no `// TODO`, no `// not implemented`.** If a function doesn't work, delete it. Broken intent is worse than missing intent.

## File layout

- One responsibility per file. 300 LOC is a soft signal; a 250-line file that owns three subsystems is worse than a 400-line single-responsibility data table.
- Tests live next to their subject: `foo.ts` + `foo.test.ts`, or `components/Foo.tsx` + `components/__tests__/Foo.test.tsx`.
- Generated `.d.ts` files belong in `dist/`, never in `src/`. `.gitignore` enforces this; if you see one in source, your tsconfig is misconfigured.

## Commits and PRs

- **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`.
- **Squash-merge.** Branch commits can be messy; the PR landing commit should be one clean summary.
- **Never force-push `main`.** Feature branches are fine with `--force-with-lease`.
- **CI mirrors local.** If `pnpm verify` passes locally, CI passes. If CI fails but local doesn't, the environment drifted — fix the drift, don't paper over it.

## GitHub Actions

- **Pin every action to a commit SHA** with a trailing `# vX.Y.Z` comment. Never `@vN` tags. See [.github/workflows/](../.github/workflows/) for examples.
- **No untrusted input in `run:` steps.** PR titles, issue bodies, commit messages go through `env:` with quoting, never direct interpolation.

## Documentation

- **Every `.md` under `docs/` and at repo root has YAML frontmatter**: `title`, `updated` (ISO date), `status` (`current` | `draft` | `stale` | `archived`), and optionally `domain`.
- **Obsolete docs get updated, not left to rot.** If you change behaviour that a doc describes, update the doc in the same commit.

## Dependencies

- `pnpm` pinned via `packageManager` field. Don't use npm or yarn.
- Runtime deps live in `dependencies`; tooling in `devDependencies`.
- Prefer dependencies we already have (koota, yuka, tone, tracery, rita, phaser, retrozone, solid) over adding new ones.
