/**
 * Stage 5 — embed every sentence of every cluster's corpus into the
 * local `authoring.db` (separate from the shipped `game.db`).
 *
 * Uses `mxbai-embed-large` via local Ollama for the authoring-time
 * retrieval surface. `nomic-embed-text` or any other local model can
 * be substituted via `BRAINSTORM_EMBED_MODEL` env var.
 *
 * The embeddings are cached under `tools/brainstorm/embeddings-cache.json`
 * keyed by sha256(text + '|' + model_id). CI can re-run the build
 * against an intact cache without needing Ollama; cache misses on CI
 * are a hard fail.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { ensureDir, readClusterManifests, readCorpusManifest } from "./io";
import { embedBatch, ollamaIsRunning } from "./ollama";
import { AUTHORING_DB, EMBEDDINGS_CACHE, SENTENCES_DIR } from "./paths";
import type { EmbeddingsCache } from "./types";

const DEFAULT_MODEL = process.env.BRAINSTORM_EMBED_MODEL ?? "mxbai-embed-large";
const AUTHORING_MODEL_DIM = 1024; // mxbai-embed-large
const CACHE_REQUIRED = process.env.CI === "true";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function cacheKey(text: string, model: string): string {
  return createHash("sha256").update(`${text}|${model}`).digest("hex");
}

function encodeF32(v: Float32Array): string {
  const b = Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  return b.toString("base64");
}

function decodeF32(s: string): Float32Array {
  const b = Buffer.from(s, "base64");
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}

async function loadCache(): Promise<EmbeddingsCache> {
  try {
    const raw = await fs.readFile(EMBEDDINGS_CACHE, "utf8");
    return JSON.parse(raw) as EmbeddingsCache;
  } catch {
    return {};
  }
}

async function saveCache(cache: EmbeddingsCache): Promise<void> {
  // Sort keys for diff-stable output.
  const sorted: EmbeddingsCache = {};
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k];
  await fs.writeFile(EMBEDDINGS_CACHE, JSON.stringify(sorted), "utf8");
}

interface SentenceRec {
  ref: string;
  sentence_idx: number;
  text: string;
}

async function readSentencesForRef(ref: string): Promise<SentenceRec[]> {
  const manifest = await readCorpusManifest();
  const src = manifest.sources.find((s) => s.ref === ref);
  if (!src) return [];
  const file = path.join(SENTENCES_DIR, slugify(src.author), `${slugify(src.work)}.jsonl`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as SentenceRec);
  } catch {
    return [];
  }
}

function openAuthoringDb(): Database.Database {
  const db = new Database(AUTHORING_DB);
  db.pragma("journal_mode = WAL");
  sqliteVec.load(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS cluster_sent_meta (
      rowid         INTEGER PRIMARY KEY,
      cluster_id    TEXT NOT NULL,
      source_ref    TEXT NOT NULL,
      sentence_idx  INTEGER NOT NULL,
      text          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cluster_sent_by_cluster
      ON cluster_sent_meta(cluster_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS cluster_sent_vec USING vec0(
      embedding float[${AUTHORING_MODEL_DIM}]
    );
  `);
  return db;
}

interface IndexRow {
  cluster_id: string;
  source_ref: string;
  sentence_idx: number;
  text: string;
  embedding: Float32Array;
}

export async function embedAll(): Promise<void> {
  await ensureDir(path.dirname(AUTHORING_DB));
  const clusters = await readClusterManifests();
  const cache = await loadCache();
  const ollamaUp = await ollamaIsRunning();

  if (!ollamaUp && !CACHE_REQUIRED) {
    console.warn(
      `  Ollama not reachable at ${process.env.OLLAMA_URL ?? "http://localhost:11434"}. Using cache only; new sentences will be skipped.`
    );
  }
  if (!ollamaUp && CACHE_REQUIRED) {
    console.error(
      "  CI mode: Ollama not reachable and cache-only mode cannot fill misses. Run `pnpm brainstorm embed` locally first, then commit the updated `tools/brainstorm/embeddings-cache.json`."
    );
  }

  const db = openAuthoringDb();
  const insertBatch = db.transaction((rows: IndexRow[]) => {
    const insertMeta = db.prepare(
      "INSERT INTO cluster_sent_meta (cluster_id, source_ref, sentence_idx, text) VALUES (?, ?, ?, ?)"
    );
    const insertVec = db.prepare("INSERT INTO cluster_sent_vec (rowid, embedding) VALUES (?, ?)");
    for (const row of rows) {
      const info = insertMeta.run(row.cluster_id, row.source_ref, row.sentence_idx, row.text);
      // sqlite-vec vec0 requires a BigInt for its rowid column when the
      // SQL binding is a number >= 2^31; passing a JS Number triggers
      // "Only integers are allows for primary key values" because the
      // binding layer tags it as a float. Wrap in BigInt to force the
      // integer binding path.
      const rowid = BigInt(info.lastInsertRowid as number | bigint);
      insertVec.run(rowid, Buffer.from(row.embedding.buffer));
    }
  });

  // Clear and rebuild for simplicity — cluster sentence counts are
  // small enough (~100k) and this keeps `authoring.db` deterministic
  // given the cache + sources. Re-runs are cheap because cache hits
  // dominate after the first full build.
  db.exec("DELETE FROM cluster_sent_meta; DELETE FROM cluster_sent_vec;");

  let totalInserted = 0;
  let totalCacheMisses = 0;

  for (const cluster of clusters) {
    const rows: IndexRow[] = [];

    for (const src of cluster.sources) {
      const sentences = await readSentencesForRef(src.ref);
      if (sentences.length === 0) {
        console.warn(`    skipping ${cluster.id}::${src.ref} — no sentences`);
        continue;
      }

      // Prefer cache. Collect misses per batch.
      const misses: SentenceRec[] = [];
      const cached: Array<{ rec: SentenceRec; vec: Float32Array }> = [];
      for (const rec of sentences) {
        const key = cacheKey(rec.text, DEFAULT_MODEL);
        const hit = cache[key];
        if (hit) {
          cached.push({ rec, vec: decodeF32(hit) });
        } else {
          misses.push(rec);
        }
      }

      if (misses.length > 0 && !ollamaUp) {
        console.warn(
          `    ${cluster.id}::${src.ref}: ${misses.length} cache misses; Ollama down, skipping misses.`
        );
      } else if (misses.length > 0) {
        console.log(
          `    ${cluster.id}::${src.ref}: ${cached.length} cache hits, ${misses.length} cache misses — embedding…`
        );
        totalCacheMisses += misses.length;
        const texts = misses.map((m) => m.text);
        const vecs = await embedBatch(DEFAULT_MODEL, texts);
        for (let i = 0; i < misses.length; i++) {
          const rec = misses[i];
          const vec = vecs[i];
          const key = cacheKey(rec.text, DEFAULT_MODEL);
          cache[key] = encodeF32(vec);
          cached.push({ rec, vec });
        }
        // Save cache incrementally so an interrupted run doesn't lose
        // expensive embeddings.
        await saveCache(cache);
      }

      for (const { rec, vec } of cached) {
        rows.push({
          cluster_id: cluster.id,
          source_ref: src.ref,
          sentence_idx: rec.sentence_idx,
          text: rec.text,
          embedding: vec,
        });
      }
      console.log(`    ${cluster.id}::${src.ref}: ${cached.length} embedded`);
    }

    if (rows.length > 0) {
      insertBatch(rows);
      totalInserted += rows.length;
      console.log(`  ${cluster.id}: ${rows.length} vectors indexed`);
    }
  }

  db.close();
  await saveCache(cache);
  console.log(
    `\nembed summary: ${totalInserted} vectors indexed, ${totalCacheMisses} new embeddings computed`
  );
}
