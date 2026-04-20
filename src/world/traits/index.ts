import type { Direction } from "@/engine";
import { trait } from "koota";

/** Tag trait: marks the entity that represents the human player. */
export const IsPlayer = trait();

/** Tag trait: marks entities that represent rooms in the argument graph. */
export const IsRoom = trait();

/** Stable string id of a rhetorical space. Used to look up rooms by id. */
export const RoomId = trait({ value: "" });

/** Player presence — points at the RoomId the player is currently in. */
export const Position = trait({ roomId: "" });

/** The rhetorical character of a room — drives narrative + audio choices. */
export const RhetoricalSpace = trait({
  type: "premise" as
    | "premise"
    | "conclusion"
    | "definition"
    | "analogy"
    | "fallacy"
    | "circular"
    | "objection"
    | "meta",
  title: "",
  description: "",
});

/** An exit that connects one room to another. */
export const Exit = trait({
  direction: "north" as Direction,
  targetRoomId: "",
  description: "",
});

/**
 * Audio tone for a rhetorical space. `dissonance` in [0, 1] shifts
 * the playback from a clean major triad toward a minor-second cluster.
 */
export const AudioTheme = trait({
  baseFrequency: 440,
  dissonance: 0,
});

/**
 * A single line of transcript output. Each line is its own entity so that
 * (a) React can key on its koota entity id for stable renders, and
 * (b) later systems can attach per-line traits (e.g. "this line is the
 * premise being challenged", "this line was traced-back-through").
 *
 * `ordinal` is monotonic per game and gives the rendered order; `kind`
 * routes styling (narration vs. player echo vs. room title vs. spacer).
 */
export const OutputLine = trait({
  ordinal: 0,
  kind: "narration" as "narration" | "echo" | "title" | "spacer",
  text: "",
});

/**
 * Turn id stamped on each OutputLine entity. A "turn" is the contiguous
 * range of output lines emitted between two player inputs — typically:
 *   echo → title → description line(s) → response line(s) → spacer.
 *
 * All lines that share a `turnId` form one logical beat of play. The
 * display projects the transcript into past/present by grouping on this
 * field (see docs/UX.md §2, readTranscriptByTurn in src/world/index.ts).
 *
 * turnId 0 is reserved for system-emitted lines that precede the first
 * player input (e.g. the opening room description).
 */
export const TurnMark = trait({ turnId: 0 });

/**
 * Per-room tallies of rhetorical acts. Counter traits on the Room entity
 * itself — incremented each time the player performs the corresponding
 * verb in that room. The argument agent reads these (projected through
 * `readArgumentMemory`) to decide how to narrate.
 *
 * Counters rather than tags because a room may be questioned twice, and
 * "the room trembles slightly more the second time" is a story we want
 * to be able to tell later.
 */
export const WasAccepted = trait({ count: 0 });
export const WasRejected = trait({ count: 0 });
export const WasQuestioned = trait({ count: 0 });

/**
 * Visit ordinal stamped on a room entity the first time the player enters
 * it. Zero means "not visited." Non-zero values form the argument-map
 * geometry: "the shape of the argument as remembered."
 *
 * We record the *first* arrival only — the map cares about turn order of
 * first contact, not revisit counts. Revisits live in the transcript and
 * the per-verb counters above.
 */
export const Visited = trait({
  ordinal: 0,
});

/**
 * Tag trait: the circle has closed. Set when the player ACCEPTs in a
 * circular or meta room — the moment when `petitio principii` stops being
 * a thing happening *in* the game and becomes the shape *of* the game.
 *
 * One-shot: once set, it persists until a new world is built. The
 * ArgumentMap reads this to draw the closing edge in bright pink.
 */
export const CircleClosed = trait();
