# Petitio Principii

A browser-based, PRNG-driven text adventure about navigating a long-winded, self-referential, and often nonsensical argument. Styled as an old CRT teletype overlaid on a memory-palace-in-the-night-sky aesthetic.

> *Petitio principii* (Latin): "asking for what is sought" — the formal name for the fallacy of begging the question. The game is the fallacy.

## Stack

- **TypeScript** (ESNext, strict)
- **SolidJS** for the interactive terminal UI
- **Phaser 4** for the starfield backdrop
- **RetroZone** for the CRT shader overlay
- **koota** ECS for world state (rooms, player presence, audio themes)
- **Yuka** for graph search (Dijkstra) over the rhetorical graph
- **Tone.js** for room-aware ambient audio
- **tracery-grammar** + **RiTa** for text generation
- **Biome** for formatting, linting, import-sorting
- **Vitest** (real-browser Playwright runner) for tests
- **pnpm** (pinned via `packageManager`) for package management

## Development

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # what CI runs: check → typecheck → test → build
```

CI is a thin shell around `pnpm verify` — if it passes locally it passes on CI. See [docs/STATE.md](docs/STATE.md) for what's shipped and what's next, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layered design.

## Structure

```
src/
  engine/      pure game logic (argument graph, parser, narrative)
  content/     lexicon, templates, tracery grammars, corpora
  world/       koota ECS — traits and systems (audio, pathfinding)
  design/      theme, typography, game tokens, CRT stylesheet
  render/      Phaser scenes + RetroZone overlay
  terminal/    SolidJS terminal UI (components + composables)
  types/       hand-written ambient declarations
```

Cross-layer imports go through barrels via `@/<layer>`. Deep imports across layers are a smell — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

MIT — see [LICENSE](LICENSE).
