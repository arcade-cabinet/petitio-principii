/**
 * Intermediate Representation — the flat shape the db-builder packs
 * into game.db.
 *
 * The normalizer (normalize.ts) takes one parsed CaseNode per file
 * and emits a CaseIR, with:
 *   - references resolved against declared ids (error on dangling)
 *   - predicates rewritten as the JSON schema documented in
 *     docs/design/pivot/01-ARCHITECTURE-DB.md §5
 *   - prose dedented, whitespace normalized
 *
 * The linter (lint.ts) runs on the IR and emits warnings; the
 * pack step (pack.ts) assumes lint has already run.
 */

export type PredicateJson =
  | { readonly all: ReadonlyArray<PredicateJson> }
  | { readonly any: ReadonlyArray<PredicateJson> }
  | { readonly none: ReadonlyArray<PredicateJson> }
  | { readonly clue: string }
  | { readonly fact: string }
  | { readonly claim_state: string; readonly eq: "accepted" | "rejected" | "left-open" }
  | { readonly examined: string }
  | { readonly visited: string }
  | { readonly visits_gte: string; readonly n: number }
  | { readonly examined_gte: string; readonly n: number };

export interface PersonaIR {
  readonly id: string; // {case_id}-persona
  readonly caseId: string;
  readonly displayName: string;
  readonly era: string;
  readonly biography: string;
  readonly voiceNotes: string;
  readonly noticesFirst: ReadonlyArray<string>;
  readonly themeChord: {
    readonly root: string;
    readonly intervals: ReadonlyArray<number>;
    readonly instrument: string;
  };
  readonly proximity: {
    readonly first: string;
    readonly middle: string;
    readonly late: string;
    readonly last: string;
  };
}

export interface CaseIR {
  readonly id: string;
  readonly hour: number;
  readonly title: string;
  readonly oneLine: string;
  readonly opensRoom: string;
  readonly persona: PersonaIR;
  readonly retorts: ReadonlyArray<RetortIR>;
  readonly entities: ReadonlyArray<NamedEntityIR>;
  readonly rooms: ReadonlyArray<RoomIR>;
  readonly exits: ReadonlyArray<ExitIR>;
  readonly clues: ReadonlyArray<ClueIR>;
  readonly claims: ReadonlyArray<ClaimIR>;
  readonly clueSupports: ReadonlyArray<{ clueId: string; claimId: string }>;
  readonly clueContradicts: ReadonlyArray<{ clueId: string; claimId: string }>;
  readonly facts: ReadonlyArray<{ id: string; text: string }>;
  readonly connections: ReadonlyArray<ConnectionIR>;
  readonly verdicts: ReadonlyArray<VerdictIR>;
}

export interface RetortIR {
  readonly caseId: string;
  readonly prose: string;
  readonly tags: ReadonlyArray<string>;
}

export interface NamedEntityIR {
  readonly id: string;
  readonly caseId: string;
  readonly kind: string;
  readonly displayName: string;
  readonly phrasesInProse: ReadonlyArray<string>;
  readonly verbs: ReadonlyArray<string>;
}

export interface RoomIR {
  readonly id: string;
  readonly caseId: string;
  readonly title: string;
  readonly prose: string;
  readonly rhetorical: string | null;
}

export interface ExitIR {
  readonly caseId: string;
  readonly fromRoom: string;
  readonly toRoom: string;
  readonly direction: string;
  readonly prose: string;
  readonly gateWhen: PredicateJson | null;
}

export interface ClueIR {
  readonly id: string;
  readonly caseId: string;
  readonly roomId: string;
  readonly onVerb: string;
  readonly onThing: string | null;
  readonly prose: string;
  readonly revealWhen: PredicateJson | null;
  readonly tags: ReadonlyArray<string>;
  /** Phrases to seed the hotspot vector table at pack time. */
  readonly hotspotPhrases: ReadonlyArray<string>;
}

export interface ClaimIR {
  readonly id: string;
  readonly caseId: string;
  readonly text: string;
}

export interface ConnectionIR {
  readonly id: string;
  readonly caseId: string;
  readonly prose: string;
  readonly yieldsFactId: string;
  readonly requires: ReadonlyArray<{
    kind: "clue" | "fact" | "claim_state";
    refId: string;
    state?: string;
  }>;
}

export interface VerdictIR {
  readonly id: string;
  readonly caseId: string;
  readonly prose: string;
  readonly moralValence: string;
  readonly atmosValence: string;
  readonly cardComment: string;
  readonly requires: PredicateJson;
}
