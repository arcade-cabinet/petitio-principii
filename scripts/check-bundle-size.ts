/**
 * check-bundle-size — fail CI if the gzipped first-paint JS bundle exceeds
 * the release-gate budget set in the PRD (T67).
 *
 * Runs after `pnpm build` (which has already populated dist/). Parses
 * `dist/index.html` to find the chunks that block first paint (the module
 * `<script>` tag + any `<link rel="modulepreload">` hints), reads each from
 * disk, gzip-compresses it in memory, and sums the sizes. If the total
 * exceeds MAX_GZIPPED_BYTES, exits 1 with a human-readable summary.
 *
 * Async chunks (React.lazy-loaded modules, dynamic imports) are listed for
 * visibility but do NOT count against the budget — they only load when the
 * feature is actually used, so they don't affect first-paint weight.
 *
 * Wired into `pnpm verify` after `pnpm build` so the gate fires on every
 * PR push.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const distDir = path.resolve(repoRoot, "dist");
const distAssets = path.resolve(distDir, "assets");
const indexHtmlPath = path.resolve(distDir, "index.html");

// PRD T67 acceptance: first-paint gzipped JS ≤ 180 kB.
const MAX_GZIPPED_BYTES = 180 * 1024;

interface ChunkReport {
  name: string;
  rawBytes: number;
  gzipBytes: number;
  firstPaint: boolean;
}

/** Parse index.html for first-paint JS chunk filenames. */
function readFirstPaintChunks(): Set<string> {
  if (!statSync(indexHtmlPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error("dist/index.html not found — run `pnpm build` first.");
  }
  const html = readFileSync(indexHtmlPath, "utf8");
  const firstPaint = new Set<string>();

  // Match <script type="module" ... src="…/assets/NAME.js">
  for (const m of html.matchAll(/<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/g)) {
    firstPaint.add(m[1]);
  }
  // Match <link rel="modulepreload" ... href="…/assets/NAME.js">
  for (const m of html.matchAll(
    /<link[^>]+rel="modulepreload"[^>]+href="[^"]*\/assets\/([^"]+\.js)"/g
  )) {
    firstPaint.add(m[1]);
  }

  if (firstPaint.size === 0) {
    throw new Error(
      "dist/index.html has no <script> or <modulepreload> tags referencing assets/*.js"
    );
  }
  return firstPaint;
}

function chunkReports(): ChunkReport[] {
  if (!statSync(distAssets, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error("dist/assets not found — run `pnpm build` first.");
  }
  const firstPaint = readFirstPaintChunks();
  return readdirSync(distAssets)
    .filter((name) => name.endsWith(".js"))
    .map((name) => {
      const raw = readFileSync(path.join(distAssets, name));
      return {
        name,
        rawBytes: raw.byteLength,
        gzipBytes: gzipSync(raw).byteLength,
        firstPaint: firstPaint.has(name),
      };
    })
    .sort((a, b) => b.gzipBytes - a.gzipBytes);
}

function fmt(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function main(): void {
  const chunks = chunkReports();
  const firstPaint = chunks.filter((c) => c.firstPaint);
  const async = chunks.filter((c) => !c.firstPaint);

  const totalFirstPaintGzip = firstPaint.reduce((acc, c) => acc + c.gzipBytes, 0);
  const totalAsyncGzip = async.reduce((acc, c) => acc + c.gzipBytes, 0);

  console.log("[check-bundle-size] First-paint chunks (counted against budget):");
  for (const c of firstPaint) {
    const pct = ((c.gzipBytes / MAX_GZIPPED_BYTES) * 100).toFixed(1);
    console.log(
      `  ${c.name}  raw=${fmt(c.rawBytes)}  gzip=${fmt(c.gzipBytes)}  (${pct}% of budget)`
    );
  }
  console.log(`  ── first-paint total: gzip=${fmt(totalFirstPaintGzip)}`);

  if (async.length > 0) {
    console.log("\n[check-bundle-size] Async chunks (lazy-loaded, NOT counted):");
    for (const c of async) {
      console.log(`  ${c.name}  raw=${fmt(c.rawBytes)}  gzip=${fmt(c.gzipBytes)}`);
    }
    console.log(`  ── async total: gzip=${fmt(totalAsyncGzip)}`);
  }

  console.log(`\n  budget: ${fmt(MAX_GZIPPED_BYTES)} gzipped (first-paint only)`);

  if (totalFirstPaintGzip > MAX_GZIPPED_BYTES) {
    const over = totalFirstPaintGzip - MAX_GZIPPED_BYTES;
    console.error(
      `\n[check-bundle-size] FAIL: first-paint bundle is ${fmt(over)} over the ${fmt(MAX_GZIPPED_BYTES)} budget.`
    );
    console.error("Trim by lazy-loading non-critical UI, dropping unused dep imports,");
    console.error("or splitting the chunk via dynamic import().");
    process.exit(1);
  }
  console.log(
    `[check-bundle-size] OK — ${fmt(MAX_GZIPPED_BYTES - totalFirstPaintGzip)} of first-paint headroom.`
  );
}

main();
