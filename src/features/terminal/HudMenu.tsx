import type { GameState } from "@/engine";
import type { WorldHandle } from "@/hooks/use-world";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArgumentMapOverlay } from "./ArgumentMapOverlay";

/**
 * HudMenu — slide-out panel triggered by the hamburger button.
 *
 * Contains:
 *   - Seed + incantation phrase metadata (formerly in HeadingPanel)
 *   - Argument map (formerly in MapPanel)
 *   - New Game action
 *
 * Opened by tapping the ☰ icon in the reading panel corner.
 * Closed by tapping anywhere outside or pressing the × button.
 */

export interface HudMenuProps {
  readonly state: GameState;
  readonly world: WorldHandle;
  readonly onNewGame: () => void;
}

export function HudMenu({ state, world, onNewGame }: HudMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger trigger */}
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="hud-menu-panel"
        data-testid="hud-menu-trigger"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/60 text-[var(--color-dim)] transition-colors hover:text-[var(--color-violet)]"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path
            d="M2 5h16M2 10h16M2 15h16"
            stroke="currentColor"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="hud-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-out panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            id="hud-menu-panel"
            key="hud-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col gap-4 border-l border-[var(--color-panel-edge)] bg-[var(--color-panel)]/90 p-5 backdrop-blur-md"
            aria-label="HUD menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.28em] text-[var(--color-dim)] uppercase">
                Status
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-muted)] hover:text-[var(--color-highlight)]"
              >
                ×
              </button>
            </div>

            {/* Seed + phrase */}
            <div className="space-y-2 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/50 p-3">
              <div className="font-[family-name:var(--font-display)] text-[0.7rem] tracking-[0.2em] text-[var(--color-dim)] uppercase">
                Seed
              </div>
              <div
                className="font-[family-name:var(--font-display)] text-[1rem] text-[var(--color-silver)]"
                style={{ textShadow: "0 0 3px rgba(192,192,255,0.25)" }}
              >
                {state.seed}
              </div>
              {state.phrase && (
                <>
                  <div className="mt-2 font-[family-name:var(--font-display)] text-[0.7rem] tracking-[0.2em] text-[var(--color-dim)] uppercase">
                    Incantation
                  </div>
                  <div
                    className="font-[family-name:var(--font-incantation)] text-[1.1rem] text-[var(--color-highlight)]"
                    style={{ textShadow: "0 0 5px rgba(255,209,250,0.35)" }}
                  >
                    {state.phrase}
                  </div>
                </>
              )}
            </div>

            {/* Argument map */}
            <div className="flex flex-1 min-h-0 flex-col gap-1">
              <div className="font-[family-name:var(--font-display)] text-[0.7rem] tracking-[0.2em] text-[var(--color-dim)] uppercase">
                Argument map
              </div>
              <div className="flex-1 min-h-0 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/50 overflow-hidden">
                <ArgumentMapOverlay state={state} world={world} />
              </div>
            </div>

            {/* New game */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewGame();
              }}
              className="w-full rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/60 py-2 font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.18em] text-[var(--color-muted)] uppercase hover:border-[var(--color-violet)] hover:text-[var(--color-violet)] transition-colors"
            >
              New Game
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
