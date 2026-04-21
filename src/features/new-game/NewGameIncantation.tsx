import { AppearanceControls } from "@/components/ui/appearance-controls";
import { HeroClock } from "@/components/ui/hero-clock";
import { generatePhrase, generateSeed } from "@/engine";
import { useAppearance } from "@/hooks/use-appearance";
import { useAudio } from "@/hooks/use-audio";
import { useEffect, useMemo, useState } from "react";

/**
 * NewGameIncantation — the landing display.
 *
 * A Victorian station clock floats in the middle of the page. The title,
 * subtitle, incantation phrase, seed, and actions wrap around it via
 * CSS `shape-outside` (a circle), so the layout reads as editorial — a
 * pull-quote with text reflowing around an illustration — rather than
 * a stacked column.
 *
 * Mobile portrait (<640px) collapses to a single-column flow because
 * shape-outside can't disambiguate at that width. The clock simply sits
 * at the top in that mode.
 */

function todayUTC(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateSeed(yyyymmdd: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < yyyymmdd.length; i++) {
    hash ^= yyyymmdd.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

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

function buildShareURL(seed: number): string {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  url.hash = "";
  return url.toString();
}

export interface NewGameIncantationProps {
  onBegin: (seed: number) => void | Promise<void>;
}

export function NewGameIncantation({ onBegin }: NewGameIncantationProps) {
  const appearance = useAppearance();
  const audio = useAudio();
  const urlSeed = useMemo(() => seedFromURL(), []);
  const today = useMemo(() => todayUTC(), []);
  const todaySeedValue = useMemo(() => dateSeed(today), [today]);

  const [seed, setSeed] = useState<number>(() => urlSeed ?? todaySeedValue);
  const [isArgumentOfDay, setIsArgumentOfDay] = useState<boolean>(
    () => urlSeed === null || urlSeed === todaySeedValue
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [melting, setMelting] = useState(false);

  const phrase = useMemo(() => generatePhrase(seed), [seed]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", String(seed));
    window.history.replaceState(null, "", url.toString());
  }, [seed]);

  const handleRegenerate = () => {
    const nextSeed = generateSeed();
    setSeed(nextSeed);
    setIsArgumentOfDay(nextSeed === todaySeedValue);
    setCustomInput("");
    setCustomError("");
    setCustomOpen(false);
    setShareStatus("idle");
  };

  const handleCustomSubmit = (event: { preventDefault: () => void }) => {
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

  // Begin flow: unlock audio + fire the melt SFX synchronously inside the
  // click stack frame (mobile audio gesture requirement), trigger the melt
  // animation, then call onBegin once the dissolve has had time to land.
  // The 1.4s matches HeroClock's melting transition duration; reduced-motion
  // users get a 0.6s fade instead.
  const handleBegin = () => {
    audio.unlock();
    audio.playSfx("ui.melt-away");
    setMelting(true);
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delayMs = reducedMotion ? 600 : 1400;
    setTimeout(() => {
      void onBegin(seed);
    }, delayMs);
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
    <div className="relative z-10 h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1100px] items-center px-6 py-8 md:px-12 md:py-12">
        <article className="w-full text-[var(--color-silver)]">
          <div
            className="
              clear-both mb-4
              w-[min(70vw,320px)]
              sm:float-right sm:ml-6 sm:mb-2
              md:w-[min(40vw,420px)] md:ml-10
              [shape-outside:circle(50%)]
            "
          >
            <HeroClock today={today} seed={seed} melting={melting} />
          </div>

          <h1
            className="
              font-[family-name:var(--font-incantation)]
              text-[clamp(2.6rem,7vw,4.4rem)] leading-[1.05]
              text-[var(--color-highlight)]
            "
            style={{
              textShadow: "0 0 8px rgba(255,209,250,0.55), 0 0 22px rgba(122,92,255,0.5)",
            }}
          >
            Petitio Principii
          </h1>

          <p
            className="
              mt-4
              font-[family-name:var(--font-display)]
              text-[clamp(0.95rem,1.4vw,1.1rem)] tracking-[0.16em]
              text-[var(--color-dim)] uppercase
            "
          >
            A text adventure through a self-justifying argument
          </p>

          {isArgumentOfDay && (
            <p
              className="
                mt-5
                font-[family-name:var(--font-display)]
                text-[0.85rem] tracking-[0.18em]
                text-[var(--color-violet-bright)] uppercase
              "
              aria-live="polite"
            >
              Today's Argument · {today}
              <span className="ml-3 text-[var(--color-muted)] normal-case tracking-[0.08em]">
                Everyone playing today shares this seed.
              </span>
            </p>
          )}

          <p
            className="
              mt-8
              font-[family-name:var(--font-incantation)]
              text-[clamp(1.6rem,3.6vw,2.6rem)] leading-tight
              text-[var(--color-silver)]
            "
            style={{ textShadow: "0 0 6px rgba(192,192,255,0.45)" }}
          >
            {phrase}
          </p>

          <p
            className="
              mt-2
              font-[family-name:var(--font-display)]
              text-[0.9rem] tracking-[0.2em]
              text-[var(--color-muted)]
            "
          >
            SEED <span className="text-[var(--color-dim)]">{seed}</span>
          </p>

          <div className="clear-both mt-10 flex flex-col gap-3 sm:max-w-[420px]">
            <button
              type="button"
              onClick={handleBegin}
              disabled={melting}
              className="
                min-h-[52px] rounded-[5px]
                border border-[var(--color-violet)]
                bg-[var(--color-violet)] text-[var(--color-ink)]
                font-[family-name:var(--font-display)] text-[1.15rem] tracking-[0.22em] uppercase
                transition-all duration-150
                hover:bg-[var(--color-violet-bright)] hover:border-[var(--color-violet-bright)]
                hover:shadow-[0_0_20px_rgba(122,92,255,0.65)]
                active:translate-y-[1px]
              "
            >
              Begin Argument
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRegenerate}
                className="
                  flex-1 min-h-[44px] rounded-[5px]
                  border border-[var(--color-panel-edge)]
                  bg-transparent text-[var(--color-dim)]
                  font-[family-name:var(--font-display)] text-[0.95rem] tracking-[0.18em] uppercase
                  transition-all duration-150
                  hover:text-[var(--color-highlight)] hover:border-[var(--color-violet)]
                "
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => setCustomOpen((v) => !v)}
                className="
                  flex-1 min-h-[44px] rounded-[5px]
                  border border-transparent
                  bg-transparent text-[var(--color-muted)]
                  font-[family-name:var(--font-display)] text-[0.9rem] tracking-[0.18em] uppercase
                  transition-colors duration-150
                  hover:text-[var(--color-dim)]
                "
              >
                Custom Seed
              </button>
            </div>

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
            <form
              onSubmit={handleCustomSubmit}
              className="clear-both mt-5 flex gap-2 sm:max-w-[420px]"
            >
              <input
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.currentTarget.value)}
                placeholder="enter a numeric seed…"
                aria-label="Custom seed"
                min={0}
                max={0xffffffff}
                className="
                  flex-1 min-h-[44px] px-3 rounded-[5px]
                  bg-[var(--color-ink)]/80 text-[var(--color-highlight)]
                  border border-[var(--color-panel-edge)]
                  font-[family-name:var(--font-display)] text-[1rem] tracking-[0.08em]
                  focus:border-[var(--color-violet)] focus:outline-none
                  [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                "
              />
              <button
                type="submit"
                className="
                  min-h-[44px] px-5 rounded-[5px]
                  border border-[var(--color-panel-edge)]
                  text-[var(--color-dim)]
                  font-[family-name:var(--font-display)] text-[0.95rem] tracking-[0.18em] uppercase
                  hover:text-[var(--color-highlight)] hover:border-[var(--color-violet)]
                "
              >
                Apply
              </button>
            </form>
          )}
          {customError && (
            <p className="clear-both mt-2 text-[0.85rem] text-[var(--color-pink)] tracking-[0.06em]">
              {customError}
            </p>
          )}

          <div className="clear-both sm:max-w-[420px]">
            <AppearanceControls appearance={appearance} />
          </div>
        </article>
      </div>
    </div>
  );
}
