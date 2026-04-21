#!/usr/bin/env node
/**
 * After `pnpm build-game-db` emits `public/game.db`, copy it into the
 * place the Capacitor-sqlite plugin expects:
 *
 *   web:     dist/assets/databases/gameSQLite.db
 *            (served at /assets/databases/gameSQLite.db by jeep-sqlite)
 *   native:  android/app/src/main/assets/public/assets/databases/gameSQLite.db
 *            ios/App/App/public/assets/databases/gameSQLite.db
 *
 * Capacitor CLI's `pnpm cap sync` syncs `dist/` into the native asset
 * paths, so we only need to stage under `dist/` — this script is
 * idempotent and runs as part of `pnpm build`.
 *
 * The plugin's `copyFromAssets()` renames `gameSQLite.db` → the
 * runtime db name (`game`) the first time it's called.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

const SOURCE = path.join(REPO, "public", "game.db");
const WEB_DIST_DIR = path.join(REPO, "dist", "assets", "databases");
const WEB_PUBLIC_DIR = path.join(REPO, "public", "assets", "databases");
const PLUGIN_NAME = "gameSQLite.db";

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!(await exists(SOURCE))) {
    console.error(`[stage-game-db] no source db at ${SOURCE} — run \`pnpm build-game-db\` first.`);
    process.exit(1);
  }
  // Stage under public/ so it's bundled into dist/ by vite build AND
  // available at dev-server / in jeep-sqlite's expected URL.
  await fs.mkdir(WEB_PUBLIC_DIR, { recursive: true });
  await fs.copyFile(SOURCE, path.join(WEB_PUBLIC_DIR, PLUGIN_NAME));
  console.log(`[stage-game-db] public/ ← ${PLUGIN_NAME}`);

  // If the vite build has already produced dist/, stage there too so
  // a standalone `pnpm cap sync` right after build picks it up.
  if (await exists(path.join(REPO, "dist"))) {
    await fs.mkdir(WEB_DIST_DIR, { recursive: true });
    await fs.copyFile(SOURCE, path.join(WEB_DIST_DIR, PLUGIN_NAME));
    console.log(`[stage-game-db] dist/ ← ${PLUGIN_NAME}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
