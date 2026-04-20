import type { TranscriptEntry } from "@/engine";
import type { TranscriptTurn } from "@/world";
import { describe, expect, it } from "vitest";
import { compactTurn } from "./compactTurn";

/**
 * T48 — PAST compactor.
 *
 * Covers every classification branch the UI relies on so that the PAST zone
 * can't silently lose the rhetorical shape of a turn as the compactor
 * evolves. Each test pins one expected glyph.
 */

let ord = 0;
let turnId = 0;

function entry(
  partial: Partial<TranscriptEntry> & { kind: TranscriptEntry["kind"]; text: string }
): TranscriptEntry {
  return {
    id: `ol-${++ord}`,
    ordinal: ord,
    turnId,
    ...partial,
  };
}

function makeTurn(entries: TranscriptEntry[]): TranscriptTurn {
  turnId++;
  return { turnId, entries: entries.map((e) => ({ ...e, turnId })) };
}

describe("compactTurn", () => {
  it("summarizes a movement turn with → glyph and destination title", () => {
    const turn = makeTurn([
      entry({ kind: "echo", text: "> north" }),
      entry({ kind: "title", text: "The Rotunda of Seven Entrances" }),
      entry({ kind: "narration", text: "A rotunda with seven entrances and no exits." }),
    ]);

    const c = compactTurn(turn);
    expect(c.glyph).toBe("→");
    expect(c.label).toBe("The Rotunda of Seven Entrances");
  });

  it("summarizes an accept turn with ✓ glyph and room + verb", () => {
    const turn = makeTurn([
      entry({ kind: "echo", text: "> accept" }),
      entry({ kind: "title", text: "The Balcony of Conclusions" }),
      entry({ kind: "narration", text: "You accept this step in the argument." }),
    ]);

    const c = compactTurn(turn);
    expect(c.glyph).toBe("✓");
    expect(c.label).toContain("The Balcony of Conclusions");
    expect(c.label).toContain("you accepted");
  });

  it("summarizes a reject turn with ✗", () => {
    const turn = makeTurn([
      entry({ kind: "echo", text: "> reject" }),
      entry({ kind: "title", text: "The Cellar" }),
      entry({ kind: "narration", text: "You reject." }),
    ]);
    expect(compactTurn(turn).glyph).toBe("✗");
  });

  it("summarizes a question turn with ?", () => {
    const turn = makeTurn([
      entry({ kind: "echo", text: "> question" }),
      entry({ kind: "title", text: "The Cloister" }),
    ]);
    expect(compactTurn(turn).glyph).toBe("?");
  });

  it("summarizes an unknown echo verb with · and the raw verb", () => {
    const turn = makeTurn([entry({ kind: "echo", text: "> sing" })]);
    const c = compactTurn(turn);
    expect(c.glyph).toBe("·");
    expect(c.label).toBe("sing");
  });

  it("summarizes a system turn (no echo) with · and first narration", () => {
    const turn = makeTurn([
      entry({ kind: "title", text: "Opening Chamber" }),
      entry({ kind: "narration", text: "The argument begins somewhere." }),
    ]);
    const c = compactTurn(turn);
    expect(c.glyph).toBe("·");
    expect(c.label).toBe("The argument begins somewhere.");
  });

  it("truncates long labels to ≤ 72 chars with ellipsis", () => {
    const long =
      "A statement mounted on a plinth with an uncommonly long engraving that clearly exceeds seventy-two characters of narrative text.";
    const turn = makeTurn([
      entry({ kind: "echo", text: "> accept" }),
      entry({ kind: "title", text: long }),
    ]);
    const c = compactTurn(turn);
    expect(c.label.length).toBeLessThanOrEqual(72);
    expect(c.label.endsWith("…")).toBe(true);
  });

  it("preserves the full text in the `full` field for accessibility expansion", () => {
    const turn = makeTurn([
      entry({ kind: "echo", text: "> accept" }),
      entry({ kind: "title", text: "The Rotunda" }),
      entry({ kind: "narration", text: "You accept." }),
      entry({ kind: "spacer", text: "" }),
    ]);
    const c = compactTurn(turn);
    expect(c.full).toContain("> accept");
    expect(c.full).toContain("The Rotunda");
    expect(c.full).toContain("You accept.");
    expect(c.full).not.toContain(" ·  ·");
  });

  it("recognises every movement verb", () => {
    const verbs = ["north", "south", "east", "west", "up", "down", "back", "forward"];
    for (const v of verbs) {
      const t = makeTurn([
        entry({ kind: "echo", text: `> ${v}` }),
        entry({ kind: "title", text: "Somewhere" }),
      ]);
      expect(compactTurn(t).glyph, v).toBe("→");
    }
  });
});
