/**
 * Hand-written tokenizer for SCENE.
 *
 * Character-by-character scan, no regex state machine. Emits a
 * Token[] that the parser walks in one pass.
 */

import { KEYWORDS, type Token, type TokenKind } from "./tokens";

export class LexError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
    readonly source: string
  ) {
    super(message);
    this.name = "LexError";
  }
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (off = 0) => source[i + off];
  const at = (s: string) => source.startsWith(s, i);
  const advance = () => {
    const ch = source[i++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  };

  const lexError = (msg: string): never => {
    throw new LexError(msg, line, col, source);
  };

  const isIdentStart = (ch: string) => /[a-z]/.test(ch);
  const isIdentCont = (ch: string) => /[a-z0-9-]/.test(ch);
  const isDigit = (ch: string) => /[0-9]/.test(ch);

  while (i < source.length) {
    const startLine = line;
    const startCol = col;
    const startOffset = i;
    const ch = peek();

    // Whitespace
    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    // Line comment
    if (ch === "#") {
      while (i < source.length && peek() !== "\n") advance();
      continue;
    }

    // Heredoc <<<  ...  >>>
    if (at("<<<")) {
      advance();
      advance();
      advance();
      // skip one leading newline if present
      if (peek() === "\n") advance();
      const body: string[] = [];
      while (i < source.length && !at(">>>")) {
        body.push(advance());
      }
      if (!at(">>>")) lexError("unterminated heredoc");
      advance();
      advance();
      advance();
      const raw = body.join("");
      tokens.push({
        kind: "heredoc",
        value: dedent(raw),
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Arrow ->
    if (at("->")) {
      advance();
      advance();
      tokens.push({
        kind: "arrow",
        value: "->",
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Punctuation
    if (
      ch === "{" ||
      ch === "}" ||
      ch === "[" ||
      ch === "]" ||
      ch === "," ||
      ch === "|" ||
      ch === "@" ||
      ch === ":"
    ) {
      const byChar: Record<string, TokenKind> = {
        "{": "lbrace",
        "}": "rbrace",
        "[": "lbracket",
        "]": "rbracket",
        ",": "comma",
        "|": "pipe",
        "@": "at",
        ":": "colon",
      };
      // ':' is ambiguous: inside a `<ident>:<ident>` form it's part of a reference.
      // We treat `:` as a standalone token; the parser stitches references together.
      advance();
      tokens.push({
        kind: byChar[ch],
        value: ch,
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // String
    if (ch === '"') {
      advance();
      const buf: string[] = [];
      while (i < source.length && peek() !== '"') {
        if (peek() === "\\") {
          advance();
          const esc = advance();
          if (esc === "n") buf.push("\n");
          else if (esc === "t") buf.push("\t");
          else if (esc === '"' || esc === "\\") buf.push(esc);
          else lexError(`unknown escape: \\${esc}`);
          continue;
        }
        if (peek() === "\n") lexError("unterminated string");
        buf.push(advance());
      }
      if (peek() !== '"') lexError("unterminated string");
      advance();
      tokens.push({
        kind: "string",
        value: buf.join(""),
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Number
    if (isDigit(ch) || (ch === "-" && peek(1) && isDigit(peek(1)))) {
      const buf: string[] = [];
      if (ch === "-") buf.push(advance());
      while (i < source.length && (isDigit(peek()) || peek() === ".")) {
        buf.push(advance());
      }
      tokens.push({
        kind: "number",
        value: buf.join(""),
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Identifier / keyword / reference
    if (isIdentStart(ch) || ch === "_") {
      const buf: string[] = [];
      // Underscore-friendly idents for predicate atoms like `claim_state`,
      // `visits_gte`, `examined_gte`.
      while (i < source.length && (isIdentCont(peek()) || peek() === "_")) {
        buf.push(advance());
      }
      const word = buf.join("");
      const kind: TokenKind = KEYWORDS.has(word) ? "keyword" : "identifier";
      tokens.push({
        kind,
        value: word,
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    lexError(`unexpected character: ${JSON.stringify(ch)}`);
  }

  tokens.push({
    kind: "eof",
    value: "",
    line,
    column: col,
    offset: i,
  });
  return tokens;
}

/** Dedent a heredoc body — strip the common leading indent across non-blank lines. */
function dedent(text: string): string {
  const lines = text.split("\n");
  let minIndent = Number.POSITIVE_INFINITY;
  for (const ln of lines) {
    if (!ln.trim()) continue;
    const m = ln.match(/^(\s*)/);
    const indent = m ? m[1].length : 0;
    if (indent < minIndent) minIndent = indent;
  }
  if (!Number.isFinite(minIndent)) minIndent = 0;
  return lines
    .map((ln) => (ln.length >= minIndent ? ln.slice(minIndent) : ln))
    .join("\n")
    .trim();
}
