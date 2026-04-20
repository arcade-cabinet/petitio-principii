# Petitio Principii

A browser-based, PRNG-driven text adventure about navigating a long-winded, self-referential, and often nonsensical argument. The player is a mind re-entering an argument it once made, discovering that every path of justification leads back to the premise it was trying to prove.

> *Petitio principii* (Latin): "asking for what is sought" — the formal name for the fallacy of begging the question. The game is the fallacy.

See [docs/LORE.md](docs/LORE.md) for the full conceit and [docs/DESIGN.md](docs/DESIGN.md) for the mechanical spec.

## Stack

- **TypeScript** (ESNext, strict) — engine and world are framework-agnostic
- **React 19** + **Vite 8** — thin UI shell around the engine
- **Tailwind 4** (via `@tailwindcss/vite`) + **tw-animate-css** + **shadcn** conventions for components
- **koota** ECS for the runtime world — rooms, transcript lines, and memory traits are all entities
- **Yuka** for graph search (Dijkstra) over the rhetorical graph, and (coming) for the argument-as-AI-opponent state machine
- **Howler** for audio (Clément Panchout BGM; Kenney CC0 SFX packs)
- **tracery-grammar** + **RiTa** (build-time) for text generation
- **Motion** (React bindings of Motion One) for declarative animation
- **Capacitor** for iOS + Android deployment; web still deploys to GitHub Pages
- **Biome** for formatting, linting, import-sorting
- **Vitest** (real-browser Playwright runner) for tests
- **pnpm** (pinned via `packageManager`) for package management

## Development

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # what CI runs: check → typecheck → test → build
```

CI is a thin shell around `pnpm verify` — if it passes locally it passes on CI. See [docs/STATE.md](docs/STATE.md) for shipped / in-progress / next-up, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layered design.

## Structure

```
src/
  app/           entry (main.tsx) + App shell
  components/    shadcn-style primitives (ui/crystal-field, ui/glowing-panel, ui/keycap, …)
  features/      feature compositions (new-game/, terminal/)
  hooks/         React hooks (use-game, use-world, use-audio)
  engine/        pure game logic (argument graph, parser, reducer, narrative) + AI agent
  content/       lexicon, templates, tracery grammars, build-time generated corpus
  world/         koota ECS — traits and systems (pathfinding, memory)
  design/        globals.css + tokens
  lib/           cn() + audio-manifest
  types/         hand-written ambients only
public/
  audio/         BGM (Panchout, full-length opus) + curated SFX (Kenney CC0)
scripts/         build-time pipelines (RiTa corpus builder)
```

Cross-layer imports go through the `@/<layer>` barrel. Deep imports across layers are a smell — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

MIT — see [LICENSE](LICENSE). BGM by Clément Panchout, used under licensed terms; SFX are Kenney CC0.
