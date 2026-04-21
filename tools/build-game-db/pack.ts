/**
 * IR → game.db pack step.
 *
 * Creates the shipped seed database per the schema in
 * docs/design/pivot/01-ARCHITECTURE-DB.md §4. Content tables are
 * populated from one or more CaseIRs; the progress + settings
 * tables are created empty. hotspot_vec_mini will hold the runtime
 * tap-resolution vectors (populated by a later ONNX build step;
 * the table is created here empty).
 */

import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import type { CaseIR, PredicateJson } from "./ir";

const SCHEMA_VERSION = 1;

export interface PackOptions {
  readonly outPath: string;
  readonly runtimeDim?: number;
  readonly authoringDim?: number;
}

export interface PackResult {
  readonly cases: number;
  readonly rooms: number;
  readonly clues: number;
  readonly verdicts: number;
  readonly bytes: number;
}

function buildSchema(runtimeDim: number, authoringDim: number): string {
  const vecAuthoring =
    authoringDim > 0
      ? `CREATE VIRTUAL TABLE hotspot_vec_mxbai USING vec0(embedding float[${authoringDim}]);`
      : "";
  return `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE personas (
  id            TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  era           TEXT NOT NULL,
  biography     TEXT NOT NULL,
  voice_notes   TEXT NOT NULL,
  notices_first TEXT NOT NULL,
  theme_chord   TEXT NOT NULL,
  proximity_first  TEXT NOT NULL,
  proximity_middle TEXT NOT NULL,
  proximity_late   TEXT NOT NULL,
  proximity_last   TEXT NOT NULL
);
CREATE INDEX personas_by_case ON personas(case_id);

CREATE TABLE cases (
  id         TEXT PRIMARY KEY,
  hour       INTEGER NOT NULL,
  title      TEXT NOT NULL,
  one_line   TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  opens_room TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id)
);

CREATE TABLE rooms (
  id          TEXT NOT NULL,
  case_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  prose       TEXT NOT NULL,
  rhetorical  TEXT,
  PRIMARY KEY (id, case_id),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE exits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      TEXT NOT NULL,
  from_room    TEXT NOT NULL,
  to_room      TEXT NOT NULL,
  direction    TEXT NOT NULL,
  prose        TEXT NOT NULL,
  gate_when    TEXT,
  FOREIGN KEY (case_id) REFERENCES cases(id)
);
CREATE INDEX exits_by_room ON exits(case_id, from_room);

CREATE TABLE clues (
  id           TEXT NOT NULL,
  case_id      TEXT NOT NULL,
  room_id      TEXT NOT NULL,
  prose        TEXT NOT NULL,
  on_verb      TEXT NOT NULL,
  on_thing     TEXT,
  reveal_when  TEXT,
  tags         TEXT NOT NULL,
  PRIMARY KEY (id, case_id, on_verb, on_thing)
);
CREATE INDEX clues_by_room ON clues(case_id, room_id);

CREATE TABLE claims (
  id       TEXT NOT NULL,
  case_id  TEXT NOT NULL,
  text     TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE TABLE clue_supports (
  case_id  TEXT NOT NULL,
  clue_id  TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  PRIMARY KEY (case_id, clue_id, claim_id)
);

CREATE TABLE clue_contradicts (
  case_id  TEXT NOT NULL,
  clue_id  TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  PRIMARY KEY (case_id, clue_id, claim_id)
);

CREATE TABLE connections (
  id       TEXT NOT NULL,
  case_id  TEXT NOT NULL,
  prose    TEXT NOT NULL,
  yields   TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE TABLE connection_requires (
  case_id       TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  kind          TEXT NOT NULL,
  ref_id        TEXT NOT NULL,
  ref_state     TEXT,
  PRIMARY KEY (case_id, connection_id, kind, ref_id)
);

CREATE TABLE facts (
  id      TEXT NOT NULL,
  case_id TEXT NOT NULL,
  text    TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE TABLE verdicts (
  id              TEXT NOT NULL,
  case_id         TEXT NOT NULL,
  prose           TEXT NOT NULL,
  moral_valence   TEXT NOT NULL,
  atmos_valence   TEXT NOT NULL,
  card_comment    TEXT NOT NULL,
  requires_json   TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE TABLE retorts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id  TEXT NOT NULL,
  prose    TEXT NOT NULL,
  tags     TEXT NOT NULL
);

CREATE TABLE named_entities (
  id             TEXT NOT NULL,
  case_id        TEXT NOT NULL,
  kind           TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  phrases_in_prose TEXT NOT NULL,
  verbs          TEXT NOT NULL,
  PRIMARY KEY (id, case_id)
);

CREATE VIRTUAL TABLE hotspot_vec_mini USING vec0(embedding float[${runtimeDim}]);
${vecAuthoring}

CREATE TABLE hotspot_meta (
  rowid          INTEGER PRIMARY KEY,
  case_id        TEXT NOT NULL,
  room_id        TEXT NOT NULL,
  target_kind    TEXT NOT NULL,
  target_ref_id  TEXT NOT NULL,
  phrase         TEXT NOT NULL,
  context        TEXT NOT NULL
);
CREATE INDEX hotspot_meta_by_room ON hotspot_meta(case_id, room_id);

CREATE TABLE progress_case (
  case_id        TEXT PRIMARY KEY,
  started_at     INTEGER NOT NULL,
  last_opened_at INTEGER NOT NULL,
  verdict_id     TEXT,
  endings_found  TEXT NOT NULL
);

CREATE TABLE progress_clue (
  case_id        TEXT NOT NULL,
  clue_id        TEXT NOT NULL,
  discovered_at  INTEGER NOT NULL,
  PRIMARY KEY (case_id, clue_id)
);

CREATE TABLE progress_fact (
  case_id   TEXT NOT NULL,
  fact_id   TEXT NOT NULL,
  formed_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, fact_id)
);

CREATE TABLE progress_room (
  case_id        TEXT NOT NULL,
  room_id        TEXT NOT NULL,
  first_visit_at INTEGER NOT NULL,
  visit_count    INTEGER NOT NULL,
  PRIMARY KEY (case_id, room_id)
);

CREATE TABLE progress_claim (
  case_id    TEXT NOT NULL,
  claim_id   TEXT NOT NULL,
  state      TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, claim_id)
);

CREATE TABLE transcript (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    TEXT NOT NULL,
  turn       INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX transcript_case_turn ON transcript(case_id, turn);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
}

const SEED_SETTINGS: Array<[string, string]> = [
  ["schema_version", String(SCHEMA_VERSION)],
  ["volume_sfx", "0.8"],
  ["volume_bgm", "0.6"],
  ["muted", "false"],
  ["dyslexic_font", "false"],
  ["text_size", "medium"],
];

function predJson(p: PredicateJson | null): string | null {
  return p === null ? null : JSON.stringify(p);
}

export async function packGameDb(
  cases: ReadonlyArray<CaseIR>,
  opts: PackOptions
): Promise<PackResult> {
  await fs.mkdir(path.dirname(opts.outPath), { recursive: true });
  try {
    await fs.unlink(opts.outPath);
  } catch {
    /* not present */
  }

  const runtimeDim = opts.runtimeDim ?? 384;
  const authoringDim = opts.authoringDim ?? 0;

  const db = new Database(opts.outPath);
  try {
    sqliteVec.load(db);
    db.exec(buildSchema(runtimeDim, authoringDim));

    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of SEED_SETTINGS) insertSetting.run(k, v);

    const insertPersona = db.prepare(`
      INSERT INTO personas (
        id, case_id, display_name, era, biography, voice_notes,
        notices_first, theme_chord,
        proximity_first, proximity_middle, proximity_late, proximity_last
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertCase = db.prepare(`
      INSERT INTO cases (id, hour, title, one_line, persona_id, opens_room)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertRoom = db.prepare(
      "INSERT INTO rooms (id, case_id, title, prose, rhetorical) VALUES (?, ?, ?, ?, ?)"
    );
    const insertExit = db.prepare(`
      INSERT INTO exits (case_id, from_room, to_room, direction, prose, gate_when)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertClue = db.prepare(`
      INSERT INTO clues (id, case_id, room_id, prose, on_verb, on_thing, reveal_when, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertClaim = db.prepare("INSERT INTO claims (id, case_id, text) VALUES (?, ?, ?)");
    const insertSupport = db.prepare(
      "INSERT OR IGNORE INTO clue_supports (case_id, clue_id, claim_id) VALUES (?, ?, ?)"
    );
    const insertContradict = db.prepare(
      "INSERT OR IGNORE INTO clue_contradicts (case_id, clue_id, claim_id) VALUES (?, ?, ?)"
    );
    const insertFact = db.prepare(
      "INSERT OR IGNORE INTO facts (id, case_id, text) VALUES (?, ?, ?)"
    );
    const insertConn = db.prepare(
      "INSERT INTO connections (id, case_id, prose, yields) VALUES (?, ?, ?, ?)"
    );
    const insertConnReq = db.prepare(`
      INSERT INTO connection_requires (case_id, connection_id, kind, ref_id, ref_state)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertVerdict = db.prepare(`
      INSERT INTO verdicts (id, case_id, prose, moral_valence, atmos_valence, card_comment, requires_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRetort = db.prepare("INSERT INTO retorts (case_id, prose, tags) VALUES (?, ?, ?)");
    const insertEntity = db.prepare(`
      INSERT INTO named_entities (id, case_id, kind, display_name, phrases_in_prose, verbs)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const pack = db.transaction((all: ReadonlyArray<CaseIR>) => {
      for (const c of all) {
        insertPersona.run(
          c.persona.id,
          c.persona.caseId,
          c.persona.displayName,
          c.persona.era,
          c.persona.biography,
          c.persona.voiceNotes,
          JSON.stringify(c.persona.noticesFirst),
          JSON.stringify(c.persona.themeChord),
          c.persona.proximity.first,
          c.persona.proximity.middle,
          c.persona.proximity.late,
          c.persona.proximity.last
        );
        insertCase.run(c.id, c.hour, c.title, c.oneLine, c.persona.id, c.opensRoom);
        for (const r of c.rooms) insertRoom.run(r.id, r.caseId, r.title, r.prose, r.rhetorical);
        for (const e of c.exits)
          insertExit.run(
            e.caseId,
            e.fromRoom,
            e.toRoom,
            e.direction,
            e.prose,
            predJson(e.gateWhen)
          );
        for (const cl of c.clues)
          insertClue.run(
            cl.id,
            cl.caseId,
            cl.roomId,
            cl.prose,
            cl.onVerb,
            cl.onThing,
            predJson(cl.revealWhen),
            JSON.stringify(cl.tags)
          );
        for (const cm of c.claims) insertClaim.run(cm.id, cm.caseId, cm.text);
        for (const s of c.clueSupports) insertSupport.run(c.id, s.clueId, s.claimId);
        for (const s of c.clueContradicts) insertContradict.run(c.id, s.clueId, s.claimId);
        for (const f of c.facts) insertFact.run(f.id, c.id, f.text);
        for (const conn of c.connections) {
          insertConn.run(conn.id, conn.caseId, conn.prose, conn.yieldsFactId);
          for (const req of conn.requires)
            insertConnReq.run(conn.caseId, conn.id, req.kind, req.refId, req.state ?? null);
        }
        for (const v of c.verdicts)
          insertVerdict.run(
            v.id,
            v.caseId,
            v.prose,
            v.moralValence,
            v.atmosValence,
            v.cardComment,
            JSON.stringify(v.requires)
          );
        for (const r of c.retorts) insertRetort.run(r.caseId, r.prose, JSON.stringify(r.tags));
        for (const e of c.entities)
          insertEntity.run(
            e.id,
            e.caseId,
            e.kind,
            e.displayName,
            JSON.stringify(e.phrasesInProse),
            JSON.stringify(e.verbs)
          );
      }
    });
    pack(cases);
  } finally {
    db.close();
  }

  const stat = await fs.stat(opts.outPath);
  return {
    cases: cases.length,
    rooms: cases.reduce((a, c) => a + c.rooms.length, 0),
    clues: cases.reduce((a, c) => a + c.clues.length, 0),
    verdicts: cases.reduce((a, c) => a + c.verdicts.length, 0),
    bytes: stat.size,
  };
}
