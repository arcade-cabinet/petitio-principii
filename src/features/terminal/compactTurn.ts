import type { TranscriptEntry } from "@/engine";
import type { TranscriptTurn } from "@/world";

/**
 * compactTurn — pure projection from a full TranscriptTurn to the one-line
 * summary the PAST zone renders.
 *
 * This is the contract docs/UX.md §2 pins down. Given a turn, yield:
 *   - a glyph reflecting the turn's rhetorical shape
 *   - a short human label (the destination room, or the verb'd action)
 *
 * The compactor reads only from the passed turn — never re-invokes the
 * grammar or touches koota. That keeps determinism tight (a turn
 * compacts the same way on every re-render) and makes it trivially
 * testable.
 */

export interface CompactedTurn {
  readonly turnId: number;
  readonly glyph: string;
  readonly label: string;
  /** Full unabridged text for hover / screen-reader expansion. */
  readonly full: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Glyphs match the argument-map node prefix convention (see
// src/components/ui/argument-map.tsx). Keep these in sync with that palette.
// ────────────────────────────────────────────────────────────────────────────

const GLYPH_MOVE = "→";
const GLYPH_ACCEPT = "✓";
const GLYPH_REJECT = "✗";
const GLYPH_QUESTION = "?";
const GLYPH_ASK_WHY = "¿";
const GLYPH_TRACE = "↶";
const GLYPH_SYSTEM = "·";

const MOVEMENT_VERBS = new Set(["north", "south", "east", "west", "up", "down", "back", "forward"]);

const VERB_GLYPH: Record<string, string> = {
  accept: GLYPH_ACCEPT,
  reject: GLYPH_REJECT,
  question: GLYPH_QUESTION,
  "ask why": GLYPH_ASK_WHY,
  "trace back": GLYPH_TRACE,
  look: GLYPH_SYSTEM,
  examine: GLYPH_SYSTEM,
};

const MAX_LABEL_LEN = 72;

function truncate(text: string, max = MAX_LABEL_LEN): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function findEcho(entries: readonly TranscriptEntry[]): TranscriptEntry | null {
  return entries.find((e) => e.kind === "echo") ?? null;
}

function findTitle(entries: readonly TranscriptEntry[]): TranscriptEntry | null {
  return entries.find((e) => e.kind === "title") ?? null;
}

/**
 * The title kind in the transcript stores the text as `== ROOM NAME ==`
 * (per reducer's classifyLine). The PAST drawer wants just the room
 * name; strip the `==` markers and trim. Title-cased to match the
 * Yesteryear hero rendering, which shows `Room Name`, not `ROOM NAME`.
 */
function cleanTitle(text: string): string {
  const inner = text
    .replace(/^==\s*/, "")
    .replace(/\s*==$/, "")
    .trim();
  // Already-title-cased? leave alone. Otherwise lowercase + capitalize words.
  if (/[a-z]/.test(inner)) return inner;
  return inner.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function findFirstNarration(entries: readonly TranscriptEntry[]): TranscriptEntry | null {
  return entries.find((e) => e.kind === "narration") ?? null;
}

/**
 * Strip the leading `> ` prefix the echo kind wraps around player input
 * before matching verbs, and lowercase for comparisons.
 */
function normalizeEcho(echoText: string): string {
  return echoText.replace(/^>\s*/, "").trim().toLowerCase();
}

export function compactTurn(turn: TranscriptTurn): CompactedTurn {
  const { turnId, entries } = turn;
  const full = entries
    .filter((e) => e.kind !== "spacer")
    .map((e) => e.text)
    .join(" · ")
    .trim();

  const echo = findEcho(entries);
  const title = findTitle(entries);

  // 1. Movement — the title after the echo is the *new* room the player
  //    entered. Display it with the → glyph.
  if (echo) {
    const verb = normalizeEcho(echo.text);
    if (MOVEMENT_VERBS.has(verb) && title) {
      return { turnId, glyph: GLYPH_MOVE, label: truncate(cleanTitle(title.text)), full };
    }

    // 2. Rhetorical verb — use the verb's glyph and the room title (which
    //    the reducer re-emits on every turn so the PAST reads "which room
    //    each action happened in").
    const verbGlyph = VERB_GLYPH[verb];
    if (verbGlyph) {
      const where = title ? cleanTitle(title.text) : "";
      const label = where ? `${where} · you ${verb}ed` : `you ${verb}ed`;
      return { turnId, glyph: verbGlyph, label: truncate(label), full };
    }

    // 3. Unknown verb — dump the echo so the player can still see what
    //    they typed. Generous length since this is an escape hatch.
    return { turnId, glyph: GLYPH_SYSTEM, label: truncate(verb), full };
  }

  // 4. System turn (no echo) — fall back to first narration, or title.
  const fallback = findFirstNarration(entries) ?? title;
  const label = fallback ? truncate(fallback.text) : "…";
  return { turnId, glyph: GLYPH_SYSTEM, label, full };
}

/** Compact a list of turns in one pass. */
export function compactTurns(turns: readonly TranscriptTurn[]): CompactedTurn[] {
  return turns.map(compactTurn);
}
