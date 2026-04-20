/**
 * Surrealist chaining — the runtime generator that turns a frozen Tracery
 * grammar into seed-deterministic, trait-conditioned, visit-count-aware room
 * descriptions.
 *
 * This module is the **only** consumer of `grammars.json` at runtime for room
 * description. It does not import RiTa, and it no longer owns any templates
 * itself — the JSON artifact emitted by `scripts/build-grammars.ts` is the
 * single source of truth.
 *
 * Strategy:
 *
 *   1. Grammar families (per rhetorical type × act) live in grammars.json.
 *   2. The PRNG is seeded with `seed ^ hash(roomId) ^ visitCount` so the same
 *      (seed, room, visit) always yields the same text.
 *   3. Memory state (accepted/rejected/questioned roomIds) promotes the room
 *      into later acts and overrides `#acceptedAck#` / `#rejectedAck#` /
 *      `#questionedAck#` to either the memory clause or the empty string.
 *   4. Tracery's `flatten("#origin#")` runs under `withSeededRng` so the
 *      process-global Tracery RNG is scoped to our seed for the duration of
 *      the call.
 *
 * See docs/VOICE.md for the tonal targets each act should hit.
 */

import type { Room } from "@/engine/core/Room";
import { createSeededRandom } from "@/engine/prng/seedRandom";
import { withSeededRng } from "@/lib/seeded-tracery";
import tracery from "tracery-grammar";
import GRAMMARS from "./generated/grammars.json";

export interface ChainingMemory {
  readonly accepted: ReadonlySet<string>;
  readonly rejected: ReadonlySet<string>;
  readonly questioned: ReadonlySet<string>;
}

export interface ChainingOptions {
  readonly seed: number;
  readonly visitCount: number;
  readonly memory?: ChainingMemory;
}

/** 32-bit FNV-1a of the roomId — stable per id, platform-independent. */
function hashRoomId(roomId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < roomId.length; i++) {
    h ^= roomId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type Act = "I" | "II" | "III";

/**
 * Determine which act we're in for this room/visit. Gating is purely local
 * (per-room) so tests don't need a global turn counter:
 *
 *   visitCount === 0 → Act I
 *   visitCount ≥ 1   → Act II normally, Act III if memory has touched this room
 *   visitCount ≥ 3   → Act III regardless
 *
 * Memory bumps: any room touched by ACCEPT or REJECT or QUESTION lives in
 * Act III the first time it's revisited. This matches LORE.md's "memory is
 * unstable and self-reinforcing": the more you've engaged with a thought,
 * the more of *you* it contains.
 */
function determineAct(roomId: string, visitCount: number, memory?: ChainingMemory): Act {
  const touched =
    (memory?.accepted.has(roomId) ?? false) ||
    (memory?.rejected.has(roomId) ?? false) ||
    (memory?.questioned.has(roomId) ?? false);

  if (visitCount <= 0) return "I";
  if (visitCount >= 3) return "III";
  return touched ? "III" : "II";
}

type RhetoricalType = Room["rhetoricalType"];

/**
 * Build the Tracery grammar for a single flatten. Every symbol the rule
 * references is declared here, so an un-substituted `#name#` in the output
 * is always a grammar bug rather than a missing override.
 *
 * Memory-conditional acks use the empty string when the memory is absent so
 * the `{acceptedAck}` slot in a template collapses to whitespace and the
 * post-flatten normalizer trims it.
 */
function realizeGrammar(
  ruleSet: readonly string[],
  memory: ChainingMemory | undefined,
  roomId: string
) {
  const hasAccepted = memory?.accepted.has(roomId) ?? false;
  const hasRejected = memory?.rejected.has(roomId) ?? false;
  const hasQuestioned = memory?.questioned.has(roomId) ?? false;
  return tracery.createGrammar({
    origin: [...ruleSet],
    fragment: [...GRAMMARS.slots.fragment],
    fragment_short: [...GRAMMARS.slots.fragment_short],
    fragmentA: [...GRAMMARS.slots.fragmentA],
    fragmentB: [...GRAMMARS.slots.fragmentB],
    acceptedAck: hasAccepted ? [...GRAMMARS.acks.accepted] : [""],
    rejectedAck: hasRejected ? [...GRAMMARS.acks.rejected] : [""],
    questionedAck: hasQuestioned ? [...GRAMMARS.acks.questioned] : [""],
  });
}

/**
 * Generate a deterministic room description variation.
 *
 * Same (seed, roomId, visitCount, memory) → same output. Different visitCount
 * for same (seed, roomId) → different output because the PRNG is re-seeded
 * with visitCount mixed in.
 */
export function chainDescription(room: Room, opts: ChainingOptions): string {
  const { seed, visitCount, memory } = opts;
  const rng = createSeededRandom(seed ^ hashRoomId(room.id) ^ (visitCount >>> 0));
  const act = determineAct(room.id, visitCount, memory);
  const type = room.rhetoricalType as RhetoricalType;
  const rules =
    GRAMMARS.descriptions[type as keyof typeof GRAMMARS.descriptions]?.[act] ??
    GRAMMARS.descriptions.premise[act];
  const grammar = realizeGrammar(rules, memory, room.id);
  const raw = withSeededRng(rng, () => grammar.flatten("#origin#"));
  // Collapse any multi-whitespace introduced by empty ack overrides.
  return raw.replace(/\s+/g, " ").trim();
}
