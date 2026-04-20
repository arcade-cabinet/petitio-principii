import { describe, expect, it } from "vitest";
import { describeRoom, generatePhrase, getHelpText } from "./NarrativeGenerator";
import type { Room } from "./Room";

describe("generatePhrase", () => {
  it("returns a space-separated adjective-adjective-noun phrase", () => {
    const phrase = generatePhrase(42);
    const parts = phrase.split(" ");
    expect(parts).toHaveLength(3);
  });

  it("is deterministic for the same seed", () => {
    expect(generatePhrase(123)).toBe(generatePhrase(123));
  });

  it("is different for different seeds", () => {
    expect(generatePhrase(1)).not.toBe(generatePhrase(2));
  });
});

describe("describeRoom", () => {
  const mockRoom: Room = {
    id: "test-room",
    title: "The Test Hall",
    description: "A description of the test hall.",
    exits: [{ direction: "north", targetRoomId: "other", description: "a corridor" }],
    rhetoricalType: "premise",
    examined: false,
  };

  it("includes the room title (uppercased)", () => {
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("THE TEST HALL");
  });

  it("includes the description", () => {
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("A description of the test hall.");
  });

  it("does NOT emit an Exits: block — the keycap row owns directions now", () => {
    // Per docs/UX.md §1.2, the prose never lists exits as a menu. Exits
    // are communicated by the keycap silhouettes in the FUTURE zone.
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).not.toContain("Exits:");
    expect(joined).not.toMatch(/^NORTH -/m);
  });
});

describe("getHelpText", () => {
  it("returns an array of strings", () => {
    const help = getHelpText();
    expect(Array.isArray(help)).toBe(true);
    expect(help.length).toBeGreaterThan(0);
  });

  it("includes GO command", () => {
    const help = getHelpText();
    const joined = help.join(" ");
    expect(joined).toContain("GO");
  });
});
