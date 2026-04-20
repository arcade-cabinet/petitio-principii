import type { Room } from "./Room";

/**
 * One entry in the running transcript — what the player sees on the display.
 *
 * The runtime stores transcript entries as koota entities (see
 * `src/world/traits/OutputLine`), but the engine layer exposes them here as a
 * plain-data shadow so that (a) the UI can iterate without reaching into the
 * ECS, and (b) tests can assert against a stable serializable shape.
 *
 * `id` is the koota entity id projected to a string ("ol-<n>"); it is the
 * React key for that line and is stable across renders and across gameplay
 * (new lines only ever extend the projection, they never shift).
 */
export interface TranscriptEntry {
  id: string;
  ordinal: number;
  kind: "narration" | "echo" | "title" | "spacer";
  text: string;
}

export interface GameState {
  seed: number;
  currentRoomId: string;
  rooms: Map<string, Room>;
  /**
   * Flat string view of the transcript. Back-compat for tests and
   * framework-agnostic consumers. Regenerated from `transcript` each update.
   */
  output: string[];
  /** Per-line transcript with stable ids and kinds. Canonical. */
  transcript: TranscriptEntry[];
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
    transcript: [],
    turnCount: 0,
    started: false,
    phrase: "",
  };
}
