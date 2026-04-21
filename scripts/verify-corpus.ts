/**
 * verify-corpus — single source of truth for the drift gate.
 *
 * Runs `build-corpus` (regenerates the frozen JSON+TS artifacts under
 * src/content/generated/), then runs `git diff --exit-code` on the
 * GENERATED_PATHS list shared with scripts/verify-corpus.test.ts. Exits
 * non-zero if anything drifted.
 *
 * The constant `GENERATED_PATHS` lives here and is imported by the test
 * — so adding a new generated artifact requires updating exactly one
 * place.
 *
 * Wired into `pnpm verify` as the FIRST gate (before biome / typecheck /
 * tests / build) so a stale generated file fails CI immediately.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

/** Paths the gate diffs against HEAD. Add new generated artifacts here. */
export const GENERATED_PATHS: readonly string[] = [
  "src/content/generated/corpus.json",
  "src/content/generated/corpus.ts",
  "src/content/generated/surrealist.json",
  "src/content/generated/surrealist.ts",
  "src/content/generated/grammars.json",
];

function runDirect(bin: string, args: string[]): void {
  execFileSync(bin, args, { cwd: repoRoot, stdio: "inherit" });
}

function main(): void {
  // Use the local tsx binary directly (resolved via require.resolve so we
  // don't depend on PATH or `npx`'s registry lookup). This matches what
  // CodeRabbit asked for: deterministic, no implicit network call.
  const tsxBin = path.resolve(repoRoot, "node_modules/.bin/tsx");
  runDirect(tsxBin, ["scripts/build-corpus.ts"]);
  runDirect("git", ["diff", "--exit-code", "--", ...GENERATED_PATHS]);
}

// Run as CLI unless imported (the test file imports GENERATED_PATHS).
const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  try {
    main();
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    process.exit(e.status ?? 1);
  }
}
