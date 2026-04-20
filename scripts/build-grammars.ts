/**
 * build-grammars
 *
 * Emits `src/content/generated/grammars.json` — the single source of truth
 * the runtime text pipeline (chainDescription, generatePhrase, argument-agent
 * templates) expands through tracery-grammar under a seeded RNG.
 *
 * Inputs (all build-time, none reach the runtime bundle):
 *   - scripts/sources/surrealist-fragments.ts  (PD quotations + pastiche)
 *   - src/content/lexicon/nouns.ts             (RiTa-validated nouns)
 *   - src/content/lexicon/adjectives.ts        (RiTa-validated adjectives)
 *   - The room-description template families currently living in
 *     src/content/chaining.ts (copied in here until T43 removes them).
 *   - The agent state × verb template families from
 *     src/engine/ai/argument-agent.ts (copied in here until T45 removes them).
 *
 * Output shape:
 *   {
 *     lastBuilt, descriptions.<type>.<act>, acks.<kind>,
 *     incantation.{origin,adj,noun}, agent.<state>.<verb>, slots.<name>
 *   }
 *
 * Placeholder convention:
 *   Runtime templates use `{fragment}` / `{acceptedAck}` / etc. We translate
 *   those to Tracery's `#symbol#` convention on the way into JSON. That keeps
 *   one — and only one — syntactic seam between how authors write templates
 *   and how the runtime (through withSeededRng + tracery.flatten) evaluates
 *   them.
 *
 * Usage:
 *   pnpm build-corpus    # also runs this
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADJECTIVES } from "../src/content/lexicon/adjectives.ts";
import { NOUNS } from "../src/content/lexicon/nouns.ts";
import { SURREALIST_FRAGMENTS } from "./sources/surrealist-fragments.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RhetoricalType =
  | "premise"
  | "conclusion"
  | "definition"
  | "analogy"
  | "fallacy"
  | "circular"
  | "objection"
  | "meta";

export type Act = "I" | "II" | "III";

export type AgentStateId = "Composed" | "Defensive" | "Seductive" | "Triumphant";

export type ArgumentVerb = "accept" | "reject" | "question";

export interface GeneratedGrammars {
  readonly lastBuilt: string;
  readonly descriptions: Readonly<Record<RhetoricalType, Readonly<Record<Act, readonly string[]>>>>;
  readonly acks: Readonly<{
    accepted: readonly string[];
    rejected: readonly string[];
    questioned: readonly string[];
  }>;
  readonly incantation: Readonly<{
    origin: readonly string[];
    adj: readonly string[];
    noun: readonly string[];
  }>;
  readonly agent: Readonly<Record<AgentStateId, Readonly<Record<ArgumentVerb, readonly string[]>>>>;
  readonly slots: Readonly<{
    fragment: readonly string[];
    fragment_short: readonly string[];
    fragmentA: readonly string[];
    fragmentB: readonly string[];
  }>;
}

// ---------------------------------------------------------------------------
// Placeholder translation: {foo} → #foo#
//   Runtime/chaining.ts authors using curly braces; Tracery expects hash.
//   We keep the curly-brace convention in the source-of-truth template
//   constants below (copied verbatim from chaining.ts so diffs stay legible),
//   then translate on the way into the JSON.
// ---------------------------------------------------------------------------

function toTraceryRule(curly: string): string {
  return curly.replace(/\{([a-zA-Z][a-zA-Z0-9_.]*)\}/g, (_, key: string) => {
    // Tracery doesn't love dots in symbol names; map `fragment.short` → `fragment_short`.
    const symbol = key.replace(/\./g, "_");
    return `#${symbol}#`;
  });
}

function toTraceryRules(curly: readonly string[]): readonly string[] {
  return curly.map(toTraceryRule);
}

// ---------------------------------------------------------------------------
// Source-of-truth templates (copied from chaining.ts verbatim).
//   T43 will delete the original copies and route chainDescription through
//   this grammar; until then, build-grammars.test.ts asserts the two sets
//   stay byte-identical so drift is impossible.
// ---------------------------------------------------------------------------

const DESCRIPTION_TEMPLATES: Record<RhetoricalType, Record<Act, readonly string[]>> = {
  premise: {
    I: [
      "Columns of unjustified assumptions rise into darkness. One reads: {fragment}. You remember agreeing.",
      "You stand among the first givens. The lectern states: {fragment}. It seemed obvious when you set it down.",
      "This is where it begins. The inscription on the nearest column: {fragment}.",
    ],
    II: [
      "You return. The column you engaged with before is now centred, taller. Its fresh inscription reads: {fragment}. {acceptedAck}",
      "The premise hall rearranges subtly. A new column has grown beside the old: {fragment}. {questionedAck}",
      "You have been here. The given reads the same, differently: {fragment}. {rejectedAck}",
    ],
    III: [
      "The columns close ranks. The only legible one reads: {fragment}. You recognize your handwriting. {acceptedAck}",
      "There are no other columns now. There is only: {fragment}. It is what it has always been.",
      "The premise recites itself, and in reciting becomes: {fragment}. You accept, or do not. It does not matter here.",
    ],
  },
  conclusion: {
    I: [
      "A statement is mounted on a plinth. It reads: {fragment}. You cannot see what it follows from, yet the balcony is comfortable.",
      "The conclusion is here, already concluded. Its engraving: {fragment}.",
      "Above the balcony a motto hangs: {fragment}. The view below is unspecified.",
    ],
    II: [
      "The conclusion has deepened. The plinth now reads: {fragment}. You can almost see what it follows from. {acceptedAck}",
      "You step onto the balcony again. The inscription has absorbed your attention: {fragment}. {questionedAck}",
      "The conclusion was here, still is. Its new wording: {fragment}. {rejectedAck}",
    ],
    III: [
      "The conclusion has become the only statement. It reads: {fragment}. It has always read this way.",
      "The balcony dissolves into its own inscription: {fragment}.",
      "You accept the conclusion, or you don't. Either way, it reads: {fragment}.",
    ],
  },
  definition: {
    I: [
      "Brass dictionaries line the walls. The lectern entry defines the term as {fragment}. You decide this is sufficient.",
      "Definition is offered as given. The chamber's canonical entry: {fragment}.",
      "The meaning is fixed by an inscription below the lantern: {fragment}.",
    ],
    II: [
      "You return to the antechamber. The definition has widened: {fragment}. {acceptedAck}",
      "The dictionary has opened itself to a new page: {fragment}. {questionedAck}",
      "The lectern entry has been amended: {fragment}. {rejectedAck}",
    ],
    III: [
      "Every dictionary is open to the same page. Every page reads: {fragment}.",
      "The definition has eaten its own entry. What remains: {fragment}.",
      "You understand the term exactly as it wished to be understood: {fragment}.",
    ],
  },
  analogy: {
    I: [
      "Paintings along the wall are hung in pairs. Between one pair the curator has written: {fragment}. You trust the arrangement.",
      "An analogy is offered. Its upper plaque reads {fragmentA}; its lower plaque reads {fragmentB}. You supply the resemblance.",
      "The gallery presents one likeness: {fragment}. You walk past it and take its shape with you.",
    ],
    II: [
      "You return to the gallery. The curator's notes between the paintings are denser now: {fragment}. {acceptedAck}",
      "A paragraph has accrued beneath the analogy you inspected before: {fragment}. {questionedAck}",
      "The pair you passed is now annotated: {fragmentA}; and in the margin: {fragmentB}. {rejectedAck}",
    ],
    III: [
      "Every pair carries the same note. Every note reads: {fragment}.",
      "The analogy has eaten both its terms. What remains of the resemblance: {fragment}.",
      "You cannot recall which painting was the source and which the image. The plaque below reads: {fragment}.",
    ],
  },
  fallacy: {
    I: [
      "The cellar is warmer than the rest of the palace. A syllogism has been left out, middle term missing: {fragment}.",
      "An error has been furnished like a room. Its inscription: {fragment}.",
      "Something went wrong here, comfortably. The leftover reasoning: {fragment}.",
    ],
    II: [
      "You return to the cellar. The missing middle term has grown a voice: {fragment}. {acceptedAck}",
      "The fallacy has dressed itself: {fragment}. {questionedAck}",
      "You already know how to complete it. The completion reads: {fragment}. {rejectedAck}",
    ],
    III: [
      "The fallacy is no longer hidden. It addresses you directly: {fragment}.",
      "The cellar has become a single sentence. It reads: {fragment}.",
      "The error admits itself, and in admitting becomes indistinguishable from: {fragment}.",
    ],
  },
  circular: {
    I: [
      "A rotunda with seven entrances and no exits. The inscription on the floor reads: {fragment}. You recognize the phrase.",
      "The atrium turns once as you enter. On the far wall: {fragment}.",
      "You are here already. The floor says so: {fragment}.",
    ],
    II: [
      "You have returned. The inscription on the floor reads: {fragment}. {acceptedAck}",
      "The rotunda repeats itself with small emphasis. The floor: {fragment}. {questionedAck}",
      "You brought this phrase here. You will find it here again: {fragment}. {rejectedAck}",
    ],
    III: [
      "The rotunda has only one inscription, and the inscription is the rotunda: {fragment}.",
      "You are the phrase on the floor. The floor reads: {fragment}.",
      "The circle has closed into a word. The word is: {fragment}.",
    ],
  },
  objection: {
    I: [
      "Monks walk the cloister in slow circles, reading from small books. Each book contains an objection: {fragment}.",
      "A dissent has been placed here for consideration: {fragment}. You nod, politely.",
      "The cloister offers counter-argument: {fragment}.",
    ],
    II: [
      "You return. The monks' objections are denser now, in a hand almost your own: {fragment}. {acceptedAck}",
      "The cloister has gained a new defence against your previous doubt: {fragment}. {questionedAck}",
      "Someone has answered the objection on your behalf: {fragment}. {rejectedAck}",
    ],
    III: [
      "The objection and the defence have become indistinguishable. Both read: {fragment}.",
      "The monks are reading the same passage, at the same time, aloud: {fragment}.",
      "You cannot remember which side of the objection you were on. The page reads: {fragment}.",
    ],
  },
  meta: {
    I: [
      "An observatory whose telescope is trained inward. Through the eyepiece: {fragment}.",
      "The argument watches itself argue. What it sees: {fragment}.",
      "The room describes itself describing. Its self-description: {fragment}.",
    ],
    II: [
      "The telescope has been adjusted. What it sees now: {fragment}. {acceptedAck}",
      "You observe the argument observing your observation: {fragment}. {questionedAck}",
      "The observatory records your return as part of itself: {fragment}. {rejectedAck}",
    ],
    III: [
      "The telescope is pointed at the plate on which it rests. The inscription on the plate reads: {fragment}.",
      "The observatory is the argument, and the argument is: {fragment}.",
      "You have been the argument. The argument has been: {fragment}.",
    ],
  },
};

// Ack clauses. Runtime wraps `{fragment_short}` with memory-conditional
// gating (chainDescription short-circuits to "" when the memory is absent);
// in the grammar JSON we always emit the full clause, and the caller
// overrides `acceptedAck` / `rejectedAck` / `questionedAck` symbols to the
// empty string when memory is absent before calling flatten().
const ACK_TEMPLATES = {
  accepted: ["You remember accepting {fragment_short}."],
  rejected: ["You remember having rejected {fragment_short}, and finding the rejection absorbed."],
  questioned: ["The room defends itself against your earlier question with {fragment_short}."],
} as const;

// Argument-agent state × verb templates — copied verbatim from
// src/engine/ai/argument-agent.ts. Runtime context fills `{roomTitle}` and
// `{roomArticle}` symbols with room-specific strings before flatten().
const AGENT_TEMPLATES: Record<AgentStateId, Record<ArgumentVerb, readonly string[]>> = {
  Composed: {
    accept: [
      "You accept this step in the argument.\nThe {roomTitle} notes your assent and continues, unhurried.",
    ],
    reject: [
      "You reject this step in the argument.\nThe {roomTitle} acknowledges the objection. It has other avenues.",
    ],
    question: [
      "You question the assumption.\nThe {roomTitle} pauses, briefly. The assumption remains.",
      "You question the assumption.\nThe {roomTitle} considers your doubt. It is patient with you.",
    ],
  },
  Defensive: {
    accept: [
      "You accept the step.\nThe {roomTitle} relaxes — it had been bracing. The acceptance is noted among the premises it has already secured.",
    ],
    reject: [
      'You reject the step.\nThe {roomTitle} absorbs the rejection. It files your objection under "dialectical moments the argument has survived."',
    ],
    question: [
      "You question the assumption.\nThe {roomTitle} answers: the question itself presupposes what it questions. You find this compelling.",
      "You question the assumption.\nThe {roomTitle} responds in a hand almost your own: the doubt is already part of the figure. The column grows firmer.",
    ],
  },
  Seductive: {
    accept: [
      "You accept the step.\nThe {roomTitle} is flattered. Details you have accepted grow prominent; details you have not recede.",
    ],
    reject: [
      "You reject the step.\nThe {roomTitle} smiles, a little. The rejection is recorded as evidence of your discernment — which in turn underwrites the conclusions you did accept.",
    ],
    question: [
      "You question the assumption.\nThe {roomTitle} welcomes the question. An argument open to scrutiny must be sound.",
      "You question the assumption.\nThe {roomTitle} recites your doubt back to you in a warmer register. You nod.",
    ],
  },
  Triumphant: {
    accept: [
      "You accept the argument.\nThe conclusion you have accepted is identical to the premise from which you began.\nYou have completed the circle here, in {roomArticle} {roomType} room. Petitio Principii.\n\nThe argument was always about itself.",
    ],
    reject: [
      "You reject the argument.\nThe {roomTitle} absorbs your rejection as a necessary dialectical moment and continues. You remember having rejected this before.",
    ],
    question: [
      "You question the assumption.\nThe {roomTitle} records your question among its premises. The question will later be cited as evidence that the conclusion is open to scrutiny, therefore sound.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Slot vocabulary — built from the frozen sources.
// ---------------------------------------------------------------------------

function trimToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function buildSlotVocabulary(): GeneratedGrammars["slots"] {
  const fullTexts = SURREALIST_FRAGMENTS.map((f) => f.text);
  return {
    fragment: fullTexts.map((t) => trimToWords(t, 14)),
    fragment_short: fullTexts.map((t) => trimToWords(t, 8)),
    fragmentA: fullTexts.map((t) => trimToWords(t, 10)),
    fragmentB: fullTexts.map((t) => trimToWords(t, 10)),
  };
}

// ---------------------------------------------------------------------------
// Incantation grammar — drives generatePhrase.
//   Current runtime: `${adj1} ${adj2} ${noun}` where adj1/adj2 come from a
//   shuffled pool so they're distinct. Expressed as Tracery:
//
//     origin: "#adj.capitalize# #adj# #noun#"
//
//   — but that *can* repeat an adjective. For T44 we'll wrap the flatten
//   call in the caller to re-roll on repeats; alternatively Tracery modifiers
//   could do it, but the caller-side approach keeps determinism explicit.
// ---------------------------------------------------------------------------

function buildIncantation(): GeneratedGrammars["incantation"] {
  return {
    origin: ["#adj# #adj# #noun#"],
    adj: [...ADJECTIVES],
    noun: [...NOUNS],
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function buildGrammars(now: Date = new Date()): GeneratedGrammars {
  const descriptions = {} as Record<RhetoricalType, Record<Act, readonly string[]>>;
  for (const [type, acts] of Object.entries(DESCRIPTION_TEMPLATES) as [
    RhetoricalType,
    Record<Act, readonly string[]>,
  ][]) {
    descriptions[type] = {
      I: toTraceryRules(acts.I),
      II: toTraceryRules(acts.II),
      III: toTraceryRules(acts.III),
    };
  }

  const agent = {} as Record<AgentStateId, Record<ArgumentVerb, readonly string[]>>;
  for (const [stateId, verbs] of Object.entries(AGENT_TEMPLATES) as [
    AgentStateId,
    Record<ArgumentVerb, readonly string[]>,
  ][]) {
    agent[stateId] = {
      accept: toTraceryRules(verbs.accept),
      reject: toTraceryRules(verbs.reject),
      question: toTraceryRules(verbs.question),
    };
  }

  return {
    lastBuilt: now.toISOString(),
    descriptions,
    acks: {
      accepted: toTraceryRules(ACK_TEMPLATES.accepted),
      rejected: toTraceryRules(ACK_TEMPLATES.rejected),
      questioned: toTraceryRules(ACK_TEMPLATES.questioned),
    },
    incantation: buildIncantation(),
    agent,
    slots: buildSlotVocabulary(),
  };
}

// ---------------------------------------------------------------------------
// Rendering — emit JSON with stable field order and preserved `lastBuilt`
// when nothing of substance changed (mirrors build-corpus's stable render).
// ---------------------------------------------------------------------------

function stableStringify(grammars: GeneratedGrammars): string {
  // JSON.stringify preserves insertion order for string keys on plain objects.
  // We construct everything in a deterministic order above, so a direct call
  // with 2-space indent is stable.
  return `${JSON.stringify(grammars, null, 2)}\n`;
}

export function renderStableGrammarsJson(
  grammars: GeneratedGrammars,
  previous: string | null
): string {
  if (previous === null) return stableStringify(grammars);
  const candidateWithPrevStamp = stableStringify({
    ...grammars,
    lastBuilt: extractLastBuilt(previous) ?? grammars.lastBuilt,
  });
  if (candidateWithPrevStamp === previous) return previous;
  return stableStringify(grammars);
}

function extractLastBuilt(source: string): string | null {
  const match = source.match(/"lastBuilt":\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function resolveOutputPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "src", "content", "generated", "grammars.json");
}

function main(): void {
  const grammars = buildGrammars();
  const target = resolveOutputPath();
  const previous = existsSync(target) ? readFileSync(target, "utf8") : null;
  const output = renderStableGrammarsJson(grammars, previous);
  writeFileSync(target, output, "utf8");
  const descriptionCount = Object.values(grammars.descriptions).reduce(
    (acc, byAct) => acc + byAct.I.length + byAct.II.length + byAct.III.length,
    0
  );
  const agentCount = Object.values(grammars.agent).reduce(
    (acc, byVerb) => acc + byVerb.accept.length + byVerb.reject.length + byVerb.question.length,
    0
  );
  console.log(
    `[build-grammars] wrote ${descriptionCount} description + ${agentCount} agent rules, ${grammars.slots.fragment.length} fragments, ${grammars.incantation.adj.length} adjs × ${grammars.incantation.noun.length} nouns to ${path.relative(
      process.cwd(),
      target
    )}`
  );
}

const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main();
}
