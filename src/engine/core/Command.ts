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
  | "back"
  | "north"
  | "south"
  | "east"
  | "west"
  | "up"
  | "down";

export interface ParsedCommand {
  verb: CommandVerb;
  args: string[];
  raw: string;
}

/**
 * Move — the clock-input equivalent of a raw string command.
 *
 * `tap`   — a single slot was pressed and released.
 * `chord` — two slots were held within the chord window.
 *
 * SlotId values must match railroad-clock.tsx's SlotId union.
 */
export type ClockSlotId =
  | "UP"
  | "RIGHT"
  | "DOWN"
  | "LEFT"
  | "LOOK"
  | "EXAMINE"
  | "QUESTION"
  | "ASK_WHY"
  | "ACCEPT"
  | "REJECT"
  | "TRACE_BACK";

export type Move =
  | { kind: "tap"; slot: ClockSlotId }
  | { kind: "chord"; slots: [ClockSlotId, ClockSlotId] };
