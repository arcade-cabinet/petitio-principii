import type { CommandVerb, GameState, Room } from "@/engine";
import type { KeycapLayout } from "./keycapLayout";

/**
 * keycapSurface — pure projection from game state to the *set* of
 * rhetorical-verb and direction keycaps the UI should render *right now*.
 *
 * Distinct from keycapLayout.ts, which only decides the emphasis
 * (calm/charged/primary) of each keycap. This module decides **visibility**.
 *
 * Design brief:
 *   - The game is click/tap only (mobile-first; web is a test harness).
 *   - Keycaps are CONTEXTUAL — they only appear when they're useful here,
 *     tied to the hint system so the first appearance of each non-cardinal
 *     button teaches itself.
 *   - The first several rooms should form an organic diegetic tutorial,
 *     so the tutorial window exposes AT MOST ONE special action at a time.
 *   - Cardinal directions (N/S/E/W) that appear anywhere in the argument
 *     graph stay pinned so the compass grid doesn't jitter. Non-cardinals
 *     only surface when currently available from this room.
 *
 * Pure, testable, stateless. TerminalDisplay.tsx imports the result.
 */

export type RhetoricalVerb =
  | "examine"
  | "question"
  | "ask why"
  | "accept"
  | "reject"
  | "trace back";

const PEDAGOGY: ReadonlyArray<{ verb: RhetoricalVerb; key: keyof KeycapLayout["rhetorical"] }> = [
  { verb: "examine", key: "examine" },
  { verb: "question", key: "question" },
  { verb: "ask why", key: "askWhy" },
  { verb: "accept", key: "accept" },
  { verb: "reject", key: "reject" },
  { verb: "trace back", key: "traceBack" },
];

/** Tutorial ends once the player has used at least this many non-LOOK verbs. */
const TUTORIAL_DISTINCT_VERB_THRESHOLD = 3;

/** …or once they've taken this many turns, whichever comes first. */
const TUTORIAL_TURN_THRESHOLD = 8;

const CARDINAL_DIRECTIONS = new Set(["north", "south", "east", "west"]);
const NON_CARDINAL_DIRECTIONS = new Set(["up", "down", "back", "forward"]);

export interface KeycapSurface {
  /** Verbs the UI should render, including "look". */
  readonly verbs: ReadonlySet<string>;
  /** Cardinal directions (N/S/E/W) that appear anywhere in the graph. Always pinned. */
  readonly cardinals: ReadonlySet<string>;
  /** Non-cardinals currently available as an exit from the present room. */
  readonly nonCardinals: ReadonlySet<string>;
}

export interface KeycapSurfaceContext {
  readonly rooms: GameState["rooms"];
  readonly currentRoom: Room | undefined;
  readonly turnCount: number;
  readonly usedVerbs: ReadonlySet<CommandVerb>;
  readonly layout: KeycapLayout | null;
}

export function computeKeycapSurface(ctx: KeycapSurfaceContext): KeycapSurface {
  const { rooms, currentRoom, turnCount, usedVerbs, layout } = ctx;

  // Cardinal directions that appear anywhere in the argument graph.
  const cardinals = new Set<string>();
  for (const room of rooms.values()) {
    for (const exit of room.exits) {
      if (CARDINAL_DIRECTIONS.has(exit.direction)) cardinals.add(exit.direction);
    }
  }

  // Non-cardinal directions only surface when currently available as an
  // exit from the present room.
  const nonCardinals = new Set<string>();
  if (currentRoom) {
    for (const exit of currentRoom.exits) {
      if (NON_CARDINAL_DIRECTIONS.has(exit.direction)) nonCardinals.add(exit.direction);
    }
  }

  // Verbs — LOOK is always visible.
  const verbs = new Set<string>(["look"]);

  // Every verb the player has already used stays visible.
  const nonLookUsed: string[] = [];
  for (const v of PEDAGOGY) {
    if (usedVerbs.has(v.verb as CommandVerb)) {
      verbs.add(v.verb);
      nonLookUsed.push(v.verb);
    }
  }

  const tutorialOver =
    nonLookUsed.length >= TUTORIAL_DISTINCT_VERB_THRESHOLD || turnCount >= TUTORIAL_TURN_THRESHOLD;

  if (tutorialOver) {
    for (const v of PEDAGOGY) verbs.add(v.verb);
    return { verbs, cardinals, nonCardinals };
  }

  // Tutorial window: reveal exactly one next verb. Prefer a layout-driven
  // primary/charged emphasis if available; otherwise fall back to
  // pedagogy-order next unused.
  if (layout) {
    const preferred = pickTutorialVerb(layout, usedVerbs);
    if (preferred) verbs.add(preferred);
    return { verbs, cardinals, nonCardinals };
  }

  for (const v of PEDAGOGY) {
    if (!usedVerbs.has(v.verb as CommandVerb)) {
      verbs.add(v.verb);
      break;
    }
  }
  return { verbs, cardinals, nonCardinals };
}

function pickTutorialVerb(
  layout: KeycapLayout,
  usedVerbs: ReadonlySet<CommandVerb>
): string | null {
  for (const v of PEDAGOGY) {
    if (usedVerbs.has(v.verb as CommandVerb)) continue;
    if (layout.rhetorical[v.key] === "primary") return v.verb;
  }
  for (const v of PEDAGOGY) {
    if (usedVerbs.has(v.verb as CommandVerb)) continue;
    if (layout.rhetorical[v.key] === "charged") return v.verb;
  }
  for (const v of PEDAGOGY) {
    if (!usedVerbs.has(v.verb as CommandVerb)) return v.verb;
  }
  return null;
}
