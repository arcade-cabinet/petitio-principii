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
 * We simulate drift by appending one byte to grammars.json, running
 * `pnpm verify-corpus`, and asserting the script exits with code != 0.
 * A finally-block restores the file so the test is idempotent.
 *
 * This locks in the release gate: if someone hand-edits a generated
 * artifact without running build-corpus, CI fails loudly instead of
 * silently shipping stale JSON.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const grammarsPath = path.resolve(repoRoot, "src/content/generated/grammars.json");

let restore: (() => void) | null = null;

afterEach(() => {
  if (restore) {
    restore();
    restore = null;
  }
});

function runVerifyCorpus(): { exitCode: number; output: string } {
  try {
    const output = execFileSync("pnpm", ["verify-corpus"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
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
    const { exitCode } = runVerifyCorpus();
    expect(exitCode).toBe(0);
  });

  it("exits non-zero when grammars.json has been hand-edited", () => {
    expect(existsSync(grammarsPath)).toBe(true);
    const original = readFileSync(grammarsPath, "utf8");
    restore = () => writeFileSync(grammarsPath, original, "utf8");

    // Mutate — add a stray key the build would never emit. Must be valid
    // JSON so the script gets far enough to run `git diff` on it.
    const mutated = original.replace(/^\{\n/, '{\n  "__driftSentinel": "T61_gate_test_only",\n');
    writeFileSync(grammarsPath, mutated, "utf8");

    const { exitCode, output } = runVerifyCorpus();
    // build-corpus writes over the mutation, then git diff exits 1 because
    // the working tree drifted from HEAD. We accept any non-zero code.
    expect(exitCode, output).not.toBe(0);
  }, 60_000);
});
