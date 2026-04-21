/**
 * Stage 1 — fetch public-domain sources from their canonical URLs.
 *
 * Only Project Gutenberg is supported at the moment (via the
 * `https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` pattern),
 * because every source we need for the READY clusters has a PG id.
 * Sources with `gutenberg_id: null` (Hammett, Black Mask anthology)
 * emit a manual-curation prompt and skip fetching; the author lands
 * those text files by hand into `raw/<author>/<work>.txt`.
 *
 * Idempotent: existing files are skipped unless `--force` is passed.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, readCorpusManifest } from "./io";
import { RAW_DIR } from "./paths";
import type { SourceManifestEntry } from "./types";

const USER_AGENT = "petitio-principii brainstorm pipeline (PD academic use)";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function targetPath(src: SourceManifestEntry): string {
  const author = slugify(src.author);
  const work = slugify(src.work);
  return path.join(RAW_DIR, author, `${work}.txt`);
}

async function fetchGutenberg(id: number): Promise<string> {
  // Try the UTF-8 canonical first; fall back to the plain text.
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (res.ok) return await res.text();
    } catch {
      // try the next URL
    }
  }
  throw new Error(`failed to fetch PG ${id} from any canonical URL`);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function fetchAll(opts: { force?: boolean } = {}): Promise<void> {
  const manifest = await readCorpusManifest();
  let fetched = 0;
  let skipped = 0;
  let manual = 0;

  for (const src of manifest.sources) {
    const out = targetPath(src);
    if (!opts.force && (await exists(out))) {
      skipped++;
      continue;
    }

    if (src.gutenberg_id == null) {
      console.warn(
        `  manual curation needed: ${src.ref}\n    place source text at: ${out}\n    notes: ${src.notes ?? "(none)"}`
      );
      manual++;
      continue;
    }

    await ensureDir(path.dirname(out));
    try {
      const text = await fetchGutenberg(src.gutenberg_id);
      await fs.writeFile(out, text, "utf8");
      console.log(`  fetched ${src.ref} → ${path.relative(process.cwd(), out)}`);
      fetched++;
    } catch (err) {
      console.error(`  FAILED ${src.ref}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nfetch summary: ${fetched} fetched, ${skipped} skipped, ${manual} awaiting manual curation`
  );
}
