/**
 * Stage 2 — strip Project Gutenberg headers/footers and split into
 * sentences.
 *
 * Writes `sentences/<author>/<work>.jsonl` where each line is:
 *   { ref, sentence_idx, text }
 *
 * Sentence splitting is a light-touch regex that handles `.`, `!`, `?`
 * as terminators with basic abbreviation tolerance. We do not bring
 * in RiTa here because RiTa at build time for this job is heavier
 * than we need; the signature extractor doesn't require perfect
 * sentence boundaries, just consistent ones.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, readCorpusManifest } from "./io";
import { CLEAN_DIR, RAW_DIR, SENTENCES_DIR } from "./paths";
import type { SourceManifestEntry } from "./types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function rawPathFor(src: SourceManifestEntry): string {
  return path.join(RAW_DIR, slugify(src.author), `${slugify(src.work)}.txt`);
}
function cleanPathFor(src: SourceManifestEntry): string {
  return path.join(CLEAN_DIR, slugify(src.author), `${slugify(src.work)}.txt`);
}
function sentencesPathFor(src: SourceManifestEntry): string {
  return path.join(SENTENCES_DIR, slugify(src.author), `${slugify(src.work)}.jsonl`);
}

function stripGutenberg(text: string): string {
  // PG wraps texts in explicit START/END markers. Strip anything
  // outside them.
  const start = text.match(
    /\*\*\* START OF (?:THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG)(?: EBOOK)?[^*]+\*\*\*/i
  );
  const end = text.match(
    /\*\*\* END OF (?:THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG)(?: EBOOK)?[^*]+\*\*\*/i
  );
  let body = text;
  if (start && start.index !== undefined) body = body.slice(start.index + start[0].length);
  if (end && end.index !== undefined) {
    const endIdx = end.index - (start?.index ?? 0) - (start?.[0].length ?? 0);
    body = body.slice(0, endIdx);
  }
  // Normalize whitespace.
  return body
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ABBREVS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "st",
  "jr",
  "sr",
  "lt",
  "col",
  "gen",
  "no",
  "vol",
  "ch",
  "ft",
  "i.e",
  "e.g",
]);

/**
 * Split text into sentences. Preserve newlines as *weak* separators:
 * a newline without a sentence-ending punctuation joins to the next
 * line with a space.
 */
function splitSentences(text: string): string[] {
  // Join wrapped lines first.
  const joined = text.replace(/([^\n])\n(?![\n])/g, "$1 ");
  const parts = joined.split(/\n{2,}/);
  const out: string[] = [];
  for (const para of parts) {
    // simple period-based splitter with abbreviation check
    const buf: string[] = [];
    let cur = "";
    const tokens = para.split(/(\s+)/);
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      cur += tk;
      if (/[.!?]["')\]]*$/.test(tk)) {
        // strip trailing punctuation to check for abbreviation
        const last = tk.replace(/["')\]]*[.!?]+["')\]]*$/, "").toLowerCase();
        if (!ABBREVS.has(last)) {
          buf.push(cur.trim());
          cur = "";
        }
      }
    }
    if (cur.trim()) buf.push(cur.trim());
    for (const s of buf) if (s.length > 0) out.push(s);
  }
  return out;
}

export async function normalizeAll(): Promise<void> {
  const manifest = await readCorpusManifest();
  let written = 0;
  let skipped = 0;
  for (const src of manifest.sources) {
    const rawP = rawPathFor(src);
    try {
      await fs.access(rawP);
    } catch {
      console.warn(`  no raw file for ${src.ref} at ${rawP} — skipping`);
      skipped++;
      continue;
    }
    const raw = await fs.readFile(rawP, "utf8");
    const cleaned = stripGutenberg(raw);
    await ensureDir(path.dirname(cleanPathFor(src)));
    await fs.writeFile(cleanPathFor(src), cleaned, "utf8");

    const sentences = splitSentences(cleaned);
    await ensureDir(path.dirname(sentencesPathFor(src)));
    const lines = sentences.map((text, idx) =>
      JSON.stringify({ ref: src.ref, sentence_idx: idx, text })
    );
    await fs.writeFile(sentencesPathFor(src), lines.join("\n"), "utf8");
    console.log(`  ${src.ref}: ${sentences.length} sentences`);
    written++;
  }
  console.log(`\nnormalize summary: ${written} written, ${skipped} skipped`);
}
