import type { CommandVerb, ParsedCommand } from "./Command";

const DIRECTION_ALIASES: Record<string, CommandVerb> = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  u: "up",
  d: "down",
  north: "north",
  south: "south",
  east: "east",
  west: "west",
  up: "up",
  down: "down",
};

const VERB_ALIASES: Record<string, CommandVerb> = {
  go: "go",
  move: "go",
  walk: "go",
  examine: "examine",
  ex: "examine",
  x: "examine",
  inspect: "examine",
  look: "look",
  l: "look",
  question: "question",
  q: "question",
  "ask why": "ask",
  ask: "ask",
  trace: "trace",
  "trace back": "trace",
  accept: "accept",
  agree: "accept",
  reject: "reject",
  deny: "reject",
  refuse: "reject",
  help: "help",
  "?": "help",
  h: "help",
  new: "new",
  "new game": "new",
  quit: "quit",
  exit: "quit",
  inventory: "inventory",
  i: "inventory",
  inv: "inventory",
};

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const tokens = lower.split(/\s+/);
  const first = tokens[0] ?? "";

  if (first in DIRECTION_ALIASES) {
    return {
      verb: DIRECTION_ALIASES[first] as CommandVerb,
      args: [],
      raw,
    };
  }

  if (first === "go" && tokens[1] && tokens[1] in DIRECTION_ALIASES) {
    return {
      verb: DIRECTION_ALIASES[tokens[1]] as CommandVerb,
      args: [],
      raw,
    };
  }

  const twoWord = `${tokens[0]} ${tokens[1] ?? ""}`.trim();
  if (twoWord in VERB_ALIASES) {
    return {
      verb: VERB_ALIASES[twoWord] as CommandVerb,
      args: tokens.slice(2),
      raw,
    };
  }

  if (first in VERB_ALIASES) {
    return {
      verb: VERB_ALIASES[first] as CommandVerb,
      args: tokens.slice(1),
      raw,
    };
  }

  return {
    verb: "examine",
    args: tokens,
    raw,
  };
}
