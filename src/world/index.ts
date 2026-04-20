import { rhetoricOf } from "@/config";
import type { ArgumentGraph, TranscriptEntry } from "@/engine";
import { type ArgumentMemory, createEmptyMemory } from "@/engine/ai/argument-traits";
import { type World, createWorld } from "koota";

export type { World } from "koota";
import {
  AudioTheme,
  CircleClosed,
  Exit as ExitTrait,
  HintsShown,
  IsPlayer,
  IsRoom,
  OutputLine,
  Position,
  RhetoricalSpace,
  RoomId,
  TurnMark,
  Visited,
  WasAccepted,
  WasQuestioned,
  WasRejected,
} from "./traits";

export * from "./traits";
export {
  buildRhetoricalGraph,
  shortestRhetoricalPath,
  wireEdges,
  type RhetoricalPath,
} from "./systems/PathfindingSystem";

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
    const config = rhetoricOf(room.rhetoricalType);
    world.spawn(
      IsRoom,
      RoomId({ value: room.id }),
      RhetoricalSpace({
        type: room.rhetoricalType,
        title: room.title,
        description: room.description,
      }),
      AudioTheme({ baseFrequency: config.tonalCentre.hz, dissonance: config.dissonance })
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

  // The player begins in the start room — that counts as the first visit.
  // Stamping this here means `readVisitHistory` is correct from turn 0 and
  // the ArgumentMap renders a single node the moment the game starts.
  markVisited(world, graph.startRoomId);

  return world;
}

/** Monotonic ordinal per world so transcript order is unambiguous. */
const ordinalByWorld = new WeakMap<World, number>();

/**
 * Monotonic turn id per world. Incremented by `beginTurn()` at the top of
 * every player-input handling pass; all `appendOutput` calls within that
 * pass stamp their lines with the current turn. Turn 0 is reserved for
 * system-emitted lines that precede the first player input.
 */
const turnIdByWorld = new WeakMap<World, number>();

/** Advance the turn counter. Called by the reducer at the top of each input. */
export function beginTurn(world: World): number {
  const next = (turnIdByWorld.get(world) ?? 0) + 1;
  turnIdByWorld.set(world, next);
  return next;
}

/** Current turn id — 0 before the first `beginTurn`. */
export function currentTurnId(world: World): number {
  return turnIdByWorld.get(world) ?? 0;
}

/**
 * Append one transcript line to the world as a dedicated entity.
 *
 * Each line is its own entity so React can key on its koota id and so
 * later systems can attach per-line traits (`IsAccepted`, `IsChallenged`,
 * relations to rooms and rhetorical moves) — the transcript becomes
 * addressable gameplay state, not an opaque string array.
 *
 * Every line is stamped with the current `TurnMark`. See docs/UX.md §2 —
 * the UI groups on turnId to project the transcript into past/present.
 */
export function appendOutput(world: World, kind: TranscriptEntry["kind"], text: string): void {
  const next = (ordinalByWorld.get(world) ?? 0) + 1;
  ordinalByWorld.set(world, next);
  const turnId = turnIdByWorld.get(world) ?? 0;
  world.spawn(OutputLine({ ordinal: next, kind, text }), TurnMark({ turnId }));
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
    .query(OutputLine, TurnMark)
    .select(OutputLine, TurnMark)
    .readEach(([line, turn], entity) => {
      entries.push({
        id: `ol-${entity.id()}`,
        ordinal: line.ordinal,
        kind: line.kind,
        text: line.text,
        turnId: turn.turnId,
      });
    });
  entries.sort((a, b) => a.ordinal - b.ordinal);
  return entries;
}

/**
 * Group the transcript by turn id.
 *
 * Returns one `TranscriptTurn` per logical beat of play. Lines that
 * predate the first `beginTurn()` call land in turn 0. Turns are in
 * play-order — turn[0] is the oldest, turn[-1] is the present.
 *
 * The past/present projection the display relies on (docs/UX.md §1) just
 * takes `turns.slice(0, -1)` as the PAST and `turns.at(-1)` as the
 * PRESENT. No further state lives in the UI — it is a pure function of
 * the koota store's OutputLine + TurnMark traits.
 */
export interface TranscriptTurn {
  readonly turnId: number;
  readonly entries: readonly TranscriptEntry[];
}

export function readTranscriptByTurn(world: World): TranscriptTurn[] {
  const flat = readTranscript(world);
  const turns: TranscriptTurn[] = [];
  let currentId: number | null = null;
  let bucket: TranscriptEntry[] = [];
  for (const entry of flat) {
    if (entry.turnId !== currentId) {
      if (bucket.length > 0 && currentId !== null) {
        turns.push({ turnId: currentId, entries: bucket });
      }
      currentId = entry.turnId;
      bucket = [];
    }
    bucket.push(entry);
  }
  if (bucket.length > 0 && currentId !== null) {
    turns.push({ turnId: currentId, entries: bucket });
  }
  return turns;
}

/**
 * Increment a per-room counter trait, adding the trait on first use.
 *
 * We keep the trait absent on rooms the player hasn't acted on — that
 * keeps `query(IsRoom, WasAccepted)` meaningful as "rooms the player has
 * actually accepted", not "every room, zero-initialised".
 */
type CounterTrait = typeof WasAccepted | typeof WasRejected | typeof WasQuestioned;

function bumpRoomCounter(world: World, roomId: string, counter: CounterTrait): void {
  world
    .query(IsRoom, RoomId)
    .select(RoomId)
    .readEach(([id], entity) => {
      if (id.value !== roomId) return;
      if (entity.has(counter)) {
        const current = entity.get(counter);
        if (current) entity.set(counter, { count: current.count + 1 });
      } else {
        entity.add(counter({ count: 1 }));
      }
    });
}

export function markRoomAccepted(world: World, roomId: string): void {
  bumpRoomCounter(world, roomId, WasAccepted);
}
export function markRoomRejected(world: World, roomId: string): void {
  bumpRoomCounter(world, roomId, WasRejected);
}
export function markRoomQuestioned(world: World, roomId: string): void {
  bumpRoomCounter(world, roomId, WasQuestioned);
}

/**
 * Project the world's per-room tallies into the plain-data shape the
 * argument agent reads.
 *
 * One pass over every IsRoom entity; counters absent on a given room
 * contribute zero. Totals are recomputed from scratch each call — cheap
 * for the room counts we're dealing with and avoids drift.
 */
export function readArgumentMemory(world: World, turnCount: number): ArgumentMemory {
  const memory = createEmptyMemory();
  memory.turnCount = turnCount;

  world
    .query(IsRoom, RoomId)
    .select(RoomId)
    .readEach(([id], entity) => {
      const accepted = entity.has(WasAccepted) ? (entity.get(WasAccepted)?.count ?? 0) : 0;
      const rejected = entity.has(WasRejected) ? (entity.get(WasRejected)?.count ?? 0) : 0;
      const questioned = entity.has(WasQuestioned) ? (entity.get(WasQuestioned)?.count ?? 0) : 0;
      if (accepted === 0 && rejected === 0 && questioned === 0) return;
      memory.byRoom.set(id.value, { accepted, rejected, questioned });
      memory.totalAccepted += accepted;
      memory.totalRejected += rejected;
      memory.totalQuestioned += questioned;
    });

  return memory;
}

// ---------------------------------------------------------------------------
// Visit history + circle-closed — what the ArgumentMap reads.
// ---------------------------------------------------------------------------

/** Monotonic visit ordinal per world — first room visited = 1, next = 2, ... */
const visitOrderByWorld = new WeakMap<World, number>();

/**
 * Stamp the Visited trait on a room entity if it hasn't been stamped yet.
 * Idempotent; re-entering an already-visited room is a no-op here
 * (revisit counts live in the per-verb counter traits, not in Visited).
 */
export function markVisited(world: World, roomId: string): void {
  for (const entity of world.query(IsRoom, RoomId)) {
    const id = entity.get(RoomId);
    if (!id || id.value !== roomId) continue;
    if (entity.has(Visited)) continue;
    const nextOrdinal = (visitOrderByWorld.get(world) ?? 0) + 1;
    visitOrderByWorld.set(world, nextOrdinal);
    entity.add(Visited({ ordinal: nextOrdinal }));
  }
}

export interface VisitRecord {
  readonly roomId: string;
  readonly ordinal: number;
  readonly rhetoricalType:
    | "premise"
    | "conclusion"
    | "definition"
    | "analogy"
    | "fallacy"
    | "circular"
    | "objection"
    | "meta";
}

/** Chronological first-visit sequence for the ArgumentMap. */
export function readVisitHistory(world: World): VisitRecord[] {
  const records: VisitRecord[] = [];
  world
    .query(IsRoom, Visited, RoomId, RhetoricalSpace)
    .select(Visited, RoomId, RhetoricalSpace)
    .readEach(([v, id, space]) => {
      records.push({
        roomId: id.value,
        ordinal: v.ordinal,
        rhetoricalType: space.type,
      });
    });
  records.sort((a, b) => a.ordinal - b.ordinal);
  return records;
}

/**
 * Mark the world as closed. Attached to the player entity (there's only
 * one per world, and the state is conceptually player-owned: "you have
 * closed the circle"). Idempotent.
 */
export function markCircleClosed(world: World): void {
  for (const entity of world.query(IsPlayer)) {
    if (!entity.has(CircleClosed)) entity.add(CircleClosed);
  }
}

/** Has the player closed the circle? */
export function isCircleClosed(world: World): boolean {
  for (const _ of world.query(IsPlayer, CircleClosed)) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Onboarding hints (HintsShown trait) — see src/features/terminal/hints.ts
// for the catalogue and `selectHint` logic.
// ---------------------------------------------------------------------------

/** Read the set of hint ids already shown. Returns an empty set if none yet. */
export function readHintsShown(world: World): ReadonlySet<string> {
  for (const entity of world.query(IsPlayer)) {
    if (!entity.has(HintsShown)) return EMPTY_STRING_SET;
    const trait = entity.get(HintsShown);
    return trait?.ids ?? EMPTY_STRING_SET;
  }
  return EMPTY_STRING_SET;
}

/** Mark a hint id as shown. Idempotent; first call lazily adds the trait. */
export function markHintShown(world: World, id: string): void {
  for (const entity of world.query(IsPlayer)) {
    if (!entity.has(HintsShown)) {
      entity.add(HintsShown({ ids: new Set([id]) }));
      return;
    }
    const current = entity.get(HintsShown);
    if (current) current.ids.add(id);
    return;
  }
}

const EMPTY_STRING_SET: ReadonlySet<string> = new Set();
