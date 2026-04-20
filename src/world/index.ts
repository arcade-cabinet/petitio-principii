import type { ArgumentGraph, TranscriptEntry } from "@/engine";
import { type World, createWorld } from "koota";

export type { World } from "koota";
import {
  AudioTheme,
  Exit as ExitTrait,
  IsPlayer,
  IsRoom,
  OutputLine,
  Position,
  RhetoricalSpace,
  RoomId,
} from "./traits";

export * from "./traits";
export { disposeAudio, initAudio, updateAudio } from "./systems/AudioSystem";
export {
  buildRhetoricalGraph,
  shortestRhetoricalPath,
  wireEdges,
  type RhetoricalPath,
} from "./systems/PathfindingSystem";

/** Frequency pool — each rhetorical type has a signature tonal centre. */
const RHETORICAL_FREQUENCIES: Record<RhetoricalSpaceType, { base: number; dissonance: number }> = {
  premise: { base: 220, dissonance: 0 }, // A3 — stable
  conclusion: { base: 329.63, dissonance: 0 }, // E4 — dominant
  definition: { base: 261.63, dissonance: 0.05 }, // C4 — clean
  analogy: { base: 293.66, dissonance: 0.1 }, // D4 — gently ambiguous
  fallacy: { base: 233.08, dissonance: 0.5 }, // Bb3 — tense
  circular: { base: 246.94, dissonance: 0.7 }, // B3 — unresolved
  objection: { base: 277.18, dissonance: 0.4 }, // C#4 — challenging
  meta: { base: 415.3, dissonance: 0.3 }, // G#4 — reflective
};

type RhetoricalSpaceType =
  | "premise"
  | "conclusion"
  | "definition"
  | "analogy"
  | "fallacy"
  | "circular"
  | "objection"
  | "meta";

/**
 * Build a koota world from a pure-engine argument graph.
 *
 * Each room becomes an entity with IsRoom + RoomId + RhetoricalSpace + AudioTheme.
 * Each exit becomes an entity with Exit (simpler than an edge relation for our
 * read-only graph). One player entity is spawned at the start room.
 */
export function buildWorld(graph: ArgumentGraph): World {
  const world = createWorld();

  for (const room of graph.rooms.values()) {
    const theme = RHETORICAL_FREQUENCIES[room.rhetoricalType];
    world.spawn(
      IsRoom,
      RoomId({ value: room.id }),
      RhetoricalSpace({
        type: room.rhetoricalType,
        title: room.title,
        description: room.description,
      }),
      AudioTheme({ baseFrequency: theme.base, dissonance: theme.dissonance })
    );

    for (const exit of room.exits) {
      world.spawn(
        ExitTrait({
          direction: exit.direction,
          targetRoomId: exit.targetRoomId,
          description: exit.description,
        })
      );
    }
  }

  world.spawn(IsPlayer, Position({ roomId: graph.startRoomId }));

  return world;
}

/** Monotonic ordinal per world so transcript order is unambiguous. */
const ordinalByWorld = new WeakMap<World, number>();

/**
 * Append one transcript line to the world as a dedicated entity.
 *
 * Each line is its own entity so React can key on its koota id and so
 * later systems can attach per-line traits (`IsAccepted`, `IsChallenged`,
 * relations to rooms and rhetorical moves) — the transcript becomes
 * addressable gameplay state, not an opaque string array.
 */
export function appendOutput(world: World, kind: TranscriptEntry["kind"], text: string): void {
  const next = (ordinalByWorld.get(world) ?? 0) + 1;
  ordinalByWorld.set(world, next);
  world.spawn(OutputLine({ ordinal: next, kind, text }));
}

/** Append a batch of lines in order. Convenience for describeRoom output. */
export function appendOutputLines(
  world: World,
  entries: ReadonlyArray<{ kind: TranscriptEntry["kind"]; text: string }>
): void {
  for (const entry of entries) {
    appendOutput(world, entry.kind, entry.text);
  }
}

/**
 * Project the world's OutputLine entities to a plain array, sorted by
 * ordinal. The returned `id` is the stable React key for each line.
 */
export function readTranscript(world: World): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  world
    .query(OutputLine)
    .select(OutputLine)
    .readEach(([line], entity) => {
      entries.push({
        id: `ol-${entity.id()}`,
        ordinal: line.ordinal,
        kind: line.kind,
        text: line.text,
      });
    });
  entries.sort((a, b) => a.ordinal - b.ordinal);
  return entries;
}
