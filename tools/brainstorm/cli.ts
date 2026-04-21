#!/usr/bin/env node
/**
 * CLI entrypoint for the brainstorm pipeline.
 *
 * Subcommands:
 *   pnpm brainstorm fetch          — stage 1: fetch PD sources
 *   pnpm brainstorm normalize      — stage 2: clean + sentence-split
 *   pnpm brainstorm signatures     — stage 4: extract per-cluster style signatures
 *   pnpm brainstorm embed          — stage 5: embed sentences via local Ollama
 *   pnpm brainstorm synthesize     — stage 6: emit authoring briefs
 *   pnpm brainstorm query --cluster <id> <text>   — retrieve nearest passages
 *   pnpm brainstorm check <scene> --cluster <id>  — stage 7: sameness-check
 *   pnpm brainstorm build          — run stages 1, 2, 4, 5, 6 in order
 *   pnpm brainstorm clusters       — list configured clusters
 */

import { checkCli } from "./check";
import { embedAll } from "./embed";
import { fetchAll } from "./fetch";
import { readClusterManifests } from "./io";
import { normalizeAll } from "./normalize";
import { queryCli } from "./query";
import { extractAllSignatures } from "./signature";
import { synthesizeAll } from "./synthesize";

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "fetch":
      await fetchAll({ force: rest.includes("--force") });
      break;
    case "normalize":
      await normalizeAll();
      break;
    case "signatures":
      await extractAllSignatures();
      break;
    case "embed":
      await embedAll();
      break;
    case "synthesize":
      await synthesizeAll();
      break;
    case "query": {
      const code = await queryCli(rest);
      if (code !== 0) process.exit(code);
      break;
    }
    case "check": {
      const code = await checkCli(rest);
      return process.exit(code);
    }
    case "build":
      console.log("→ stage 1: fetch");
      await fetchAll();
      console.log("\n→ stage 2: normalize");
      await normalizeAll();
      console.log("\n→ stage 4: signatures");
      await extractAllSignatures();
      console.log("\n→ stage 5: embed");
      await embedAll();
      console.log("\n→ stage 6: synthesize briefs");
      await synthesizeAll();
      console.log("\n✓ brainstorm build complete.");
      break;
    case "clusters": {
      const clusters = await readClusterManifests();
      console.log(`${clusters.length} clusters configured:\n`);
      for (const c of clusters) {
        console.log(`  ${c.id}`);
        console.log(`    hour=${c.slot_hour} · ${c.context.period} · ${c.context.milieu}`);
        console.log(`    sources: ${c.sources.map((s) => s.ref).join(", ")}`);
      }
      break;
    }
    default:
      console.error(
        "usage: pnpm brainstorm <fetch|normalize|signatures|embed|synthesize|query|check|build|clusters>"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
