/**
 * CommandVerb — every legal player input the parser can emit.
 *
 * Movement: 8 cardinals + 2 vertical (matches src/engine/core/Room.ts
 * Direction). No `back` / `forward` — those were spatial 2D-game
 * crutches. The transcript records where the player came from.
 *
 * Rhetorical: look, examine, question, ask (parsed from "ask why"),
 * trace (parsed from "trace back"), accept, reject. `trace` is the
 * MEMORY verb — it revisits a prior premise rhetorically and is
 * unrelated to spatial reverse.
 */
export type CommandVerb =
  | "go"
  | "examine"
  | "question"
  | "trace"
  | "ask"
  | "accept"
  | "reject"
  | "look"
  | "help"
  | "new"
  | "quit"
  | "inventory"
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest"
  | "up"
  | "down";

export interface ParsedCommand {
  verb: CommandVerb;
  args: string[];
  raw: string;
}

/**
 * Move — the equivalent of a raw string command, used by chord-aware
 * input surfaces (like the future railroad clock or the compass rose).
 *
 * `tap`   — a single slot was pressed and released.
 * `chord` — two slots were held within the chord window.
 *
 * SlotId values must match the consuming UI component's slot IDs.
 */
export type SlotId =
  | "UP"
  | "DOWN"
  | "NORTH"
  | "NORTHEAST"
  | "EAST"
  | "SOUTHEAST"
  | "SOUTH"
  | "SOUTHWEST"
  | "WEST"
  | "NORTHWEST"
  | "LOOK"
  | "EXAMINE"
  | "QUESTION"
  | "ASK_WHY"
  | "ACCEPT"
  | "REJECT"
  | "TRACE_BACK";

export type Move = { kind: "tap"; slot: SlotId } | { kind: "chord"; slots: [SlotId, SlotId] };
