/**
 * Lexical grammar for the SCENE language.
 *
 * Token kinds mirror `docs/design/pivot/03-SCENE-LANGUAGE.md` §2.
 */

export type TokenKind =
  | "identifier"
  | "keyword"
  | "reference" // ns:id — resolved later to a kind + id
  | "string" // "..."
  | "heredoc" // <<< ... >>>
  | "number" // 42 or 0.5
  | "lbrace" // {
  | "rbrace" // }
  | "lbracket" // [
  | "rbracket" // ]
  | "colon" // : (standalone, after `all`/`any`/`none` in predicates)
  | "comma" // ,
  | "arrow" // ->
  | "pipe" // |
  | "at" // @ (used as `@ accepted` on claim_state refs)
  | "eof";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
  /** byte offset into source; useful for better error pointers. */
  readonly offset: number;
}

export const KEYWORDS: ReadonlySet<string> = new Set([
  "case",
  "title",
  "hour",
  "one-line",
  "opens",
  "persona",
  "name",
  "era",
  "biography",
  "voice-notes",
  "notices-first",
  "theme-chord",
  "root",
  "intervals",
  "instrument",
  "proximity-first",
  "proximity-middle",
  "proximity-late",
  "proximity-last",
  "retorts",
  "retort",
  "named-entity",
  "kind",
  "display-name",
  "phrases-in-prose",
  "verbs",
  "room",
  "prose",
  "rhetorical",
  "exit",
  "gate",
  "clue",
  "on",
  "examine",
  "question",
  "ask",
  "look",
  "accept",
  "reject",
  "trace",
  "thing",
  "reveal",
  "tags",
  "supports",
  "contradicts",
  "hotspots",
  "connect",
  "from",
  "yields",
  "claim",
  "verdict",
  "requires",
  "moral",
  "atmos",
  "card-comment",
  "claim_state",
  "fact",
  "examined",
  "visited",
  "visits_gte",
  "examined_gte",
  "all",
  "any",
  "none",
]);
