import fs from "node:fs/promises";
import path from "node:path";
import { CLUSTERS_DIR, CORPUS_MANIFEST } from "./paths";
import type { ClusterManifest, CorpusManifest } from "./types";

export async function readCorpusManifest(): Promise<CorpusManifest> {
  const raw = await fs.readFile(CORPUS_MANIFEST, "utf8");
  const parsed = JSON.parse(raw) as CorpusManifest;
  if (!Array.isArray(parsed.sources)) {
    throw new Error(`corpus-manifest.json has no 'sources' array`);
  }
  return parsed;
}

export async function readClusterManifests(): Promise<ClusterManifest[]> {
  const files = await fs.readdir(CLUSTERS_DIR);
  const out: ClusterManifest[] = [];
  for (const f of files) {
    if (!f.endsWith(".cluster.json")) continue;
    const raw = await fs.readFile(path.join(CLUSTERS_DIR, f), "utf8");
    out.push(JSON.parse(raw) as ClusterManifest);
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}
