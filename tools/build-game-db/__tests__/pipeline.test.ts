/**
 * End-to-end pipeline test: parse → normalize → lint → pack.
 *
 * Reads the starter fixture, builds the whole thing, then opens the
 * resulting db and asserts the expected rows landed.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { lint } from "../lint";
import { normalize } from "../normalize";
import { packGameDb } from "../pack";
import { parseCase } from "../parse/parser";
import { tokenize } from "../parse/tokenizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const MIDNIGHT = path.join(REPO, "scene", "cases", "00-midnight-starter.scene");

describe("SCENE build pipeline (parse → normalize → lint → pack)", () => {
  it("round-trips the midnight fixture into a valid game.db", async () => {
    const src = await fs.readFile(MIDNIGHT, "utf8");
    const ast = parseCase(tokenize(src), MIDNIGHT);
    const ir = normalize(ast, MIDNIGHT);

    const roomProse = Object.fromEntries(ir.rooms.map((r) => [r.id, r.prose]));
    const issues = lint(ir, roomProse);
    // Some rules are informational; assert only that nothing SEVERE
    // (these would be warnings signaling structural confusion in the
    // fixture itself, not authoring taste).
    const severe = issues.filter(
      (i) =>
        i.severity === "warning" &&
        i.rule !== "retorts-too-few" &&
        i.rule !== "valence-moral-thin" &&
        i.rule !== "valence-atmos-thin"
    );
    expect(severe).toEqual([]);

    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "petitio-db-"));
    const outPath = path.join(tmpdir, "game.db");
    const result = await packGameDb([ir], { outPath });

    expect(result.cases).toBe(1);
    expect(result.rooms).toBe(3);
    expect(result.verdicts).toBe(2);
    expect(result.bytes).toBeGreaterThan(0);

    const db = new Database(outPath, { readonly: true });
    try {
      const caseRow = db
        .prepare("SELECT id, hour, title, opens_room FROM cases WHERE id=?")
        .get("midnight") as { id: string; hour: number; title: string; opens_room: string };
      expect(caseRow.hour).toBe(0);
      expect(caseRow.opens_room).toBe("office");

      const persona = db
        .prepare("SELECT display_name, era FROM personas WHERE case_id=?")
        .get("midnight") as { display_name: string; era: string };
      expect(persona.display_name).toBe("Harrison Drake");

      const exitCount = (
        db.prepare("SELECT count(*) AS n FROM exits WHERE case_id=?").get("midnight") as {
          n: number;
        }
      ).n;
      expect(exitCount).toBeGreaterThanOrEqual(3);

      const verdictRow = db
        .prepare(
          "SELECT moral_valence, atmos_valence, requires_json FROM verdicts WHERE id=? AND case_id=?"
        )
        .get("she-came-and-went", "midnight") as {
        moral_valence: string;
        atmos_valence: string;
        requires_json: string;
      };
      expect(verdictRow.moral_valence).toBe("unsettled");
      const reqs = JSON.parse(verdictRow.requires_json) as Record<string, unknown>;
      expect("all" in reqs).toBe(true);

      const settings = db.prepare("SELECT key, value FROM settings").all() as Array<{
        key: string;
        value: string;
      }>;
      const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      expect(byKey.schema_version).toBe("1");
      expect(byKey.text_size).toBe("medium");

      const factRow = db
        .prepare("SELECT text FROM facts WHERE id=? AND case_id=?")
        .get("she-was-alone", "midnight") as { text: string };
      expect(factRow.text.toLowerCase()).toContain("warm phone");
    } finally {
      db.close();
      await fs.rm(tmpdir, { recursive: true, force: true });
    }
  });

  it("rejects an unresolved claim reference via NormalizeError", async () => {
    const bad = `
      case bad {
        title "x"
        hour 5
        one-line "x"
        opens room:a
        persona {
          name "n"
          era "e"
          biography "b"
          voice-notes "v"
          notices-first { any }
          theme-chord { root "x" intervals [ 0 ] instrument "x" }
          proximity-first  "a"
          proximity-middle "b"
          proximity-late   "c"
          proximity-last   "d"
        }
        room a {
          title "t"
          prose "p"
          rhetorical premise
        }
        claim x "x"
        verdict end {
          requires { all: [ claim_state:does-not-exist @ accepted ] }
          moral unsettled
          atmos quiet
          prose "end"
          card-comment "end"
        }
      }`;
    expect(() => {
      const ast = parseCase(tokenize(bad));
      normalize(ast);
    }).toThrow(/unknown claim_state:does-not-exist/);
  });
});
