import type { CompassHeading } from "@/components/ui/compass-rose";
import { KeyCap } from "@/components/ui/keycap";
import type { CommandVerb, GameState, TranscriptEntry } from "@/engine";
import { parseCommand } from "@/engine";
import { HeadingPanel } from "@/features/terminal/HeadingPanel";
import { MapPanel } from "@/features/terminal/MapPanel";
import { type DeckPanel, PanelDeck } from "@/features/terminal/PanelDeck";
import { PresentPanel } from "@/features/terminal/PresentPanel";
import { compactTurns } from "@/features/terminal/compactTurn";
import { computeKeycapLayout } from "@/features/terminal/keycapLayout";
import { computeKeycapSurface } from "@/features/terminal/keycapSurface";
import { useViewport } from "@/hooks/use-viewport";
import type { WorldHandle } from "@/hooks/use-world";
import { isCircleClosed } from "@/world";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  MoveDiagonal,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * TerminalDisplay — the in-game view.
 *
 * Three zones (docs/UX.md):
 *   1. PAST      — compacted turn summaries (scrollable).
 *   2. PRESENT   — current room title + latest description + latest
 *                  agent response. Always centered on the current turn.
 *   3. FUTURE    — rhetorical verbs + direction keycaps.
 *
 * The koota world is the source of truth; state.transcript is a plain-data
 * shadow already grouped by turnId (TranscriptEntry.turnId, added in T47).
 * We project it client-side into past/present every render — cheap, and
 * keeps determinism intact.
 */
export interface TerminalDisplayProps {
  state: GameState;
  world: WorldHandle;
  onCommand: (raw: string) => void;
  onNewGame: () => void;
  /** Clear the active onboarding hint (tap-dismiss + auto-fade). */
  onHintDismiss: () => void;
}

// The game is click/tap-only (mobile-first, no keyboard). Keycap labels
// stand on their own; there are no keyboard shortcuts to display.
const RHETORICAL_VERBS: ReadonlyArray<{ label: string; verb: string }> = [
  { label: "Look", verb: "look" },
  { label: "Examine", verb: "examine" },
  { label: "Question", verb: "question" },
  { label: "Ask Why", verb: "ask why" },
  { label: "Accept", verb: "accept" },
  { label: "Reject", verb: "reject" },
  { label: "Trace Back", verb: "trace back" },
];

/**
 * Group transcript entries by turnId. This is the UI-side mirror of
 * src/world/readTranscriptByTurn — we do it here too because the
 * TranscriptEntry[] already carries turnId per T47, and re-reading koota
 * would cost another query and subscription.
 */
function groupByTurn(
  transcript: TranscriptEntry[]
): { turnId: number; entries: TranscriptEntry[] }[] {
  const turns: { turnId: number; entries: TranscriptEntry[] }[] = [];
  let current: { turnId: number; entries: TranscriptEntry[] } | null = null;
  for (const entry of transcript) {
    if (!current || current.turnId !== entry.turnId) {
      current = { turnId: entry.turnId, entries: [] };
      turns.push(current);
    }
    current.entries.push(entry);
  }
  return turns;
}

export function TerminalDisplay({
  state,
  world,
  onCommand,
  onNewGame,
  onHintDismiss,
}: TerminalDisplayProps) {
  const pastRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();
  // PAST zone collapses on portrait by default; landscape always expanded.
  // Per-viewport user override stored in a Map so a portrait→landscape
  // rotation doesn't strand the user with a closed drawer they explicitly
  // opened on the prior viewport. CodeRabbit caught a stale-frame edge
  // case in the prior version (state + effect → first frame after viewport
  // change rendered with the old default).
  const [overrides, setOverrides] = useState<{ portrait?: boolean; landscape?: boolean }>({});
  const pastExpanded = overrides[viewport] ?? viewport === "landscape";
  const setPastExpanded = (next: boolean | ((prev: boolean) => boolean)) =>
    setOverrides((prev) => {
      const current = prev[viewport] ?? viewport === "landscape";
      const value = typeof next === "function" ? next(current) : next;
      return { ...prev, [viewport]: value };
    });

  const currentRoom = useMemo(
    () => state.rooms.get(state.currentRoomId),
    [state.rooms, state.currentRoomId]
  );

  // Used verbs derived from the transcript's echo lines — matches the
  // reducer's hint system so keycap emphasis stays in lockstep with the
  // progressive onboarding logic.
  const usedVerbs = useMemo(() => {
    const set = new Set<CommandVerb>();
    for (const entry of state.transcript) {
      if (entry.kind !== "echo") continue;
      const raw = entry.text.replace(/^>\s*/, "").trim().toLowerCase();
      set.add(parseCommand(raw).verb);
    }
    return set;
  }, [state.transcript]);

  // Last cardinal heading the player committed to — drives the compass
  // rose's rotation in the PRESENT underlay. Purely derived from the
  // transcript; null until the player moves.
  const lastCardinalHeading = useMemo<CompassHeading>(() => {
    const CARDINALS = new Set(["north", "south", "east", "west"]);
    for (let i = state.transcript.length - 1; i >= 0; i--) {
      const entry = state.transcript[i];
      if (entry.kind !== "echo") continue;
      const raw = entry.text.replace(/^>\s*/, "").trim().toLowerCase();
      if (CARDINALS.has(raw)) return raw as CompassHeading;
    }
    return null;
  }, [state.transcript]);

  // Exits already traversed from this room (via movement-verb echoes in
  // the current room). Used to draw the faint trail-glow on direction
  // keycaps — the UX half of the argument map's geometry.
  const traversedDirections = useMemo(() => {
    const set = new Set<string>();
    const DIRS = new Set(["north", "south", "east", "west", "up", "down", "back", "forward"]);
    for (const entry of state.transcript) {
      if (entry.kind !== "echo") continue;
      const raw = entry.text.replace(/^>\s*/, "").trim().toLowerCase();
      if (DIRS.has(raw)) set.add(raw);
    }
    return set;
  }, [state.transcript]);

  // Keycap layout — emphasis per rhetorical verb + per-direction state.
  // Re-derives on every render because koota mutations aren't React-tracked;
  // the cost is trivial (pure function, maybe-20 branches).
  const layout = useMemo(() => {
    if (!currentRoom) return null;
    const w = world.getWorld();
    const circleClosed = w ? isCircleClosed(w) : false;
    return computeKeycapLayout(
      { room: currentRoom, turnCount: state.turnCount, usedVerbs, circleClosed },
      traversedDirections
    );
  }, [currentRoom, state.turnCount, usedVerbs, traversedDirections, world]);

  // Contextual keycap surfacing — pure state → visible-set projection.
  // The *what shows* logic lives in keycapSurface.ts so this component
  // stays presentational. Re-derived per render; the function is cheap.
  const surface = useMemo(
    () =>
      computeKeycapSurface({
        rooms: state.rooms,
        currentRoom,
        turnCount: state.turnCount,
        usedVerbs,
        layout,
      }),
    [state.rooms, currentRoom, state.turnCount, usedVerbs, layout]
  );

  const turns = useMemo(() => groupByTurn(state.transcript), [state.transcript]);
  const past = turns.slice(0, -1);
  const present = turns.at(-1);
  const compactedPast = useMemo(() => compactTurns(past), [past]);

  // Auto-scroll the PAST rail to the bottom so the most recent compacted
  // summary is flush against the PRESENT on every new turn — and on every
  // expand of the drawer in portrait (the ref wasn't mounted before; the
  // pastLength-only dep used to skip this case).
  const pastLength = compactedPast.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: pastLength + pastExpanded drive the scroll
  useEffect(() => {
    if (pastRef.current) pastRef.current.scrollTop = pastRef.current.scrollHeight;
  }, [pastLength, pastExpanded]);

  // Room-visit tally from the world. The HeadingPanel shows this next to
  // the compass rose; it's the count the old "Argument map: N visited"
  // strip used to own, now promoted to a proper HUD readout.
  // biome-ignore lint/correctness/useExhaustiveDependencies: koota mutations drive updates through transcript length
  const visitedCount = useMemo(() => {
    const history = world.readVisitHistory();
    return new Set(history.map((h) => h.roomId)).size;
  }, [world, state.transcript.length]);

  // The PanelDeck rows: on landscape, all three panels sit side-by-side
  // across the chassis; on narrow portrait the deck becomes scroll-snap
  // pages the player swipes between. Widths via flex weight — PRESENT
  // gets the lion's share (2x), flanked by HEADING + MAP.
  const deckPanels: DeckPanel[] = [
    {
      id: "heading",
      label: "Heading",
      weight: 1,
      content: <HeadingPanel heading={lastCardinalHeading} visitedCount={visitedCount} />,
    },
    {
      id: "present",
      label: "Present",
      weight: 2,
      content: (
        <PresentPanel
          currentRoom={currentRoom}
          present={present}
          activeHint={state.activeHint}
          onHintDismiss={onHintDismiss}
        />
      ),
    },
    {
      id: "map",
      label: "Argument map",
      weight: 1,
      content: <MapPanel state={state} world={world} />,
    },
  ];

  return (
    <div className="relative z-10 flex h-full w-full flex-col gap-4 p-4 md:p-6">
      {/* Chassis-level header: brand + new-game action. Sits OUTSIDE the
          panel deck so the display surface is pure game content. */}
      <div className="flex flex-shrink-0 items-baseline justify-between px-1">
        <span className="font-[family-name:var(--font-display)] text-[0.9rem] tracking-[0.22em] text-[var(--color-dim)] uppercase">
          Petitio Principii
        </span>
        <button
          type="button"
          onClick={onNewGame}
          className="font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.18em] text-[var(--color-muted)] uppercase hover:text-[var(--color-violet)]"
        >
          New Game
        </button>
      </div>

      {/* PAST rail on landscape sits above the deck; on portrait it's a
          collapsible strip. Keeping it outside the panel deck so it
          remains a persistent rail that works across pane swipes. */}
      {compactedPast.length > 0 && (
        <>
          {viewport === "portrait" && (
            <button
              type="button"
              onClick={() => setPastExpanded((v) => !v)}
              className="flex-shrink-0 px-1 py-2 text-left font-[family-name:var(--font-display)] text-[0.85rem] text-[var(--color-muted)] hover:text-[var(--color-highlight)]"
              aria-expanded={pastExpanded}
              aria-controls="past-zone-list"
              data-testid="past-zone-toggle"
            >
              {pastExpanded ? "▾" : "▸"} earlier — {compactedPast.length}{" "}
              {compactedPast.length === 1 ? "turn" : "turns"}
            </button>
          )}
          {pastExpanded && (
            <div
              id="past-zone-list"
              ref={pastRef}
              className="max-h-[18%] overflow-y-auto overflow-x-hidden px-2 py-2 font-[family-name:var(--font-display)] text-[0.85rem] leading-[1.3] text-[var(--color-dim)] [scrollbar-color:var(--color-panel-edge)_transparent] [scrollbar-width:thin]"
              aria-label="Turn history"
              data-testid="past-zone"
            >
              {compactedPast.map((c) => (
                <div
                  key={c.turnId}
                  className="truncate"
                  title={c.full}
                  data-testid="past-entry"
                  data-turn-id={c.turnId}
                >
                  <span className="inline-block w-[1.2em] text-[var(--color-muted)]">
                    {c.glyph}
                  </span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* The deck itself — three bezel-framed panels. */}
      <div className="min-h-0 flex-1">
        <PanelDeck panels={deckPanels} defaultPanelId="present" />
      </div>

      {/* FUTURE zone — rhetorical verbs, directions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {RHETORICAL_VERBS.filter((v) => surface.verbs.has(v.verb)).map((v) => (
            <KeyCap
              key={v.verb}
              label={v.label}
              variant="verb"
              emphasis={layout?.rhetorical[emphasisKeyFor(v.verb)] ?? "charged"}
              onPress={() => onCommand(v.verb)}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {DIRECTION_KEYS.filter((d) => {
            const isCardinal =
              d.dir === "north" || d.dir === "south" || d.dir === "east" || d.dir === "west";
            if (isCardinal) return surface.cardinals.has(d.dir);
            return surface.nonCardinals.has(d.dir);
          }).map((d) => {
            const dirState = layout?.directions[d.dir];
            return (
              <KeyCap
                key={d.dir}
                label={d.label}
                icon={d.icon}
                variant="direction"
                disabled={!dirState?.available}
                traversed={dirState?.alreadyTraversed ?? false}
                onPress={() => onCommand(d.dir)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Map a RHETORICAL_VERBS[].verb (space-and-lowercase) to its emphasis key
 * in computeKeycapLayout's RhetoricalEmphasis shape.
 */
function emphasisKeyFor(
  verb: string
): "look" | "examine" | "question" | "askWhy" | "accept" | "reject" | "traceBack" {
  switch (verb) {
    case "ask why":
      return "askWhy";
    case "trace back":
      return "traceBack";
    default:
      return verb as "look" | "examine" | "question" | "accept" | "reject";
  }
}

const DIRECTION_KEYS: ReadonlyArray<{ dir: string; label: string; icon: React.ReactElement }> = [
  { dir: "north", label: "N", icon: <ArrowUp size={18} aria-hidden /> },
  { dir: "south", label: "S", icon: <ArrowDown size={18} aria-hidden /> },
  { dir: "east", label: "E", icon: <ArrowRight size={18} aria-hidden /> },
  { dir: "west", label: "W", icon: <ArrowLeft size={18} aria-hidden /> },
  { dir: "up", label: "Up", icon: <ChevronUp size={18} aria-hidden /> },
  { dir: "down", label: "Down", icon: <ChevronDown size={18} aria-hidden /> },
  { dir: "back", label: "Back", icon: <RotateCcw size={18} aria-hidden /> },
  { dir: "forward", label: "Fwd", icon: <MoveDiagonal size={18} aria-hidden /> },
];
