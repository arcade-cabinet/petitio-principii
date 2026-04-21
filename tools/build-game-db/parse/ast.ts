/**
 * AST types for SCENE. A case parses into one CaseNode; the
 * normalizer flattens this into IR the db-builder consumes.
 */

export interface Position {
  readonly line: number;
  readonly column: number;
}

/** A reference like `clue:receiver-warm` or `fact:she-was-alone`. */
export interface Ref {
  readonly kind: string; // 'clue' | 'claim' | 'fact' | 'room' | 'verdict' | 'connection' | 'entity' | 'persona' | 'case' | 'exit'
  readonly id: string;
  readonly pos: Position;
}

/** Predicate node — the gate/reveal/requires grammar. */
export type Predicate =
  | { readonly op: "all"; readonly children: ReadonlyArray<Predicate> }
  | { readonly op: "any"; readonly children: ReadonlyArray<Predicate> }
  | { readonly op: "none"; readonly children: ReadonlyArray<Predicate> }
  | { readonly op: "clue"; readonly ref: Ref }
  | { readonly op: "fact"; readonly ref: Ref }
  | { readonly op: "claim_state"; readonly ref: Ref; readonly state: string }
  | { readonly op: "examined"; readonly ref: Ref }
  | { readonly op: "visited"; readonly ref: Ref }
  | { readonly op: "visits_gte"; readonly ref: Ref; readonly n: number }
  | { readonly op: "examined_gte"; readonly ref: Ref; readonly n: number };

export interface PersonaNode {
  readonly name: string;
  readonly era: string;
  readonly biography: string;
  readonly voiceNotes: string;
  readonly noticesFirst: ReadonlyArray<string>;
  readonly themeChord: {
    readonly root: string;
    readonly intervals: ReadonlyArray<number>;
    readonly instrument: string;
  } | null;
  readonly proximity: {
    readonly first: string;
    readonly middle: string;
    readonly late: string;
    readonly last: string;
  };
  readonly pos: Position;
}

export interface RetortNode {
  readonly prose: string;
  readonly tags: ReadonlyArray<string>;
  readonly pos: Position;
}

export interface NamedEntityNode {
  readonly id: string;
  readonly kind: string; // 'person' | 'place' | 'object'
  readonly displayName: string;
  readonly phrasesInProse: ReadonlyArray<string>;
  readonly verbs: ReadonlyArray<string>;
  readonly pos: Position;
}

export interface ExitNode {
  readonly direction: string;
  readonly target: string; // room id
  readonly prose: string;
  readonly gate: Predicate | null;
  readonly pos: Position;
}

export interface ClueOnClause {
  readonly verb: string;
  readonly thing: string | null; // `thing:<tag>` argument
}

export interface ClueNode {
  readonly id: string;
  readonly on: ReadonlyArray<ClueOnClause>;
  readonly prose: string;
  readonly hotspots: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly supports: ReadonlyArray<Ref>;
  readonly contradicts: ReadonlyArray<Ref>;
  readonly reveal: Predicate | null;
  readonly pos: Position;
}

export interface RoomNode {
  readonly id: string;
  readonly title: string;
  readonly prose: string;
  readonly rhetorical: string | null;
  readonly exits: ReadonlyArray<ExitNode>;
  readonly clues: ReadonlyArray<ClueNode>;
  readonly pos: Position;
}

export interface ConnectionNode {
  readonly id: string;
  readonly from: ReadonlyArray<Ref>;
  readonly yields: Ref; // fact ref
  readonly prose: string;
  readonly pos: Position;
}

export interface ClaimNode {
  readonly id: string;
  readonly text: string;
  readonly pos: Position;
}

export interface VerdictNode {
  readonly id: string;
  readonly requires: Predicate;
  readonly moral: string;
  readonly atmos: string;
  readonly prose: string;
  readonly cardComment: string;
  readonly pos: Position;
}

export interface CaseNode {
  readonly id: string;
  readonly title: string;
  readonly hour: number;
  readonly oneLine: string;
  readonly opens: string; // room id
  readonly persona: PersonaNode;
  readonly retorts: ReadonlyArray<RetortNode>;
  readonly entities: ReadonlyArray<NamedEntityNode>;
  readonly rooms: ReadonlyArray<RoomNode>;
  readonly connections: ReadonlyArray<ConnectionNode>;
  readonly claims: ReadonlyArray<ClaimNode>;
  readonly verdicts: ReadonlyArray<VerdictNode>;
  readonly pos: Position;
}
