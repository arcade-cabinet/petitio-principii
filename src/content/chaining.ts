/**
 * Surrealist chaining — the runtime generator that turns a frozen corpus of
 * public-domain fragments into seed-deterministic, trait-conditioned,
 * visit-count-aware room descriptions.
 *
 * This module is the **only** consumer of SURREALIST_CORPUS at runtime. It
 * does not import RiTa (RiTa is a build-time dependency — see
 * `scripts/build-corpus.ts`). All POS / syllable data arrives pre-baked.
 *
 * The strategy is template-driven, not Markov-driven:
 *
 *   1. A family of short templates exists per rhetorical room type per act
 *      (Act I = confident, Act II = cross-referential, Act III = self-consuming).
 *   2. The PRNG is seeded with `seed ^ hash(roomId) ^ visitCount` so the same
 *      (seed, room, visit) always yields the same text.
 *   3. Memory state (accepted / rejected / questioned roomIds) promotes the
 *      room into later acts and injects acknowledgement clauses.
 *   4. `{placeholder}` slots in templates are filled from the frozen corpus.
 *
 * See docs/VOICE.md for the tonal targets each act should hit.
 */

import type { Room } from "@/engine/core/Room";
import { createSeededRandom, pickRandom } from "@/engine/prng/seedRandom";
import { type GeneratedSurrealistFragment, SURREALIST_CORPUS } from "./generated/surrealist";

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
 *   visitCount === 0           → Act I
 *   visitCount ∈ {1, 2}        → Act II
 *   visitCount ≥ 3             → Act III
 *
 * Memory bumps: any room touched by ACCEPT or REJECT or QUESTION lives in
 * Act II the first time it's revisited, and Act III on the second revisit.
 * This matches LORE.md's "memory is unstable and self-reinforcing": the more
 * you've engaged with a thought, the more of *you* it contains.
 */
function determineAct(roomId: string, visitCount: number, memory?: ChainingMemory): Act {
  const touched =
    (memory?.accepted.has(roomId) ?? false) ||
    (memory?.rejected.has(roomId) ?? false) ||
    (memory?.questioned.has(roomId) ?? false);

  if (visitCount <= 0) return "I";
  if (visitCount === 1) return touched ? "III" : "II";
  if (visitCount === 2) return touched ? "III" : "II";
  return "III";
}

type RhetoricalType = Room["rhetoricalType"];

/**
 * Template families. Each slot is either a literal or `{fragment}` /
 * `{fragment.short}` — filled from the corpus by the chainer. Acknowledgement
 * clauses (`{acceptedAck}`, `{rejectedAck}`, `{questionedAck}`) are filled by
 * the memory reader; empty string if that memory is absent.
 */
const TEMPLATES: Record<RhetoricalType, Record<Act, readonly string[]>> = {
  premise: {
    I: [
      "Columns of unjustified assumptions rise into darkness. One reads: {fragment}. You remember agreeing.",
      "You stand among the first givens. The lectern states: {fragment}. It seemed obvious when you set it down.",
      "This is where it begins. The inscription on the nearest column: {fragment}.",
    ],
    II: [
      "You return. The column you engaged with before is now centred, taller. Its fresh inscription reads: {fragment}. {acceptedAck}",
      "The premise hall rearranges subtly. A new column has grown beside the old: {fragment}. {questionedAck}",
      "You have been here. The given reads the same, differently: {fragment}. {rejectedAck}",
    ],
    III: [
      "The columns close ranks. The only legible one reads: {fragment}. You recognize your handwriting. {acceptedAck}",
      "There are no other columns now. There is only: {fragment}. It is what it has always been.",
      "The premise recites itself, and in reciting becomes: {fragment}. You accept, or do not. It does not matter here.",
    ],
  },
  conclusion: {
    I: [
      "A statement is mounted on a plinth. It reads: {fragment}. You cannot see what it follows from, yet the balcony is comfortable.",
      "The conclusion is here, already concluded. Its engraving: {fragment}.",
      "Above the balcony a motto hangs: {fragment}. The view below is unspecified.",
    ],
    II: [
      "The conclusion has deepened. The plinth now reads: {fragment}. You can almost see what it follows from. {acceptedAck}",
      "You step onto the balcony again. The inscription has absorbed your attention: {fragment}. {questionedAck}",
      "The conclusion was here, still is. Its new wording: {fragment}. {rejectedAck}",
    ],
    III: [
      "The conclusion has become the only statement. It reads: {fragment}. It has always read this way.",
      "The balcony dissolves into its own inscription: {fragment}.",
      "You accept the conclusion, or you don't. Either way, it reads: {fragment}.",
    ],
  },
  definition: {
    I: [
      "Brass dictionaries line the walls. The lectern entry defines the term as {fragment}. You decide this is sufficient.",
      "Definition is offered as given. The chamber's canonical entry: {fragment}.",
      "The meaning is fixed by an inscription below the lantern: {fragment}.",
    ],
    II: [
      "You return to the antechamber. The definition has widened: {fragment}. {acceptedAck}",
      "The dictionary has opened itself to a new page: {fragment}. {questionedAck}",
      "The lectern entry has been amended: {fragment}. {rejectedAck}",
    ],
    III: [
      "Every dictionary is open to the same page. Every page reads: {fragment}.",
      "The definition has eaten its own entry. What remains: {fragment}.",
      "You understand the term exactly as it wished to be understood: {fragment}.",
    ],
  },
  analogy: {
    I: [
      "Paintings along the wall are hung in pairs. Between one pair the curator has written: {fragment}. You trust the arrangement.",
      "An analogy is offered. Its upper plaque reads {fragmentA}; its lower plaque reads {fragmentB}. You supply the resemblance.",
      "The gallery presents one likeness: {fragment}. You walk past it and take its shape with you.",
    ],
    II: [
      "You return to the gallery. The curator's notes between the paintings are denser now: {fragment}. {acceptedAck}",
      "A paragraph has accrued beneath the analogy you inspected before: {fragment}. {questionedAck}",
      "The pair you passed is now annotated: {fragmentA}; and in the margin: {fragmentB}. {rejectedAck}",
    ],
    III: [
      "Every pair carries the same note. Every note reads: {fragment}.",
      "The analogy has eaten both its terms. What remains of the resemblance: {fragment}.",
      "You cannot recall which painting was the source and which the image. The plaque below reads: {fragment}.",
    ],
  },
  fallacy: {
    I: [
      "The cellar is warmer than the rest of the palace. A syllogism has been left out, middle term missing: {fragment}.",
      "An error has been furnished like a room. Its inscription: {fragment}.",
      "Something went wrong here, comfortably. The leftover reasoning: {fragment}.",
    ],
    II: [
      "You return to the cellar. The missing middle term has grown a voice: {fragment}. {acceptedAck}",
      "The fallacy has dressed itself: {fragment}. {questionedAck}",
      "You already know how to complete it. The completion reads: {fragment}. {rejectedAck}",
    ],
    III: [
      "The fallacy is no longer hidden. It addresses you directly: {fragment}.",
      "The cellar has become a single sentence. It reads: {fragment}.",
      "The error admits itself, and in admitting becomes indistinguishable from: {fragment}.",
    ],
  },
  circular: {
    I: [
      "A rotunda with seven entrances and no exits. The inscription on the floor reads: {fragment}. You recognize the phrase.",
      "The atrium turns once as you enter. On the far wall: {fragment}.",
      "You are here already. The floor says so: {fragment}.",
    ],
    II: [
      "You have returned. The inscription on the floor reads: {fragment}. {acceptedAck}",
      "The rotunda repeats itself with small emphasis. The floor: {fragment}. {questionedAck}",
      "You brought this phrase here. You will find it here again: {fragment}. {rejectedAck}",
    ],
    III: [
      "The rotunda has only one inscription, and the inscription is the rotunda: {fragment}.",
      "You are the phrase on the floor. The floor reads: {fragment}.",
      "The circle has closed into a word. The word is: {fragment}.",
    ],
  },
  objection: {
    I: [
      "Monks walk the cloister in slow circles, reading from small books. Each book contains an objection: {fragment}.",
      "A dissent has been placed here for consideration: {fragment}. You nod, politely.",
      "The cloister offers counter-argument: {fragment}.",
    ],
    II: [
      "You return. The monks' objections are denser now, in a hand almost your own: {fragment}. {acceptedAck}",
      "The cloister has gained a new defence against your previous doubt: {fragment}. {questionedAck}",
      "Someone has answered the objection on your behalf: {fragment}. {rejectedAck}",
    ],
    III: [
      "The objection and the defence have become indistinguishable. Both read: {fragment}.",
      "The monks are reading the same passage, at the same time, aloud: {fragment}.",
      "You cannot remember which side of the objection you were on. The page reads: {fragment}.",
    ],
  },
  meta: {
    I: [
      "An observatory whose telescope is trained inward. Through the eyepiece: {fragment}.",
      "The argument watches itself argue. What it sees: {fragment}.",
      "The room describes itself describing. Its self-description: {fragment}.",
    ],
    II: [
      "The telescope has been adjusted. What it sees now: {fragment}. {acceptedAck}",
      "You observe the argument observing your observation: {fragment}. {questionedAck}",
      "The observatory records your return as part of itself: {fragment}. {rejectedAck}",
    ],
    III: [
      "The telescope is pointed at the plate on which it rests. The inscription on the plate reads: {fragment}.",
      "The observatory is the argument, and the argument is: {fragment}.",
      "You have been the argument. The argument has been: {fragment}.",
    ],
  },
};

/** Trim a fragment to a plausibly-insertable length. */
function shortenFragment(text: string, maxWords = 14): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function pickFragment(rng: () => number, preferDerivative?: boolean): GeneratedSurrealistFragment {
  const pool =
    preferDerivative === undefined
      ? SURREALIST_CORPUS.fragments
      : SURREALIST_CORPUS.fragments.filter((f) => f.derivative === preferDerivative);
  const picked = pickRandom(pool, rng) ?? SURREALIST_CORPUS.fragments[0];
  return picked as GeneratedSurrealistFragment;
}

function acceptedClause(rng: () => number): string {
  const ack = pickFragment(rng).text;
  return `You remember accepting ${shortenFragment(ack, 8)}.`;
}

function rejectedClause(rng: () => number): string {
  const ack = pickFragment(rng).text;
  return `You remember having rejected ${shortenFragment(ack, 8)}, and finding the rejection absorbed.`;
}

function questionedClause(rng: () => number): string {
  const ack = pickFragment(rng).text;
  return `The room defends itself against your earlier question with ${shortenFragment(ack, 8)}.`;
}

/**
 * Fill `{placeholder}` slots in a template. Each call to `pickFragment`
 * advances the same PRNG so the whole composition is deterministic.
 */
function fillTemplate(
  template: string,
  rng: () => number,
  memory: ChainingMemory | undefined,
  roomId: string
): string {
  return template.replace(/\{([a-zA-Z.]+)\}/g, (_match, key: string) => {
    switch (key) {
      case "fragment":
        return shortenFragment(pickFragment(rng).text);
      case "fragment.short":
        return shortenFragment(pickFragment(rng).text, 6);
      case "fragmentA":
        return shortenFragment(pickFragment(rng).text, 10);
      case "fragmentB":
        return shortenFragment(pickFragment(rng).text, 10);
      case "acceptedAck":
        return memory?.accepted.has(roomId) ? acceptedClause(rng) : "";
      case "rejectedAck":
        return memory?.rejected.has(roomId) ? rejectedClause(rng) : "";
      case "questionedAck":
        return memory?.questioned.has(roomId) ? questionedClause(rng) : "";
      default:
        return "";
    }
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
  const family = TEMPLATES[room.rhetoricalType]?.[act] ?? TEMPLATES.premise[act];
  const template = pickRandom(family, rng) ?? family[0];
  const raw = fillTemplate(template, rng, memory, room.id);
  // Collapse any multi-whitespace introduced by empty ack slots.
  return raw.replace(/\s+/g, " ").trim();
}
