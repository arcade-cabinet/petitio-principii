import {
  type Direction,
  type GameState,
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
  buildRhetoricalGraph,
  buildWorld,
  disposeAudio,
  initAudio,
  shortestRhetoricalPath,
  updateAudio,
  wireEdges,
} from "@/world";
import { useCallback, useRef, useState } from "react";

/**
 * React port of the framework-agnostic game engine.
 *
 * Thin shell: all of the logic lives in @/engine (pure) and @/world
 * (koota ECS). This hook's job is only to (a) hold the GameState in a
 * React state tree, (b) own the koota World lifetime, and (c) bridge
 * user gestures to initAudio() since Tone.start() needs a user click.
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

export function useGameEngine(): GameEngine {
  const [state, setState] = useState<GameState>(createInitialGameState);
  const worldRef = useRef<World | null>(null);
  const pathCacheRef = useRef<PathCache | null>(null);

  const moveTo = useCallback((world: World, nextRoomId: string) => {
    world
      .query(IsPlayer, Position)
      .select(Position)
      .updateEach(([position]) => {
        position.roomId = nextRoomId;
      });
    updateAudio(world);
  }, []);

  const startGame = useCallback(async (seed: number) => {
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

    setState({
      seed,
      currentRoomId: graph.startRoomId,
      rooms: graph.rooms,
      output: [
        "Petitio Principii",
        `Seed: ${seed} — "${phrase}"`,
        "",
        "You find yourself at the threshold of an argument.",
        "The premise smells faintly of tautology.",
        "",
        ...(startRoom ? describeRoom(startRoom) : ["The argument begins..."]),
      ],
      turnCount: 0,
      started: true,
      phrase,
    });
  }, []);

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
        const parsed = parseCommand(raw);
        const currentRoom = prev.rooms.get(prev.currentRoomId);
        const log = [...prev.output, `> ${raw}`];

        if (!prev.started || !currentRoom) {
          return {
            ...prev,
            output: [...log, "The argument has not yet begun."],
          };
        }

        // Movement verbs — follow the exit if one exists in that direction
        if (MOVEMENT.includes(parsed.verb as Direction)) {
          const dir = parsed.verb as Direction;
          const exit = currentRoom.exits.find((e) => e.direction === dir);
          if (exit) {
            const next = prev.rooms.get(exit.targetRoomId);
            if (next) {
              if (world) moveTo(world, next.id);
              return {
                ...prev,
                currentRoomId: next.id,
                output: [...log, `You move ${dir}.`, "", ...describeRoom(next)],
                turnCount: prev.turnCount + 1,
              };
            }
          }
          return {
            ...prev,
            output: [
              ...log,
              "You cannot go that way. The argument has no passage in that direction.",
            ],
            turnCount: prev.turnCount + 1,
          };
        }

        switch (parsed.verb) {
          case "look":
            return {
              ...prev,
              output: [...log, ...describeRoom(currentRoom)],
              turnCount: prev.turnCount + 1,
            };
          case "examine": {
            const rooms = new Map(prev.rooms);
            rooms.set(currentRoom.id, { ...currentRoom, examined: true });
            return {
              ...prev,
              rooms,
              output: [
                ...log,
                `You examine the ${currentRoom.title} more closely.`,
                currentRoom.description,
              ],
              turnCount: prev.turnCount + 1,
            };
          }
          case "help":
            return {
              ...prev,
              output: [...log, ...getHelpText()],
              turnCount: prev.turnCount + 1,
            };
          case "question":
            return {
              ...prev,
              output: [
                ...log,
                "You question the assumption.",
                `The ${currentRoom.title} trembles slightly. Good question. The argument doesn't have a ready answer.`,
              ],
              turnCount: prev.turnCount + 1,
            };
          case "ask":
            return {
              ...prev,
              output: [
                ...log,
                "You ask: Why?",
                `The ${currentRoom.title} echoes. A voice replies: "Because it follows from the premise." You note that the premise has not been justified.`,
              ],
              turnCount: prev.turnCount + 1,
            };
          case "accept":
            if (
              currentRoom.rhetoricalType === "circular" ||
              currentRoom.rhetoricalType === "meta"
            ) {
              return {
                ...prev,
                output: [
                  ...log,
                  "You accept the argument.",
                  "The conclusion you have accepted is identical to the premise from which you began.",
                  "You have completed the circle. Petitio Principii.",
                  "",
                  "The argument was always about itself.",
                ],
                turnCount: prev.turnCount + 1,
              };
            }
            return {
              ...prev,
              output: [
                ...log,
                "You accept this step in the argument.",
                "The argument notes your acceptance and moves on, emboldened.",
              ],
              turnCount: prev.turnCount + 1,
            };
          case "reject":
            return {
              ...prev,
              output: [
                ...log,
                "You reject this argument.",
                "The argument buckles but does not collapse. It has more premises.",
              ],
              turnCount: prev.turnCount + 1,
            };
          case "trace": {
            // Walk one step toward the nearest circular/meta room via Dijkstra
            if (world && pathCache) {
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
                  return {
                    ...prev,
                    currentRoomId: next.id,
                    output: [
                      ...log,
                      "You trace back through the argument.",
                      "",
                      ...describeRoom(next),
                    ],
                    turnCount: prev.turnCount + 1,
                  };
                }
              }
            }
            return {
              ...prev,
              output: [
                ...log,
                "You cannot trace back further. This is where the argument begins—or claims to.",
              ],
              turnCount: prev.turnCount + 1,
            };
          }
          case "quit":
            return {
              ...prev,
              output: [...log, "You cannot quit. The argument has already begun."],
              turnCount: prev.turnCount + 1,
            };
          case "inventory":
            return {
              ...prev,
              output: [...log, "You are carrying nothing but your preconceptions."],
              turnCount: prev.turnCount + 1,
            };
          default:
            return {
              ...prev,
              output: [
                ...log,
                `The argument does not understand "${raw}". Try HELP for available commands.`,
              ],
              turnCount: prev.turnCount + 1,
            };
        }
      });
    },
    [moveTo]
  );

  return { state, startGame, submitCommand, requestNewGame };
}
