import type { CommandVerb, Room } from "@/engine";

/**
 * Progressive onboarding hints.
 *
 * The system fires a single-line nudge the first time the player is in a
 * position to usefully discover a capability. Each hint has a stable `id`
 * so the `HintsShown` trait can record it and never show it twice in the
 * same game.
 *
 * Design goals (per docs/UX.md §6 and the user's direct note that the
 * game "cannot become SO abstract that it is impossible to understand"):
 *
 *   - Hints are **diegetic where possible** — the prose answers the
 *     question "what did you just do?" rather than a floating UI toast.
 *   - Exactly one hint per eligible turn, priority-ordered — stacking
 *     three nudges at once buries them.
 *   - Hints only fire on *eligibility*: the capability must be actually
 *     available here and now, so nothing ever reads as a lie.
 *   - No hint repeats across a game (HintsShown tracks ids).
 *
 * The rendered hint is a single short line the reducer appends under the
 * regular response body — styled dimmer in the PRESENT zone so it feels
 * like marginalia rather than an interruption.
 */

export interface HintContext {
  /** The room the player is currently in. */
  readonly room: Room;
  /** The number of completed turns. 0 = before any player input. */
  readonly turnCount: number;
  /** Verbs the player has already used at least once. */
  readonly usedVerbs: ReadonlySet<CommandVerb>;
  /** Ids of hints already surfaced in this game. */
  readonly shown: ReadonlySet<string>;
  /** The verb just issued (the reducer passes this in). May be null for system turns. */
  readonly lastVerb: CommandVerb | null;
}

export interface Hint {
  readonly id: string;
  readonly text: string;
}

/**
 * The hint catalogue, in priority order. The first eligible hint whose id
 * is not already in `shown` fires. Edit order to change priority; each
 * hint's `when` predicate is a pure function of the context.
 */
const CATALOGUE: ReadonlyArray<{
  readonly id: string;
  readonly text: string;
  readonly when: (ctx: HintContext) => boolean;
}> = [
  {
    id: "first-look",
    text: "Tip: LOOK re-reads the present room. Every reading may differ.",
    when: (ctx) => ctx.turnCount === 1 && !ctx.usedVerbs.has("look"),
  },
  {
    id: "first-examine",
    text: "Tip: EXAMINE names the rhetorical shape of the room you are in.",
    when: (ctx) =>
      ctx.turnCount >= 2 && ctx.lastVerb !== "examine" && !ctx.usedVerbs.has("examine"),
  },
  {
    id: "first-accept-available",
    text: "Tip: ACCEPT to agree with the step the room is asserting. The argument remembers.",
    when: (ctx) => ctx.turnCount >= 3 && !ctx.usedVerbs.has("accept") && !isCircleRoom(ctx.room),
  },
  {
    id: "first-question-available",
    text: "Tip: QUESTION when an assumption feels unearned. Doubt is not refusal.",
    when: (ctx) => ctx.turnCount >= 2 && !ctx.usedVerbs.has("question"),
  },
  {
    id: "first-reject-available",
    text: "Tip: REJECT to refuse a step. The argument will absorb your refusal — but it will remember.",
    when: (ctx) => ctx.turnCount >= 5 && !ctx.usedVerbs.has("reject"),
  },
  {
    id: "first-circular-room",
    text: "You feel the room curving. ACCEPT here would close the shape you have been drawing.",
    when: (ctx) => isCircleRoom(ctx.room) && !ctx.usedVerbs.has("accept"),
  },
  {
    id: "first-trace-back",
    text: "Tip: TRACE BACK follows the path of your reasoning in reverse.",
    when: (ctx) => ctx.turnCount >= 8 && !ctx.usedVerbs.has("trace"),
  },
];

function isCircleRoom(room: Room): boolean {
  return room.rhetoricalType === "circular" || room.rhetoricalType === "meta";
}

/**
 * Select a single hint for this turn, or null if none is eligible.
 *
 * Priority-order: the first catalogue entry whose `when` fires and whose
 * id has not yet been shown is returned. Callers mark the returned id
 * into `HintsShown` before the next turn so it doesn't re-fire.
 */
export function selectHint(ctx: HintContext): Hint | null {
  for (const candidate of CATALOGUE) {
    if (ctx.shown.has(candidate.id)) continue;
    if (!candidate.when(ctx)) continue;
    return { id: candidate.id, text: candidate.text };
  }
  return null;
}

/** Test-only: expose the catalogue's ordered ids for completeness tests. */
export const _hintIdsForTests: readonly string[] = CATALOGUE.map((h) => h.id);
