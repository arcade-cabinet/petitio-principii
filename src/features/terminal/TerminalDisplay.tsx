import { GlowingPanel } from "@/components/ui/glowing-panel";
import { KeyCap } from "@/components/ui/keycap";
import type { GameState } from "@/engine";
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
import { useEffect, useMemo, useRef } from "react";

/**
 * TerminalDisplay — the in-game view.
 *
 * Two stacked surfaces:
 *   1. Display (GlowingPanel) — the luminous projection of the argument.
 *      Output lines stream in VT323; the current room's title is the
 *      "750k / Views" slot of the reference glowing-card — it breathes
 *      at the center of the panel.
 *   2. KeyRow (bottom) — the rhetorical action keys. No typing.
 */
export interface TerminalDisplayProps {
  state: GameState;
  onCommand: (raw: string) => void;
  onNewGame: () => void;
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

export function TerminalDisplay({ state, onCommand, onNewGame }: TerminalDisplayProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  const currentRoom = useMemo(
    () => state.rooms.get(state.currentRoomId),
    [state.rooms, state.currentRoomId]
  );
  const availableDirections = useMemo(
    () => new Set((currentRoom?.exits ?? []).map((e) => e.direction)),
    [currentRoom]
  );

  // Auto-scroll the display as output streams in
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [state.output]);

  // Keyboard parity — desktop users can still use the keyboard even though
  // the primary input model is taps. Movement, L, X, Q, T.
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

        {/* Current room title — the breathing slot */}
        {currentRoom && (
          <div
            className="px-6 pt-3 pb-1 font-[family-name:var(--font-incantation)] text-[clamp(1.4rem,3vw,1.8rem)] leading-tight text-[var(--color-highlight)]"
            style={{
              textShadow: "0 0 6px rgba(255,209,250,0.45), 0 0 14px rgba(122,92,255,0.4)",
            }}
          >
            {currentRoom.title}
          </div>
        )}

        {/* Output stream */}
        <div
          ref={outputRef}
          className={`
            flex-1 min-h-0 overflow-y-auto overflow-x-hidden
            px-6 py-4
            font-[family-name:var(--font-display)] text-[clamp(1rem,2.4vw,1.2rem)]
            leading-[1.55] text-[var(--color-silver)]
            [mask-image:linear-gradient(to_bottom,transparent_0%,black_4%)]
            [scrollbar-width:thin]
            [scrollbar-color:var(--color-panel-edge)_transparent]
          `}
          style={{ textShadow: "0 0 2px rgba(192,192,255,0.35)" }}
          aria-live="polite"
        >
          {state.output.map((line, i) => {
            if (line === "") {
              return (
                <div key={`empty-${i}`} className="h-[1.55em]">
                  &nbsp;
                </div>
              );
            }
            if (line.startsWith(">")) {
              return (
                <div
                  key={`in-${i}`}
                  className="text-[var(--color-violet)] mt-3"
                  style={{ textShadow: "0 0 4px rgba(122,92,255,0.5)" }}
                >
                  {line}
                </div>
              );
            }
            return (
              <div key={`out-${i}`} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            );
          })}
        </div>
      </GlowingPanel>

      {/* KeyRow — rhetorical verbs first, then directions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {RHETORICAL_VERBS.map((v) => (
            <KeyCap
              key={v.verb}
              label={v.label}
              variant="verb"
              shortcut={v.hint}
              onPress={() => onCommand(v.verb)}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <KeyCap
            label="N"
            icon={<ArrowUp size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("north")}
            onPress={() => onCommand("north")}
          />
          <KeyCap
            label="S"
            icon={<ArrowDown size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("south")}
            onPress={() => onCommand("south")}
          />
          <KeyCap
            label="E"
            icon={<ArrowRight size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("east")}
            onPress={() => onCommand("east")}
          />
          <KeyCap
            label="W"
            icon={<ArrowLeft size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("west")}
            onPress={() => onCommand("west")}
          />
          <KeyCap
            label="Up"
            icon={<ChevronUp size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("up")}
            onPress={() => onCommand("up")}
          />
          <KeyCap
            label="Down"
            icon={<ChevronDown size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("down")}
            onPress={() => onCommand("down")}
          />
          <KeyCap
            label="Back"
            icon={<RotateCcw size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("back")}
            onPress={() => onCommand("back")}
          />
          <KeyCap
            label="Fwd"
            icon={<MoveDiagonal size={18} aria-hidden />}
            variant="direction"
            disabled={!availableDirections.has("forward")}
            onPress={() => onCommand("forward")}
          />
        </div>
      </div>
    </div>
  );
}
