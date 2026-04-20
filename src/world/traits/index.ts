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
