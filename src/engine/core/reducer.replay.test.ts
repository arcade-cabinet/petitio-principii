import { type World, buildWorld, readTranscript } from "@/world";
import {
  IsPlayer,
  Position,
  RhetoricalSpace,
  RoomId,
  appendOutput,
  beginTurn,
  isCircleClosed,
  markCircleClosed,
  markHintShown,
  markRoomAccepted,
  markRoomQuestioned,
  markRoomRejected,
  markVisited,
  readArgumentMemory,
  readHintsShown,
} from "@/world";
import { describe, expect, it } from "vitest";
import { ArgumentAgent } from "../ai/argument-agent";
import type { ArgumentMemory } from "../ai/argument-traits";
import { createSeededRandom } from "../prng/seedRandom";
import { generateArgumentGraph } from "./ArgumentGraph";
import { type GameState, createInitialGameState } from "./GameState";
import { describeRoom } from "./NarrativeGenerator";
import type { Room } from "./Room";
import { type AudioSink, type WorldBridge, applyCommand } from "./reducer";

/**
 * T52 — 100-turn byte-identical replay audit.
 *
 * Runs a scripted session twice with the same seed and asserts that the
 * produced transcripts match byte-for-byte. This is the end-to-end
 * determinism contract that everything in P11 (seeded Tracery wrapper,
 * grammars.json, chainDescription, generatePhrase, agent respondTo)
 * and P12 (TurnMark projection, hint selection) exists to preserve.
 *
 * The test does NOT touch React, koota hooks, or Howler. It wires a bare
 * WorldBridge directly to a koota World + Yuka ArgumentAgent and drives
 * `applyCommand` through a fixed input list twice, building an
 * independent World for each run. If the two runs diverge at any line,
 * the tests fails on the first mismatch.
 */

const SEED = 1337;

// Scripted input list — long enough to exercise movement, rhetorical
// verbs, hint emission, and agent state transitions. Mix of valid and
// invalid moves so the failure-branch also sees coverage.
const INPUTS: readonly string[] = [
  "look",
  "examine",
  "north",
  "look",
  "question",
  "south",
  "accept",
  "east",
  "look",
  "examine",
  "reject",
  "west",
  "north",
  "question",
  "north",
  "accept",
  "south",
  "look",
  "east",
  "trace back",
  "question",
  "north",
  "accept",
  "north",
  "look",
  "examine",
  "south",
  "accept",
  "east",
  "reject",
  "west",
  "north",
  "look",
  "question",
  "south",
  "accept",
  "east",
  "trace back",
  "north",
  "look",
  "examine",
  "accept",
  "north",
  "south",
  "question",
  "look",
  "east",
  "accept",
  "west",
  "reject",
  "north",
  "look",
  "question",
  "south",
  "examine",
  "accept",
  "east",
  "look",
  "north",
  "reject",
  "south",
  "accept",
  "east",
  "question",
  "north",
  "look",
  "west",
  "accept",
  "south",
  "examine",
  "north",
  "look",
  "reject",
  "east",
  "question",
  "accept",
  "south",
  "west",
  "look",
  "examine",
  "north",
  "accept",
  "question",
  "south",
  "east",
  "reject",
  "look",
  "west",
  "north",
  "accept",
  "examine",
  "south",
  "east",
  "question",
  "accept",
  "north",
  "west",
  "look",
  "south",
  "east",
  "accept",
];

function createBridge(world: World, rooms: Map<string, Room>, agent: ArgumentAgent): WorldBridge {
  const visitCounts = new Map<string, number>();
  for (const id of rooms.keys()) visitCounts.set(id, 0);
  // The start room counts as the first visit (mirrors buildWorld + useWorld).
  return {
    movePlayer: (roomId) => {
      for (const entity of world.query(IsPlayer, Position)) {
        const pos = entity.get(Position);
        if (pos) entity.set(Position, { roomId });
      }
      visitCounts.set(roomId, (visitCounts.get(roomId) ?? 0) + 1);
    },
    appendLine: (kind, text) => appendOutput(world, kind, text),
    beginTurn: () => beginTurn(world),
    readHintsShown: () => readHintsShown(world),
    markHintShown: (id) => markHintShown(world, id),
    findNextHopToCircle: (_fromRoomId) => {
      // For replay, we don't need pathfinding — TRACE BACK falls through
      // to "you cannot trace back from here" and still emits transcript.
      // Determinism holds because both runs take the same branch.
      return null;
    },
    markVisited: (roomId) => markVisited(world, roomId),
    markRoomAccepted: (roomId) => markRoomAccepted(world, roomId),
    markRoomRejected: (roomId) => markRoomRejected(world, roomId),
    markRoomQuestioned: (roomId) => markRoomQuestioned(world, roomId),
    markCircleClosed: () => markCircleClosed(world),
    readMemory: (turnCount: number): ArgumentMemory => readArgumentMemory(world, turnCount),
    argument: agent,
    seed: SEED,
    visitCount: (roomId) => visitCounts.get(roomId) ?? 0,
  };
}

function makeInitialState(seed: number): { state: GameState; rooms: Map<string, Room> } {
  const graph = generateArgumentGraph(seed);
  const rooms = graph.rooms;
  const start = rooms.get(graph.startRoomId);
  if (!start) throw new Error(`start room ${graph.startRoomId} missing from graph`);
  const state: GameState = {
    ...createInitialGameState(),
    seed,
    currentRoomId: graph.startRoomId,
    rooms,
    started: true,
  };
  // Seed the opening description into state.transcript by running describe
  // once here — the reducer doesn't own the start-of-game narration, but
  // replay needs both runs to begin from the same state.
  const world = buildWorld(graph);
  const opening = describeRoom(start, { seed, visitCount: 1 });
  for (const line of opening) appendOutput(world, "narration", line);
  state.transcript = readTranscript(world);
  state.output = state.transcript.map((e) => e.text);
  state.turnCount = 0;
  return { state, rooms };
}

function runSession(
  inputs: readonly string[],
  seed: number
): {
  transcript: string[];
  circleClosed: boolean;
} {
  const graph = generateArgumentGraph(seed);
  const world = buildWorld(graph);
  // Mark start as the first visit so visitCount starts at 1 like useWorld.
  const { state: initialState, rooms } = makeInitialState(seed);
  // Use the real ArgumentAgent with a seeded RNG so agent responses are
  // deterministic across runs.
  const agent = new ArgumentAgent({ rng: createSeededRandom(seed) });
  const bridge = createBridge(world, rooms, agent);
  const audio: AudioSink = { playSfx: () => {} };

  // Re-emit the opening narration into this run's world so the transcript
  // projection below includes it (makeInitialState built a disposable
  // world just to capture the opening lines for state.transcript, but
  // this run needs its own world with those lines too).
  for (const line of initialState.transcript) {
    appendOutput(world, line.kind, line.text);
  }

  let state = initialState;
  for (const input of inputs) {
    state = applyCommand(state, input, bridge, audio);
    // Refresh the plain-data transcript off the world so the reducer's
    // hint system sees the running echo history.
    state = { ...state, transcript: readTranscript(world) };
  }

  // Touch rooms variable to placate noUnusedLocals in strict mode.
  void rooms;

  return {
    transcript: readTranscript(world).map((e) => `${e.kind}:${e.text}`),
    circleClosed: isCircleClosed(world),
  };
}

describe("reducer replay determinism", () => {
  it("100-turn scripted session produces byte-identical transcripts for the same seed", () => {
    const run1 = runSession(INPUTS, SEED);
    const run2 = runSession(INPUTS, SEED);

    // Compare lengths first — on mismatch Vitest shows both numbers.
    expect(run2.transcript.length).toBe(run1.transcript.length);

    // Compare line by line — the first diverging line is the signal.
    for (let i = 0; i < run1.transcript.length; i++) {
      expect(run2.transcript[i], `line ${i}`).toBe(run1.transcript[i]);
    }

    // Circle-closed state should match too.
    expect(run2.circleClosed).toBe(run1.circleClosed);
  });

  it("different seeds produce different transcripts", () => {
    const runA = runSession(INPUTS, 1337);
    const runB = runSession(INPUTS, 4711);
    expect(runA.transcript.join("\n")).not.toBe(runB.transcript.join("\n"));
  });

  // Sanity check — tests use a Yuka RhetoricalSpace so unused import isn't warned.
  void RhetoricalSpace;
  void RoomId;
});
