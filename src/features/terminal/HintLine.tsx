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
              "pointer-events-auto inline-flex items-center gap-2 px-2 py-0.5 rounded-sm",
              "font-[family-name:var(--font-commandline)] text-[0.85rem]",
              "text-[var(--color-dim)] hover:text-[var(--color-highlight)]",
              "border border-[var(--color-panel-edge)]/40",
              "bg-[var(--color-panel)]/60 backdrop-blur-sm"
            )}
            aria-label={`Dismiss hint: ${hint.text}`}
          >
            <span aria-hidden className="text-[var(--color-violet)]">
              ›
            </span>
            <span>{hint.text}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
