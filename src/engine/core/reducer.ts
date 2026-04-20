import type { ArgumentAgent } from "../ai/argument-agent";
import type { ArgumentMemory } from "../ai/argument-traits";
import type { CommandVerb, ParsedCommand } from "./Command";
import type { GameState } from "./GameState";
import { describeRoom, getHelpText } from "./NarrativeGenerator";
import { parseCommand } from "./Parser";
import type { Direction, Room } from "./Room";
import type { SfxKey } from "./audio-effects";

/**
 * Pure, framework-agnostic command reducer.
 *
 * The UI hands us the current GameState plus a thin world-bridge — opaque
 * to the engine layer — and we return the next GameState plus a list of
 * effects to apply to that bridge (room moves, transcript appends, audio
 * cues). This is the clearest possible boundary:
 *
 *   engine                  world bridge                 audio sink
 *   -------                 ------------                 ----------
 *   applyCommand →          onMove(roomId)               playSfx(key)
 *   (pure)                  onAppend(kind, text)         playBgm / stopBgm
 *                           findTraceTarget() → roomId?
 *
 * The hook that wires it (`useGame`) holds the koota World and the Yuka
 * pathfinding cache; neither touches this file. Engine imports nothing
 * from React or world.
 */

const MOVEMENT: readonly Direction[] = [
  "north",
  "south",
  "east",
  "west",
  "up",
  "down",
  "back",
  "forward",
];

export interface WorldBridge {
  /** Move the player entity and cue ambient audio for the destination room. */
  movePlayer: (roomId: string, toRoomType: Room["rhetoricalType"]) => void;
  /** Append a transcript line through the ECS so React can key on its entity id. */
  appendLine: (kind: "narration" | "echo" | "title" | "spacer", text: string) => void;
  /** Ask Yuka for the next hop toward the nearest circular/meta room. */
  findNextHopToCircle: (fromRoomId: string) => string | null;
  /** Stamp the Visited trait on the room entity for the ArgumentMap. */
  markVisited: (roomId: string) => void;
  /** Increment the per-room counter trait (WasAccepted / Rejected / Questioned). */
  markRoomAccepted: (roomId: string) => void;
  markRoomRejected: (roomId: string) => void;
  markRoomQuestioned: (roomId: string) => void;
  /** Flip the CircleClosed tag on the player entity; idempotent. */
  markCircleClosed: () => void;
  /** Read the memory projection that the argument agent and chainer consume. */
  readMemory: (turnCount: number) => ArgumentMemory;
  /** The argument-as-agent. Responds to accept/reject/question verbs. */
  argument: ArgumentAgent;
  /** The seed for the current game — threads into chained descriptions. */
  seed: number;
  /** How many times each room has been entered. Used by the chainer. */
  visitCount: (roomId: string) => number;
}

export interface AudioSink {
  playSfx: (key: SfxKey) => void;
}

/**
 * Apply one raw input string to the state. Returns the next state.
 * All side effects (transcript appends, room moves, audio cues) are routed
 * through the bridges — the reducer never touches koota or Howler directly.
 */
export function applyCommand(
  state: GameState,
  raw: string,
  world: WorldBridge,
  audio: AudioSink
): GameState {
  if (!raw.trim()) return state;

  const parsed = parseCommand(raw);
  const currentRoom = state.rooms.get(state.currentRoomId);

  // Echo the player's input
  world.appendLine("echo", `> ${raw}`);

  if (!state.started || !currentRoom) {
    world.appendLine("narration", "The argument has not yet begun.");
    return state;
  }

  // Movement verbs
  if (MOVEMENT.includes(parsed.verb as Direction)) {
    return applyMovement(state, parsed, currentRoom, world, audio);
  }

  return applyRhetoricalVerb(state, parsed, raw, currentRoom, world, audio);
}

function applyMovement(
  state: GameState,
  parsed: ParsedCommand,
  currentRoom: Room,
  world: WorldBridge,
  _audio: AudioSink
): GameState {
  const dir = parsed.verb as Direction;
  const exit = currentRoom.exits.find((e) => e.direction === dir);
  if (exit) {
    const next = state.rooms.get(exit.targetRoomId);
    if (next) {
      world.movePlayer(next.id, next.rhetoricalType);
      world.markVisited(next.id);
      appendLines(world, [`You move ${dir}.`, "", ...describeRoomChained(next, world, state)]);
      return { ...state, currentRoomId: next.id, turnCount: state.turnCount + 1 };
    }
  }
  world.appendLine(
    "narration",
    "You cannot go that way. The argument has no passage in that direction."
  );
  return { ...state, turnCount: state.turnCount + 1 };
}

/**
 * Wrap describeRoom with the chainer bindings — seed, visitCount, memory.
 * The engine stays pure; the bridge provides the world projections.
 */
function describeRoomChained(room: Room, world: WorldBridge, state: GameState): string[] {
  const memory = world.readMemory(state.turnCount);
  const accepted = new Set<string>();
  const rejected = new Set<string>();
  const questioned = new Set<string>();
  for (const [id, tally] of memory.byRoom) {
    if (tally.accepted > 0) accepted.add(id);
    if (tally.rejected > 0) rejected.add(id);
    if (tally.questioned > 0) questioned.add(id);
  }
  return describeRoom(room, {
    seed: world.seed,
    visitCount: world.visitCount(room.id),
    memory: { accepted, rejected, questioned },
  });
}

/**
 * Ask the Yuka argument agent to respond. Centralises the per-verb flow:
 *   1. Mark the room so the memory projection reflects this act.
 *   2. Build the context (fresh memory projection + room context).
 *   3. respondTo(verb, ctx) — the agent's StateMachine/Think arbitrates
 *      and returns narration + an optional sfx intent.
 *   4. Emit audio and append narration.
 */
function agentRespond(
  verb: "accept" | "reject" | "question",
  room: Room,
  state: GameState,
  world: WorldBridge,
  audio: AudioSink
): string[] {
  // Mark first so readMemory includes the just-issued act.
  if (verb === "accept") world.markRoomAccepted(room.id);
  else if (verb === "reject") world.markRoomRejected(room.id);
  else world.markRoomQuestioned(room.id);

  const memory = world.readMemory(state.turnCount + 1);
  const response = world.argument.respondTo(verb, {
    memory,
    room: {
      id: room.id,
      title: room.title,
      rhetoricalType: room.rhetoricalType,
    },
  });

  if (response.sfx) audio.playSfx(response.sfx);
  if (verb === "accept" && response.state === "Triumphant") {
    world.markCircleClosed();
  }
  return response.lines;
}

function applyRhetoricalVerb(
  state: GameState,
  parsed: ParsedCommand,
  raw: string,
  currentRoom: Room,
  world: WorldBridge,
  audio: AudioSink
): GameState {
  const bump = (lines: readonly string[]): GameState => {
    appendLines(world, lines);
    return { ...state, turnCount: state.turnCount + 1 };
  };

  switch (parsed.verb satisfies CommandVerb) {
    case "look":
      audio.playSfx("rhetoric.examine");
      return bump(describeRoomChained(currentRoom, world, state));

    case "examine": {
      audio.playSfx("rhetoric.examine");
      const rooms = new Map(state.rooms);
      rooms.set(currentRoom.id, { ...currentRoom, examined: true });
      appendLines(world, [
        `You examine the ${currentRoom.title} more closely.`,
        currentRoom.description,
      ]);
      return { ...state, rooms, turnCount: state.turnCount + 1 };
    }

    case "help":
      return bump(getHelpText());

    case "question":
    case "ask":
      // Routed through the Yuka agent — state (Composed/Defensive/...) picks
      // the response. Agent returns lines + sfx; reducer only bumps turnCount.
      return bump(agentRespond("question", currentRoom, state, world, audio));

    case "accept":
      return bump(agentRespond("accept", currentRoom, state, world, audio));

    case "reject":
      return bump(agentRespond("reject", currentRoom, state, world, audio));

    case "trace": {
      audio.playSfx("rhetoric.trace");
      const nextHop = world.findNextHopToCircle(currentRoom.id);
      if (nextHop) {
        const next = state.rooms.get(nextHop);
        if (next) {
          world.movePlayer(next.id, next.rhetoricalType);
          world.markVisited(next.id);
          appendLines(world, [
            "You trace back through the argument.",
            "",
            ...describeRoomChained(next, world, state),
          ]);
          return { ...state, currentRoomId: next.id, turnCount: state.turnCount + 1 };
        }
      }
      return bump([
        "You cannot trace back further. This is where the argument begins—or claims to.",
      ]);
    }

    case "quit":
      return bump(["You cannot quit. The argument has already begun."]);

    case "inventory":
      return bump(["You are carrying nothing but your preconceptions."]);

    case "new":
      return bump(["Starting a new game..."]);

    // Direction verbs shouldn't reach here; MOVEMENT branch handled them.
    case "north":
    case "south":
    case "east":
    case "west":
    case "up":
    case "down":
    case "back":
      return bump([`You cannot go ${parsed.verb} from here.`]);

    default:
      return bump([`The argument does not understand "${raw}". Try HELP for available commands.`]);
  }
}

/** Append a batch of lines, classifying each into a transcript kind. */
function appendLines(world: WorldBridge, lines: readonly string[]): void {
  for (const line of lines) {
    world.appendLine(classifyLine(line), line);
  }
}

function classifyLine(text: string): "narration" | "echo" | "title" | "spacer" {
  if (text === "") return "spacer";
  if (text.startsWith(">")) return "echo";
  if (text.startsWith("== ") && text.endsWith(" ==")) return "title";
  return "narration";
}
