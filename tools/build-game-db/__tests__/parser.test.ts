import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCase } from "../parse/parser";
import { tokenize } from "../parse/tokenizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const MIDNIGHT = path.join(REPO, "scene", "cases", "00-midnight-starter.scene");

describe("SCENE parser — midnight starter", () => {
  it("parses the full fixture without errors", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const tokens = tokenize(src);
    const node = parseCase(tokens, MIDNIGHT);

    expect(node.id).toBe("midnight");
    expect(node.hour).toBe(0);
    expect(node.title).toBe("A Voice Before Dawn");
    expect(node.opens).toBe("office");
  });

  it("captures persona fields", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    expect(node.persona.name).toBe("Harrison Drake");
    expect(node.persona.era).toBe("Los Angeles, 1946");
    expect(node.persona.noticesFirst).toContain("weather");
    expect(node.persona.themeChord?.root).toBe("A-flat-minor");
    expect(node.persona.themeChord?.intervals).toEqual([0, 3, 7, 10]);
    expect(node.persona.proximity.last.toLowerCase()).toContain("sure");
  });

  it("captures rooms, exits, clues with proper shape", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    expect(node.rooms.map((r) => r.id)).toEqual(["office", "hall", "alley"]);
    const office = node.rooms[0];
    expect(office.exits.map((e) => e.direction)).toEqual(["east", "down"]);
    expect(office.exits[1].gate).not.toBeNull();
    expect(office.clues.map((c) => c.id)).toEqual(["receiver-warm", "perfume-faint"]);
    const warm = office.clues[0];
    expect(warm.on).toHaveLength(2);
    expect(warm.on[0].verb).toBe("examine");
    expect(warm.on[0].thing).toBe("phone");
    expect(warm.supports[0].id).toBe("caller-was-here");
  });

  it("captures reveal predicate as a clue ref atom", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    const perfume = node.rooms[0].clues[1];
    expect(perfume.reveal?.op).toBe("clue");
    if (perfume.reveal?.op === "clue") {
      expect(perfume.reveal.ref.id).toBe("receiver-warm");
    }
  });

  it("captures verdicts with claim_state atoms", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    expect(node.verdicts).toHaveLength(2);
    const v = node.verdicts[0];
    expect(v.moral).toBe("unsettled");
    expect(v.atmos).toBe("quiet");
    expect(v.requires.op).toBe("all");
    if (v.requires.op === "all") {
      const atom = v.requires.children[0];
      expect(atom.op).toBe("claim_state");
      if (atom.op === "claim_state") {
        expect(atom.state).toBe("accepted");
        expect(atom.ref.id).toBe("it-was-evelyn");
      }
    }
  });

  it("captures connection with refs and yields fact", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    expect(node.connections).toHaveLength(1);
    const conn = node.connections[0];
    expect(conn.id).toBe("she-was-alone");
    expect(conn.from.map((r) => r.id)).toEqual(["receiver-warm", "perfume-faint"]);
    expect(conn.yields.kind).toBe("fact");
    expect(conn.yields.id).toBe("she-was-alone");
  });

  it("dedents heredoc prose", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const node = parseCase(tokenize(src));
    const office = node.rooms[0];
    expect(office.prose.startsWith("The phone")).toBe(true);
    expect(office.prose).not.toMatch(/^\s{4}/);
  });
});
