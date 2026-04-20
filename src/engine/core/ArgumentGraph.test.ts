import { describe, expect, it } from "vitest";
import { generateArgumentGraph } from "./ArgumentGraph";

describe("generateArgumentGraph", () => {
  it("generates rooms for a given seed", () => {
    const graph = generateArgumentGraph(42);
    expect(graph.rooms.size).toBeGreaterThan(0);
  });

  it("has a valid start room", () => {
    const graph = generateArgumentGraph(42);
    expect(graph.rooms.has(graph.startRoomId)).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const g1 = generateArgumentGraph(999);
    const g2 = generateArgumentGraph(999);
    expect([...g1.rooms.keys()].sort()).toEqual([...g2.rooms.keys()].sort());
    expect(g1.startRoomId).toBe(g2.startRoomId);
  });

  it("produces different graphs for different seeds", () => {
    const g1 = generateArgumentGraph(1);
    const g2 = generateArgumentGraph(2);
    const desc1 = [...g1.rooms.values()].map((r) => r.description).join("|");
    const desc2 = [...g2.rooms.values()].map((r) => r.description).join("|");
    expect(desc1).not.toBe(desc2);
  });

  it("all rooms have valid exit targets", () => {
    const graph = generateArgumentGraph(42);
    for (const room of graph.rooms.values()) {
      for (const exit of room.exits) {
        expect(graph.rooms.has(exit.targetRoomId)).toBe(true);
      }
    }
  });

  it("rooms have titles and descriptions", () => {
    const graph = generateArgumentGraph(42);
    for (const room of graph.rooms.values()) {
      expect(room.title).toBeTruthy();
      expect(room.description).toBeTruthy();
    }
  });
});
