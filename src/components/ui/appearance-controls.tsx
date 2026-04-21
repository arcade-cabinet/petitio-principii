/**
 * AppearanceControls — landing-screen settings for T85 + T86.
 *
 * T85: dyslexia-friendly font toggle (VT323 → OpenDyslexic)
 * T86: text-size step control (Small / Medium / Large)
 *
 * Rendered as a compact footer bar on the landing panel.
 * The incantation font (Yesteryear) is never affected.
 */
import { type AppearanceHandle, type TextSize } from "@/hooks/use-appearance";

const TEXT_SIZES: { label: string; value: TextSize }[] = [
  { label: "S", value: "small" },
  { label: "M", value: "medium" },
  { label: "L", value: "large" },
];

interface AppearanceControlsProps {
  appearance: AppearanceHandle;
}

export function AppearanceControls({ appearance }: AppearanceControlsProps) {
  const { dyslexia, textSize, toggleDyslexia, setTextSize } = appearance;

  return (
    <div
      className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--color-panel-edge)] pt-4"
      aria-label="Display settings"
    >
      {/* T85 — Dyslexia font toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={dyslexia}
        aria-label="Toggle dyslexia-friendly font"
        onClick={toggleDyslexia}
        className={`
          flex items-center gap-2
          font-[family-name:var(--font-display)] text-[0.8rem] tracking-[0.14em] uppercase
          transition-colors duration-150
          ${dyslexia ? "text-[var(--color-violet-bright)]" : "text-[var(--color-muted)] hover:text-[var(--color-dim)]"}
        `}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 rounded-sm border
            transition-colors duration-150
            ${dyslexia ? "border-[var(--color-violet-bright)] bg-[var(--color-violet)]" : "border-[var(--color-panel-edge)] bg-transparent"}
          `}
          aria-hidden="true"
        />
        Dyslexic Font
      </button>

      {/* T86 — Text size stepper */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Text size"
      >
        {TEXT_SIZES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            aria-pressed={textSize === value}
            aria-label={`Text size ${value}`}
            onClick={() => setTextSize(value)}
            className={`
              min-h-[28px] min-w-[28px] rounded-[3px]
              border
              font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.1em] uppercase
              transition-colors duration-150
              ${
                textSize === value
                  ? "border-[var(--color-violet)] bg-[var(--color-violet)]/20 text-[var(--color-violet-bright)]"
                  : "border-[var(--color-panel-edge)] bg-transparent text-[var(--color-muted)] hover:text-[var(--color-dim)] hover:border-[var(--color-dim)]"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
