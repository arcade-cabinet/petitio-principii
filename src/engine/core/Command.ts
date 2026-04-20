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
