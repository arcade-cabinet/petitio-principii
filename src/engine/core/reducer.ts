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
      appendLines(world, [`You move ${dir}.`, "", ...describeRoom(next)]);
      return { ...state, currentRoomId: next.id, turnCount: state.turnCount + 1 };
    }
  }
  world.appendLine(
    "narration",
    "You cannot go that way. The argument has no passage in that direction."
  );
  return { ...state, turnCount: state.turnCount + 1 };
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
      return bump(describeRoom(currentRoom));

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
      audio.playSfx("rhetoric.question");
      return bump([
        "You question the assumption.",
        `The ${currentRoom.title} trembles slightly. Good question. The argument doesn't have a ready answer.`,
      ]);

    case "ask":
      audio.playSfx("rhetoric.question");
      return bump([
        "You ask: Why?",
        `The ${currentRoom.title} echoes. A voice replies: "Because it follows from the premise." You note that the premise has not been justified.`,
      ]);

    case "accept":
      audio.playSfx("rhetoric.accept");
      if (currentRoom.rhetoricalType === "circular" || currentRoom.rhetoricalType === "meta") {
        audio.playSfx("circle.closed");
        return bump([
          "You accept the argument.",
          "The conclusion you have accepted is identical to the premise from which you began.",
          "You have completed the circle. Petitio Principii.",
          "",
          "The argument was always about itself.",
        ]);
      }
      return bump([
        "You accept this step in the argument.",
        "The argument notes your acceptance and moves on, emboldened.",
      ]);

    case "reject":
      audio.playSfx("rhetoric.reject");
      return bump([
        "You reject this argument.",
        "The argument buckles but does not collapse. It has more premises.",
      ]);

    case "trace": {
      audio.playSfx("rhetoric.trace");
      const nextHop = world.findNextHopToCircle(currentRoom.id);
      if (nextHop) {
        const next = state.rooms.get(nextHop);
        if (next) {
          world.movePlayer(next.id, next.rhetoricalType);
          appendLines(world, ["You trace back through the argument.", "", ...describeRoom(next)]);
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
