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
 * ### The drift gate's two failure modes
 *
 * The gate catches two *kinds* of drift:
 *
 *   1. **Stale build output.** A lexicon / grammar source changed but
 *      nobody ran `pnpm build-corpus`, so the committed generated files
 *      no longer match what the build would produce. This is caught by
 *      Step 1 — running build-corpus regenerates the files, and any real
 *      change appears as a post-build diff.
 *
 *   2. **Hand-edited generated files.** Someone tweaked one of the
 *      generated artifacts directly (thinking they were fixing a typo,
 *      say) without updating the source that feeds into it. This is
 *      caught by Step 2 — `git diff --exit-code` on the specific paths
 *      flags the working tree drift versus HEAD.
 *
 * The tests below verify both behaviours independently. CodeRabbit's
 * round-3 review flagged that an earlier version ran build+diff in a
 * single `runVerifyCorpusDirect()` call and expected non-zero for a
 * hand-edit, which failed because the build step overwrote the mutation
 * before the diff ran. The split below fixes that.
 *
 * ### Implementation notes
 *
 *   - We invoke `tsx scripts/build-corpus.ts` and `git diff` directly
 *     rather than going through `pnpm verify-corpus`. The package.json
 *     script is exactly `tsx + git diff`; going via pnpm adds a layer
 *     that's brittle across Corepack / direct-pnpm environments.
 *   - We mutate via `JSON.parse` + `JSON.stringify` — never regex — so
 *     the test doesn't depend on serializer whitespace choices.
 *   - Both tests write to tracked paths under `src/content/generated/`.
 *     An `afterEach` hook restores any file we touched, so the tests are
 *     idempotent even if an assertion throws. The `scripts` vitest
 *     project is a separate worker — no parallel contention with
 *     browser-mode tests reading the same files.
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

/** Run `tsx scripts/build-corpus.ts`. Returns { exitCode, output }. */
function runBuildCorpus(): { exitCode: number; output: string } {
  try {
    execFileSync("npx", ["tsx", "scripts/build-corpus.ts"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, output: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? -1,
      output: `build-corpus failed: ${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }
}

/** Run `git diff --exit-code` on the generated paths only. */
function runGitDiffGenerated(): { exitCode: number; output: string } {
  try {
    execFileSync("git", ["diff", "--exit-code", "--", ...GENERATED_PATHS], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
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
  it("baseline: build-corpus + git diff on generated paths exits 0 when nothing has drifted", () => {
    // This is the happy path — the committed artifacts match what the
    // current build would produce, so neither step reports drift.
    const build = runBuildCorpus();
    expect(build.exitCode, build.output).toBe(0);
    const diff = runGitDiffGenerated();
    expect(diff.exitCode, diff.output).toBe(0);
  }, 60_000);

  it("hand-edited generated file: git diff exits non-zero (without running rebuild first)", () => {
    expect(existsSync(grammarsPath)).toBe(true);
    const original = readFileSync(grammarsPath, "utf8");
    restore = () => writeFileSync(grammarsPath, original, "utf8");

    // Mutate via parse/stringify — independent of file whitespace.
    const parsed = JSON.parse(original) as Record<string, unknown>;
    parsed.__driftSentinel = "T61_gate_test_only";
    writeFileSync(grammarsPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

    // Diff directly — no rebuild. This is the "hand-edit" path: the
    // release gate catches it before build-corpus runs. In CI, the gate
    // does run build first, but that's the "stale build output" case
    // which the next test covers.
    const diff = runGitDiffGenerated();
    expect(diff.exitCode, diff.output).not.toBe(0);
  }, 60_000);

  it("hand-edit + rebuild: build-corpus's stable-render detects the structural change via lastBuilt rotation", () => {
    expect(existsSync(grammarsPath)).toBe(true);
    const original = readFileSync(grammarsPath, "utf8");
    restore = () => writeFileSync(grammarsPath, original, "utf8");

    // Same mutation as above.
    const parsed = JSON.parse(original) as Record<string, unknown>;
    parsed.__driftSentinel = "T61_gate_test_only";
    writeFileSync(grammarsPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

    // Now rebuild. build-corpus's stable-render compares the new output
    // against the on-disk file (which has the sentinel). Because the
    // structure differs, the renderer emits a fresh lastBuilt timestamp
    // and writes the clean output. The sentinel is gone but the
    // timestamp rotated — so `git diff` against HEAD still shows drift.
    const build = runBuildCorpus();
    expect(build.exitCode, build.output).toBe(0);

    const diff = runGitDiffGenerated();
    expect(diff.exitCode, diff.output).not.toBe(0);
  }, 60_000);
});
