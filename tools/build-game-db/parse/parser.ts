/**
 * Recursive-descent parser for SCENE.
 *
 * Input: Token[] from tokenizer.ts
 * Output: CaseNode (one per file)
 *
 * No backtracking. Parse errors carry line/column; the top-level
 * `parseCase` function catches and rethrows with a source-location
 * excerpt for clean CLI reporting.
 */

import type {
  CaseNode,
  ClaimNode,
  ClueNode,
  ClueOnClause,
  ConnectionNode,
  ExitNode,
  NamedEntityNode,
  PersonaNode,
  Position,
  Predicate,
  Ref,
  RetortNode,
  RoomNode,
  VerdictNode,
} from "./ast";
import type { Token } from "./tokens";

export class ParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
    readonly path?: string
  ) {
    super(path ? `${path}:${line}:${column}: ${message}` : `(${line}:${column}): ${message}`);
    this.name = "ParseError";
  }
}

class Cursor {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}

  peek(off = 0): Token {
    return this.tokens[this.i + off] ?? this.tokens[this.tokens.length - 1];
  }

  next(): Token {
    const tk = this.tokens[this.i];
    if (this.i < this.tokens.length - 1) this.i++;
    return tk;
  }

  /** Consume a token of the given kind + (optional) value, or throw. */
  expect(kind: Token["kind"], value?: string): Token {
    const tk = this.peek();
    if (tk.kind !== kind || (value !== undefined && tk.value !== value)) {
      throw new ParseError(
        `expected ${value ? `\`${value}\`` : kind}, got \`${tk.value || tk.kind}\``,
        tk.line,
        tk.column
      );
    }
    return this.next();
  }

  /** Accept a token if it matches; otherwise return null without advancing. */
  accept(kind: Token["kind"], value?: string): Token | null {
    const tk = this.peek();
    if (tk.kind !== kind) return null;
    if (value !== undefined && tk.value !== value) return null;
    return this.next();
  }

  eof(): boolean {
    return this.peek().kind === "eof";
  }
}

const posOf = (t: Token): Position => ({ line: t.line, column: t.column });

// ─────────────────────────────────────────────────────────────────────
// Reference parser: `<kind> : <id>`
//
// References can also appear as `claim_state:<id>` even though
// `claim_state` is a keyword — the tokenizer emits keywords for these
// because they're used as predicate-atom markers.
// ─────────────────────────────────────────────────────────────────────
function parseRef(c: Cursor): Ref {
  const head = c.peek();
  if (head.kind !== "identifier" && head.kind !== "keyword") {
    throw new ParseError(
      `expected reference kind (e.g. 'clue'), got \`${head.value || head.kind}\``,
      head.line,
      head.column
    );
  }
  const kind = c.next().value;
  c.expect("colon");
  const idTok = c.peek();
  if (idTok.kind !== "identifier" && idTok.kind !== "keyword") {
    throw new ParseError(`expected reference id after \`${kind}:\``, idTok.line, idTok.column);
  }
  c.next();
  return { kind, id: idTok.value, pos: posOf(head) };
}

// ─────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────
function parseStringOrHeredoc(c: Cursor): string {
  const tk = c.peek();
  if (tk.kind === "string" || tk.kind === "heredoc") return c.next().value;
  throw new ParseError(
    `expected string or heredoc, got \`${tk.value || tk.kind}\``,
    tk.line,
    tk.column
  );
}

function parseStringList(c: Cursor): string[] {
  c.expect("lbracket");
  const out: string[] = [];
  while (c.peek().kind !== "rbracket") {
    const tk = c.peek();
    if (tk.kind !== "string") {
      throw new ParseError(
        `expected string in list, got \`${tk.value || tk.kind}\``,
        tk.line,
        tk.column
      );
    }
    out.push(c.next().value);
    if (!c.accept("comma")) break;
  }
  c.expect("rbracket");
  return out;
}

function parseNumberList(c: Cursor): number[] {
  c.expect("lbracket");
  const out: number[] = [];
  while (c.peek().kind !== "rbracket") {
    const tk = c.expect("number");
    out.push(Number(tk.value));
    if (!c.accept("comma")) break;
  }
  c.expect("rbracket");
  return out;
}

function parseRefList(c: Cursor): Ref[] {
  c.expect("lbracket");
  const out: Ref[] = [];
  while (c.peek().kind !== "rbracket") {
    out.push(parseRef(c));
    if (!c.accept("comma")) break;
  }
  c.expect("rbracket");
  return out;
}

function parseTagsBlock(c: Cursor): string[] {
  // `tags { foo, bar, baz }` — tags look like identifiers without colon.
  c.expect("keyword", "tags");
  c.expect("lbrace");
  const out: string[] = [];
  while (c.peek().kind !== "rbrace") {
    const tk = c.peek();
    if (tk.kind !== "identifier" && tk.kind !== "keyword") {
      throw new ParseError(
        `expected tag identifier, got \`${tk.value || tk.kind}\``,
        tk.line,
        tk.column
      );
    }
    out.push(c.next().value);
    if (!c.accept("comma")) break;
  }
  c.expect("rbrace");
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Predicate grammar (gate / reveal / requires)
// ─────────────────────────────────────────────────────────────────────
function parsePredicate(c: Cursor): Predicate {
  // wrap token: either `{ all: [...] }` top-level block, or a single atom
  if (c.peek().kind === "lbrace") {
    c.expect("lbrace");
    // inside the block there MUST be exactly one "op: [...]" combinator
    const head = c.peek();
    if (
      head.kind === "keyword" &&
      (head.value === "all" || head.value === "any" || head.value === "none")
    ) {
      const op = c.next().value as "all" | "any" | "none";
      c.expect("colon");
      c.expect("lbracket");
      const children: Predicate[] = [];
      while (c.peek().kind !== "rbracket") {
        children.push(parsePredicateAtom(c));
        if (!c.accept("comma")) break;
      }
      c.expect("rbracket");
      c.expect("rbrace");
      return { op, children };
    }
    // shorthand: `{ clue:foo }` — a single-atom block
    const atom = parsePredicateAtom(c);
    c.expect("rbrace");
    return atom;
  }
  return parsePredicateAtom(c);
}

function parsePredicateAtom(c: Cursor): Predicate {
  const head = c.peek();
  // nested combinator: `any: [ ... ]`
  if (
    head.kind === "keyword" &&
    (head.value === "all" || head.value === "any" || head.value === "none")
  ) {
    const op = c.next().value as "all" | "any" | "none";
    c.expect("colon");
    c.expect("lbracket");
    const children: Predicate[] = [];
    while (c.peek().kind !== "rbracket") {
      children.push(parsePredicateAtom(c));
      if (!c.accept("comma")) break;
    }
    c.expect("rbracket");
    return { op, children };
  }

  // reference-like atoms: kind:id [modifier]
  const ref = parseRef(c);
  switch (ref.kind) {
    case "clue":
      return { op: "clue", ref };
    case "fact":
      return { op: "fact", ref };
    case "examined":
      return { op: "examined", ref };
    case "visited":
      return { op: "visited", ref };
    case "claim_state": {
      c.expect("at");
      const stateTok = c.peek();
      if (stateTok.kind !== "identifier" && stateTok.kind !== "keyword") {
        throw new ParseError("expected claim state after @", stateTok.line, stateTok.column);
      }
      c.next();
      return { op: "claim_state", ref, state: stateTok.value };
    }
    case "visits_gte":
    case "examined_gte": {
      // `visits_gte:<room-id>:<n>` parsed as two refs then a number —
      // actually simpler: the form is `visits_gte:<id>` followed by
      // nothing special; n is encoded in the ref id as id:n OR we allow
      // a trailing number atom. Simplify: require `visits_gte:<id>` and
      // a following number.
      const nTok = c.expect("number");
      return {
        op: ref.kind,
        ref,
        n: Number(nTok.value),
      };
    }
    default:
      throw new ParseError(
        `unknown predicate atom kind: ${ref.kind}`,
        ref.pos.line,
        ref.pos.column
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Persona block
// ─────────────────────────────────────────────────────────────────────
function parsePersona(c: Cursor): PersonaNode {
  const start = c.peek();
  c.expect("keyword", "persona");
  c.expect("lbrace");

  let name = "";
  let era = "";
  let biography = "";
  let voiceNotes = "";
  let noticesFirst: string[] = [];
  let themeChord: PersonaNode["themeChord"] = null;
  const proximity = { first: "", middle: "", late: "", last: "" };

  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    switch (tk.value) {
      case "name":
        name = parseStringOrHeredoc(c);
        break;
      case "era":
        era = parseStringOrHeredoc(c);
        break;
      case "biography":
        biography = parseStringOrHeredoc(c);
        break;
      case "voice-notes":
        voiceNotes = parseStringOrHeredoc(c);
        break;
      case "notices-first":
        noticesFirst = parseTagsBlockInline(c);
        break;
      case "theme-chord":
        themeChord = parseThemeChord(c);
        break;
      case "proximity-first":
        proximity.first = parseStringOrHeredoc(c);
        break;
      case "proximity-middle":
        proximity.middle = parseStringOrHeredoc(c);
        break;
      case "proximity-late":
        proximity.late = parseStringOrHeredoc(c);
        break;
      case "proximity-last":
        proximity.last = parseStringOrHeredoc(c);
        break;
      default:
        throw new ParseError(`unknown persona field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");

  return {
    name,
    era,
    biography,
    voiceNotes,
    noticesFirst,
    themeChord,
    proximity,
    pos: posOf(start),
  };
}

function parseTagsBlockInline(c: Cursor): string[] {
  // Used inside persona for `notices-first { ... }`. Structurally same as `tags { ... }`
  // but without the "tags" keyword prefix.
  c.expect("lbrace");
  const out: string[] = [];
  while (c.peek().kind !== "rbrace") {
    const tk = c.peek();
    if (tk.kind !== "identifier" && tk.kind !== "keyword") {
      throw new ParseError(
        `expected tag identifier, got \`${tk.value || tk.kind}\``,
        tk.line,
        tk.column
      );
    }
    out.push(c.next().value);
    if (!c.accept("comma")) break;
  }
  c.expect("rbrace");
  return out;
}

function parseThemeChord(c: Cursor): NonNullable<PersonaNode["themeChord"]> {
  c.expect("lbrace");
  let root = "";
  let intervals: number[] = [];
  let instrument = "";
  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    switch (tk.value) {
      case "root":
        root = parseStringOrHeredoc(c);
        break;
      case "intervals":
        intervals = parseNumberList(c);
        break;
      case "instrument":
        instrument = parseStringOrHeredoc(c);
        break;
      default:
        throw new ParseError(`unknown theme-chord field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");
  return { root, intervals, instrument };
}

// ─────────────────────────────────────────────────────────────────────
// Retorts block
// ─────────────────────────────────────────────────────────────────────
function parseRetorts(c: Cursor): RetortNode[] {
  c.expect("keyword", "retorts");
  c.expect("lbrace");
  const out: RetortNode[] = [];
  while (c.peek().kind !== "rbrace") {
    out.push(parseRetort(c));
  }
  c.expect("rbrace");
  return out;
}

function parseRetort(c: Cursor): RetortNode {
  const start = c.peek();
  c.expect("keyword", "retort");
  c.expect("lbrace");
  let prose = "";
  let tags: string[] = [];
  while (c.peek().kind !== "rbrace") {
    const tk = c.peek();
    if (tk.value === "prose") {
      c.next();
      prose = parseStringOrHeredoc(c);
    } else if (tk.value === "tags") {
      tags = parseTagsBlock(c);
    } else {
      throw new ParseError(`unknown retort field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");
  return { prose, tags, pos: posOf(start) };
}

// ─────────────────────────────────────────────────────────────────────
// Named entity
// ─────────────────────────────────────────────────────────────────────
function parseNamedEntity(c: Cursor): NamedEntityNode {
  const start = c.peek();
  c.expect("keyword", "named-entity");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError(
      `expected named-entity id, got \`${idTok.value}\``,
      idTok.line,
      idTok.column
    );
  }
  const id = c.next().value;
  c.expect("lbrace");

  let kind = "";
  let displayName = "";
  let phrasesInProse: string[] = [];
  let verbs: string[] = [];

  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    switch (tk.value) {
      case "kind": {
        const k = c.peek();
        if (k.kind !== "identifier" && k.kind !== "keyword") {
          throw new ParseError("expected kind", k.line, k.column);
        }
        c.next();
        kind = k.value;
        break;
      }
      case "display-name":
        displayName = parseStringOrHeredoc(c);
        break;
      case "phrases-in-prose":
        phrasesInProse = parseStringList(c);
        break;
      case "verbs":
        verbs = parseTagsBlockInline(c);
        break;
      default:
        throw new ParseError(`unknown named-entity field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");
  return { id, kind, displayName, phrasesInProse, verbs, pos: posOf(start) };
}

// ─────────────────────────────────────────────────────────────────────
// Room, exit, clue
// ─────────────────────────────────────────────────────────────────────
function parseExit(c: Cursor): ExitNode {
  const start = c.peek();
  c.expect("keyword", "exit");
  const dirTok = c.peek();
  if (dirTok.kind !== "identifier" && dirTok.kind !== "keyword") {
    throw new ParseError("expected direction", dirTok.line, dirTok.column);
  }
  const direction = c.next().value;
  c.expect("arrow");
  const targetTok = c.peek();
  if (targetTok.kind !== "identifier") {
    throw new ParseError("expected exit target id", targetTok.line, targetTok.column);
  }
  const target = c.next().value;
  c.expect("lbrace");
  let prose = "";
  let gate: Predicate | null = null;
  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    if (tk.value === "prose") prose = parseStringOrHeredoc(c);
    else if (tk.value === "gate") gate = parsePredicate(c);
    else throw new ParseError(`unknown exit field: \`${tk.value}\``, tk.line, tk.column);
  }
  c.expect("rbrace");
  return { direction, target, prose, gate, pos: posOf(start) };
}

function parseClueOnClauses(c: Cursor): ClueOnClause[] {
  // form: `on examine thing:foo | thing:bar`, `on examine thing:foo`, `on examine`
  c.expect("keyword", "on");
  const clauses: ClueOnClause[] = [];
  const parseOne = (): ClueOnClause => {
    const verbTok = c.peek();
    if (verbTok.kind !== "keyword" && verbTok.kind !== "identifier") {
      throw new ParseError("expected verb after `on`", verbTok.line, verbTok.column);
    }
    c.next();
    let thing: string | null = null;
    // optional `thing:<id>`
    if (c.peek().kind === "keyword" && c.peek().value === "thing") {
      c.next();
      c.expect("colon");
      const t = c.peek();
      if (t.kind !== "identifier" && t.kind !== "keyword") {
        throw new ParseError("expected thing id", t.line, t.column);
      }
      c.next();
      thing = t.value;
    }
    return { verb: verbTok.value, thing };
  };
  clauses.push(parseOne());
  while (c.accept("pipe")) clauses.push(parseOne());
  return clauses;
}

function parseClue(c: Cursor): ClueNode {
  const start = c.peek();
  c.expect("keyword", "clue");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError("expected clue id", idTok.line, idTok.column);
  }
  const id = c.next().value;
  c.expect("lbrace");

  let on: ClueOnClause[] = [];
  let prose = "";
  let hotspots: string[] = [];
  let tags: string[] = [];
  const supports: Ref[] = [];
  const contradicts: Ref[] = [];
  let reveal: Predicate | null = null;

  while (c.peek().kind !== "rbrace") {
    const tk = c.peek();
    if (tk.value === "on") on = parseClueOnClauses(c);
    else if (tk.value === "prose") {
      c.next();
      prose = parseStringOrHeredoc(c);
    } else if (tk.value === "hotspots") {
      c.next();
      hotspots = parseStringList(c);
    } else if (tk.value === "tags") {
      tags = parseTagsBlock(c);
    } else if (tk.value === "supports") {
      c.next();
      supports.push(parseRef(c));
    } else if (tk.value === "contradicts") {
      c.next();
      contradicts.push(parseRef(c));
    } else if (tk.value === "reveal") {
      c.next();
      reveal = parsePredicate(c);
    } else {
      throw new ParseError(`unknown clue field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");
  return {
    id,
    on,
    prose,
    hotspots,
    tags,
    supports,
    contradicts,
    reveal,
    pos: posOf(start),
  };
}

function parseRoom(c: Cursor): RoomNode {
  const start = c.peek();
  c.expect("keyword", "room");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError("expected room id", idTok.line, idTok.column);
  }
  const id = c.next().value;
  c.expect("lbrace");

  let title = "";
  let prose = "";
  let rhetorical: string | null = null;
  const exits: ExitNode[] = [];
  const clues: ClueNode[] = [];

  while (c.peek().kind !== "rbrace") {
    const tk = c.peek();
    if (tk.value === "title") {
      c.next();
      title = parseStringOrHeredoc(c);
    } else if (tk.value === "prose") {
      c.next();
      prose = parseStringOrHeredoc(c);
    } else if (tk.value === "rhetorical") {
      c.next();
      const r = c.peek();
      if (r.kind !== "identifier" && r.kind !== "keyword") {
        throw new ParseError("expected rhetorical tag", r.line, r.column);
      }
      c.next();
      rhetorical = r.value;
    } else if (tk.value === "exit") {
      exits.push(parseExit(c));
    } else if (tk.value === "clue") {
      clues.push(parseClue(c));
    } else {
      throw new ParseError(`unknown room field: \`${tk.value}\``, tk.line, tk.column);
    }
  }
  c.expect("rbrace");
  return { id, title, prose, rhetorical, exits, clues, pos: posOf(start) };
}

// ─────────────────────────────────────────────────────────────────────
// Connect, claim, verdict
// ─────────────────────────────────────────────────────────────────────
function parseConnection(c: Cursor): ConnectionNode {
  const start = c.peek();
  c.expect("keyword", "connect");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError("expected connection id", idTok.line, idTok.column);
  }
  const id = c.next().value;
  c.expect("lbrace");

  let from: Ref[] = [];
  let yieldsRef: Ref | null = null;
  let prose = "";

  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    if (tk.value === "from") from = parseRefList(c);
    else if (tk.value === "yields") yieldsRef = parseRef(c);
    else if (tk.value === "prose") prose = parseStringOrHeredoc(c);
    else throw new ParseError(`unknown connect field: \`${tk.value}\``, tk.line, tk.column);
  }
  c.expect("rbrace");
  if (!yieldsRef) {
    throw new ParseError(`connect \`${id}\` missing \`yields\``, start.line, start.column);
  }
  return { id, from, yields: yieldsRef, prose, pos: posOf(start) };
}

function parseClaim(c: Cursor): ClaimNode {
  const start = c.peek();
  c.expect("keyword", "claim");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError("expected claim id", idTok.line, idTok.column);
  }
  const id = c.next().value;
  const text = parseStringOrHeredoc(c);
  return { id, text, pos: posOf(start) };
}

function parseVerdict(c: Cursor): VerdictNode {
  const start = c.peek();
  c.expect("keyword", "verdict");
  const idTok = c.peek();
  if (idTok.kind !== "identifier") {
    throw new ParseError("expected verdict id", idTok.line, idTok.column);
  }
  const id = c.next().value;
  c.expect("lbrace");
  let requires: Predicate | null = null;
  let moral = "";
  let atmos = "";
  let prose = "";
  let cardComment = "";
  while (c.peek().kind !== "rbrace") {
    const tk = c.next();
    if (tk.value === "requires") requires = parsePredicate(c);
    else if (tk.value === "moral") {
      const v = c.peek();
      if (v.kind !== "identifier" && v.kind !== "keyword") {
        throw new ParseError("expected moral valence", v.line, v.column);
      }
      c.next();
      moral = v.value;
    } else if (tk.value === "atmos") {
      const v = c.peek();
      if (v.kind !== "identifier" && v.kind !== "keyword") {
        throw new ParseError("expected atmos valence", v.line, v.column);
      }
      c.next();
      atmos = v.value;
    } else if (tk.value === "prose") prose = parseStringOrHeredoc(c);
    else if (tk.value === "card-comment") cardComment = parseStringOrHeredoc(c);
    else throw new ParseError(`unknown verdict field: \`${tk.value}\``, tk.line, tk.column);
  }
  c.expect("rbrace");
  if (!requires) {
    throw new ParseError(`verdict \`${id}\` missing \`requires\``, start.line, start.column);
  }
  return { id, requires, moral, atmos, prose, cardComment, pos: posOf(start) };
}

// ─────────────────────────────────────────────────────────────────────
// Top-level case
// ─────────────────────────────────────────────────────────────────────
export function parseCase(tokens: Token[], path?: string): CaseNode {
  const c = new Cursor(tokens);
  try {
    const start = c.expect("keyword", "case");
    const idTok = c.peek();
    if (idTok.kind !== "identifier") {
      throw new ParseError("expected case id", idTok.line, idTok.column);
    }
    const id = c.next().value;
    c.expect("lbrace");

    let title = "";
    let hour = -1;
    let oneLine = "";
    let opens = "";
    let persona: PersonaNode | null = null;
    let retorts: RetortNode[] = [];
    const entities: NamedEntityNode[] = [];
    const rooms: RoomNode[] = [];
    const connections: ConnectionNode[] = [];
    const claims: ClaimNode[] = [];
    const verdicts: VerdictNode[] = [];

    while (c.peek().kind !== "rbrace") {
      const tk = c.peek();
      if (tk.value === "title") {
        c.next();
        title = parseStringOrHeredoc(c);
      } else if (tk.value === "hour") {
        c.next();
        const h = c.expect("number");
        hour = Number(h.value);
      } else if (tk.value === "one-line") {
        c.next();
        oneLine = parseStringOrHeredoc(c);
      } else if (tk.value === "opens") {
        c.next();
        const r = parseRef(c);
        if (r.kind !== "room") {
          throw new ParseError(
            `\`opens\` must reference a room (got \`${r.kind}\`)`,
            r.pos.line,
            r.pos.column
          );
        }
        opens = r.id;
      } else if (tk.value === "persona") {
        persona = parsePersona(c);
      } else if (tk.value === "retorts") {
        retorts = parseRetorts(c);
      } else if (tk.value === "named-entity") {
        entities.push(parseNamedEntity(c));
      } else if (tk.value === "room") {
        rooms.push(parseRoom(c));
      } else if (tk.value === "connect") {
        connections.push(parseConnection(c));
      } else if (tk.value === "claim") {
        claims.push(parseClaim(c));
      } else if (tk.value === "verdict") {
        verdicts.push(parseVerdict(c));
      } else {
        throw new ParseError(`unknown case-level field: \`${tk.value}\``, tk.line, tk.column);
      }
    }
    c.expect("rbrace");
    if (!persona) throw new ParseError("case missing `persona { ... }`", start.line, start.column);
    if (!opens) throw new ParseError("case missing `opens room:<id>`", start.line, start.column);

    return {
      id,
      title,
      hour,
      oneLine,
      opens,
      persona,
      retorts,
      entities,
      rooms,
      connections,
      claims,
      verdicts,
      pos: posOf(start),
    };
  } catch (err) {
    if (err instanceof ParseError) {
      throw new ParseError(err.message, err.line, err.column, path);
    }
    throw err;
  }
}
