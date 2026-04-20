import { PASSAGE_TEMPLATES } from "../content/templates/passageTemplates";
import { ROOM_TEMPLATES } from "../content/templates/roomTemplates";
import { createSeededRandom, pickRandom, shuffleArray } from "../prng/seedRandom";
import type { Passage } from "./Passage";
import type { Direction, Exit, Room } from "./Room";

const DIRECTIONS: Direction[] = ["north", "south", "east", "west", "up", "down"];

function oppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
    up: "down",
    down: "up",
    back: "forward",
    forward: "back",
  };
  return opposites[dir];
}

export interface ArgumentGraph {
  rooms: Map<string, Room>;
  passages: Map<string, Passage>;
  startRoomId: string;
}

export function generateArgumentGraph(seed: number): ArgumentGraph {
  const rng = createSeededRandom(seed);
  const rooms = new Map<string, Room>();
  const passages = new Map<string, Passage>();

  const shuffled = shuffleArray([...ROOM_TEMPLATES], rng);
  const selected = shuffled.slice(0, Math.min(6, shuffled.length));

  for (const template of selected) {
    const desc = pickRandom([...template.descriptions], rng) || template.descriptions[0];
    const room: Room = {
      id: template.id,
      title: template.title,
      description: desc,
      exits: [],
      rhetoricalType: template.rhetoricalType,
      examined: false,
    };
    rooms.set(room.id, room);
  }

  const roomIds = [...rooms.keys()];

  const usedConnections = new Set<string>();
  const directionPool = shuffleArray([...DIRECTIONS], rng);

  for (let i = 0; i < roomIds.length; i++) {
    const fromId = roomIds[i];
    const toId = roomIds[(i + 1) % roomIds.length];
    const connKey = `${fromId}->${toId}`;
    if (usedConnections.has(connKey)) continue;
    usedConnections.add(connKey);

    const dir = directionPool[i % directionPool.length] as Direction;
    const passageTemplate = pickRandom([...PASSAGE_TEMPLATES], rng) || PASSAGE_TEMPLATES[0];

    const passage: Passage = {
      id: `${fromId}-${dir}`,
      fromRoomId: fromId,
      toRoomId: toId,
      direction: dir,
      description: passageTemplate.description,
      rhetoricalMove: passageTemplate.rhetoricalMove,
    };
    passages.set(passage.id, passage);

    const fromRoom = rooms.get(fromId);
    const toRoom = rooms.get(toId);
    if (fromRoom && toRoom) {
      const hasExit = fromRoom.exits.some((e) => e.direction === dir);
      if (!hasExit) {
        const exit: Exit = {
          direction: dir,
          targetRoomId: toId,
          description: passageTemplate.description,
        };
        fromRoom.exits.push(exit);
      }

      const returnDir = oppositeDirection(dir);
      const returnExit: Exit = {
        direction: returnDir,
        targetRoomId: fromId,
        description: passageTemplate.description,
      };
      const hasReturn = toRoom.exits.some((e) => e.direction === returnDir);
      if (!hasReturn) {
        toRoom.exits.push(returnExit);
      }
    }
  }

  const circularRoom = rooms.get("circular-atrium");
  if (circularRoom && roomIds.length > 1) {
    const targetId = roomIds[Math.floor(rng() * roomIds.length)];
    const loopDir: Direction = "back";
    const hasLoop = circularRoom.exits.some((e) => e.direction === loopDir);
    if (!hasLoop && targetId) {
      circularRoom.exits.push({
        direction: loopDir,
        targetRoomId: "circular-atrium",
        description: "A corridor that curves back on itself",
      });
    }
  }

  const startRoomId = roomIds[0] ?? "";
  return { rooms, passages, startRoomId };
}
