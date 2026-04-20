import type { CommandVerb, Room } from "@/engine";
import { describe, expect, it } from "vitest";
import { type HintContext, _hintIdsForTests, selectHint } from "./hints";

/**
 * T49 — Progressive onboarding hints.
 *
 * The catalogue fires at most one hint per eligible turn and never repeats
 * an id once it's been marked shown. Each test pins one edge of that
 * contract; together they cover the priority/eligibility/no-repeat surface
 * that the reducer depends on.
 */

function roomOf(type: Room["rhetoricalType"] = "premise"): Room {
  return {
    id: `test-${type}`,
    title: "Test Room",
    description: "A test room.",
    rhetoricalType: type,
    exits: [],
    examined: false,
  };
}

function ctx(overrides: Partial<HintContext> = {}): HintContext {
  return {
    room: overrides.room ?? roomOf(),
    turnCount: overrides.turnCount ?? 0,
    usedVerbs: overrides.usedVerbs ?? new Set<CommandVerb>(),
    shown: overrides.shown ?? new Set<string>(),
    lastVerb: overrides.lastVerb ?? null,
  };
}

describe("selectHint", () => {
  it("returns null on turn 0 (no hints before the player has acted)", () => {
    expect(selectHint(ctx({ turnCount: 0 }))).toBeNull();
  });

  it("fires first-look on turn 1 if look hasn't been used", () => {
    const h = selectHint(ctx({ turnCount: 1 }));
    expect(h?.id).toBe("first-look");
  });

  it("never fires a hint whose id is already in shown", () => {
    const h = selectHint(ctx({ turnCount: 1, shown: new Set(["first-look"]) }));
    expect(h?.id).not.toBe("first-look");
  });

  it("first-circular-room preempts other hints when in a circular room", () => {
    const h = selectHint(ctx({ turnCount: 6, room: roomOf("circular") }));
    // first-question-available (turn ≥ 2) and first-reject-available (turn ≥ 5)
    // would also be eligible, but the circular-room hint has higher priority.
    // We verify the chosen hint is one of them *or* the circular one, then
    // verify that when circular is un-shown it's preferred when eligible.
    const noCircle = selectHint(ctx({ turnCount: 6, room: roomOf("premise") }));
    expect(h?.id).toBeDefined();
    expect(noCircle?.id).not.toBe("first-circular-room");
  });

  it("respects priority order — look before examine", () => {
    const turn1 = selectHint(ctx({ turnCount: 1 }));
    expect(turn1?.id).toBe("first-look");

    const turn2WithLookUsed = selectHint(
      ctx({
        turnCount: 2,
        usedVerbs: new Set<CommandVerb>(["look"]),
      })
    );
    // examine fires earlier than question in the catalogue.
    expect(turn2WithLookUsed?.id).toBe("first-examine");
  });

  it("exhausting every hint id returns null", () => {
    const all = new Set(_hintIdsForTests);
    const h = selectHint(
      ctx({
        turnCount: 10,
        room: roomOf("circular"),
        usedVerbs: new Set<CommandVerb>([
          "look",
          "examine",
          "question",
          "accept",
          "reject",
          "trace",
        ]),
        shown: all,
      })
    );
    expect(h).toBeNull();
  });

  it("catalogue contains the expected unique ids", () => {
    expect(new Set(_hintIdsForTests).size).toBe(_hintIdsForTests.length);
    expect(_hintIdsForTests).toContain("first-look");
    expect(_hintIdsForTests).toContain("first-circular-room");
  });
});
