/**
 * ConsentBanner — T81 analytics opt-in.
 *
 * Appears on first launch if the player has not yet made a consent choice.
 * Defaults to OFF. Once a choice is made it is persisted to localStorage
 * and the banner never appears again.
 *
 * The banner is minimal: one sentence of plain language, two buttons.
 * Full privacy policy is linked from the banner text → docs/PRIVACY.md
 * (hosted at /privacy or the README, whichever is available).
 */
import { setConsent } from "@/lib/telemetry";
import { useEffect, useState } from "react";

const DECISION_KEY = "pp.analytics.decided";

function hasDecided(): boolean {
  try {
    return localStorage.getItem(DECISION_KEY) === "true";
  } catch {
    return false;
  }
}

function markDecided(): void {
  try {
    localStorage.setItem(DECISION_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function ConsentBanner() {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Show banner only on first visit (no prior decision).
    if (!hasDecided()) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    setConsent(true);
    markDecided();
    setVisible(false);
  };

  const decline = () => {
    setConsent(false);
    markDecided();
    setVisible(false);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: banner role="dialog" on div is intentional; aside would misrepresent a consent prompt
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Analytics consent"
      aria-live="polite"
      className={`
        fixed bottom-4 inset-x-4 z-50 mx-auto max-w-md
        rounded-[5px]
        border border-[var(--color-panel-edge)]
        bg-[var(--color-panel)]/95
        px-5 py-4
        flex flex-col gap-3
        shadow-[0_4px_24px_rgba(0,0,0,0.6)]
      `}
    >
      <p className="font-[family-name:var(--font-display)] text-[0.9rem] leading-[1.5] tracking-[0.06em] text-[var(--color-dim)]">
        We use <span className="text-[var(--color-silver)]">privacy-first analytics</span> (no
        cookies, no tracking) to understand which arguments get closed. Opt in to help improve the
        game.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={accept}
          className={`
            flex-1 min-h-[36px] rounded-[4px]
            border border-[var(--color-violet)]
            bg-[var(--color-violet)]/20 text-[var(--color-violet-bright)]
            font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.16em] uppercase
            transition-colors duration-150
            hover:bg-[var(--color-violet)]/40
          `}
        >
          Yes, opt in
        </button>
        <button
          type="button"
          onClick={decline}
          className={`
            flex-1 min-h-[36px] rounded-[4px]
            border border-[var(--color-panel-edge)]
            bg-transparent text-[var(--color-muted)]
            font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.16em] uppercase
            transition-colors duration-150
            hover:text-[var(--color-dim)]
          `}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
