/**
 * Direction — the 10 spatial primitives the player can move along.
 *
 * 8 horizontal cardinals (N, NE, E, SE, S, SW, W, NW) + 2 vertical
 * (up, down). Together they cover the full 3D space of the memory
 * palace. We do NOT have `back` / `forward` — those were 2D-game
 * crutches that don't map onto a real spatial place. The transcript
 * already records where the player came from; the rhetorical
 * `trace back` verb (in CommandVerb) is unrelated to spatial reverse.
 */
export type Direction =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest"
  | "up"
  | "down";

export const CARDINAL_DIRECTIONS: ReadonlyArray<Direction> = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
];

export const VERTICAL_DIRECTIONS: ReadonlyArray<Direction> = ["up", "down"];

export interface Exit {
  direction: Direction;
  targetRoomId: string;
  description: string;
}

export interface Room {
  id: string;
  title: string;
  description: string;
  exits: Exit[];
  rhetoricalType:
    | "premise"
    | "conclusion"
    | "definition"
    | "analogy"
    | "fallacy"
    | "circular"
    | "objection"
    | "meta";
  examined: boolean;
}
