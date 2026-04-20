import {
  ADJECTIVES,
  type ChainingMemory,
  NOUNS,
  RHETORICAL_TERMS,
  chainDescription,
} from "@/content";
import { createSeededRandom, pickRandom, shuffleArray } from "../prng/seedRandom";
import type { Room } from "./Room";

export interface DescribeRoomOptions {
  /** Seed for the surrealist chainer. If omitted, the static description is used. */
  readonly seed?: number;
  /** How many times this room has been entered (0 = first visit). */
  readonly visitCount?: number;
  /** Accepted/rejected/questioned roomIds the player has touched. */
  readonly memory?: ChainingMemory;
}

export function generatePhrase(seed: number): string {
  const rng = createSeededRandom(seed);
  const shuffledAdjectives = shuffleArray(ADJECTIVES, rng);
  const adj1 = shuffledAdjectives[0];
  const adj2 = shuffledAdjectives[1];
  const noun = pickRandom(NOUNS, rng);

  return `${adj1} ${adj2} ${noun}`;
}

export const RHETORICAL_EXAMINE: Record<Room["rhetoricalType"], string> = {
  premise: "assert something as given",
  conclusion: "draw a conclusion",
  definition: "fix a meaning",
  analogy: "reason by resemblance",
  fallacy: "invite a mistake",
  circular: "assume what it tries to prove",
  objection: "consider a counter-argument",
  meta: "describe itself",
};

export const describeExamineFor = (room: Room) =>
  `This is a ${room.rhetoricalType} space. The argument pauses here to ${RHETORICAL_EXAMINE[room.rhetoricalType]}.`;

/**
 * Render a room's description to a list of lines.
 *
 * With no `opts`, produces the static hand-authored description (back-compat
 * with the existing tests). With a `seed`, the body is produced by the
 * surrealist chainer — same inputs → same output; different visit counts or
 * memory states → different readings. Memory is unstable and self-reinforcing.
 */
export function describeRoom(room: Room, opts?: DescribeRoomOptions): string[] {
  const body =
    opts && typeof opts.seed === "number"
      ? chainDescription(room, {
          seed: opts.seed,
          visitCount: opts.visitCount ?? 0,
          memory: opts.memory,
        })
      : room.description;
  return [
    `== ${room.title.toUpperCase()} ==`,
    body,
    describeExamineFor(room),
    "",
    "Exits:",
    ...room.exits.map((e) => `  ${e.direction.toUpperCase()} - ${e.description}`),
  ];
}

export function describeFallacy(seed: number): string {
  const rng = createSeededRandom(seed);
  const fallacies = RHETORICAL_TERMS.filter((t) => t.category === "fallacy");
  if (fallacies.length === 0) {
    return "You sense a logical error here, but cannot quite name it.";
  }
  const term = pickRandom(fallacies, rng);
  return `You sense a ${term?.term || "fallacy"} here. ${term?.definition || ""}`;
}

export function getHelpText(): string[] {
  return [
    "You are navigating an argument.",
    "Available commands:",
    "  GO [DIRECTION] (e.g., GO NORTH) — Move to another part of the argument.",
    "  LOOK (or L)                            — Examine your current surroundings.",
    "  INVENTORY (or I)                       — Check your active premises (Not implemented).",
    "  NEW GAME                               — Start a new game.",
    "  QUIT                                   — Exit the current game.",
  ];
}
