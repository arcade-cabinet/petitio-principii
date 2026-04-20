import { type ChainingMemory, RHETORICAL_TERMS, chainDescription } from "@/content";
import GRAMMARS from "@/content/generated/grammars.json";
import { withSeededRng } from "@/lib/seeded-tracery";
import tracery from "tracery-grammar";
import { createSeededRandom, pickRandom } from "../prng/seedRandom";
import type { Room } from "./Room";

export interface DescribeRoomOptions {
  /** Seed for the surrealist chainer. If omitted, the static description is used. */
  readonly seed?: number;
  /** How many times this room has been entered (0 = first visit). */
  readonly visitCount?: number;
  /** Accepted/rejected/questioned roomIds the player has touched. */
  readonly memory?: ChainingMemory;
}

/**
 * generatePhrase — deterministic three-word incantation ("adj adj noun").
 *
 * Flattens the incantation rule in the frozen grammar under a seeded RNG.
 * The `#adj# #adj# #noun#` rule can naturally repeat an adjective; we
 * re-flatten (advancing the RNG, so determinism is preserved) when that
 * happens, up to a small bound. With the current adjective pool the first
 * retry is sufficient for every seed in the common range.
 */
export function generatePhrase(seed: number): string {
  const rng = createSeededRandom(seed);
  const grammar = tracery.createGrammar({
    origin: [...GRAMMARS.incantation.origin],
    adj: [...GRAMMARS.incantation.adj],
    noun: [...GRAMMARS.incantation.noun],
  });
  return withSeededRng(rng, () => {
    for (let i = 0; i < 8; i++) {
      const phrase = grammar.flatten("#origin#");
      const parts = phrase.split(" ");
      if (parts.length === 3 && parts[0] !== parts[1]) return phrase;
    }
    // Fallback — if 8 deterministic retries all collided (vanishingly
    // unlikely with the current pool), return the last one unchanged rather
    // than silently breaking the "three space-separated words" contract.
    return grammar.flatten("#origin#");
  });
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
