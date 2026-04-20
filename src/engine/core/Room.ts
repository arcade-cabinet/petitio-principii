export type Direction = "north" | "south" | "east" | "west" | "up" | "down" | "back" | "forward";

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
