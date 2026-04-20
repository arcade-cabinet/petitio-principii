import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/**
 * T61 — verify-corpus must exit non-zero if any of the frozen generated
 * artifacts (corpus.json, corpus.ts, surrealist.json, surrealist.ts,
 * grammars.json) drifts from the build-corpus output.
 *
 * We simulate drift by parsing grammars.json, adding a sentinel key, then
 * JSON.stringify-ing it back. The next build-corpus run overwrites our
 * mutation with the authoritative output, and `git diff --exit-code` on
 * the generated paths exits non-zero because the working tree differs
 * from HEAD for the duration of the test. An `afterEach` hook restores
 * the original file so the test is idempotent even if assertions throw.
 *
 * This locks in the release gate: if someone hand-edits a generated
 * artifact without running build-corpus, CI fails loudly instead of
 * silently shipping stale JSON.
 *
 * Implementation notes:
 *   - We invoke `tsx scripts/build-corpus.ts` + `git diff` directly rather
 *     than going through `pnpm verify-corpus`. The package.json script is
 *     exactly `tsx + git diff`, and going via pnpm adds a layer that's
 *     brittle across Corepack / npm-vs-pnpm-direct-invocation environments.
 *   - We mutate via `JSON.parse` + `JSON.stringify` — never via regex —
 *     so the test doesn't depend on the serializer's whitespace choices.
 *   - Both tests run `build-corpus`, which **writes to tracked paths under
 *     src/content/generated/**. That write is idempotent for the "no drift"
 *     case (bit-identical output preserves the previous file) and is
 *     reverted-then-regenerated for the "drift" case. Still, no other
 *     vitest should run in parallel against those files — they already
 *     live under the `scripts` project which is a separate worker, and
 *     we apply an explicit per-test timeout on both to keep slow CI from
 *     hanging indefinitely.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const grammarsPath = path.resolve(repoRoot, "src/content/generated/grammars.json");

const GENERATED_PATHS = [
  "src/content/generated/corpus.json",
  "src/content/generated/corpus.ts",
  "src/content/generated/surrealist.json",
  "src/content/generated/surrealist.ts",
  "src/content/generated/grammars.json",
];

let restore: (() => void) | null = null;

afterEach(() => {
  if (restore) {
    restore();
    restore = null;
  }
});

/**
 * Replicates what `pnpm verify-corpus` does: regenerate artifacts, then
 * diff the specific paths. Returns the combined exit code — 0 iff the
 * build ran AND nothing drifted.
 */
function runVerifyCorpusDirect(): { exitCode: number; output: string } {
  const env = { ...process.env };
  try {
    // Step 1 — regenerate. If this throws, propagate as non-zero.
    execFileSync("npx", ["tsx", "scripts/build-corpus.ts"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? -1,
      output: `build-corpus failed: ${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }

  // Step 2 — diff. Non-zero exit means drift.
  try {
    execFileSync("git", ["diff", "--exit-code", "--", ...GENERATED_PATHS], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
    return { exitCode: 0, output: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? -1,
      output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }
}

describe("verify-corpus drift gate", () => {
  it("exits 0 when no drift exists", () => {
    // Baseline — grammars.json as checked in; no mutation.
    const { exitCode } = runVerifyCorpusDirect();
    expect(exitCode).toBe(0);
  }, 60_000);

  it("exits non-zero when grammars.json has been hand-edited", () => {
    expect(existsSync(grammarsPath)).toBe(true);
    const original = readFileSync(grammarsPath, "utf8");
    restore = () => writeFileSync(grammarsPath, original, "utf8");

    // Mutate via parse/stringify — independent of file whitespace. Adding
    // a sentinel key the build will never emit guarantees drift.
    const parsed = JSON.parse(original) as Record<string, unknown>;
    parsed.__driftSentinel = "T61_gate_test_only";
    writeFileSync(grammarsPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

    const { exitCode, output } = runVerifyCorpusDirect();
    expect(exitCode, output).not.toBe(0);
  }, 60_000);
});
