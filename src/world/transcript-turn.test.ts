import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import {
  appendOutput,
  beginTurn,
  currentTurnId,
  readTranscript,
  readTranscriptByTurn,
} from "./index";

/**
 * T47 — TurnMark trait + by-turn projection.
 *
 * The UI's past/present/future split (docs/UX.md) treats each logical beat
 * of play — one player input and everything it produced — as a single unit.
 * These tests guarantee that `beginTurn` / `appendOutput` / `readTranscriptByTurn`
 * cooperate to produce exactly that grouping, even when system lines are
 * emitted before the first input.
 */

describe("readTranscriptByTurn", () => {
  it("groups pre-input system lines under turn 0", () => {
    const world = createWorld();
    appendOutput(world, "title", "Opening Room");
    appendOutput(world, "narration", "The argument begins somewhere.");

    const turns = readTranscriptByTurn(world);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.turnId).toBe(0);
    expect(turns[0]?.entries).toHaveLength(2);
  });

  it("advances the turn id on each beginTurn", () => {
    const world = createWorld();
    expect(currentTurnId(world)).toBe(0);
    beginTurn(world);
    expect(currentTurnId(world)).toBe(1);
    beginTurn(world);
    expect(currentTurnId(world)).toBe(2);
  });

  it("stamps every line emitted after beginTurn with that turn's id", () => {
    const world = createWorld();
    appendOutput(world, "narration", "before input (turn 0)");

    beginTurn(world);
    appendOutput(world, "echo", "> north");
    appendOutput(world, "title", "The Rotunda");
    appendOutput(world, "narration", "You are in a rotunda.");

    beginTurn(world);
    appendOutput(world, "echo", "> accept");
    appendOutput(world, "narration", "You accept the step.");

    const turns = readTranscriptByTurn(world);
    expect(turns.map((t) => t.turnId)).toEqual([0, 1, 2]);
    expect(turns[0]?.entries.map((e) => e.text)).toEqual(["before input (turn 0)"]);
    expect(turns[1]?.entries).toHaveLength(3);
    expect(turns[2]?.entries).toHaveLength(2);
  });

  it("preserves ordinal order within a turn", () => {
    const world = createWorld();
    beginTurn(world);
    appendOutput(world, "echo", "first");
    appendOutput(world, "narration", "second");
    appendOutput(world, "spacer", "");

    const turns = readTranscriptByTurn(world);
    const ordinals = turns[0]?.entries.map((e) => e.ordinal) ?? [];
    expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
  });

  it("readTranscript exposes turnId on every entry", () => {
    const world = createWorld();
    appendOutput(world, "narration", "system");
    beginTurn(world);
    appendOutput(world, "echo", "input");

    const entries = readTranscript(world);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.turnId).toBe(0);
    expect(entries[1]?.turnId).toBe(1);
  });
});
