import {
  type Direction,
  type GameState,
  type TranscriptEntry,
  createInitialGameState,
  describeRoom,
  generateArgumentGraph,
  generatePhrase,
  getHelpText,
  parseCommand,
} from "@/engine";
import {
  IsPlayer,
  Position,
  RhetoricalSpace,
  RoomId,
  type World,
  appendOutput,
  appendOutputLines,
  buildRhetoricalGraph,
  buildWorld,
  disposeAudio,
  initAudio,
  readTranscript,
  shortestRhetoricalPath,
  updateAudio,
  wireEdges,
} from "@/world";
import { useCallback, useRef, useState } from "react";

/**
 * React port of the framework-agnostic game engine.
 *
 * Thin shell around @/engine (pure logic) and @/world (koota ECS).
 * Every transcript line is a koota `OutputLine` entity — the UI keys on
 * entity ids (stable by construction) rather than array indices, and
 * later systems can attach per-line traits (IsAccepted, IsChallenged,
 * relations to rooms) so the log becomes addressable gameplay state.
 *
 * If you need to change game behaviour, edit @/engine — not this file.
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

interface PathCache {
  graph: ReturnType<typeof buildRhetoricalGraph>["graph"];
  indexByRoomId: Map<string, number>;
  roomIdByIndex: Map<number, string>;
}

export interface GameEngine {
  state: GameState;
  startGame: (seed: number) => Promise<void>;
  submitCommand: (raw: string) => void;
  requestNewGame: () => void;
}

/** Classify a string line into a transcript kind for koota storage. */
function classifyLine(text: string): TranscriptEntry["kind"] {
  if (text === "") return "spacer";
  if (text.startsWith(">")) return "echo";
  if (text.startsWith("== ") && text.endsWith(" ==")) return "title";
  return "narration";
}

export function useGameEngine(): GameEngine {
  const [state, setState] = useState<GameState>(createInitialGameState);
  const worldRef = useRef<World | null>(null);
  const pathCacheRef = useRef<PathCache | null>(null);

  /** Rebuild GameState.output + GameState.transcript from the koota world. */
  const project = useCallback((world: World, base: GameState): GameState => {
    const transcript = readTranscript(world);
    const output = transcript.map((e) => e.text);
    return { ...base, transcript, output };
  }, []);

  const writeLines = useCallback((world: World, texts: readonly string[]): void => {
    appendOutputLines(
      world,
      texts.map((text) => ({ kind: classifyLine(text), text }))
    );
  }, []);

  const moveTo = useCallback((world: World, nextRoomId: string) => {
    world
      .query(IsPlayer, Position)
      .select(Position)
      .updateEach(([position]) => {
        position.roomId = nextRoomId;
      });
    updateAudio(world);
  }, []);

  const startGame = useCallback(
    async (seed: number) => {
      disposeAudio();
      await initAudio();

      const graph = generateArgumentGraph(seed);
      const phrase = generatePhrase(seed);
      const startRoom = graph.rooms.get(graph.startRoomId);

      const world = buildWorld(graph);
      worldRef.current = world;

      const { graph: rhetGraph, indexByRoomId, roomIdByIndex } = buildRhetoricalGraph(world);
      wireEdges(rhetGraph, graph.rooms, indexByRoomId);
      pathCacheRef.current = { graph: rhetGraph, indexByRoomId, roomIdByIndex };

      updateAudio(world);

      // Seed the transcript via koota so the UI can key on entity ids.
      writeLines(world, [
        "Petitio Principii",
        `Seed: ${seed} — "${phrase}"`,
        "",
        "You find yourself at the threshold of an argument.",
        "The premise smells faintly of tautology.",
        "",
        ...(startRoom ? describeRoom(startRoom) : ["The argument begins..."]),
      ]);

      setState((prev) =>
        project(world, {
          ...prev,
          seed,
          currentRoomId: graph.startRoomId,
          rooms: graph.rooms,
          turnCount: 0,
          started: true,
          phrase,
        })
      );
    },
    [project, writeLines]
  );

  const requestNewGame = useCallback(() => {
    disposeAudio();
    worldRef.current = null;
    pathCacheRef.current = null;
    setState(createInitialGameState());
  }, []);

  const submitCommand = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      const world = worldRef.current;
      const pathCache = pathCacheRef.current;

      setState((prev) => {
        if (!world) return prev;
        const parsed = parseCommand(raw);
        const currentRoom = prev.rooms.get(prev.currentRoomId);

        // Echo the player's input into the transcript
        appendOutput(world, "echo", `> ${raw}`);

        if (!prev.started || !currentRoom) {
          writeLines(world, ["The argument has not yet begun."]);
          return project(world, prev);
        }

        // Movement verbs
        if (MOVEMENT.includes(parsed.verb as Direction)) {
          const dir = parsed.verb as Direction;
          const exit = currentRoom.exits.find((e) => e.direction === dir);
          if (exit) {
            const next = prev.rooms.get(exit.targetRoomId);
            if (next) {
              moveTo(world, next.id);
              writeLines(world, [`You move ${dir}.`, "", ...describeRoom(next)]);
              return project(world, {
                ...prev,
                currentRoomId: next.id,
                turnCount: prev.turnCount + 1,
              });
            }
          }
          writeLines(world, [
            "You cannot go that way. The argument has no passage in that direction.",
          ]);
          return project(world, { ...prev, turnCount: prev.turnCount + 1 });
        }

        const bump = (lines: readonly string[]): GameState => {
          writeLines(world, lines);
          return project(world, { ...prev, turnCount: prev.turnCount + 1 });
        };

        switch (parsed.verb) {
          case "look":
            return bump(describeRoom(currentRoom));
          case "examine": {
            const rooms = new Map(prev.rooms);
            rooms.set(currentRoom.id, { ...currentRoom, examined: true });
            writeLines(world, [
              `You examine the ${currentRoom.title} more closely.`,
              currentRoom.description,
            ]);
            return project(world, {
              ...prev,
              rooms,
              turnCount: prev.turnCount + 1,
            });
          }
          case "help":
            return bump(getHelpText());
          case "question":
            return bump([
              "You question the assumption.",
              `The ${currentRoom.title} trembles slightly. Good question. The argument doesn't have a ready answer.`,
            ]);
          case "ask":
            return bump([
              "You ask: Why?",
              `The ${currentRoom.title} echoes. A voice replies: "Because it follows from the premise." You note that the premise has not been justified.`,
            ]);
          case "accept":
            if (
              currentRoom.rhetoricalType === "circular" ||
              currentRoom.rhetoricalType === "meta"
            ) {
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
            return bump([
              "You reject this argument.",
              "The argument buckles but does not collapse. It has more premises.",
            ]);
          case "trace": {
            if (pathCache) {
              const targets: string[] = [];
              world
                .query(RhetoricalSpace, RoomId)
                .select(RhetoricalSpace, RoomId)
                .readEach(([space, id]) => {
                  if (space.type === "circular" || space.type === "meta") {
                    targets.push(id.value);
                  }
                });

              let nextHop: string | null = null;
              let shortest = Number.POSITIVE_INFINITY;
              for (const target of targets) {
                const path = shortestRhetoricalPath(
                  pathCache.graph,
                  pathCache.indexByRoomId,
                  pathCache.roomIdByIndex,
                  currentRoom.id,
                  target
                );
                if (path.found && path.rooms.length > 1 && path.rooms.length < shortest) {
                  shortest = path.rooms.length;
                  nextHop = path.rooms[1] ?? null;
                }
              }
              if (nextHop) {
                const next = prev.rooms.get(nextHop);
                if (next) {
                  moveTo(world, next.id);
                  writeLines(world, [
                    "You trace back through the argument.",
                    "",
                    ...describeRoom(next),
                  ]);
                  return project(world, {
                    ...prev,
                    currentRoomId: next.id,
                    turnCount: prev.turnCount + 1,
                  });
                }
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
          default:
            return bump([
              `The argument does not understand "${raw}". Try HELP for available commands.`,
            ]);
        }
      });
    },
    [moveTo, project, writeLines]
  );

  return { state, startGame, submitCommand, requestNewGame };
}
