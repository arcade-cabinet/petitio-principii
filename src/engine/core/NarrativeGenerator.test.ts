import { describe, expect, it } from "vitest";
import { describeRoom, generatePhrase, getHelpText } from "./NarrativeGenerator";
import type { Room } from "./Room";

describe("generatePhrase", () => {
  it("returns a hyphenated adjective-adjective-noun phrase", () => {
    const phrase = generatePhrase(42);
    const parts = phrase.split("-");
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

  it("includes the room title", () => {
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("The Test Hall");
  });

  it("includes the description", () => {
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("A description of the test hall.");
  });

  it("includes exits", () => {
    const lines = describeRoom(mockRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("NORTH");
  });

  it("handles rooms with no exits", () => {
    const noExitRoom = { ...mockRoom, exits: [] };
    const lines = describeRoom(noExitRoom);
    const joined = lines.join(" ");
    expect(joined).toContain("no obvious exits");
  });
});

describe("getHelpText", () => {
  it("returns an array of strings", () => {
    const help = getHelpText();
    expect(Array.isArray(help)).toBe(true);
    expect(help.length).toBeGreaterThan(0);
  });

  it("includes GO and HELP commands", () => {
    const help = getHelpText();
    const joined = help.join(" ");
    expect(joined).toContain("GO");
    expect(joined).toContain("HELP");
  });
});
