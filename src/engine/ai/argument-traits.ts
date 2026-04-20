import type { Room } from "../core/Room";

/**
 * The AI's read of gameplay state — what the player has done to each room.
 *
 * This is a pure, plain-data projection of the koota world. The engine/ai
 * layer is framework-agnostic: it never touches koota directly. The world
 * bridge projects its trait store into this shape and hands it to the
 * argument agent on demand.
 */

/** How the player has engaged with one room across the game so far. */
export interface RoomMemory {
  accepted: number;
  rejected: number;
  questioned: number;
}

/** The running tally the argument's mind has about what you've done. */
export interface ArgumentMemory {
  /** Per-room counts, keyed by room id. */
  byRoom: Map<string, RoomMemory>;
  /** Total accepts across the whole argument. */
  totalAccepted: number;
  /** Total rejects across the whole argument. */
  totalRejected: number;
  /** Total questions across the whole argument. */
  totalQuestioned: number;
  /** Turns elapsed since startGame (parallel to GameState.turnCount). */
  turnCount: number;
}

/** Empty memory — use as the initial value before any player action. */
export function createEmptyMemory(): ArgumentMemory {
  return {
    byRoom: new Map(),
    totalAccepted: 0,
    totalRejected: 0,
    totalQuestioned: 0,
    turnCount: 0,
  };
}

/** Rhetorical verb that the argument responds to. */
export type ArgumentVerb = "accept" | "reject" | "question";

/** The room description the agent needs to condition its response on. */
export interface ArgumentRoomContext {
  id: string;
  title: string;
  rhetoricalType: Room["rhetoricalType"];
}
