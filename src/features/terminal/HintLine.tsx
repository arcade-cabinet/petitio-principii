import type { ActiveHint } from "@/engine";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

/**
 * HintLine — overlay-style onboarding nudge.
 *
 * Per docs/UX.md §6 + the T63 PRD entry:
 *   - Single-line, DM Mono, 0.85rem, dim color.
 *   - Fades in 400ms via Motion One.
 *   - Auto-dismisses after 6s; tap dismisses immediately.
 *   - Never blocks input — `pointer-events: none` on the wrapper while
 *     idle; the inner button accepts taps to dismiss.
 *   - Reduced-motion respected via Motion's `prefers-reduced-motion`
 *     handling (animations short-circuit to instant transitions).
 */

export interface HintLineProps {
  hint: ActiveHint | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6000;

export function HintLine({ hint, onDismiss }: HintLineProps) {
  // Auto-fade timer. Reset whenever the hint changes (a new id arrives
  // before the previous one expired). Cleared on unmount + on dismiss.
  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [hint, onDismiss]);

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          key={hint.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none mt-3 flex items-center"
          data-testid="hint-line"
          data-hint-id={hint.id}
          // biome-ignore lint/a11y/useSemanticElements: motion.div wraps its children with animation primitives that don't compose with native <output>; role+aria-live is the equivalent and what every assistive-tech vendor expects on a div-based status region.
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "pointer-events-auto inline-flex items-center gap-2 px-3 py-1 rounded-sm",
              "font-[family-name:var(--font-commandline)] text-[0.95rem]",
              // Was --color-dim with --panel-edge/40 border — readable as
              // "dim marginalia" but unreadable in screenshots at desktop
              // distance. Bump to --color-silver text + violet accent border
              // so the chip earns its real estate.
              "text-[var(--color-silver)] hover:text-[var(--color-highlight)]",
              "border border-[var(--color-violet)]/50 hover:border-[var(--color-violet)]",
              "bg-[var(--color-panel)]/85 backdrop-blur-sm",
              "shadow-[0_0_8px_rgba(122,92,255,0.25)]"
            )}
            aria-label={`Dismiss hint: ${hint.text}`}
          >
            <span aria-hidden className="text-[var(--color-pink)] text-[1.05rem] leading-none">
              ›
            </span>
            <span>{hint.text}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
