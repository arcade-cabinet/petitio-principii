import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the repo root relative to this file so scripts work from
// anywhere, including the monorepo build.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");

export const BRAINSTORM_DIR = path.join(REPO_ROOT, "tools", "brainstorm");
export const CLUSTERS_DIR = path.join(BRAINSTORM_DIR, "clusters");
export const RAW_DIR = path.join(BRAINSTORM_DIR, "raw");
export const CLEAN_DIR = path.join(BRAINSTORM_DIR, "clean");
export const SENTENCES_DIR = path.join(BRAINSTORM_DIR, "sentences");
export const SIGNATURES_DIR = path.join(BRAINSTORM_DIR, "signatures");
export const EMBEDDINGS_CACHE = path.join(BRAINSTORM_DIR, "embeddings-cache.json");
export const AUTHORING_DB = path.join(BRAINSTORM_DIR, "authoring.db");
export const CORPUS_MANIFEST = path.join(BRAINSTORM_DIR, "corpus-manifest.json");
export const AUTHORING_BRIEFS_DIR = path.join(REPO_ROOT, "authoring", "briefs");
