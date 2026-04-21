/**
 * Runtime game.db wrapper.
 *
 * Single API over `@capacitor-community/sqlite` — jeep-sqlite (sql.js
 * under the hood) on web, native sqlite on iOS/Android. We never
 * import sql.js directly; the Capacitor plugin is the only SQLite
 * surface this module knows about.
 *
 * Lifecycle:
 *   1. Seed: on first boot (no user db yet), fetch the shipped
 *      `public/game.db` and copy it into the plugin's storage.
 *   2. Open: connect read-write. sqlite-vec extension loaded here.
 *   3. Use: callers issue `run(sql, params)` or `vecSearch(...)`.
 *   4. Close: plugin handles persistence; we just close the handle.
 *
 * This module is loaded via a dynamic `import()` from the case-
 * entry transition so it does not inflate the landing bundle.
 */

import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

const DB_NAME = "game";
const DB_VERSION = 1;

export interface SqlRow {
  readonly [col: string]: string | number | null;
}

export interface ResultSet {
  readonly changes: number;
  readonly rows: ReadonlyArray<SqlRow>;
}

export interface VecHit {
  readonly rowid: number;
  readonly distance: number;
}

/**
 * Runtime handle to `game.db`. One connection per game session.
 * `runMany` is for non-returning statements (DDL / bulk inserts).
 * `run` is for everything else.
 */
export interface GameDb {
  run(sql: string, params?: ReadonlyArray<unknown>): Promise<ResultSet>;
  runMany(sql: string): Promise<void>;
  vecSearch(table: string, query: Float32Array, k: number): Promise<VecHit[]>;
  close(): Promise<void>;
}

let _sqlite: SQLiteConnection | null = null;
let _initialized = false;

async function initWebIfNeeded(): Promise<void> {
  if (Capacitor.getPlatform() !== "web") return;
  if (_initialized) return;
  const mod = (await import("jeep-sqlite/loader")) as {
    defineCustomElements: (win: Window) => void;
  };
  mod.defineCustomElements(window);
  for (let i = 0; i < 50; i++) {
    if (customElements.get("jeep-sqlite")) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!document.querySelector("jeep-sqlite")) {
    const el = document.createElement("jeep-sqlite");
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
  }
  await CapacitorSQLite.initWebStore();
  _initialized = true;
}

async function hasConnection(name: string): Promise<boolean> {
  if (!_sqlite) return false;
  try {
    const existing = await _sqlite.isConnection(name, false);
    return existing.result === true;
  } catch {
    return false;
  }
}

async function dbExists(name: string): Promise<boolean> {
  if (!_sqlite) return false;
  try {
    const r = await _sqlite.isDatabase(name);
    return r.result === true;
  } catch {
    return false;
  }
}

async function seedIfNeeded(): Promise<void> {
  if (!_sqlite) throw new Error("seedIfNeeded() called before plugin init");
  if (await dbExists(DB_NAME)) return;
  try {
    await CapacitorSQLite.copyFromAssets({ overwrite: false });
  } catch (err) {
    console.warn(
      "[game.db] copyFromAssets failed; dev environments may need to run the native sync or place the seed db manually.",
      err
    );
  }
}

function rowsOf(values: unknown): ReadonlyArray<SqlRow> {
  if (!Array.isArray(values)) return [];
  return values as ReadonlyArray<SqlRow>;
}

export async function openGameDb(): Promise<GameDb> {
  await initWebIfNeeded();
  if (!_sqlite) _sqlite = new SQLiteConnection(CapacitorSQLite);

  await seedIfNeeded();

  let conn: SQLiteDBConnection;
  if (await hasConnection(DB_NAME)) {
    conn = await _sqlite.retrieveConnection(DB_NAME, false);
  } else {
    conn = await _sqlite.createConnection(
      DB_NAME,
      /*encrypted*/ false,
      /*mode*/ "no-encryption",
      DB_VERSION,
      /*readonly*/ false
    );
  }
  await conn.open();

  return {
    async run(sql, params = []) {
      const isSelect = /^\s*(select|with|pragma|explain)/i.test(sql);
      if (isSelect) {
        const res = await conn.query(sql, params as unknown[]);
        return { changes: 0, rows: rowsOf(res.values) };
      }
      const res = await conn.run(sql, params as unknown[]);
      return {
        changes: typeof res.changes?.changes === "number" ? res.changes.changes : 0,
        rows: [],
      };
    },

    async runMany(sql) {
      await conn.execute(sql);
    },

    async vecSearch(table, query, k) {
      const buf = query.buffer.slice(query.byteOffset, query.byteOffset + query.byteLength);
      const res = await conn.query(
        `SELECT rowid, vec_distance_cosine(embedding, ?) AS d FROM ${table} ORDER BY d ASC LIMIT ?`,
        [buf, k]
      );
      const rows = rowsOf(res.values);
      return rows.map((r) => ({
        rowid: Number(r.rowid),
        distance: Number(r.d),
      }));
    },

    async close() {
      await conn.close();
      if (_sqlite) await _sqlite.closeConnection(DB_NAME, false).catch(() => undefined);
    },
  };
}

// ────────────────────────────────────────────────────────────────────
// Thin typed case loader
// ────────────────────────────────────────────────────────────────────

export interface CaseRow {
  readonly id: string;
  readonly hour: number;
  readonly title: string;
  readonly oneLine: string;
  readonly personaId: string;
  readonly opensRoom: string;
}

export interface RoomRow {
  readonly id: string;
  readonly title: string;
  readonly prose: string;
  readonly rhetorical: string | null;
}

export interface ExitRow {
  readonly fromRoom: string;
  readonly toRoom: string;
  readonly direction: string;
  readonly prose: string;
  readonly gateWhen: string | null;
}

export interface ClueRow {
  readonly id: string;
  readonly roomId: string;
  readonly prose: string;
  readonly onVerb: string;
  readonly onThing: string | null;
  readonly revealWhen: string | null;
  readonly tags: string;
}

export async function loadCase(
  db: GameDb,
  caseId: string
): Promise<{
  case: CaseRow;
  rooms: ReadonlyArray<RoomRow>;
  exits: ReadonlyArray<ExitRow>;
  clues: ReadonlyArray<ClueRow>;
}> {
  const c = await db.run(
    "SELECT id, hour, title, one_line as oneLine, persona_id as personaId, opens_room as opensRoom FROM cases WHERE id = ?",
    [caseId]
  );
  if (c.rows.length === 0) throw new Error(`no such case: ${caseId}`);
  const caseRow = c.rows[0] as unknown as CaseRow;

  const rooms = (
    await db.run("SELECT id, title, prose, rhetorical FROM rooms WHERE case_id = ? ORDER BY id", [
      caseId,
    ])
  ).rows as unknown as RoomRow[];

  const exits = (
    await db.run(
      "SELECT from_room as fromRoom, to_room as toRoom, direction, prose, gate_when as gateWhen FROM exits WHERE case_id = ? ORDER BY id",
      [caseId]
    )
  ).rows as unknown as ExitRow[];

  const clues = (
    await db.run(
      "SELECT id, room_id as roomId, prose, on_verb as onVerb, on_thing as onThing, reveal_when as revealWhen, tags FROM clues WHERE case_id = ? ORDER BY id, on_verb, on_thing",
      [caseId]
    )
  ).rows as unknown as ClueRow[];

  return { case: caseRow, rooms, exits, clues };
}
