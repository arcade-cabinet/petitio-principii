import type { ActionSlotId, DirectionSlotId, Move, SlotId } from "@/components/ui/railroad-clock";
import { RailroadClock } from "@/components/ui/railroad-clock";
import type { GameState, TranscriptEntry } from "@/engine";
import { parseCommand } from "@/engine";
import type { WorldHandle } from "@/hooks/use-world";
import { isCircleClosed } from "@/world";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HintLine } from "./HintLine";
import { HudMenu } from "./HudMenu";
import { compactTurns } from "./compactTurn";

/**
 * TerminalDisplay — the in-game view (T102 rewrite).
 *
 * New layout: CrystalField backdrop (in App.tsx) + this component:
 *   1. PAST rail   — collapsible compacted turn history at the top.
 *   2. READING     — compact panel: room title + prose + hint.
 *   3. CLOCK       — RailroadClock at bottom (tap / chord input).
 *   4. HudMenu     — slide-out drawer (seed, phrase, argument map, new game).
 *
 * PanelDeck / HeadingPanel / MapPanel / PresentPanel / CompassRose /
 * GlowCard in-game wrappers / keycapSurface are all retired.
 * ALL slots always visible — shading communicates availability.
 */
export interface TerminalDisplayProps {
  state: GameState;
  world: WorldHandle;
  /** @deprecated Clock tap/chord input via onMove supersedes raw command strings. Kept for test compat. */
  onCommand?: (raw: string) => void;
  onMove: (move: Move) => void;
  onNewGame: () => void;
  onHintDismiss: () => void;
}

// ── Slot availability helpers ────────────────────────────────────────────────

/** Map engine Direction strings to clock DirectionSlotId. */
const DIRECTION_TO_SLOT: Record<string, DirectionSlotId> = {
  north: "UP",
  south: "DOWN",
  east: "RIGHT",
  west: "LEFT",
};

/** Map engine CommandVerb strings to clock ActionSlotId. */
const VERB_TO_SLOT: Record<string, ActionSlotId> = {
  look: "LOOK",
  examine: "EXAMINE",
  question: "QUESTION",
  ask: "ASK_WHY",
  "ask why": "ASK_WHY",
  accept: "ACCEPT",
  reject: "REJECT",
  trace: "TRACE_BACK",
  "trace back": "TRACE_BACK",
};

/** Map a clock SlotId back to the command string it triggers. */
const SLOT_TO_COMMAND: Record<SlotId, string> = {
  UP: "north",
  RIGHT: "east",
  DOWN: "south",
  LEFT: "west",
  LOOK: "look",
  EXAMINE: "examine",
  QUESTION: "question",
  ASK_WHY: "ask why",
  ACCEPT: "accept",
  REJECT: "reject",
  TRACE_BACK: "trace back",
};
void SLOT_TO_COMMAND; // referenced in onMove dispatch below

// ── groupByTurn ──────────────────────────────────────────────────────────────

function groupByTurn(transcript: TranscriptEntry[]) {
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

// ── TerminalDisplay ──────────────────────────────────────────────────────────

export function TerminalDisplay({
  state,
  world,
  onMove,
  onNewGame,
  onHintDismiss,
}: TerminalDisplayProps) {
  const pastRef = useRef<HTMLDivElement>(null);
  const [pastExpanded, setPastExpanded] = useState(false);

  const currentRoom = useMemo(
    () => state.rooms.get(state.currentRoomId),
    [state.rooms, state.currentRoomId]
  );

  // Derive available direction slots from current room exits.
  const availableDirections = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!currentRoom) return set;
    for (const exit of currentRoom.exits) {
      const slotId = DIRECTION_TO_SLOT[exit.direction];
      if (slotId) set.add(slotId);
    }
    return set;
  }, [currentRoom]);

  // Derive available action slots — all rhetorical actions are always
  // available (all slots visible + enabled), matching the "no contextual
  // hiding" design of T97/T102.
  const availableActions = useMemo<Set<string>>(() => {
    return new Set(["LOOK", "EXAMINE", "QUESTION", "ASK_WHY", "ACCEPT", "REJECT", "TRACE_BACK"]);
  }, []);

  // Last committed slot — drives the spade hand.
  const lastSlot = useMemo<SlotId | null>(() => {
    for (let i = state.transcript.length - 1; i >= 0; i--) {
      const entry = state.transcript[i];
      if (entry.kind !== "echo") continue;
      const raw = entry.text.replace(/^>\s*/, "").trim().toLowerCase();
      // Try direction first
      for (const [dir, slotId] of Object.entries(DIRECTION_TO_SLOT)) {
        if (raw === dir) return slotId;
      }
      // Then verb
      const parsed = parseCommand(raw);
      const slotId = VERB_TO_SLOT[parsed.verb] ?? VERB_TO_SLOT[raw];
      if (slotId) return slotId;
    }
    return null;
  }, [state.transcript]);

  // Past/present split.
  const turns = useMemo(() => groupByTurn(state.transcript), [state.transcript]);
  const past = turns.slice(0, -1);
  const present = turns.at(-1);
  const compactedPast = useMemo(() => compactTurns(past), [past]);

  // Auto-scroll past rail.
  const pastLength = compactedPast.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: pastLength + pastExpanded drive the scroll
  useEffect(() => {
    if (pastRef.current) pastRef.current.scrollTop = pastRef.current.scrollHeight;
  }, [pastLength, pastExpanded]);

  // Circle-closed state for visual flag.
  // biome-ignore lint/correctness/useExhaustiveDependencies: koota mutations aren't React-tracked; transcript length is a reliable proxy trigger.
  const circleClosed = useMemo(() => {
    const w = world.getWorld();
    return w ? isCircleClosed(w) : false;
  }, [world, state.transcript.length]);

  return (
    <div className="relative z-10 flex h-full w-full flex-col gap-2 p-4 pb-3">
      {/* ── PAST rail ── */}
      {compactedPast.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setPastExpanded((v) => !v)}
            className="flex-shrink-0 px-1 py-1 text-left font-[family-name:var(--font-display)] text-[0.8rem] text-[var(--color-muted)] hover:text-[var(--color-highlight)]"
            aria-expanded={pastExpanded}
            aria-controls="past-zone-list"
            data-testid="past-zone-toggle"
          >
            {pastExpanded ? "▾" : "▸"} earlier — {compactedPast.length}{" "}
            {compactedPast.length === 1 ? "turn" : "turns"}
          </button>
          {pastExpanded && (
            <div
              id="past-zone-list"
              ref={pastRef}
              className="max-h-[16%] overflow-y-auto overflow-x-hidden px-2 py-1 font-[family-name:var(--font-display)] text-[0.8rem] leading-[1.3] text-[var(--color-dim)] [scrollbar-color:var(--color-panel-edge)_transparent] [scrollbar-width:thin]"
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

      {/* ── READING panel ── */}
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/55 px-5 py-4 backdrop-blur-sm"
        aria-live="polite"
        aria-atomic="true"
        data-testid="present-zone"
      >
        {/* Top-right HUD menu trigger */}
        <div className="absolute right-3 top-3 z-20">
          <HudMenu state={state} world={world} onNewGame={onNewGame} />
        </div>

        {/* Circle-closed badge */}
        {circleClosed && (
          <div
            className="mb-2 inline-block rounded-full px-3 py-0.5 font-[family-name:var(--font-display)] text-[0.7rem] tracking-[0.22em] uppercase"
            style={{
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.4)",
              color: "#c084fc",
              textShadow: "0 0 4px rgba(168,85,247,0.5)",
            }}
          >
            Circle closed
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentRoom && (
            <motion.div
              key={currentRoom.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mb-1 font-[family-name:var(--font-incantation)] text-[clamp(1.2rem,3vw,1.6rem)] leading-tight text-[var(--color-highlight)]"
              style={{
                textShadow: "0 0 6px rgba(255,209,250,0.45), 0 0 14px rgba(122,92,255,0.4)",
              }}
              data-testid="present-room-title"
            >
              {currentRoom.title}
            </motion.div>
          )}
        </AnimatePresence>

        {present && (
          <motion.div
            key={`turn-${present.turnId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 min-h-0 overflow-y-auto font-[family-name:var(--font-display)] text-[clamp(0.9rem,2.2vw,1.1rem)] leading-[1.55] text-[var(--color-silver)] [scrollbar-width:thin] [scrollbar-color:var(--color-panel-edge)_transparent]"
            style={{ textShadow: "0 0 2px rgba(192,192,255,0.3)" }}
          >
            {present.entries.map((entry) => {
              if (entry.kind === "spacer") {
                return (
                  <div key={entry.id} className="h-[1.55em]">
                    &nbsp;
                  </div>
                );
              }
              if (entry.kind === "echo") {
                return (
                  <div
                    key={entry.id}
                    className="mt-1 text-[var(--color-violet)]"
                    style={{ textShadow: "0 0 4px rgba(122,92,255,0.5)" }}
                  >
                    {entry.text}
                  </div>
                );
              }
              if (entry.kind === "title") {
                // Room title already rendered above; suppress duplicate.
                return null;
              }
              return (
                <div key={entry.id} className="whitespace-pre-wrap break-words">
                  {entry.text}
                </div>
              );
            })}
          </motion.div>
        )}

        <HintLine hint={state.activeHint} onDismiss={onHintDismiss} />
      </div>

      {/* ── CLOCK ── primary input surface; commands the viewport */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <div
          className="mx-auto w-full"
          style={{
            // Desktop: min(60vh, 600px). Mobile: fills width (≤ viewport).
            maxWidth: "min(60vh, 600px)",
          }}
        >
          <RailroadClock
            availableDirections={availableDirections}
            availableActions={availableActions}
            lastSlot={lastSlot}
            onCommit={onMove}
            size="100%"
          />
        </div>
      </div>
    </div>
  );
}
