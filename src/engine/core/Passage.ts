import type { Direction } from "./Room";

export interface Passage {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  direction: Direction;
  description: string;
  rhetoricalMove: string;
}
