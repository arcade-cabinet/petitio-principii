import { GlowCard } from "@/components/ui/spotlight-card";
import type { GameState, Room } from "@/engine";
import { HintLine } from "@/features/terminal/HintLine";
import { AnimatePresence, motion } from "motion/react";

/**
 * PresentPanel — the "NOW" panel.
 *
 * Renders the current room's title (hero incantation font), the active
 * turn's prose body, and the onboarding hint overlay. Everything else
 * (argument map, compass, past rail, seed readout) lives in its own
 * sibling panel inside the PanelDeck — this one is pure PRESENT.
 *
 * Pure presentational: takes the projected present turn + currentRoom
 * and emits JSX. The PanelDeck parent owns layout and responsive
 * behavior.
 */
export interface PresentTurn {
  readonly turnId: number;
  readonly entries: ReadonlyArray<{
    readonly id: string;
    readonly kind: "spacer" | "echo" | "title" | "narration" | "response" | "system";
    readonly text: string;
  }>;
}

export interface PresentPanelProps {
  readonly currentRoom: Room | undefined;
  readonly present: PresentTurn | undefined;
  readonly activeHint: GameState["activeHint"];
  readonly onHintDismiss: () => void;
}

export function PresentPanel({
  currentRoom,
  present,
  activeHint,
  onHintDismiss,
}: PresentPanelProps) {
  return (
    <GlowCard
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-panel)]/55 backdrop-blur-sm"
      radius={20}
      border={1}
      spotlightSize={360}
    >
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4"
        aria-live="polite"
        aria-atomic="true"
        data-testid="present-zone"
      >
        <AnimatePresence mode="wait">
          {currentRoom && (
            <motion.div
              key={currentRoom.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative z-10 pb-2 font-[family-name:var(--font-incantation)] text-[clamp(1.4rem,3vw,1.8rem)] leading-tight text-[var(--color-highlight)]"
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
            className="relative z-10 font-[family-name:var(--font-display)] text-[clamp(1rem,2.4vw,1.2rem)] leading-[1.55] text-[var(--color-silver)]"
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
                    className="mt-2 text-[var(--color-violet)]"
                    style={{ textShadow: "0 0 4px rgba(122,92,255,0.5)" }}
                  >
                    {entry.text}
                  </div>
                );
              }
              if (entry.kind === "title") {
                // Room title is already rendered above; suppress the
                // transcript's duplicate title entry.
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
        <HintLine hint={activeHint} onDismiss={onHintDismiss} />
      </div>
    </GlowCard>
  );
}
