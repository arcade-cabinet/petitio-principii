import type { Room } from "@/engine/core/Room";
import { describe, expect, it } from "vitest";
import { type ChainingMemory, chainDescription } from "./chaining";

/**
 * T43 — chainDescription now flattens through the frozen Tracery grammar.
 *
 * These tests guard the behavioural contract that the rest of the text
 * pipeline (NarrativeGenerator.describeRoom, TerminalDisplay output) relies
 * on:
 *
 *   1. Determinism: same (seed, room, visit, memory) → byte-identical output.
 *   2. Visit gating: visitCount 0/1/≥3 reliably map to Acts I/II/III under
 *      the "not previously touched" branch.
 *   3. Memory bumps an unseen room into Act III on second visit when
 *      accepted/rejected/questioned.
 *   4. Memory-conditional acks only appear when the memory is present.
 *   5. Every (type, act) pair produces fully-resolved text (no leftover
 *      `#symbol#` placeholders).
 */

const RHETORICAL_TYPES: ReadonlyArray<Room["rhetoricalType"]> = [
  "premise",
  "conclusion",
  "definition",
  "analogy",
  "fallacy",
  "circular",
  "objection",
  "meta",
];

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "test-room",
    title: "Test Room",
    description: "unused — chainDescription emits body from the grammar",
    rhetoricalType: "premise",
    exits: [],
    ...overrides,
  } as Room;
}

describe("chainDescription", () => {
  it("is byte-identical for the same seed/room/visit/memory", () => {
    const room = makeRoom({ id: "rotunda", rhetoricalType: "circular" });
    const first = chainDescription(room, { seed: 42, visitCount: 1 });
    const second = chainDescription(room, { seed: 42, visitCount: 1 });
    expect(first).toBe(second);
  });

  it("produces different output for different seeds (≥ 70% unique across 50)", () => {
    const room = makeRoom({ id: "balcony", rhetoricalType: "conclusion" });
    const outputs = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      outputs.add(chainDescription(room, { seed, visitCount: 0 }));
    }
    expect(outputs.size).toBeGreaterThanOrEqual(35);
  });

  it("produces different output for different visit counts", () => {
    const room = makeRoom({ id: "cloister", rhetoricalType: "objection" });
    const v0 = chainDescription(room, { seed: 7, visitCount: 0 });
    const v1 = chainDescription(room, { seed: 7, visitCount: 1 });
    const v3 = chainDescription(room, { seed: 7, visitCount: 3 });
    expect(v0).not.toBe(v1);
    expect(v1).not.toBe(v3);
  });

  it("never leaves an unflattened Tracery placeholder", () => {
    for (const type of RHETORICAL_TYPES) {
      for (const vc of [0, 1, 3]) {
        const room = makeRoom({ id: `room-${type}`, rhetoricalType: type });
        const text = chainDescription(room, { seed: 100 + vc, visitCount: vc });
        expect(text, `${type}/v${vc}`).not.toMatch(/#[a-zA-Z_]+#/);
        expect(text, `${type}/v${vc}`).not.toMatch(/\{[a-zA-Z]/);
        expect(text.length, `${type}/v${vc}`).toBeGreaterThan(20);
      }
    }
  });

  it("omits acks when memory is absent (no 'You remember' clause in Act I)", () => {
    const room = makeRoom({ id: "lantern", rhetoricalType: "definition" });
    const text = chainDescription(room, { seed: 9, visitCount: 0 });
    expect(text).not.toMatch(
      /You remember accepting|You remember having rejected|defends itself against your earlier question/
    );
  });

  it("injects the accepted-ack clause when the room is in accepted memory", () => {
    // premise/III rule 1 carries `#acceptedAck#`; memory=accepted bumps a
    // touched room to Act III on visit=1, so this configuration reliably
    // surfaces the accepted clause once the right rule is picked.
    const room = makeRoom({ id: "hall-of-columns", rhetoricalType: "premise" });
    const memory: ChainingMemory = {
      accepted: new Set(["hall-of-columns"]),
      rejected: new Set(),
      questioned: new Set(),
    };
    let acked = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const text = chainDescription(room, { seed, visitCount: 1, memory });
      if (text.includes("You remember accepting")) acked++;
    }
    expect(acked).toBeGreaterThan(0);
  });

  it("uses Act III text when memory has touched the room (visit=1)", () => {
    const room = makeRoom({ id: "balcony", rhetoricalType: "conclusion" });
    const noMemory = chainDescription(room, { seed: 13, visitCount: 1 });
    const withMemory = chainDescription(room, {
      seed: 13,
      visitCount: 1,
      memory: {
        accepted: new Set(["balcony"]),
        rejected: new Set(),
        questioned: new Set(),
      },
    });
    // Same seed, same room, same visit, different memory → different output.
    expect(noMemory).not.toBe(withMemory);
  });

  it("falls back to premise rules if the rhetorical type is unknown", () => {
    // Cast into Room's type; runtime may receive data from content that
    // drifted ahead of this enum. The fallback keeps the game playable.
    const room = makeRoom({
      id: "unknown",
      rhetoricalType: "invented_type" as Room["rhetoricalType"],
    });
    const text = chainDescription(room, { seed: 1, visitCount: 0 });
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toMatch(/#[a-zA-Z_]+#/);
  });
});
