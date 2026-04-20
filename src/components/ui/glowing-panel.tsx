import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * GlowingPanel — the luminous display surface.
 *
 * One panel treatment shared by the Incantation modal and the in-game Display.
 * Corner lines trace the frame (like a lighthouse beacon painting the edge),
 * an orbiting dot circles the perimeter, an internal ray rotates slowly.
 * The contents of the panel breathe through the glow, not the other way
 * around — we are looking at a memory, not at a screen.
 *
 * Pattern adapted from the reference glowing-card; re-tuned to our palette
 * (violet ray, silver traces, pink dot) and reframed to hold arbitrary
 * children so both the Incantation and the in-game Display can wear it.
 */
export interface GlowingPanelProps {
  children: ReactNode;
  className?: string;
  /**
   * Intensity of the orbit / ray. "active" = in-game (vivid),
   * "calm" = incantation (still). Default "calm".
   */
  tone?: "active" | "calm";
}

export function GlowingPanel({ children, className, tone = "calm" }: GlowingPanelProps) {
  const active = tone === "active";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[6px]",
        "bg-[var(--color-panel)]/85 backdrop-blur-sm",
        "border border-[var(--color-panel-edge)]",
        "shadow-[inset_0_0_40px_rgba(10,0,30,0.8),0_0_4px_#c0c0ff,0_0_24px_#7a5cff66]",
        className
      )}
    >
      {/* Orbiting dot — pink phosphor pinpoint tracing the perimeter */}
      <div
        className={cn(
          "pointer-events-none absolute h-[6px] w-[6px] rounded-full",
          "bg-[var(--color-pink)]",
          "shadow-[0_0_8px_#ffd1fa,0_0_16px_#ffd1facc]"
        )}
        style={{
          animation: `dot-orbit ${active ? "6s" : "14s"} linear infinite`,
        }}
      />

      {/* Rotating ray — faint violet beam sweeping the interior */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[180%] w-[180%] origin-center"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(122,92,255,0.18) 40deg, transparent 80deg, transparent 360deg)",
          animation: `ray-sweep ${active ? "10s" : "22s"} linear infinite`,
        }}
      />

      {/* Corner lines — top */}
      <div className="pointer-events-none absolute left-3 right-3 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-silver)]/50 to-transparent" />
      {/* bottom */}
      <div className="pointer-events-none absolute left-3 right-3 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-silver)]/50 to-transparent" />
      {/* left */}
      <div className="pointer-events-none absolute top-3 bottom-3 left-0 w-px bg-gradient-to-b from-transparent via-[var(--color-silver)]/50 to-transparent" />
      {/* right */}
      <div className="pointer-events-none absolute top-3 bottom-3 right-0 w-px bg-gradient-to-b from-transparent via-[var(--color-silver)]/50 to-transparent" />

      {/* Interior radial vignette — gently darkens the corners so the
          content breathes at the center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(5,1,10,0.55) 100%)",
        }}
      />

      {/* Content sits above the chrome */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
