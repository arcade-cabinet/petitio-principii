/**
 * check-bundle-size — fail CI if the gzipped JS bundle exceeds the
 * release-gate budget set in the PRD (T67).
 *
 * Runs after `pnpm build` (which has already populated dist/). Reads
 * every `.js` chunk under dist/assets/, gzip-compresses it in memory,
 * sums the sizes. If the total exceeds MAX_GZIPPED_BYTES, exits 1 with
 * a human-readable summary so CI can surface the regression.
 *
 * Wired into `pnpm verify` after `pnpm build` so the gate fires on
 * every PR push.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const distAssets = path.resolve(repoRoot, "dist/assets");

// PRD T67 acceptance: gzipped JS ≤ 180 kB.
const MAX_GZIPPED_BYTES = 180 * 1024;

interface ChunkReport {
  name: string;
  rawBytes: number;
  gzipBytes: number;
}

function chunkReports(): ChunkReport[] {
  if (!statSync(distAssets, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error("dist/assets not found — run `pnpm build` first.");
  }
  return readdirSync(distAssets)
    .filter((name) => name.endsWith(".js"))
    .map((name) => {
      const raw = readFileSync(path.join(distAssets, name));
      return {
        name,
        rawBytes: raw.byteLength,
        gzipBytes: gzipSync(raw).byteLength,
      };
    })
    .sort((a, b) => b.gzipBytes - a.gzipBytes);
}

function fmt(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function main(): void {
  const chunks = chunkReports();
  const totalRaw = chunks.reduce((acc, c) => acc + c.rawBytes, 0);
  const totalGzip = chunks.reduce((acc, c) => acc + c.gzipBytes, 0);

  console.log("[check-bundle-size] dist/assets/*.js (sorted by gzip):");
  for (const c of chunks) {
    const pct = ((c.gzipBytes / MAX_GZIPPED_BYTES) * 100).toFixed(1);
    console.log(
      `  ${c.name}  raw=${fmt(c.rawBytes)}  gzip=${fmt(c.gzipBytes)}  (${pct}% of budget)`
    );
  }
  console.log(`  ── total: raw=${fmt(totalRaw)}  gzip=${fmt(totalGzip)}`);
  console.log(`  budget: ${fmt(MAX_GZIPPED_BYTES)} gzipped`);

  if (totalGzip > MAX_GZIPPED_BYTES) {
    const over = totalGzip - MAX_GZIPPED_BYTES;
    console.error(
      `\n[check-bundle-size] FAIL: bundle is ${fmt(over)} over the ${fmt(MAX_GZIPPED_BYTES)} budget.`
    );
    console.error("Trim by lazy-loading non-critical UI, dropping unused dep imports,");
    console.error("or splitting the chunk via dynamic import().");
    process.exit(1);
  }
  console.log(`\n[check-bundle-size] OK — ${fmt(MAX_GZIPPED_BYTES - totalGzip)} of headroom.`);
}

main();
