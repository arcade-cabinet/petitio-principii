import type { CommandVerb, Room } from "@/engine";
import { describe, expect, it } from "vitest";
import { type KeycapLayoutContext, computeKeycapLayout } from "./keycapLayout";

/**
 * T50 — computeKeycapLayout.
 *
 * The tests pin every rule in the layout function so that T51's UI
 * consumption can trust each emphasis is intentional and won't silently
 * drift. Exactly one primary at most per layout is the load-bearing
 * invariant the visual treatment relies on.
 */

function roomOf(type: Room["rhetoricalType"] = "premise", exits: Room["exits"] = []): Room {
  return {
    id: `test-${type}`,
    title: "Test Room",
    description: "A test room.",
    rhetoricalType: type,
    exits,
    examined: false,
  };
}

function ctx(overrides: Partial<KeycapLayoutContext> = {}): KeycapLayoutContext {
  return {
    room: overrides.room ?? roomOf(),
    turnCount: overrides.turnCount ?? 0,
    usedVerbs: overrides.usedVerbs ?? new Set<CommandVerb>(),
    circleClosed: overrides.circleClosed ?? false,
  };
}

function countPrimaries(layout: ReturnType<typeof computeKeycapLayout>): number {
  return Object.values(layout.rhetorical).filter((e) => e === "primary").length;
}

describe("computeKeycapLayout", () => {
  it("at most one primary emphasis per layout", () => {
    // Exhaustive sample across the interesting axes.
    const variations: KeycapLayoutContext[] = [
      ctx({ turnCount: 0 }),
      ctx({ turnCount: 1, usedVerbs: new Set<CommandVerb>(["look"]) }),
      ctx({ turnCount: 3, room: roomOf("circular") }),
      ctx({ turnCount: 5, circleClosed: true }),
      ctx({ turnCount: 2, usedVerbs: new Set<CommandVerb>(["look", "examine"]) }),
    ];
    for (const v of variations) {
      expect(countPrimaries(computeKeycapLayout(v))).toBeLessThanOrEqual(1);
    }
  });

  it("turn 0 makes LOOK the primary verb", () => {
    const layout = computeKeycapLayout(ctx({ turnCount: 0 }));
    expect(layout.rhetorical.look).toBe("primary");
  });

  it("after LOOK is used on turn 1, EXAMINE becomes primary", () => {
    const layout = computeKeycapLayout(
      ctx({ turnCount: 1, usedVerbs: new Set<CommandVerb>(["look"]) })
    );
    expect(layout.rhetorical.examine).toBe("primary");
    expect(layout.rhetorical.look).toBe("charged");
  });

  it("a circular room with accept un-used promotes ACCEPT to primary", () => {
    const layout = computeKeycapLayout(
      ctx({ turnCount: 5, room: roomOf("circular"), usedVerbs: new Set<CommandVerb>(["look"]) })
    );
    expect(layout.rhetorical.accept).toBe("primary");
  });

  it("a circular room with accept already used drops circle-based primary", () => {
    const layout = computeKeycapLayout(
      ctx({
        turnCount: 5,
        room: roomOf("circular"),
        usedVerbs: new Set<CommandVerb>(["look", "examine", "accept"]),
      })
    );
    // accept is used → no forced primary from the circle-room rule; look &
    // examine are used → no progression primary either.
    expect(countPrimaries(layout)).toBe(0);
    expect(layout.rhetorical.accept).toBe("charged");
  });

  it("circle closed promotes TRACE BACK to primary regardless of room type", () => {
    const layout = computeKeycapLayout(
      ctx({
        turnCount: 10,
        circleClosed: true,
        room: roomOf("premise"),
      })
    );
    expect(layout.rhetorical.traceBack).toBe("primary");
  });

  it("reject/question are calm inside a circular room (the shape is closing, not debating)", () => {
    const layout = computeKeycapLayout(
      ctx({
        turnCount: 5,
        room: roomOf("circular"),
        usedVerbs: new Set<CommandVerb>(["look", "examine", "accept"]),
      })
    );
    expect(layout.rhetorical.reject).toBe("calm");
    expect(layout.rhetorical.question).toBe("calm");
  });

  it("direction availability mirrors room.exits", () => {
    const layout = computeKeycapLayout(
      ctx({
        room: roomOf("premise", [
          { direction: "north", targetRoomId: "a", description: "" },
          { direction: "east", targetRoomId: "b", description: "" },
        ]),
      })
    );
    expect(layout.directions.north?.available).toBe(true);
    expect(layout.directions.east?.available).toBe(true);
    expect(layout.directions.south?.available).toBe(false);
    expect(layout.directions.up?.available).toBe(false);
  });

  it("alreadyTraversed flag reflects the traversed parameter", () => {
    const layout = computeKeycapLayout(
      ctx({
        room: roomOf("premise", [{ direction: "north", targetRoomId: "a", description: "" }]),
      }),
      new Set(["north"])
    );
    expect(layout.directions.north?.alreadyTraversed).toBe(true);
    expect(layout.directions.south?.alreadyTraversed).toBe(false);
  });
});
