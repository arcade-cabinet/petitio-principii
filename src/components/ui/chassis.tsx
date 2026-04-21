import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Chassis — the brushed black-steel surface that panels sit in.
 *
 * Renders as a dark matte gradient with a faint vertical brush-grain
 * overlay. Sits ON TOP of the violet nebula backdrop (which is owned by
 * the body-level background) so the chassis reads as a physical device
 * mounted over a living lush scene.
 *
 * Fully CSS — no noise texture image, no extra deps. The brush grain is
 * a repeating linear-gradient at very low opacity. Renders cheap,
 * scales to any viewport, and respects the game palette.
 *
 * Designed to wrap the whole in-game layout so every panel sits on the
 * chassis consistently.
 */

export interface ChassisProps {
  children: ReactNode;
  className?: string;
}

export function Chassis({ children, className }: ChassisProps) {
  return (
    <div
      className={cn(
        "relative isolate h-full w-full",
        // Top-to-bottom matte dark gradient. Slightly lighter at top so a
        // faint "mounted under ambient ceiling light" feel lands on the
        // surface; darker at the bottom where the chassis sinks into the
        // scene.
        "bg-[linear-gradient(180deg,#1a1519_0%,#0c090f_55%,#050208_100%)]",
        // Outer bevel so the chassis itself feels like a slab resting on
        // the nebula, not just a flat paint.
        "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.9),0_20px_60px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {/* Brushed-steel grain: a very faint vertical repeating gradient.
          stacked on top of the base color at low alpha so it reads as
          "machined" at arm's length but vanishes at distance. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* Atmospheric pink ambient — the nebula's subtle bloom leaking
          through the chassis surface where the dark steel thins. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-15 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at 25% 20%, rgba(122,92,255,0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(255,209,250,0.18) 0%, transparent 45%)",
        }}
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
