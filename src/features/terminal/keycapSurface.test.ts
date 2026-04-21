import type { CommandVerb, Room } from "@/engine";
import { describe, expect, it } from "vitest";
import type { KeycapLayout } from "./keycapLayout";
import { computeKeycapSurface } from "./keycapSurface";

function room(overrides: Partial<Room> = {}): Room {
  return {
    id: "r",
    title: "Room",
    description: "",
    rhetoricalType: "premise",
    exits: [],
    examined: false,
    ...overrides,
  };
}

function neutralLayout(): KeycapLayout {
  return {
    rhetorical: {
      look: "charged",
      examine: "charged",
      question: "calm",
      askWhy: "calm",
      accept: "calm",
      reject: "calm",
      traceBack: "calm",
    },
    directions: {
      north: { available: true, alreadyTraversed: false },
      northeast: { available: false, alreadyTraversed: false },
      east: { available: false, alreadyTraversed: false },
      southeast: { available: false, alreadyTraversed: false },
      south: { available: false, alreadyTraversed: false },
      southwest: { available: false, alreadyTraversed: false },
      west: { available: false, alreadyTraversed: false },
      northwest: { available: false, alreadyTraversed: false },
      up: { available: false, alreadyTraversed: false },
      down: { available: false, alreadyTraversed: false },
    },
  };
}

describe("computeKeycapSurface", () => {
  it("on a fresh game, exposes LOOK + exactly one teaching verb", () => {
    const r = room({ exits: [{ direction: "north", targetRoomId: "x", description: "" }] });
    const rooms = new Map<string, Room>([["r", r]]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: r,
      turnCount: 0,
      usedVerbs: new Set(),
      layout: neutralLayout(),
    });
    expect(s.verbs.has("look")).toBe(true);
    // Exactly one non-LOOK verb during tutorial window.
    const nonLook = Array.from(s.verbs).filter((v) => v !== "look");
    expect(nonLook.length).toBe(1);
    expect(nonLook[0]).toBe("examine"); // charged → first in pedagogy order.
  });

  it("keeps every verb the player has used pinned (never yanks a capability)", () => {
    const r = room();
    const rooms = new Map<string, Room>([["r", r]]);
    const used: Set<CommandVerb> = new Set(["reject"]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: r,
      turnCount: 1,
      usedVerbs: used,
      layout: neutralLayout(),
    });
    expect(s.verbs.has("reject")).toBe(true);
  });

  it("opens the full verb set once the player has used 3+ distinct non-LOOK verbs", () => {
    const r = room();
    const rooms = new Map<string, Room>([["r", r]]);
    const used: Set<CommandVerb> = new Set(["examine", "question", "accept"]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: r,
      turnCount: 4,
      usedVerbs: used,
      layout: neutralLayout(),
    });
    for (const v of ["look", "examine", "question", "ask why", "accept", "reject", "trace back"]) {
      expect(s.verbs.has(v)).toBe(true);
    }
  });

  it("opens the full set once turnCount reaches the turn threshold", () => {
    const r = room();
    const rooms = new Map<string, Room>([["r", r]]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: r,
      turnCount: 8,
      usedVerbs: new Set(),
      layout: neutralLayout(),
    });
    expect(s.verbs.has("trace back")).toBe(true);
  });

  it("pins cardinal directions that appear anywhere in the argument graph", () => {
    const a = room({
      id: "a",
      exits: [{ direction: "north", targetRoomId: "b", description: "" }],
    });
    const b = room({
      id: "b",
      exits: [{ direction: "south", targetRoomId: "a", description: "" }],
    });
    const rooms = new Map<string, Room>([
      ["a", a],
      ["b", b],
    ]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: a,
      turnCount: 0,
      usedVerbs: new Set(),
      layout: null,
    });
    expect(s.cardinals.has("north")).toBe(true);
    expect(s.cardinals.has("south")).toBe(true);
    expect(s.cardinals.has("east")).toBe(false);
    expect(s.cardinals.has("west")).toBe(false);
  });

  it("surfaces non-cardinal exits only when currently available from this room", () => {
    const here = room({
      id: "here",
      exits: [
        { direction: "up", targetRoomId: "attic", description: "" },
        { direction: "north", targetRoomId: "yard", description: "" },
      ],
    });
    const other = room({
      id: "other",
      exits: [{ direction: "down", targetRoomId: "cellar", description: "" }],
    });
    const rooms = new Map<string, Room>([
      ["here", here],
      ["other", other],
    ]);
    const s = computeKeycapSurface({
      rooms,
      currentRoom: here,
      turnCount: 0,
      usedVerbs: new Set(),
      layout: null,
    });
    expect(s.nonCardinals.has("up")).toBe(true);
    // "down" exists in the graph but not from here → hidden.
    expect(s.nonCardinals.has("down")).toBe(false);
  });
});
