import type { CommandVerb, Room } from "@/engine";

/**
 * computeKeycapLayout — pure function from "where the player is and what
 * they've done" to per-keycap visual emphasis.
 *
 * Per docs/UX.md §1.3:
 *   - calm:    technically available, unlikely to matter *here*.
 *   - charged: available and meaningful.
 *   - primary: the verb most plausibly useful next (one at most).
 *
 * Keycaps never vanish. This function only shifts emphasis — the TerminalDisplay
 * still renders every verb/direction, and direction silhouettes (disabled +
 * faded) communicate un-traversable exits separately.
 *
 * Determinism: pure function of the inputs. Testable in isolation (no React,
 * no koota). TerminalDisplay calls it once per render.
 */

export type KeycapEmphasis = "calm" | "charged" | "primary";

export interface KeycapLayoutContext {
  readonly room: Room;
  /** Turns played so far (GameState.turnCount). */
  readonly turnCount: number;
  /** Verbs the player has used at least once. */
  readonly usedVerbs: ReadonlySet<CommandVerb>;
  /** Whether the player has already closed the circle (CircleClosed tag). */
  readonly circleClosed: boolean;
}

/** Emphasis per *rhetorical* verb — movement gets its own treatment below. */
export interface RhetoricalEmphasis {
  readonly look: KeycapEmphasis;
  readonly examine: KeycapEmphasis;
  readonly question: KeycapEmphasis;
  readonly askWhy: KeycapEmphasis;
  readonly accept: KeycapEmphasis;
  readonly reject: KeycapEmphasis;
  readonly traceBack: KeycapEmphasis;
}

/**
 * Per-direction availability, plus whether that exit has been traversed
 * from this room at least once (the trailing-glow hint in the UX spec).
 * `available` drives the silhouette in T51; `alreadyTraversed` drives the
 * faint exit-glow.
 */
export interface DirectionState {
  readonly available: boolean;
  readonly alreadyTraversed: boolean;
}

export interface KeycapLayout {
  readonly rhetorical: RhetoricalEmphasis;
  readonly directions: Readonly<Record<string, DirectionState>>;
}

// 10 spatial primitives — 8 horizontal cardinals + 2 vertical.
// No `back` / `forward` (those were 2D-game crutches, retired).
const ALL_DIRECTIONS = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "up",
  "down",
] as const;

function isCircleRoom(room: Room): boolean {
  return room.rhetoricalType === "circular" || room.rhetoricalType === "meta";
}

export function computeKeycapLayout(
  ctx: KeycapLayoutContext,
  /** Optional: traversed-from-this-room exits, keyed by direction. */
  traversed: ReadonlySet<string> = new Set()
): KeycapLayout {
  const { room, turnCount, usedVerbs, circleClosed } = ctx;

  // Rhetorical emphasis ----------------------------------------------------
  // One primary at most. Rules apply in order — first match wins:
  //   1. Circle already closed → traceBack is primary (explore the shape).
  //   2. In a circular/meta room and accept not yet used → accept is primary.
  //   3. Never looked AND (turn 0, OR turn 1 with no look yet) → look is primary.
  //   4. Otherwise any turn ≥ 1 where examine is unused → examine is primary.
  //   5. Otherwise → nothing is primary; emphasis is calm/charged only.
  let primary: keyof RhetoricalEmphasis | null = null;
  if (circleClosed) {
    primary = "traceBack";
  } else if (isCircleRoom(room) && !usedVerbs.has("accept")) {
    primary = "accept";
  } else if (turnCount === 0 || (turnCount === 1 && !usedVerbs.has("look"))) {
    primary = "look";
  } else if (turnCount >= 1 && !usedVerbs.has("examine")) {
    primary = "examine";
  }

  // Charged vs calm: accept/reject/question are charged anywhere it's not
  // a circle room (in a circle room only accept is charged — reject and
  // question collapse to calm because the shape of the turn is about to
  // become the shape of the game). look/examine are charged on turn 0,
  // calm otherwise. askWhy is always calm until T55's enrichment.
  const charged = new Set<keyof RhetoricalEmphasis>();
  if (!isCircleRoom(room)) {
    charged.add("accept");
    charged.add("reject");
    charged.add("question");
  } else {
    charged.add("accept");
  }
  if (turnCount <= 1) charged.add("look");
  if (turnCount <= 2) charged.add("examine");
  if (circleClosed) charged.add("traceBack");

  const asEmphasis = (v: keyof RhetoricalEmphasis): KeycapEmphasis => {
    if (primary === v) return "primary";
    if (charged.has(v)) return "charged";
    return "calm";
  };

  const rhetorical: RhetoricalEmphasis = {
    look: asEmphasis("look"),
    examine: asEmphasis("examine"),
    question: asEmphasis("question"),
    askWhy: asEmphasis("askWhy"),
    accept: asEmphasis("accept"),
    reject: asEmphasis("reject"),
    traceBack: asEmphasis("traceBack"),
  };

  // Direction availability -------------------------------------------------
  const available = new Set(room.exits.map((e) => e.direction));
  const directions: Record<string, DirectionState> = {};
  for (const dir of ALL_DIRECTIONS) {
    directions[dir] = {
      available: available.has(dir),
      alreadyTraversed: traversed.has(dir),
    };
  }

  return { rhetorical, directions };
}
