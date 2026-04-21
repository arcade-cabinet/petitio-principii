/**
 * AST → IR normalizer.
 *
 * Takes one parsed CaseNode and flattens it into the relational
 * shape the db-builder packs. Resolves references, rewrites
 * predicates to JSON, denormalizes clue/exit rooms ids.
 *
 * Throws `NormalizeError` on unresolved references or other hard
 * structural issues. Warnings live in lint.ts.
 */

import type { CaseIR, ClueIR, ConnectionIR, ExitIR, PredicateJson, RoomIR, VerdictIR } from "./ir";
import type {
  CaseNode,
  ClueNode,
  ConnectionNode,
  ExitNode,
  Predicate,
  Ref,
  RoomNode,
  VerdictNode,
} from "./parse/ast";

export class NormalizeError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
    readonly path?: string
  ) {
    super(path ? `${path}:${line}:${column}: ${message}` : `(${line}:${column}): ${message}`);
    this.name = "NormalizeError";
  }
}

interface IdIndex {
  readonly rooms: Set<string>;
  readonly clues: Set<string>;
  readonly claims: Set<string>;
  readonly facts: Set<string>;
  readonly entities: Set<string>;
  readonly verdicts: Set<string>;
  readonly connections: Set<string>;
}

function buildIndex(caseNode: CaseNode): IdIndex {
  const rooms = new Set<string>();
  const clues = new Set<string>();
  const claims = new Set<string>();
  const facts = new Set<string>();
  const entities = new Set<string>();
  const verdicts = new Set<string>();
  const connections = new Set<string>();

  for (const r of caseNode.rooms) {
    rooms.add(r.id);
    for (const c of r.clues) clues.add(c.id);
  }
  for (const c of caseNode.claims) claims.add(c.id);
  for (const e of caseNode.entities) entities.add(e.id);
  for (const v of caseNode.verdicts) verdicts.add(v.id);
  for (const c of caseNode.connections) {
    connections.add(c.id);
    facts.add(c.yields.id);
  }
  return { rooms, clues, claims, facts, entities, verdicts, connections };
}

function checkRef(ref: Ref, idx: IdIndex, path?: string): void {
  const ok: Record<string, Set<string>> = {
    room: idx.rooms,
    clue: idx.clues,
    claim: idx.claims,
    fact: idx.facts,
    entity: idx.entities,
    verdict: idx.verdicts,
    connection: idx.connections,
  };
  const set = ok[ref.kind];
  if (!set) return;
  if (!set.has(ref.id)) {
    throw new NormalizeError(
      `unresolved reference ${ref.kind}:${ref.id}`,
      ref.pos.line,
      ref.pos.column,
      path
    );
  }
}

function predicateToJson(pred: Predicate, idx: IdIndex, path?: string): PredicateJson {
  switch (pred.op) {
    case "all":
      return { all: pred.children.map((c) => predicateToJson(c, idx, path)) };
    case "any":
      return { any: pred.children.map((c) => predicateToJson(c, idx, path)) };
    case "none":
      return { none: pred.children.map((c) => predicateToJson(c, idx, path)) };
    case "clue":
      if (!idx.clues.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown clue:${pred.ref.id}`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { clue: pred.ref.id };
    case "fact":
      if (!idx.facts.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown fact:${pred.ref.id}`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { fact: pred.ref.id };
    case "claim_state": {
      if (!idx.claims.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown claim_state:${pred.ref.id}`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      const state = pred.state;
      if (state !== "accepted" && state !== "rejected" && state !== "left-open") {
        throw new NormalizeError(
          `claim_state expects @ accepted|rejected|left-open, got @ ${state}`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { claim_state: pred.ref.id, eq: state };
    }
    case "examined":
      if (!idx.clues.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown examined:${pred.ref.id} (must be a clue id)`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { examined: pred.ref.id };
    case "visited":
      if (!idx.rooms.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown visited:${pred.ref.id} (must be a room id)`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { visited: pred.ref.id };
    case "visits_gte":
      if (!idx.rooms.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown visits_gte:${pred.ref.id} (must be a room id)`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { visits_gte: pred.ref.id, n: pred.n };
    case "examined_gte":
      if (!idx.clues.has(pred.ref.id)) {
        throw new NormalizeError(
          `predicate references unknown examined_gte:${pred.ref.id} (must be a clue id)`,
          pred.ref.pos.line,
          pred.ref.pos.column,
          path
        );
      }
      return { examined_gte: pred.ref.id, n: pred.n };
  }
}

function normalizeRoom(room: RoomNode, caseId: string): RoomIR {
  return {
    id: room.id,
    caseId,
    title: room.title,
    prose: room.prose,
    rhetorical: room.rhetorical,
  };
}

function normalizeExit(
  exit: ExitNode,
  room: RoomNode,
  caseId: string,
  idx: IdIndex,
  path?: string
): ExitIR {
  if (!idx.rooms.has(exit.target)) {
    throw new NormalizeError(
      `exit ${room.id} -> ${exit.target} (${exit.direction}) targets unknown room`,
      exit.pos.line,
      exit.pos.column,
      path
    );
  }
  return {
    caseId,
    fromRoom: room.id,
    toRoom: exit.target,
    direction: exit.direction,
    prose: exit.prose,
    gateWhen: exit.gate ? predicateToJson(exit.gate, idx, path) : null,
  };
}

function normalizeClue(
  clue: ClueNode,
  room: RoomNode,
  caseId: string,
  idx: IdIndex,
  path?: string
): ClueIR[] {
  for (const r of clue.supports) checkRef(r, idx, path);
  for (const r of clue.contradicts) checkRef(r, idx, path);
  const revealWhen = clue.reveal ? predicateToJson(clue.reveal, idx, path) : null;
  return clue.on.map((clause) => ({
    id: clue.id,
    caseId,
    roomId: room.id,
    onVerb: clause.verb,
    onThing: clause.thing,
    prose: clue.prose,
    revealWhen,
    tags: clue.tags,
    hotspotPhrases: clue.hotspots,
  }));
}

function normalizeVerdict(
  verdict: VerdictNode,
  caseId: string,
  idx: IdIndex,
  path?: string
): VerdictIR {
  return {
    id: verdict.id,
    caseId,
    prose: verdict.prose,
    moralValence: verdict.moral,
    atmosValence: verdict.atmos,
    cardComment: verdict.cardComment,
    requires: predicateToJson(verdict.requires, idx, path),
  };
}

function normalizeConnection(
  conn: ConnectionNode,
  caseId: string,
  idx: IdIndex,
  path?: string
): ConnectionIR {
  for (const r of conn.from) {
    if (r.kind !== "clue" && r.kind !== "fact") {
      throw new NormalizeError(
        `connect from: expected clue or fact reference, got ${r.kind}:${r.id}`,
        r.pos.line,
        r.pos.column,
        path
      );
    }
    checkRef(r, idx, path);
  }
  return {
    id: conn.id,
    caseId,
    prose: conn.prose,
    yieldsFactId: conn.yields.id,
    requires: conn.from.map((r) => ({
      kind: r.kind as "clue" | "fact",
      refId: r.id,
    })),
  };
}

export function normalize(caseNode: CaseNode, path?: string): CaseIR {
  const idx = buildIndex(caseNode);

  if (!idx.rooms.has(caseNode.opens)) {
    throw new NormalizeError(
      `\`opens room:${caseNode.opens}\` references an unknown room`,
      caseNode.pos.line,
      caseNode.pos.column,
      path
    );
  }

  const rooms: RoomIR[] = caseNode.rooms.map((r) => normalizeRoom(r, caseNode.id));
  const exits: ExitIR[] = [];
  const clues: ClueIR[] = [];
  for (const room of caseNode.rooms) {
    for (const exit of room.exits) exits.push(normalizeExit(exit, room, caseNode.id, idx, path));
    for (const clue of room.clues) clues.push(...normalizeClue(clue, room, caseNode.id, idx, path));
  }

  const clueSupports: Array<{ clueId: string; claimId: string }> = [];
  const clueContradicts: Array<{ clueId: string; claimId: string }> = [];
  for (const room of caseNode.rooms) {
    for (const clue of room.clues) {
      for (const c of clue.supports) clueSupports.push({ clueId: clue.id, claimId: c.id });
      for (const c of clue.contradicts) clueContradicts.push({ clueId: clue.id, claimId: c.id });
    }
  }

  const claims = caseNode.claims.map((c) => ({
    id: c.id,
    caseId: caseNode.id,
    text: c.text,
  }));

  const facts = caseNode.connections.map((c) => ({
    id: c.yields.id,
    text: c.prose.split(/[.!?]/)[0].trim() || c.prose,
  }));

  const connections = caseNode.connections.map((c) =>
    normalizeConnection(c, caseNode.id, idx, path)
  );
  const verdicts = caseNode.verdicts.map((v) => normalizeVerdict(v, caseNode.id, idx, path));

  return {
    id: caseNode.id,
    hour: caseNode.hour,
    title: caseNode.title,
    oneLine: caseNode.oneLine,
    opensRoom: caseNode.opens,
    persona: {
      id: `${caseNode.id}-persona`,
      caseId: caseNode.id,
      displayName: caseNode.persona.name,
      era: caseNode.persona.era,
      biography: caseNode.persona.biography,
      voiceNotes: caseNode.persona.voiceNotes,
      noticesFirst: caseNode.persona.noticesFirst,
      themeChord: caseNode.persona.themeChord ?? {
        root: "",
        intervals: [],
        instrument: "",
      },
      proximity: caseNode.persona.proximity,
    },
    retorts: caseNode.retorts.map((r) => ({
      caseId: caseNode.id,
      prose: r.prose,
      tags: r.tags,
    })),
    entities: caseNode.entities.map((e) => ({
      id: e.id,
      caseId: caseNode.id,
      kind: e.kind,
      displayName: e.displayName,
      phrasesInProse: e.phrasesInProse,
      verbs: e.verbs,
    })),
    rooms,
    exits,
    clues,
    claims,
    clueSupports,
    clueContradicts,
    facts,
    connections,
    verdicts,
  };
}
