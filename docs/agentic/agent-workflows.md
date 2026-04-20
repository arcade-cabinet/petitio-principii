---
title: Agentic Workflows
updated: 2026-04-20
status: current
domain: technical
---

# Agentic Workflows

Context for AI agents (Claude Code, subagents dispatched via `/task-batch`) working on the Petitio Principii repository.

## Guiding principles

1. **Challenge assumptions.** Don't blindly implement standard text-adventure tropes. If a system can be made more absurd or more philosophically engaging, propose the change. The conceit (see [LORE.md](../LORE.md)) leans into being self-referential — resist flattening it.

2. **Embrace the current stack.**
   - **React 19** for the UI shell. Components in `@/components/ui` follow shadcn conventions (`cn()` helper, variants via CVA, Tailwind 4 utility classes).
   - **koota ECS** for runtime state — rooms, transcript lines, player position, and memory traits are all entities. Prefer ECS traits over ad-hoc state where the data is game state.
   - **Yuka** for graph logic (Dijkstra over the rhetorical graph) and AI state machines (argument-as-opponent FSM). Don't reinvent graph search.
   - **Howler** for audio with real authored assets (BGM by Clément Panchout, SFX by Kenney). Add sounds by editing `src/lib/audio-manifest.ts`; the engine emits semantic `SfxKey` values and never sees filenames.
   - **RiTa at build time only.** Runtime never imports `rita`; it consumes frozen `GENERATED_CORPUS` from `src/content/generated/`.
   - **Biome** for formatting, linting, and import-sort. Run `pnpm check` before committing.
   - **Capacitor** is the mobile target. The web deploy (GitHub Pages) must keep working.

3. **Content expansion.** Prefer public-domain surrealist and absurdist literature (Carroll, Breton, Dada, pre-1929 US) over generic fantasy/sci-fi tropes. All quoted fragments must be PD-verifiable; new prose in that register gets tagged `derivative: true` in the source.

4. **Deterministic chaos.** All random generation must thread through `createSeededRandom(seed)` from `@/engine`. The one allowed exception is `CrystalField`'s decorative stroke jitter. If you add a generator, seed it from the current game's seed.

5. **Engine stays framework-agnostic.** `src/engine/` must not import React, Howler, or koota. The engine defines interfaces (`WorldBridge`, `AudioSink`) that the React layer implements. This is how tests stay fast and how alternate surfaces (CLI replay, server-side render-tree snapshots) remain possible.

6. **Improve as you go.** Leave the codebase and this doc better than you found them. If a pattern you shipped turns out wrong two commits later, correct it in-place with a refactor commit — don't leave cruft for "later."

## Running in parallel

The `/task-batch` skill dispatches independent tasks to subagents. To avoid collision:

- **Engine changes** (src/engine/) — one agent at a time
- **World/ECS changes** (src/world/) — one agent at a time
- **Hooks** (src/hooks/) — one agent at a time
- **UI primitives** (src/components/ui/) — parallel OK, one agent per primitive
- **Feature compositions** (src/features/) — parallel OK, one agent per feature
- **Docs** (docs/, *.md) — parallel OK, but beware merge conflicts on STATE.md and the PRD
- **Capacitor / CI / deploy** (capacitor.config.ts, android/, .github/workflows/) — one agent
- **Scripts** (scripts/) — one agent

When in doubt, read `git status` first and coordinate by editing disjoint file sets.

## Commit discipline

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`.
- Commit after each task reaches VERIFIED_DONE (`pnpm verify` green).
- Scope commits narrowly — one task's work per commit when possible.
- Never force-push `main`. Feature branches use `--force-with-lease`.
- `pnpm verify` mirrors CI; if local passes, CI passes. Fix environment drift at its root, don't paper over.

## Where to look

- **Current state:** [../STATE.md](../STATE.md) — what's shipped, in progress, next
- **The fiction:** [../LORE.md](../LORE.md) + [../VOICE.md](../VOICE.md)
- **The mechanical spec:** [../DESIGN.md](../DESIGN.md)
- **The layered stack:** [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **The quality bar:** [../../STANDARDS.md](../../STANDARDS.md)
- **The long-form plan:** [../plans/react-mobile-mvp.prq.md](../plans/react-mobile-mvp.prq.md)
