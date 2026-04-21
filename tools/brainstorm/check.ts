/**
 * Stage 7 — sameness-check.
 *
 * Given a path to a SCENE file (or any markdown/text containing
 * authored prose paragraphs), embed each paragraph and knn-search
 * the cluster's vector space. Flag paragraphs whose nearest-source-
 * neighbor is too close: cosine distance ≤ 0.36 (⇔ cosine similarity
 * ≥ 0.82 under sim = 1 - dist/2) is FAIL; 0.36 < dist ≤ 0.50 is WARN;
 * anything farther is CLEAN.
 *
 * CLI:
 *   pnpm brainstorm check <scene-file> [--cluster <id>]
 *
 * If --cluster is omitted, the SCENE file must declare one in its
 * header (parser lands in a follow-up; for now the cluster is
 * required as a CLI arg).
 *
 * Exit codes:
 *   0  all paragraphs CLEAN (cosine sim <= 0.75)
 *   2  one or more WARN paragraphs (cosine sim in 0.75..0.82)
 *   3  one or more FAIL paragraphs (cosine sim > 0.82)
 *   1  infrastructure error
 */

import fs from "node:fs/promises";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { embedBatch, ollamaIsRunning } from "./ollama";
import { AUTHORING_DB } from "./paths";

const MODEL = process.env.BRAINSTORM_EMBED_MODEL ?? "mxbai-embed-large";
// Cosine distance thresholds. `vec_distance_cosine` returns 0 (identical)
// to 2 (opposite). sim = 1 - dist/2, so:
//   sim >= 0.82  ⇔  dist <= 0.36  → FAIL (too close to some source)
//   sim >= 0.75  ⇔  dist <= 0.50  → WARN (borderline)
//   sim <  0.75  ⇔  dist >  0.50  → CLEAN
const FAIL_MAX_DIST = 0.36;
const WARN_MAX_DIST = 0.5;

export type Verdict = "CLEAN" | "WARN" | "FAIL";

export interface CheckResult {
  readonly paragraph_idx: number;
  readonly snippet: string;
  readonly verdict: Verdict;
  readonly nearest: {
    readonly source_ref: string;
    readonly text: string;
    readonly cosine_distance: number;
    readonly cosine_similarity: number;
  } | null;
}

/** Split a text into paragraphs (double-newline separated). Skips
 *  markdown frontmatter + heading lines. */
export function paragraphsFor(text: string): string[] {
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/, "");
  const blocks = withoutFrontmatter.split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;
    // skip headings
    if (/^#{1,6}\s/.test(trimmed)) continue;
    // skip code fences
    if (trimmed.startsWith("```") || trimmed.endsWith("```")) continue;
    // skip list lines
    if (/^[-*+>]\s/.test(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

export async function checkFile(scenePath: string, clusterId: string): Promise<CheckResult[]> {
  if (!(await ollamaIsRunning())) {
    throw new Error(
      "Ollama not reachable. `ollama serve` must be running, and the embedding model pulled (`ollama pull mxbai-embed-large`)."
    );
  }
  const src = await fs.readFile(scenePath, "utf8");
  const paragraphs = paragraphsFor(src);
  if (paragraphs.length === 0) {
    console.warn(`  ${scenePath}: no paragraphs to check`);
    return [];
  }

  const embeddings = await embedBatch(MODEL, paragraphs);

  const db = new Database(AUTHORING_DB, { readonly: true });
  sqliteVec.load(db);

  const results: CheckResult[] = [];
  const knn = db.prepare(
    `
    SELECT hm.source_ref, hm.text, vec_distance_cosine(hv.embedding, ?) AS d
    FROM cluster_sent_vec hv
    JOIN cluster_sent_meta hm ON hm.rowid = hv.rowid
    WHERE hm.cluster_id = ?
    ORDER BY d ASC
    LIMIT 1
  `
  );

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const vec = embeddings[i];
    const row = knn.get(Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength), clusterId) as
      | { source_ref: string; text: string; d: number }
      | undefined;
    let verdict: Verdict;
    if (!row) {
      verdict = "CLEAN"; // empty cluster => no reference to fail against
    } else if (row.d <= FAIL_MAX_DIST) {
      verdict = "FAIL";
    } else if (row.d <= WARN_MAX_DIST) {
      verdict = "WARN";
    } else {
      verdict = "CLEAN";
    }
    results.push({
      paragraph_idx: i,
      snippet: para.slice(0, 160).replace(/\s+/g, " "),
      verdict,
      nearest: row
        ? {
            source_ref: row.source_ref,
            text: row.text,
            cosine_distance: row.d,
            cosine_similarity: 1 - row.d / 2,
          }
        : null,
    });
  }
  db.close();
  return results;
}

export function formatResults(scenePath: string, results: CheckResult[]): string {
  const lines: string[] = [];
  lines.push(`check: ${scenePath}`);
  const totals = results.reduce(
    (acc, r) => {
      acc[r.verdict]++;
      return acc;
    },
    { CLEAN: 0, WARN: 0, FAIL: 0 } as Record<Verdict, number>
  );
  lines.push(`  summary: ${totals.CLEAN} CLEAN · ${totals.WARN} WARN · ${totals.FAIL} FAIL`);
  for (const r of results) {
    if (r.verdict === "CLEAN") continue;
    const sim = r.nearest ? (r.nearest.cosine_similarity * 100).toFixed(1) : "—";
    const src = r.nearest ? r.nearest.source_ref : "—";
    lines.push("");
    lines.push(`  [${r.verdict}] ¶${r.paragraph_idx + 1}  sim=${sim}%  nearest=${src}`);
    lines.push(`    your:   ${r.snippet}`);
    if (r.nearest) lines.push(`    source: ${r.nearest.text.slice(0, 160).replace(/\s+/g, " ")}`);
  }
  return lines.join("\n");
}

export async function checkCli(argv: string[]): Promise<number> {
  const scenePath = argv[0];
  if (!scenePath) {
    console.error("usage: pnpm brainstorm check <scene-file> --cluster <id>");
    return 1;
  }
  const clusterArgIdx = argv.findIndex((a) => a === "--cluster");
  const clusterId = clusterArgIdx >= 0 ? argv[clusterArgIdx + 1] : undefined;
  if (!clusterId) {
    console.error("error: --cluster <id> is required (SCENE header lookup lands later)");
    return 1;
  }
  const results = await checkFile(scenePath, clusterId);
  console.log(formatResults(scenePath, results));
  const hasFail = results.some((r) => r.verdict === "FAIL");
  const hasWarn = results.some((r) => r.verdict === "WARN");
  if (hasFail) return 3;
  if (hasWarn) return 2;
  return 0;
}
