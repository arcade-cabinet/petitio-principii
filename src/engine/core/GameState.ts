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
  /**
   * Turn this line belongs to. Lines within the same turn are the
   * contiguous output between two player inputs — see docs/UX.md §2.
   * turnId 0 is reserved for system-emitted lines before the first input.
   */
  turnId: number;
}

export interface ActiveHint {
  /** Stable hint id (matches HintsShown trait + selectHint catalogue). */
  readonly id: string;
  /** Player-facing text, single short line. */
  readonly text: string;
  /** Turn this hint fired on. UI uses it to drop active hint when the turn advances. */
  readonly turnId: number;
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
  /**
   * The most recently emitted onboarding hint, or null. Set by the
   * reducer's hint system (T49); rendered by `<HintLine />` as a
   * fading overlay in the PRESENT zone (T63). Cleared by user tap or
   * by the next turn beginning. The HintsShown trait records that the
   * id has been surfaced — so even if the player dismisses it within
   * 50ms, it never re-fires.
   */
  activeHint: ActiveHint | null;
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
    activeHint: null,
  };
}
