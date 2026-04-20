import { GlowingPanel } from "@/components/ui/glowing-panel";
import { KeyCap } from "@/components/ui/keycap";
import type { CommandVerb, GameState, TranscriptEntry } from "@/engine";
import { parseCommand } from "@/engine";
import { ArgumentMapOverlay } from "@/features/terminal/ArgumentMapOverlay";
import { HintLine } from "@/features/terminal/HintLine";
import { compactTurns } from "@/features/terminal/compactTurn";
import { computeKeycapLayout } from "@/features/terminal/keycapLayout";
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
import { AnimatePresence, motion } from "motion/react";
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

const RHETORICAL_VERBS: ReadonlyArray<{ label: string; verb: string; hint?: string }> = [
  { label: "Look", verb: "look", hint: "L" },
  { label: "Examine", verb: "examine", hint: "X" },
  { label: "Question", verb: "question", hint: "Q" },
  { label: "Ask Why", verb: "ask why" },
  { label: "Accept", verb: "accept" },
  { label: "Reject", verb: "reject" },
  { label: "Trace Back", verb: "trace back", hint: "T" },
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
  // Local-only state — never persisted; opening the drawer is a deliberate
  // act on the current screen, not a setting.
  const [pastExpanded, setPastExpanded] = useState<boolean>(viewport === "landscape");

  // When the viewport changes (rotation, browser resize), re-evaluate the
  // default. Keeps the contract docs/UX.md §3 promises: portrait → collapsed,
  // landscape → expanded, regardless of how the user got there.
  useEffect(() => {
    setPastExpanded(viewport === "landscape");
  }, [viewport]);

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

  const turns = useMemo(() => groupByTurn(state.transcript), [state.transcript]);
  const past = turns.slice(0, -1);
  const present = turns.at(-1);
  const compactedPast = useMemo(() => compactTurns(past), [past]);

  // Auto-scroll the PAST rail to the bottom so the most recent compacted
  // summary is flush against the PRESENT on every new turn.
  const pastLength = compactedPast.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: pastLength drives the scroll
  useEffect(() => {
    if (pastRef.current) pastRef.current.scrollTop = pastRef.current.scrollHeight;
  }, [pastLength]);

  // Keyboard parity — desktop users can still use the keyboard even though
  // the primary input model is taps. Movement, L, X, Q, T, A, R, ?.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const keys: Record<string, string> = {
        n: "north",
        s: "south",
        e: "east",
        w: "west",
        ArrowUp: "north",
        ArrowDown: "south",
        ArrowLeft: "west",
        ArrowRight: "east",
        u: "up",
        d: "down",
        l: "look",
        x: "examine",
        q: "question",
        t: "trace back",
        b: "back",
        a: "accept",
        r: "reject",
        "?": "ask why",
      };
      const verb = keys[e.key] ?? keys[e.key.toLowerCase()];
      if (verb) {
        e.preventDefault();
        onCommand(verb);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCommand]);

  return (
    <div className="relative z-10 flex h-full w-full flex-col gap-4 p-4 md:p-6">
      {/* Display surface */}
      <GlowingPanel tone="active" className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-baseline justify-between px-6 pt-4 pb-2 border-b border-[var(--color-panel-edge)]/60">
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

        {/* Argument map — geometry of the walk so far. Always visible. */}
        <ArgumentMapOverlay state={state} world={world} />

        {/* PAST zone — compacted turn summaries.
            Portrait: collapsed-by-default header, tap to expand.
            Landscape: always-visible scrollable rail.
            Per docs/UX.md §1.1 + §3 (T62). */}
        {compactedPast.length > 0 && (
          <>
            {/* Portrait-only collapse toggle. Always rendered in DOM (so
                screen readers can navigate), hidden via CSS at landscape
                breakpoints to keep the layout consistent there. */}
            {viewport === "portrait" && (
              <button
                type="button"
                onClick={() => setPastExpanded((v) => !v)}
                className="px-6 py-2 border-b border-[var(--color-panel-edge)]/30 text-left font-[family-name:var(--font-display)] text-[0.85rem] text-[var(--color-muted)] hover:text-[var(--color-highlight)]"
                aria-expanded={pastExpanded}
                aria-controls="past-zone-list"
                data-testid="past-zone-toggle"
              >
                {pastExpanded ? "▾" : "▸"} earlier — {compactedPast.length}{" "}
                {compactedPast.length === 1 ? "turn" : "turns"}
              </button>
            )}
            {/* Entry list — visible on landscape always, on portrait only
                when expanded. */}
            {pastExpanded && (
              <div
                id="past-zone-list"
                ref={pastRef}
                className={`
                  max-h-[30%] overflow-y-auto overflow-x-hidden
                  px-6 py-2 border-b border-[var(--color-panel-edge)]/30
                  font-[family-name:var(--font-display)] text-[0.85rem] leading-[1.3]
                  text-[var(--color-dim)]
                  [scrollbar-width:thin] [scrollbar-color:var(--color-panel-edge)_transparent]
                `}
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

        {/* PRESENT zone — current room title + description + latest response */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4"
          aria-live="polite"
          aria-atomic="true"
          data-testid="present-zone"
        >
          {/* Room title — crossfade on movement (T66, 300ms). The
              AnimatePresence wraps a single keyed motion.div so each new
              room's title fades in while the previous one fades out.
              prefers-reduced-motion is respected automatically by Motion. */}
          <AnimatePresence mode="wait">
            {currentRoom && (
              <motion.div
                key={currentRoom.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="pb-2 font-[family-name:var(--font-incantation)] text-[clamp(1.4rem,3vw,1.8rem)] leading-tight text-[var(--color-highlight)]"
                style={{
                  textShadow: "0 0 6px rgba(255,209,250,0.45), 0 0 14px rgba(122,92,255,0.4)",
                }}
                data-testid="present-room-title"
              >
                {currentRoom.title}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Present body — crossfade on new turn (T66, 180ms). Keyed by
              the present turnId so a new turn replaces, not appends. */}
          {present && (
            <motion.div
              key={`turn-${present.turnId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`
                font-[family-name:var(--font-display)] text-[clamp(1rem,2.4vw,1.2rem)]
                leading-[1.55] text-[var(--color-silver)]
              `}
              style={{ textShadow: "0 0 2px rgba(192,192,255,0.35)" }}
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
                      className="text-[var(--color-violet)] mt-2"
                      style={{ textShadow: "0 0 4px rgba(122,92,255,0.5)" }}
                    >
                      {entry.text}
                    </div>
                  );
                }
                if (entry.kind === "title") {
                  // We already render the room title above; suppress the
                  // duplicate that comes in via the transcript.
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
          {/* Active onboarding hint — fades in/out via Motion One. T63. */}
          <HintLine hint={state.activeHint} onDismiss={onHintDismiss} />
        </div>
      </GlowingPanel>

      {/* FUTURE zone — rhetorical verbs, directions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {RHETORICAL_VERBS.map((v) => (
            <KeyCap
              key={v.verb}
              label={v.label}
              variant="verb"
              shortcut={v.hint}
              emphasis={layout?.rhetorical[emphasisKeyFor(v.verb)] ?? "charged"}
              onPress={() => onCommand(v.verb)}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {DIRECTION_KEYS.map((d) => {
            const state = layout?.directions[d.dir];
            return (
              <KeyCap
                key={d.dir}
                label={d.label}
                icon={d.icon}
                variant="direction"
                disabled={!state?.available}
                traversed={state?.alreadyTraversed ?? false}
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
