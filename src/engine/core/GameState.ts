import type { Room } from "./Room";

export interface GameState {
  seed: number;
  currentRoomId: string;
  rooms: Map<string, Room>;
  output: string[];
  turnCount: number;
  started: boolean;
  phrase: string;
}

export function createInitialGameState(): GameState {
  return {
    seed: 0,
    currentRoomId: "",
    rooms: new Map(),
    output: [],
    turnCount: 0,
    started: false,
    phrase: "",
  };
}
