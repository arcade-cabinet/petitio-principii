import { AppearanceControls } from "@/components/ui/appearance-controls";
import { GlowingPanel } from "@/components/ui/glowing-panel";
import { generatePhrase, generateSeed } from "@/engine";
import { useAppearance } from "@/hooks/use-appearance";
import { useEffect, useMemo, useState } from "react";

/**
 * NewGameIncantation — the landing display.
 *
 * A luminous panel floats in the memory palace. The incantation (Yesteryear)
 * is the seeded adjective-adjective-noun phrase from the original prompt's
 * canon. Beneath it, the seed itself (VT323) — the mechanism of the magic.
 *
 * Three actions: BEGIN (press the incantation into the argument),
 * REGENERATE (another phrase), CUSTOM SEED (specify the reproducible
 * argument-journey you want to play).
 *
 * T91: If `?seed=XXXX` is present in the URL on landing, that seed is loaded
 * immediately. The "Share" button copies
 * `window.location.origin + base + "?seed=" + currentSeed` to the clipboard.
 *
 * T92: Each day a date-derived seed surfaces as "Argument of the Day". The
 * seed is derived from `hash(YYYY-MM-DD)` so every device on the same UTC
 * date plays the same argument.
 */

/** Derive a deterministic u32 seed from a UTC date string "YYYY-MM-DD". */
function dateSeed(dateStr: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Return today's UTC date as "YYYY-MM-DD". */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse ?seed= from the current URL; returns null if absent/invalid. */
function seedFromURL(): number | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("seed");
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n > 0xffffffff) return null;
    return n;
  } catch {
    return null;
  }
}

/** Build the shareable URL for a given seed. */
function buildShareURL(seed: number): string {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  // Strip any hash fragment so the shared link lands on landing
  url.hash = "";
  return url.toString();
}

export interface NewGameIncantationProps {
  onBegin: (seed: number) => void | Promise<void>;
}

export function NewGameIncantation({ onBegin }: NewGameIncantationProps) {
  const appearance = useAppearance();
  const urlSeed = useMemo(() => seedFromURL(), []);
  const todaySeedValue = useMemo(() => dateSeed(todayUTC()), []);

  const [seed, setSeed] = useState<number>(() => urlSeed ?? todaySeedValue);
  /** true when the currently-shown seed is today's date-derived seed */
  const [isArgumentOfDay, setIsArgumentOfDay] = useState<boolean>(
    () => urlSeed === null || urlSeed === todaySeedValue,
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");

  const phrase = useMemo(() => generatePhrase(seed), [seed]);

  // Keep the URL bar in sync with the current seed so the page is always shareable.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", String(seed));
    window.history.replaceState(null, "", url.toString());
  }, [seed]);

  const handleRegenerate = () => {
    setSeed(generateSeed());
    setIsArgumentOfDay(false);
    setCustomInput("");
    setCustomError("");
    setCustomOpen(false);
    setShareStatus("idle");
  };

  const handleCustomSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number.parseInt(customInput, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 0xffffffff) {
      setCustomError("Seed must be between 0 and 4294967295");
      return;
    }
    setCustomError("");
    setSeed(parsed);
    setIsArgumentOfDay(parsed === todaySeedValue);
    setCustomOpen(false);
    setCustomInput("");
    setShareStatus("idle");
  };

  const handleShare = async () => {
    const shareURL = buildShareURL(seed);
    try {
      await navigator.clipboard.writeText(shareURL);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("error");
      setTimeout(() => setShareStatus("idle"), 2000);
    }
  };

  return (
    <div className="relative z-10 flex h-full w-full items-center justify-center p-6">
      <GlowingPanel
        tone="calm"
        className="w-[min(560px,94vw)] max-w-[560px] p-10 md:p-14 text-center"
      >
        <h1
          className="font-[family-name:var(--font-incantation)] text-[clamp(2.6rem,8vw,3.8rem)] leading-none text-[var(--color-highlight)]"
          style={{
            textShadow: "0 0 8px rgba(255,209,250,0.55), 0 0 22px rgba(122,92,255,0.5)",
          }}
        >
          Petitio Principii
        </h1>
        <p className="mt-4 font-[family-name:var(--font-display)] text-[1.05rem] tracking-[0.14em] text-[var(--color-dim)]">
          a text adventure through a self-justifying argument
        </p>

        {/* T92 — Argument of the Day banner */}
        {isArgumentOfDay && (
          <div
            className="mt-5 rounded-[4px] border border-[var(--color-panel-edge)] bg-[var(--color-ink)]/60 px-4 py-2"
            aria-live="polite"
          >
            <p className="font-[family-name:var(--font-display)] text-[0.88rem] tracking-[0.16em] text-[var(--color-violet-bright)] uppercase">
              Today&rsquo;s Argument &mdash; {todayUTC()}
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-[0.78rem] tracking-[0.1em] text-[var(--color-muted)]">
              Everyone playing today shares this seed.
            </p>
          </div>
        )}

        {/* Incantation — the seeded phrase, drawn in Yesteryear */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div
            className="font-[family-name:var(--font-incantation)] text-[clamp(1.8rem,5vw,2.4rem)] leading-tight text-[var(--color-silver)]"
            style={{ textShadow: "0 0 6px rgba(192,192,255,0.45)" }}
          >
            {phrase}
          </div>
          <div className="font-[family-name:var(--font-display)] text-[0.95rem] tracking-[0.18em] text-[var(--color-muted)]">
            SEED <span className="text-[var(--color-dim)]">{seed}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onBegin(seed)}
            className={`
              min-h-[52px] rounded-[5px]
              border border-[var(--color-violet)]
              bg-[var(--color-violet)] text-[var(--color-ink)]
              font-[family-name:var(--font-display)] text-[1.15rem] tracking-[0.22em] uppercase
              transition-all duration-150
              hover:bg-[var(--color-violet-bright)] hover:border-[var(--color-violet-bright)]
              hover:shadow-[0_0_20px_rgba(122,92,255,0.65)]
              active:translate-y-[1px]
            `}
          >
            Begin Argument
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              className={`
                flex-1 min-h-[44px] rounded-[5px]
                border border-[var(--color-panel-edge)]
                bg-transparent text-[var(--color-dim)]
                font-[family-name:var(--font-display)] text-[0.95rem] tracking-[0.18em] uppercase
                transition-all duration-150
                hover:text-[var(--color-highlight)] hover:border-[var(--color-violet)]
              `}
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className={`
                flex-1 min-h-[44px] rounded-[5px]
                border border-transparent
                bg-transparent text-[var(--color-muted)]
                font-[family-name:var(--font-display)] text-[0.9rem] tracking-[0.18em] uppercase
                transition-colors duration-150
                hover:text-[var(--color-dim)]
              `}
            >
              Custom Seed
            </button>
          </div>

          {/* T91 — Share button */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Copy shareable link to this seed"
            className={`
              min-h-[40px] rounded-[5px]
              border border-transparent
              bg-transparent
              font-[family-name:var(--font-display)] text-[0.85rem] tracking-[0.16em] uppercase
              transition-colors duration-150
              ${shareStatus === "copied" ? "text-[var(--color-silver)]" : "text-[var(--color-muted)] hover:text-[var(--color-dim)]"}
            `}
          >
            {shareStatus === "copied"
              ? "Link copied!"
              : shareStatus === "error"
                ? "Copy failed — try again"
                : "Share this seed"}
          </button>
        </div>

        {customOpen && (
          <form onSubmit={handleCustomSubmit} className="mt-5 flex gap-2">
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.currentTarget.value)}
              placeholder="enter a numeric seed…"
              aria-label="Custom seed"
              min={0}
              max={0xffffffff}
              className={`
                flex-1 min-h-[44px] px-3 rounded-[5px]
                bg-[var(--color-ink)]/80 text-[var(--color-highlight)]
                border border-[var(--color-panel-edge)]
                font-[family-name:var(--font-display)] text-[1rem] tracking-[0.08em]
                focus:border-[var(--color-violet)] focus:outline-none
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
              `}
            />
            <button
              type="submit"
              className={`
                min-h-[44px] px-5 rounded-[5px]
                border border-[var(--color-panel-edge)]
                text-[var(--color-dim)]
                font-[family-name:var(--font-display)] text-[0.95rem] tracking-[0.18em] uppercase
                hover:text-[var(--color-highlight)] hover:border-[var(--color-violet)]
              `}
            >
              Apply
            </button>
          </form>
        )}
        {customError && (
          <p className="mt-2 text-[0.85rem] text-[var(--color-pink)] tracking-[0.06em]">
            {customError}
          </p>
        )}

        {/* T85/T86 appearance settings */}
        <AppearanceControls appearance={appearance} />
      </GlowingPanel>
    </div>
  );
}
