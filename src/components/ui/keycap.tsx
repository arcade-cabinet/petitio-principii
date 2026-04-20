import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * KeyCap — one key on the HUD.
 *
 * Amendment to the prompt: the player does not type. Mobile-first.
 * Keycap chrome borrows the inset-shadow / LED / bg-glow vocabulary from
 * the bluetooth-key reference but is rewritten as a plain React button
 * so it's accessible, keyboard-reachable on desktop, and tap-responsive
 * on touch. Labels use VT323 — the display typeface — so they read as
 * part of the same surface as the output text.
 *
 * Variants:
 *   - "direction" — compass icons from lucide (N/S/E/W/Up/Down/Back)
 *   - "verb"      — rhetorical action labels (EXAMINE, ACCEPT, ...)
 *   - "meta"      — NEW / QUIT / HELP — slightly de-emphasized
 */
export type KeyCapVariant = "direction" | "verb" | "meta";
export type KeyCapEmphasis = "calm" | "charged" | "primary";

export interface KeyCapProps {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  variant?: KeyCapVariant;
  disabled?: boolean;
  /**
   * Visual emphasis — drives colour + glow. Defaults to "charged" for
   * back-compat with call sites that don't specify. See docs/UX.md §1.3
   * and computeKeycapLayout (T50).
   */
  emphasis?: KeyCapEmphasis;
  /**
   * Direction-only: `true` means the player has traversed this exit at
   * least once from the current room. Adds a faint trailing glow to the
   * key. Ignored for non-direction variants.
   */
  traversed?: boolean;
  /** Optional shortcut hint shown beneath the label (e.g. "N", "L") */
  shortcut?: string;
  "aria-label"?: string;
}

export function KeyCap({
  label,
  icon,
  onPress,
  variant = "verb",
  disabled = false,
  emphasis = "charged",
  traversed = false,
  shortcut,
  "aria-label": ariaLabel,
}: KeyCapProps) {
  const tonal = {
    direction: "bg-[var(--color-panel)] text-[var(--color-silver)]",
    verb: "bg-[var(--color-panel)] text-[var(--color-highlight)]",
    meta: "bg-[var(--color-panel)]/70 text-[var(--color-dim)]",
  }[variant];

  // Emphasis treatments per docs/UX.md §1.3 + T64:
  //   calm    — opacity-only. "available but not especially useful here."
  //   charged — full opacity + a subtle violet outer glow that distinguishes
  //             it from calm at arm's length on a phone screen.
  //   primary — full opacity + violet outer glow + inner-pink tint via a
  //             gradient overlay + the motion-safe pulsing ring. There is
  //             at most one primary per layout (computeKeycapLayout
  //             enforces this), so the pink tint is the unmistakable
  //             "tap this next" signal.
  const emphasisClasses = {
    calm: "opacity-55",
    charged:
      "opacity-95 [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.08),inset_0_-6px_1px_-4px_rgba(122,92,255,0.45),inset_0_-15px_6px_-8px_rgba(30,10,60,0.9),0_0_0_1px_rgba(5,1,10,0.6),0_0_10px_rgba(122,92,255,0.25)]",
    primary:
      "opacity-100 ring-1 ring-[var(--color-violet)] [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-6px_1px_-4px_rgba(155,127,255,0.7),inset_0_-15px_6px_-8px_rgba(30,10,60,0.9),0_0_0_1px_rgba(5,1,10,0.6),0_0_18px_rgba(255,209,250,0.55)] motion-safe:[animation:pulse-violet_2s_ease-in-out_infinite] before:absolute before:inset-0 before:rounded-[5px] before:bg-gradient-to-b before:from-transparent before:via-transparent before:to-[rgba(255,209,250,0.18)] before:pointer-events-none",
  }[emphasis];

  // Direction silhouettes: disabled + already-traversed keeps the slot in
  // layout grid (never jitters), and traversed picks up a faint pink glow.
  const traversedRing =
    traversed && variant === "direction"
      ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),0_0_8px_rgba(255,209,250,0.25)]"
      : "";

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onPress();
      }}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      data-emphasis={emphasis}
      data-variant={variant}
      className={cn(
        "group relative isolate select-none",
        "min-h-[52px] min-w-[52px] px-3 py-2",
        "rounded-[5px] border border-[var(--color-panel-edge)]",
        "font-[family-name:var(--font-display)] text-[1.05rem] leading-none tracking-[0.08em] uppercase",
        "transition-all duration-150",
        // Inset highlights + outer glow — the "physical key" effect
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),inset_0_-6px_1px_-4px_rgba(122,92,255,0.35),inset_0_-15px_6px_-8px_rgba(30,10,60,0.9),0_0_0_1px_rgba(5,1,10,0.6)]",
        tonal,
        !disabled && [
          "cursor-pointer",
          "hover:text-[var(--color-highlight)]",
          "hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),inset_0_-6px_1px_-4px_rgba(155,127,255,0.6),inset_0_-15px_6px_-8px_rgba(30,10,60,0.9),0_0_12px_rgba(122,92,255,0.4)]",
          "hover:border-[var(--color-violet)]",
          "active:translate-y-[1px]",
          "active:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),inset_0_-2px_1px_-1px_rgba(122,92,255,0.6),0_0_16px_rgba(122,92,255,0.55)]",
        ],
        disabled && "cursor-not-allowed opacity-40",
        !disabled && emphasisClasses,
        traversedRing
      )}
    >
      {/* LED — the pink status pip on the top-right corner */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-1.5 top-1.5 h-1 w-1 rounded-full",
          "bg-[var(--color-pink)] shadow-[0_0_6px_#ffd1fa]",
          "transition-opacity duration-200",
          disabled ? "opacity-20" : "opacity-80 group-hover:opacity-100"
        )}
      />

      <span className="flex flex-col items-center gap-0.5">
        {icon ? <span className="mb-0.5 text-[1.1rem]">{icon}</span> : null}
        <span
          className="text-[var(--color-silver)]"
          style={{ textShadow: "0 0 4px rgba(192,192,255,0.45)" }}
        >
          {label}
        </span>
        {shortcut ? (
          <span className="text-[0.6rem] tracking-[0.2em] text-[var(--color-muted)]">
            {shortcut}
          </span>
        ) : null}
      </span>
    </button>
  );
}
