#!/usr/bin/env node
/**
 * build-game-db — compile every scene/cases/*.scene file into the
 * shipped `public/game.db` seed.
 *
 * Usage:
 *   pnpm build-game-db            build default scene/ → public/game.db
 *   pnpm build-game-db --strict   lint warnings fail the build
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CaseIR } from "./ir";
import { lint } from "./lint";
import { normalize } from "./normalize";
import { packGameDb } from "./pack";
import { parseCase } from "./parse/parser";
import { tokenize } from "./parse/tokenizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

const SCENE_DIR = path.join(REPO, "scene", "cases");
const OUT_DB = path.join(REPO, "public", "game.db");
const OUT_CARDS = path.join(REPO, "public", "landing-cards.json");

interface LandingCard {
  readonly hour: number;
  readonly caseId: string;
  readonly title: string;
  readonly oneLine: string;
  readonly personaDisplayName: string;
  readonly personaEra: string;
  readonly locked: boolean;
}

async function listSceneFiles(): Promise<string[]> {
  try {
    const names = await fs.readdir(SCENE_DIR);
    return names
      .filter((n) => n.endsWith(".scene"))
      .sort()
      .map((n) => path.join(SCENE_DIR, n));
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  const paths = await listSceneFiles();
  if (paths.length === 0) {
    console.error(`no .scene files found under ${SCENE_DIR}`);
    process.exit(1);
  }

  const cases: CaseIR[] = [];
  let warningCount = 0;

  for (const p of paths) {
    console.log(`→ ${path.relative(REPO, p)}`);
    const src = await fs.readFile(p, "utf8");
    const ast = parseCase(tokenize(src), p);
    const ir = normalize(ast, p);
    const roomProse = Object.fromEntries(ir.rooms.map((r) => [r.id, r.prose]));
    const issues = lint(ir, roomProse);
    if (issues.length > 0) {
      for (const i of issues) {
        console.log(`    [${i.severity}] ${i.rule}: ${i.message}`);
        if (i.severity === "warning") warningCount++;
      }
    }
    cases.push(ir);
  }

  if (strict && warningCount > 0) {
    console.error(`\n--strict: ${warningCount} warning(s) — build aborted`);
    process.exit(2);
  }

  const result = await packGameDb(cases, { outPath: OUT_DB });
  console.log(
    `\n✓ ${OUT_DB}: ${result.cases} cases, ${result.rooms} rooms, ${result.clues} clues, ${result.verdicts} verdicts, ${(result.bytes / 1024).toFixed(1)} KB`
  );

  const cards: LandingCard[] = cases.map((c) => ({
    hour: c.hour,
    caseId: c.id,
    title: c.title,
    oneLine: c.oneLine,
    personaDisplayName: c.persona.displayName,
    personaEra: c.persona.era,
    locked: false,
  }));
  const byHour = new Map(cards.map((c) => [c.hour, c]));
  for (let h = 0; h < 12; h++) {
    if (!byHour.has(h)) {
      cards.push({
        hour: h,
        caseId: `locked-${h}`,
        title: "— coming soon —",
        oneLine: "This hour has not yet been authored.",
        personaDisplayName: "",
        personaEra: "",
        locked: true,
      });
    }
  }
  cards.sort((a, b) => a.hour - b.hour);
  await fs.mkdir(path.dirname(OUT_CARDS), { recursive: true });
  await fs.writeFile(OUT_CARDS, `${JSON.stringify(cards, null, 2)}\n`, "utf8");
  console.log(
    `✓ ${OUT_CARDS}: ${cards.length} cards (${cards.filter((c) => !c.locked).length} unlocked, ${cards.filter((c) => c.locked).length} locked)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
