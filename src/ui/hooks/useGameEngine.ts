import { createSignal } from "solid-js";
import { generateArgumentGraph } from "../../engine/core/ArgumentGraph";
import type { GameState } from "../../engine/core/GameState";
import { createInitialGameState } from "../../engine/core/GameState";
import { describeRoom, generatePhrase, getHelpText } from "../../engine/core/NarrativeGenerator";
import { parseCommand } from "../../engine/core/Parser";
import type { Direction } from "../../engine/core/Room";

export interface GameEngineResult {
  gameState: () => GameState;
  startGame: (seed: number) => void;
  submitCommand: (input: string) => void;
}

/**
 * SolidJS-native game engine primitive.
 * Returns a signal getter `gameState()` so consumers track reactivity correctly.
 */
export function createGameEngine(): GameEngineResult {
  const [gameState, setGameState] = createSignal<GameState>(createInitialGameState());

  function startGame(seed: number): void {
    const graph = generateArgumentGraph(seed);
    const phrase = generatePhrase(seed);
    const startRoom = graph.rooms.get(graph.startRoomId);
    const initialOutput: string[] = [
      "Petitio Principii",
      `Seed: ${seed} — "${phrase}"`,
      "",
      "You find yourself at the threshold of an argument.",
      "The premise smells faintly of tautology.",
      "",
      ...(startRoom ? describeRoom(startRoom) : ["The argument begins..."]),
      "",
      "Type HELP for a list of commands.",
    ];

    setGameState({
      seed,
      currentRoomId: graph.startRoomId,
      rooms: graph.rooms,
      output: initialOutput,
      turnCount: 0,
      started: true,
      phrase,
    });
  }

  function submitCommand(input: string): void {
    if (!input.trim()) return;

    setGameState((prev) => {
      const parsed = parseCommand(input);
      const currentRoom = prev.rooms.get(prev.currentRoomId);
      const newOutput = [...prev.output, `> ${input}`];

      if (!prev.started || !currentRoom) {
        return {
          ...prev,
          output: [...newOutput, "The argument has not yet begun. Start a new game."],
        };
      }

      const movementDirections: Direction[] = [
        "north",
        "south",
        "east",
        "west",
        "up",
        "down",
        "back",
        "forward",
      ];
      if (movementDirections.includes(parsed.verb as Direction)) {
        const dir = parsed.verb as Direction;
        const exit = currentRoom.exits.find((e) => e.direction === dir);
        if (exit) {
          const nextRoom = prev.rooms.get(exit.targetRoomId);
          if (nextRoom) {
            return {
              ...prev,
              currentRoomId: exit.targetRoomId,
              output: [...newOutput, `You move ${dir}.`, "", ...describeRoom(nextRoom)],
              turnCount: prev.turnCount + 1,
            };
          }
        }
        return {
          ...prev,
          output: [
            ...newOutput,
            "You cannot go that way. The argument has no passage in that direction.",
          ],
          turnCount: prev.turnCount + 1,
        };
      }

      switch (parsed.verb) {
        case "look": {
          return {
            ...prev,
            output: [...newOutput, ...describeRoom(currentRoom)],
            turnCount: prev.turnCount + 1,
          };
        }
        case "examine": {
          const newRooms = new Map(prev.rooms);
          newRooms.set(currentRoom.id, { ...currentRoom, examined: true });
          return {
            ...prev,
            rooms: newRooms,
            output: [
              ...newOutput,
              `You examine the ${currentRoom.title} more closely.`,
              currentRoom.description,
              "",
              `This is a ${currentRoom.rhetoricalType} space. The argument pauses here to ${
                currentRoom.rhetoricalType === "premise"
                  ? "assert something as given"
                  : currentRoom.rhetoricalType === "conclusion"
                    ? "draw a conclusion"
                    : "make its case"
              }.`,
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "help": {
          return {
            ...prev,
            output: [...newOutput, ...getHelpText()],
            turnCount: prev.turnCount + 1,
          };
        }
        case "question": {
          return {
            ...prev,
            output: [
              ...newOutput,
              "You question the assumption.",
              `The ${currentRoom.title} trembles slightly. Good question. The argument doesn't have a ready answer.`,
              "Perhaps TRACE BACK to find where this assumption was introduced.",
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "ask": {
          return {
            ...prev,
            output: [
              ...newOutput,
              "You ask: Why?",
              `The ${currentRoom.title} echoes. A voice replies: "Because it follows from the premise." You note that the premise has not been justified.`,
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "accept": {
          if (currentRoom.rhetoricalType === "circular" || currentRoom.rhetoricalType === "meta") {
            return {
              ...prev,
              output: [
                ...newOutput,
                "You accept the argument.",
                "A moment of clarity: the conclusion you have accepted is identical to the premise from which you began.",
                "You have completed the circle. Petitio Principii.",
                "",
                "The argument was always about itself.",
                "",
                "Type NEW GAME to begin another circle.",
              ],
              turnCount: prev.turnCount + 1,
            };
          }
          return {
            ...prev,
            output: [
              ...newOutput,
              "You accept this step in the argument.",
              "The argument notes your acceptance and moves on, emboldened.",
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "reject": {
          return {
            ...prev,
            output: [
              ...newOutput,
              "You reject this argument.",
              "The argument buckles but does not collapse. It has more premises.",
              "You may TRACE BACK to examine where the logic first went astray.",
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "trace": {
          const exits = currentRoom.exits;
          if (exits.length > 0) {
            const backExit = exits.find((e) => e.direction === "back") ?? exits[exits.length - 1];
            const backRoom = prev.rooms.get(backExit?.targetRoomId ?? "");
            if (backRoom) {
              return {
                ...prev,
                currentRoomId: backExit?.targetRoomId ?? "",
                output: [
                  ...newOutput,
                  "You trace back through the argument.",
                  "",
                  ...describeRoom(backRoom),
                ],
                turnCount: prev.turnCount + 1,
              };
            }
          }
          return {
            ...prev,
            output: [
              ...newOutput,
              "You cannot trace back further. This is where the argument begins—or claims to.",
            ],
            turnCount: prev.turnCount + 1,
          };
        }
        case "new": {
          // Fallback if not intercepted by TerminalScreen
          return { ...prev, output: [...newOutput, "Starting a new game..."] };
        }
        case "quit": {
          return {
            ...prev,
            output: [...newOutput, "You cannot quit. The argument has already begun."],
            turnCount: prev.turnCount + 1,
          };
        }
        case "inventory": {
          return {
            ...prev,
            output: [...newOutput, "You are carrying nothing but your preconceptions."],
            turnCount: prev.turnCount + 1,
          };
        }
        default: {
          return {
            ...prev,
            output: [
              ...newOutput,
              `The argument does not understand "${input}". Try HELP for available commands.`,
            ],
            turnCount: prev.turnCount + 1,
          };
        }
      }
    });
  }

  return { gameState, startGame, submitCommand };
}
