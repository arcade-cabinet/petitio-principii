/**
 * check-bundle-size — fail CI if the gzipped JS bundle exceeds either of
 * the release-gate budgets set in the PRD (T67).
 *
 * Two gates are enforced; CI fails if EITHER is exceeded:
 *
 *   1. FIRST-PAINT BUDGET (180 kB gzipped)
 *      Only the chunks referenced from `dist/index.html` as module <script>
 *      or <link rel="modulepreload"> count here. This measures what actually
 *      loads before the user sees pixels.
 *
 *   2. TOTAL DIST BUDGET (280 kB gzipped)
 *      Every .js file in `dist/assets/` (including lazy-loaded React.lazy
 *      chunks, dynamic imports, locale splits). This is the backstop that
 *      prevents silently shipping arbitrarily large lazy payloads and
 *      calling the headline budget "green."
 *
 * The two-gate design: gate 1 aligns with web.dev page-weight semantics
 * and lets the initial paint be fast; gate 2 makes sure we haven't just
 * moved the bloat behind a dynamic import() hatch.
 *
 * Wired into `pnpm verify` after `pnpm build` so both gates fire on every
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
const MAX_GZIPPED_BYTES_FIRST_PAINT = 180 * 1024;
// Total-dist backstop: every .js chunk under dist/assets/ combined ≤ 280 kB.
const MAX_GZIPPED_BYTES_TOTAL = 280 * 1024;

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
  const asyncChunks = chunks.filter((c) => !c.firstPaint);

  const totalFirstPaintGzip = firstPaint.reduce((acc, c) => acc + c.gzipBytes, 0);
  const totalAsyncGzip = asyncChunks.reduce((acc, c) => acc + c.gzipBytes, 0);
  const totalAllGzip = totalFirstPaintGzip + totalAsyncGzip;

  console.log("[check-bundle-size] First-paint chunks (gate 1 — first-paint budget):");
  for (const c of firstPaint) {
    const pct = ((c.gzipBytes / MAX_GZIPPED_BYTES_FIRST_PAINT) * 100).toFixed(1);
    console.log(
      `  ${c.name}  raw=${fmt(c.rawBytes)}  gzip=${fmt(c.gzipBytes)}  (${pct}% of first-paint budget)`
    );
  }
  console.log(`  ── first-paint total: gzip=${fmt(totalFirstPaintGzip)}`);

  if (asyncChunks.length > 0) {
    console.log("\n[check-bundle-size] Async chunks (counted only in gate 2 — total-dist budget):");
    for (const c of asyncChunks) {
      const pct = ((c.gzipBytes / MAX_GZIPPED_BYTES_TOTAL) * 100).toFixed(1);
      console.log(
        `  ${c.name}  raw=${fmt(c.rawBytes)}  gzip=${fmt(c.gzipBytes)}  (${pct}% of total-dist budget)`
      );
    }
    console.log(`  ── async total: gzip=${fmt(totalAsyncGzip)}`);
  }

  console.log("\n[check-bundle-size] Budget summary:");
  const firstPaintOver = totalFirstPaintGzip > MAX_GZIPPED_BYTES_FIRST_PAINT;
  const totalOver = totalAllGzip > MAX_GZIPPED_BYTES_TOTAL;
  const firstPaintStatus = firstPaintOver ? "FAIL" : "OK";
  const totalStatus = totalOver ? "FAIL" : "OK";
  console.log(
    `  [${firstPaintStatus}] first-paint: ${fmt(totalFirstPaintGzip)} / ${fmt(MAX_GZIPPED_BYTES_FIRST_PAINT)} ` +
      `(${firstPaintOver ? `${fmt(totalFirstPaintGzip - MAX_GZIPPED_BYTES_FIRST_PAINT)} over` : `${fmt(MAX_GZIPPED_BYTES_FIRST_PAINT - totalFirstPaintGzip)} headroom`})`
  );
  console.log(
    `  [${totalStatus}] total-dist:  ${fmt(totalAllGzip)} / ${fmt(MAX_GZIPPED_BYTES_TOTAL)} ` +
      `(${totalOver ? `${fmt(totalAllGzip - MAX_GZIPPED_BYTES_TOTAL)} over` : `${fmt(MAX_GZIPPED_BYTES_TOTAL - totalAllGzip)} headroom`})`
  );

  if (firstPaintOver || totalOver) {
    console.error("");
    if (firstPaintOver) {
      console.error(
        `[check-bundle-size] FAIL: first-paint bundle is ${fmt(totalFirstPaintGzip - MAX_GZIPPED_BYTES_FIRST_PAINT)} over the ${fmt(MAX_GZIPPED_BYTES_FIRST_PAINT)} budget.`
      );
      console.error("  Trim by lazy-loading non-critical UI, dropping unused dep imports,");
      console.error("  or splitting the chunk via dynamic import().");
    }
    if (totalOver) {
      console.error(
        `[check-bundle-size] FAIL: total-dist bundle is ${fmt(totalAllGzip - MAX_GZIPPED_BYTES_TOTAL)} over the ${fmt(MAX_GZIPPED_BYTES_TOTAL)} budget.`
      );
      console.error("  Lazy-loading moved bytes behind async imports but the total ship weight");
      console.error("  still exceeds the backstop. Drop a dep or delete a feature.");
    }
    process.exit(1);
  }

  console.log("\n[check-bundle-size] OK — both gates pass.");
}

main();
