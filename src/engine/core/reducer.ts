import { selectHint } from "@/features/terminal/hints";
import type { ArgumentAgent } from "../ai/argument-agent";
import type { ArgumentMemory } from "../ai/argument-traits";
import type { CommandVerb, Move, ParsedCommand, SlotId } from "./Command";
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
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "up",
  "down",
];

export interface WorldBridge {
  /** Move the player entity and cue ambient audio for the destination room. */
  movePlayer: (roomId: string, toRoomType: Room["rhetoricalType"]) => void;
  /** Append a transcript line through the ECS so React can key on its entity id. */
  appendLine: (kind: "narration" | "echo" | "title" | "spacer", text: string) => void;
  /**
   * Advance the turn counter. Called once per applyCommand entry before any
   * appendLine — so every line emitted during that call belongs to the same
   * logical turn (see TurnMark trait + readTranscriptByTurn projection).
   */
  beginTurn: () => void;
  /** Read the set of onboarding hint ids already shown this game. */
  readHintsShown: () => ReadonlySet<string>;
  /** Mark a hint id as shown — idempotent, attaches HintsShown trait on first call. */
  markHintShown: (id: string) => void;
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
 * Map a clock SlotId to the raw string command it represents.
 * Chord slots get mapped individually; the chord handler assembles them.
 */
const SLOT_TO_COMMAND: Record<SlotId, string> = {
  UP: "up",
  DOWN: "down",
  NORTH: "north",
  NORTHEAST: "northeast",
  EAST: "east",
  SOUTHEAST: "southeast",
  SOUTH: "south",
  SOUTHWEST: "southwest",
  WEST: "west",
  NORTHWEST: "northwest",
  LOOK: "look",
  EXAMINE: "examine",
  QUESTION: "question",
  ASK_WHY: "ask why",
  ACCEPT: "accept",
  REJECT: "reject",
  TRACE_BACK: "trace back",
};

/**
 * Apply a clock Move (tap or chord) to the state.
 *
 * Tap: maps to a single raw command via SLOT_TO_COMMAND.
 * Chord: checks for a known chord template via resolveChord; if none matches,
 *        runs both slots sequentially (first then second) with a connective
 *        narration phrase separating them.
 *
 * Chords are a first-class verb, not two sequential commands — the beginTurn
 * call happens exactly once, so the entire chord belongs to one turn.
 */
export function applyMove(
  state: GameState,
  move: Move,
  world: WorldBridge,
  audio: AudioSink
): GameState {
  if (move.kind === "tap") {
    return applyCommand(state, SLOT_TO_COMMAND[move.slot], world, audio);
  }

  // Chord — try to resolve a template.
  const chordKey = chordTemplateKey(move.slots[0], move.slots[1]);
  const template = CHORD_TEMPLATES[chordKey];

  if (template) {
    // Known chord — run as a single named command.
    return applyCommand(state, template.command, world, audio);
  }

  // Unknown chord — apply both effects in sequence within ONE turn.
  // We begin the turn once and emit both effects plus a connective phrase.
  world.beginTurn();
  const currentRoom = state.rooms.get(state.currentRoomId);
  const rawA = SLOT_TO_COMMAND[move.slots[0]];
  const rawB = SLOT_TO_COMMAND[move.slots[1]];
  world.appendLine("echo", `> ${rawA} + ${rawB}`);

  if (!state.started || !currentRoom) {
    world.appendLine("narration", "The argument has not yet begun.");
    return state;
  }

  // Run both verbs' logic directly, accumulating state.
  // We call applyRhetoricalOrMovement for each, skipping beginTurn (already done).
  const parsedA = parseCommand(rawA);
  const parsedB = parseCommand(rawB);

  let nextState = applyVerbInternal(state, parsedA, rawA, currentRoom, world, audio);
  const roomForB = nextState.rooms.get(nextState.currentRoomId);
  if (roomForB) {
    world.appendLine("narration", "— and then —");
    nextState = applyVerbInternal(nextState, parsedB, rawB, roomForB, world, audio);
  }

  return {
    ...nextState,
    activeHint: maybeSelectHint(nextState, parsedB.verb, world),
  };
}

/**
 * Canonical chord key — sorted slot ids joined with "+".
 * Ensures UP+ACCEPT and ACCEPT+UP resolve to the same template.
 */
function chordTemplateKey(a: SlotId, b: SlotId): string {
  return [a, b].sort().join("+");
}

/**
 * Known chord templates. Each maps a canonical slot pair to a single
 * named command string that the engine already handles.
 *
 * Populated from T100; for T99 we seed the table with the most
 * analytically fundamental pairs so chord routing is exercised.
 */
const CHORD_TEMPLATES: Record<string, { command: string; label: string }> = {
  [chordTemplateKey("EXAMINE", "QUESTION")]: {
    command: "examine",
    label: "scrutinize",
  },
  [chordTemplateKey("ACCEPT", "REJECT")]: {
    command: "question",
    label: "provisional",
  },
  [chordTemplateKey("QUESTION", "ASK_WHY")]: {
    command: "ask why",
    label: "deep interrogation",
  },
  [chordTemplateKey("REJECT", "TRACE_BACK")]: {
    command: "trace back",
    label: "disavow",
  },
  [chordTemplateKey("LOOK", "EXAMINE")]: {
    command: "look",
    label: "survey",
  },
  [chordTemplateKey("ACCEPT", "TRACE_BACK")]: {
    command: "accept",
    label: "endorse chain",
  },
  // direction + ACCEPT = "committed walk" — the player commits as they move.
  // Defined for the 4 horizontal cardinals (the most pedagogically common
  // movements). Diagonals + vertical chords are reserved for authored
  // worlds where they have a specific narrative meaning.
  [chordTemplateKey("NORTH", "ACCEPT")]: {
    command: "north",
    label: "committed walk north",
  },
  [chordTemplateKey("SOUTH", "ACCEPT")]: {
    command: "south",
    label: "committed walk south",
  },
  [chordTemplateKey("EAST", "ACCEPT")]: {
    command: "east",
    label: "committed walk east",
  },
  [chordTemplateKey("WEST", "ACCEPT")]: {
    command: "west",
    label: "committed walk west",
  },
};

/**
 * Internal helper — apply a parsed command to state WITHOUT calling
 * beginTurn (used by applyMove's chord path, which already called it).
 * Returns only the new state; hint selection is handled by the caller.
 */
function applyVerbInternal(
  state: GameState,
  parsed: ParsedCommand,
  raw: string,
  currentRoom: Room,
  world: WorldBridge,
  audio: AudioSink
): GameState {
  if (MOVEMENT.includes(parsed.verb as Direction)) {
    return applyMovement(state, parsed, currentRoom, world, audio);
  }
  return applyRhetoricalVerb(state, parsed, raw, currentRoom, world, audio);
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
  world.beginTurn();

  const parsed = parseCommand(raw);
  const currentRoom = state.rooms.get(state.currentRoomId);

  // Echo the player's input
  world.appendLine("echo", `> ${raw}`);

  if (!state.started || !currentRoom) {
    world.appendLine("narration", "The argument has not yet begun.");
    return state;
  }

  // Movement verbs
  let nextState: GameState;
  if (MOVEMENT.includes(parsed.verb as Direction)) {
    nextState = applyMovement(state, parsed, currentRoom, world, audio);
  } else {
    nextState = applyRhetoricalVerb(state, parsed, raw, currentRoom, world, audio);
  }

  // Hints are surfaced via `state.activeHint` (overlay) instead of the
  // transcript so they don't pollute the persistent record. The previous
  // turn's hint (if any) clears here; a new one may take its place.
  return { ...nextState, activeHint: maybeSelectHint(nextState, parsed.verb, world) };
}

/**
 * After a turn's main content has been computed, pick the first eligible
 * onboarding hint if one exists and hasn't already been shown. Returns
 * the hint to surface (or null) AND marks the id in HintsShown — so even
 * a hint the player dismisses in 50ms never fires twice.
 *
 * See docs/UX.md §6, src/features/terminal/hints.ts (T49 catalogue),
 * src/features/terminal/HintLine.tsx (T63 overlay).
 */
function maybeSelectHint(
  state: GameState,
  lastVerb: CommandVerb,
  world: WorldBridge
): GameState["activeHint"] {
  const room = state.rooms.get(state.currentRoomId);
  if (!room) return null;
  const usedVerbs = collectUsedVerbs(state);
  const hint = selectHint({
    room,
    turnCount: state.turnCount,
    usedVerbs,
    shown: world.readHintsShown(),
    lastVerb,
  });
  if (!hint) return null;
  world.markHintShown(hint.id);
  return { id: hint.id, text: hint.text, turnId: state.turnCount };
}

/**
 * Clear the active hint without advancing the turn. Used by the UI when
 * the player taps the hint to dismiss, or when the auto-fade timer fires.
 * Pure — no side effects on the world bridge.
 */
export function dismissActiveHint(state: GameState): GameState {
  if (!state.activeHint) return state;
  return { ...state, activeHint: null };
}

/**
 * Derive the set of verbs the player has actually used this game from the
 * transcript's echo lines. Cheap and avoids a parallel world-level counter:
 * the transcript is already authoritative, and the set is small (< 12).
 */
function collectUsedVerbs(state: GameState): Set<CommandVerb> {
  const used = new Set<CommandVerb>();
  for (const entry of state.transcript) {
    if (entry.kind !== "echo") continue;
    const raw = entry.text.replace(/^>\s*/, "").trim().toLowerCase();
    const parsed = parseCommand(raw);
    used.add(parsed.verb);
  }
  return used;
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
    case "northeast":
    case "east":
    case "southeast":
    case "south":
    case "southwest":
    case "west":
    case "northwest":
    case "up":
    case "down":
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
