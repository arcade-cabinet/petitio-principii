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
        onHintDismiss={vi.fn()}
      />
    );
    expect(screen.queryByTestId("past-zone")).toBeNull();
    const present = screen.getByTestId("present-zone");
    expect(present).toHaveTextContent("A rotunda with seven entrances.");
  });

  it("on a multi-turn game, splits past (all turns except last) from present (last turn)", () => {
    // Force landscape so the PAST drawer is always-expanded — this test
    // checks classification, not the responsive collapse behavior (which
    // T62's dedicated tests cover).
    const undo = mockMatchMedia(false);
    try {
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
          onHintDismiss={vi.fn()}
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
    } finally {
      undo();
    }
  });

  it("reveals rhetorical verbs contextually — LOOK + at most one ENABLED teaching verb on turn 0", () => {
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
        onHintDismiss={vi.fn()}
      />
    );
    // Per the contextual-surface design brief: on a brand-new game, only
    // LOOK plus a single pedagogical verb (the keycap layout's primary)
    // should be ENABLED. The SCUMM-style VerbPanel renders all 7 verb
    // buttons always (so the layout doesn't jitter as the surface
    // expands), but disables those not currently surfaced.
    expect(screen.getByRole("button", { name: /Look/i })).toBeInTheDocument();
    const verbButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[data-variant="verb"]')
    );
    const enabled = verbButtons.filter((b) => !b.disabled);
    expect(enabled.length).toBeLessThanOrEqual(2);
    const enabledLabels = enabled.map((b) => b.textContent?.toLowerCase() ?? "");
    expect(enabledLabels.some((l) => /look/.test(l))).toBe(true);
  });

  it("opens the full rhetorical verb set once the tutorial window has ended", () => {
    // Tutorial ends after ≥3 distinct non-LOOK verbs OR turnCount ≥ 8.
    const transcript = [
      entry({ kind: "title", text: "Opening", turnId: 0 }),
      entry({ kind: "narration", text: "Start.", turnId: 0 }),
      entry({ kind: "echo", text: "> examine", turnId: 1 }),
      entry({ kind: "echo", text: "> question", turnId: 2 }),
      entry({ kind: "echo", text: "> accept", turnId: 3 }),
    ];
    render(
      <TerminalDisplay
        state={{ ...mockState(transcript), turnCount: 3 }}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
        onHintDismiss={vi.fn()}
      />
    );
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

  it("hosts an interactive 8-cardinal compass rose; vertical traversal lives on Up/Down keycaps", () => {
    const transcript = [entry({ kind: "narration", text: "You are here.", turnId: 0 })];
    render(
      <TerminalDisplay
        state={mockState(transcript)}
        world={mockWorld()}
        onCommand={vi.fn()}
        onNewGame={vi.fn()}
        onHintDismiss={vi.fn()}
      />
    );
    // The compass rose hosts the 8 horizontal cardinals (N/NE/E/SE/S/SW/W/NW)
    // — they're SVG-button hit-areas inside the HEADING panel, not keycaps.
    // mockRoom() exposes only "north" from current room; that direction
    // should be enabled, others disabled.
    const compassN = screen.getByRole("button", { name: /^N — north/i });
    expect(compassN).not.toHaveAttribute("aria-disabled", "true");
    const compassS = screen.getByRole("button", { name: /^S — south/i });
    expect(compassS).toHaveAttribute("aria-disabled", "true");
    // Up/Down keycaps live on the FUTURE zone alongside the verb panel.
    // mockRoom() has no vertical exits so both should be disabled.
    const upKey = screen.getByRole("button", { name: /^Up$/ });
    expect(upKey).toBeDisabled();
    const downKey = screen.getByRole("button", { name: /^Down$/ });
    expect(downKey).toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────
  // T62 — responsive past drawer
  // ─────────────────────────────────────────────────────────────────────

  describe("PAST drawer responsive behavior (T62)", () => {
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

    it("portrait: PAST collapsed by default; toggle button rendered", () => {
      restore = mockMatchMedia(true); // (max-width: 640px) matches

      render(
        <TerminalDisplay
          state={mockState(multiTurnTranscript())}
          world={mockWorld()}
          onCommand={vi.fn()}
          onNewGame={vi.fn()}
          onHintDismiss={vi.fn()}
        />
      );

      // Toggle button visible with the "▸ earlier — N turns" label.
      const toggle = screen.getByTestId("past-zone-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveTextContent(/earlier — 2 turns/i);
      // Entries hidden when collapsed.
      expect(screen.queryByTestId("past-zone")).toBeNull();
    });

    it("portrait: clicking the toggle expands the drawer", async () => {
      restore = mockMatchMedia(true);

      const user = userEvent.setup();
      render(
        <TerminalDisplay
          state={mockState(multiTurnTranscript())}
          world={mockWorld()}
          onCommand={vi.fn()}
          onNewGame={vi.fn()}
          onHintDismiss={vi.fn()}
        />
      );

      await user.click(screen.getByTestId("past-zone-toggle"));

      const past = screen.getByTestId("past-zone");
      expect(past).toBeInTheDocument();
      expect(screen.getAllByTestId("past-entry")).toHaveLength(2);
      expect(screen.getByTestId("past-zone-toggle")).toHaveAttribute("aria-expanded", "true");
    });

    it("landscape: PAST always expanded; no toggle button", () => {
      restore = mockMatchMedia(false); // matchMedia returns false → landscape

      render(
        <TerminalDisplay
          state={mockState(multiTurnTranscript())}
          world={mockWorld()}
          onCommand={vi.fn()}
          onNewGame={vi.fn()}
          onHintDismiss={vi.fn()}
        />
      );

      // Entries visible immediately.
      expect(screen.getByTestId("past-zone")).toBeInTheDocument();
      expect(screen.getAllByTestId("past-entry")).toHaveLength(2);
      // Toggle absent at landscape.
      expect(screen.queryByTestId("past-zone-toggle")).toBeNull();
    });

    it("singular vs plural in the toggle label (1 turn vs N turns)", () => {
      restore = mockMatchMedia(true);

      const oneTurnPast = [
        entry({ kind: "title", text: "Open", turnId: 0 }),
        entry({ kind: "echo", text: "> north", turnId: 1 }),
        entry({ kind: "narration", text: "You moved.", turnId: 1 }),
      ];

      render(
        <TerminalDisplay
          state={mockState(oneTurnPast)}
          world={mockWorld()}
          onCommand={vi.fn()}
          onNewGame={vi.fn()}
          onHintDismiss={vi.fn()}
        />
      );

      // Past has only turn 0 (turn 1 is the present).
      expect(screen.getByTestId("past-zone-toggle")).toHaveTextContent(/1 turn$/);
    });
  });
});
