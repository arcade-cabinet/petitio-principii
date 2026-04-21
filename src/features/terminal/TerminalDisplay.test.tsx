import type { Move } from "@/components/ui/railroad-clock";
import type { GameState, TranscriptEntry } from "@/engine";
import type { WorldHandle } from "@/hooks/use-world";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TerminalDisplay } from "./TerminalDisplay";

/**
 * Mock window.matchMedia for the portrait/landscape tests. Vitest browser
 * mode runs in real Chromium so matchMedia exists, but we need to control
 * its result to test both viewport classes deterministically.
 */
function mockMatchMedia(matches: boolean) {
  const original = window.matchMedia;
  const mql = {
    matches,
    media: "(max-width: 640px)",
    onchange: null as ((e: MediaQueryListEvent) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn().mockImplementation(() => mql) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

/**
 * T55 / T102 — TerminalDisplay clock layout tests.
 *
 * Verifies the UI layer correctly splits state.transcript into PAST and
 * PRESENT zones, and that the RailroadClock is rendered with the correct
 * slots. Adapted from the prior PanelDeck test suite to match the new
 * clock-centric TerminalDisplay (T102).
 *
 * Key changes from the keycap-based version:
 *   - No `data-variant="verb"` buttons (KeyCap is retired).
 *   - Clock slots are SVG `role="button"` elements with aria-labels.
 *   - All 11 slots always rendered (no contextual hiding).
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

function mockState(transcript: TranscriptEntry[], overrides: Partial<GameState> = {}): GameState {
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
    activeHint: null,
    ...overrides,
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

function renderDisplay(state: GameState, world = mockWorld(), onMove: (m: Move) => void = vi.fn()) {
  render(
    <TerminalDisplay
      state={state}
      world={world}
      onMove={onMove}
      onNewGame={vi.fn()}
      onHintDismiss={vi.fn()}
    />
  );
}

describe("TerminalDisplay (T102 clock layout)", () => {
  it("on a fresh game (turn 0 only), renders no past entries and the present has the opening", () => {
    const transcript = [
      entry({ kind: "title", text: "The Rotunda", turnId: 0 }),
      entry({ kind: "narration", text: "A rotunda with seven entrances.", turnId: 0 }),
    ];
    renderDisplay(mockState(transcript));
    expect(screen.queryByTestId("past-zone")).toBeNull();
    const present = screen.getByTestId("present-zone");
    expect(present).toHaveTextContent("A rotunda with seven entrances.");
  });

  it("on a multi-turn game, splits past (all turns except last) from present (last turn)", async () => {
    const transcript = [
      entry({ kind: "title", text: "The Rotunda", turnId: 0 }),
      entry({ kind: "narration", text: "A rotunda.", turnId: 0 }),
      entry({ kind: "echo", text: "> north", turnId: 1 }),
      entry({ kind: "title", text: "The Balcony", turnId: 1 }),
      entry({ kind: "narration", text: "You stand on the balcony.", turnId: 1 }),
      entry({ kind: "echo", text: "> accept", turnId: 2 }),
      entry({ kind: "narration", text: "You accept the step.", turnId: 2 }),
    ];

    const user = userEvent.setup();
    renderDisplay(mockState(transcript));

    // Click the past toggle to expand.
    await user.click(screen.getByTestId("past-zone-toggle"));

    // Past should have 2 entries (turn 0 + turn 1); present is turn 2.
    const pastEntries = screen.getAllByTestId("past-entry");
    expect(pastEntries).toHaveLength(2);

    const present = screen.getByTestId("present-zone");
    expect(present).toHaveTextContent("> accept");
    expect(present).toHaveTextContent("You accept the step.");
    // The previous turn's description should NOT be in the present zone.
    expect(present).not.toHaveTextContent("You stand on the balcony.");
  });

  it("renders all 11 clock slots always visible", () => {
    const transcript = [
      entry({ kind: "title", text: "Opening", turnId: 0 }),
      entry({ kind: "narration", text: "Start.", turnId: 0 }),
    ];
    renderDisplay(mockState(transcript));

    // All 11 interactive slots must be present (4 directions + 7 actions).
    const slotButtons = document.querySelectorAll('[role="button"][data-slot-id]');
    expect(slotButtons).toHaveLength(11);
  });

  it("clock slot tap fires onMove with tap+slot", async () => {
    const transcript = [
      entry({ kind: "title", text: "Opening", turnId: 0 }),
      entry({ kind: "narration", text: "Start.", turnId: 0 }),
    ];
    const onMove = vi.fn();
    const user = userEvent.setup();
    renderDisplay(mockState(transcript), mockWorld(), onMove);

    // Click the LOOK slot.
    const lookSlot = screen.getByRole("button", { name: /Look/i });
    await user.click(lookSlot);

    expect(onMove).toHaveBeenCalledWith({ kind: "tap", slot: "LOOK" });
  });

  it("direction slots disabled when direction is not available", () => {
    const transcript = [entry({ kind: "narration", text: "You are here.", turnId: 0 })];
    renderDisplay(mockState(transcript));

    // mockRoom only has a north exit → UP should be enabled; others disabled.
    const upSlot = screen.getByRole("button", { name: /Up/i });
    expect(upSlot).toHaveAttribute("aria-disabled", "false");

    const downSlot = screen.getByRole("button", { name: /Down/i });
    expect(downSlot).toHaveAttribute("aria-disabled", "true");
  });

  // ─────────────────────────────────────────────────────────────────────
  // PAST drawer toggle
  // ─────────────────────────────────────────────────────────────────────

  describe("PAST drawer behavior", () => {
    let restore: (() => void) | null = null;

    afterEach(() => {
      if (restore) {
        restore();
        restore = null;
      }
    });

    function multiTurnTranscript() {
      return [
        entry({ kind: "title", text: "The Rotunda", turnId: 0 }),
        entry({ kind: "narration", text: "A rotunda.", turnId: 0 }),
        entry({ kind: "echo", text: "> north", turnId: 1 }),
        entry({ kind: "title", text: "The Balcony", turnId: 1 }),
        entry({ kind: "narration", text: "You stand on the balcony.", turnId: 1 }),
        entry({ kind: "echo", text: "> accept", turnId: 2 }),
        entry({ kind: "narration", text: "You accept the step.", turnId: 2 }),
      ];
    }

    it("PAST collapsed by default; toggle button rendered", () => {
      restore = mockMatchMedia(true);
      renderDisplay(mockState(multiTurnTranscript()));

      const toggle = screen.getByTestId("past-zone-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveTextContent(/earlier — 2 turns/i);
      expect(screen.queryByTestId("past-zone")).toBeNull();
    });

    it("clicking the toggle expands the drawer", async () => {
      restore = mockMatchMedia(true);
      const user = userEvent.setup();
      renderDisplay(mockState(multiTurnTranscript()));

      await user.click(screen.getByTestId("past-zone-toggle"));

      const past = screen.getByTestId("past-zone");
      expect(past).toBeInTheDocument();
      expect(screen.getAllByTestId("past-entry")).toHaveLength(2);
      expect(screen.getByTestId("past-zone-toggle")).toHaveAttribute("aria-expanded", "true");
    });

    it("singular vs plural in the toggle label (1 turn vs N turns)", () => {
      restore = mockMatchMedia(true);

      const oneTurnPast = [
        entry({ kind: "title", text: "Open", turnId: 0 }),
        entry({ kind: "echo", text: "> north", turnId: 1 }),
        entry({ kind: "narration", text: "You moved.", turnId: 1 }),
      ];

      renderDisplay(mockState(oneTurnPast));
      expect(screen.getByTestId("past-zone-toggle")).toHaveTextContent(/1 turn$/);
    });
  });
});
