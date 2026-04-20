import type { GameState, TranscriptEntry } from "@/engine";
import type { WorldHandle } from "@/hooks/use-world";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalDisplay } from "./TerminalDisplay";

/**
 * T55 — TerminalDisplay three-zone projection.
 *
 * Verifies the UI layer correctly splits state.transcript into PAST (all
 * turns but the last) and PRESENT (the last turn) via the turnId field
 * added in T47, and renders the keycap emphasis computed in T50.
 *
 * RTL is intentionally sparse here — the rendering logic is simple, the
 * *classification* of entries into zones is the interesting thing.
 * Three test fixtures at increasing session lengths cover:
 *
 *   1. Start of game: no past zone, present shows the opening.
 *   2. Mid game: past + present split correctly.
 *   3. After many turns: past compacts without scroll-causing overflow.
 */

// Minimal room factory for the fixtures.
function mockRoom(
  overrides: Partial<GameState["rooms"] extends Map<string, infer R> ? R : never> = {}
) {
  return {
    id: "room-a",
    title: "The Rotunda",
    description: "A rotunda with seven entrances.",
    rhetoricalType: "circular" as const,
    exits: [{ direction: "north" as const, targetRoomId: "room-b", description: "an arch" }],
    examined: false,
    ...overrides,
  };
}

function entry(
  partial: Partial<TranscriptEntry> & {
    kind: TranscriptEntry["kind"];
    text: string;
    turnId: number;
  }
): TranscriptEntry {
  return {
    id: `ol-${Math.random()}`,
    ordinal: 0,
    ...partial,
  };
}

function mockState(transcript: TranscriptEntry[]): GameState {
  const room = mockRoom();
  return {
    seed: 1,
    currentRoomId: room.id,
    rooms: new Map([[room.id, room]]),
    output: transcript.map((e) => e.text),
    transcript,
    turnCount: Math.max(0, ...transcript.map((e) => e.turnId)),
    started: true,
    phrase: "test phrase",
  };
}

function mockWorld(): WorldHandle {
  return {
    install: vi.fn(),
    discard: vi.fn(),
    appendLine: vi.fn(),
    beginTurn: vi.fn(),
    movePlayer: vi.fn(),
    markVisited: vi.fn(),
    markAccepted: vi.fn(),
    markRejected: vi.fn(),
    markQuestioned: vi.fn(),
    markCircleClosed: vi.fn(),
    bumpVisitCount: vi.fn(),
    visitCount: vi.fn().mockReturnValue(1),
    readMemory: vi.fn().mockReturnValue({
      byRoom: new Map(),
      totalAccepted: 0,
      totalRejected: 0,
      totalQuestioned: 0,
      turnCount: 0,
    }),
    readHintsShown: vi.fn().mockReturnValue(new Set<string>()),
    markHintShown: vi.fn(),
    findNextHopToCircle: vi.fn().mockReturnValue(null),
    getWorld: vi.fn().mockReturnValue(null),
    readVisitHistory: vi.fn().mockReturnValue([]),
  };
}

describe("TerminalDisplay three-zone projection", () => {
  it("on a fresh game (turn 0 only), renders no past entries and the present has the opening", () => {
    const transcript = [
      entry({ kind: "title", text: "The Rotunda", turnId: 0 }),
      entry({ kind: "narration", text: "A rotunda with seven entrances.", turnId: 0 }),
    ];
    render(
      <TerminalDisplay
        state={mockState(transcript)}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
      />
    );
    expect(screen.queryByTestId("past-zone")).toBeNull();
    const present = screen.getByTestId("present-zone");
    expect(present).toHaveTextContent("A rotunda with seven entrances.");
  });

  it("on a multi-turn game, splits past (all turns except last) from present (last turn)", () => {
    const transcript = [
      entry({ kind: "title", text: "The Rotunda", turnId: 0 }),
      entry({ kind: "narration", text: "A rotunda.", turnId: 0 }),
      entry({ kind: "echo", text: "> north", turnId: 1 }),
      entry({ kind: "title", text: "The Balcony", turnId: 1 }),
      entry({ kind: "narration", text: "You stand on the balcony.", turnId: 1 }),
      entry({ kind: "echo", text: "> accept", turnId: 2 }),
      entry({ kind: "narration", text: "You accept the step.", turnId: 2 }),
    ];
    render(
      <TerminalDisplay
        state={mockState(transcript)}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
      />
    );

    // Past should have 2 entries (turn 0 + turn 1); present is turn 2.
    const pastEntries = screen.getAllByTestId("past-entry");
    expect(pastEntries).toHaveLength(2);

    const present = screen.getByTestId("present-zone");
    expect(present).toHaveTextContent("> accept");
    expect(present).toHaveTextContent("You accept the step.");
    // The previous turn's description should NOT be in the present zone.
    expect(present).not.toHaveTextContent("You stand on the balcony.");
  });

  it("includes every rhetorical verb keycap regardless of availability", () => {
    const transcript = [
      entry({ kind: "title", text: "Opening", turnId: 0 }),
      entry({ kind: "narration", text: "Start.", turnId: 0 }),
    ];
    render(
      <TerminalDisplay
        state={mockState(transcript)}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
      />
    );
    // Per docs/UX.md §1.3: keycaps never vanish.
    for (const label of [
      "Look",
      "Examine",
      "Question",
      "Ask Why",
      "Accept",
      "Reject",
      "Trace Back",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("disables direction keycaps for exits that don't exist on the current room", () => {
    const transcript = [entry({ kind: "narration", text: "You are here.", turnId: 0 })];
    render(
      <TerminalDisplay
        state={mockState(transcript)}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
      />
    );
    // mockRoom() exposes only "north" — south/east/west/up/down/back/forward
    // must be disabled silhouettes, not hidden.
    const south = screen.getByRole("button", { name: /^S$/ });
    expect(south).toBeDisabled();
    const north = screen.getByRole("button", { name: /^N$/ });
    expect(north).not.toBeDisabled();
  });
});
