import { ADJECTIVES } from "../content/lexicon/adjectives";
import { NOUNS } from "../content/lexicon/nouns";
import { RHETORICAL_TERMS } from "../content/lexicon/rhetoricalTerms";
import { createSeededRandom, pickRandom } from "../prng/seedRandom";
import type { Room } from "./Room";

export function generatePhrase(seed: number): string {
  const rng = createSeededRandom(seed);
  const adj1 = pickRandom([...ADJECTIVES], rng);
  const adj2 = pickRandom([...ADJECTIVES], rng);
  const noun = pickRandom([...NOUNS], rng);
  return `${adj1}-${adj2}-${noun}`;
}

export function describeRoom(room: Room): string[] {
  const lines: string[] = [];
  lines.push(`--- ${room.title} ---`);
  lines.push(room.description);
  lines.push("");
  if (room.exits.length === 0) {
    lines.push("There are no obvious exits.");
  } else {
    const exitList = room.exits.map((e) => e.direction.toUpperCase()).join(", ");
    lines.push(`Exits: ${exitList}`);
  }
  return lines;
}

export function describeFallacy(seed: number): string {
  const rng = createSeededRandom(seed);
  const fallacies = RHETORICAL_TERMS.filter((t) => t.category === "fallacy");
  const term = pickRandom(fallacies, rng);
  return `You sense a ${term.term} here. ${term.definition}`;
}

export function getHelpText(): string[] {
  return [
    "Available commands:",
    "  GO <direction> / N / S / E / W / UP / DOWN — Move through the argument.",
    "  LOOK / L                                   — Describe the current room.",
    "  EXAMINE / X [thing]                        — Examine something closely.",
    "  QUESTION ASSUMPTION                        — Question the current premise.",
    "  ASK WHY                                    — Ask for justification.",
    "  TRACE BACK                                 — Return to the previous room.",
    "  ACCEPT                                     — Accept the current argument.",
    "  REJECT                                     — Reject the current argument.",
    "  HELP / ?                                   — Show this help.",
    "  NEW GAME                                   — Start a new game.",
  ];
}
