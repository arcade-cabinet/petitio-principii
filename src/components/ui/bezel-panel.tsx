import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Rivet } from "./rivet";

/**
 * BezelPanel — a panel recessed into the chassis surface.
 *
 * Visually it's three layered surfaces:
 *   1. Chassis edge (the brushed-black-steel surround the panel sits in,
 *      supplied by the parent Chassis component).
 *   2. Bezel lip — a machined cut with a silver-grey highlight on top
 *      and a black shadow on bottom, created entirely via inset shadows.
 *   3. Panel well — the dark violet interior where the game's prose /
 *      map / compass renders. The violet nebula backdrop peeks through
 *      the well's translucent background.
 *
 * Silver rivets sit at the four corners by default (the design brief:
 * "big silver polished rivets"). A `rivetPattern` prop lets larger
 * panels mount mid-edge rivets as well.
 *
 * Pure presentational wrapper. No motion, no interactivity of its own —
 * the panel interior handles those concerns.
 *
 * Shadow vocabulary borrowed from 21st.dev's MetalButton + RetroButton
 * references: inner lit edge + outer black rim builds the "machined
 * drop" illusion at any panel size.
 */
export type RivetPattern = "corners" | "corners-mid-h" | "corners-mid-all" | "none";

export interface BezelPanelProps {
  children: ReactNode;
  className?: string;
  /** Where to place rivets. Defaults to the four corners. */
  rivets?: RivetPattern;
  /** Size of the rivet domes in px. Defaults to 10. */
  rivetSize?: number;
  /** Corner radius. Defaults to "lg" (10px) to match the chassis feel. */
  radius?: "sm" | "md" | "lg";
  /** Optional aria-label for screen readers if the panel is landmark-y. */
  "aria-label"?: string;
  /** Optional role — e.g. "region" for a landmark panel. */
  role?: string;
}

const RADIUS = {
  sm: "rounded-[4px]",
  md: "rounded-[6px]",
  lg: "rounded-[10px]",
} as const;

export function BezelPanel({
  children,
  className,
  rivets = "corners",
  rivetSize = 10,
  radius = "lg",
  role,
  "aria-label": ariaLabel,
}: BezelPanelProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn(
        "relative isolate",
        RADIUS[radius],
        // Outer bezel edge — the machined lip between chassis and well.
        // The composed box-shadow layers (top→bottom):
        //   inset top highlight (silver)
        //   inset bottom rim (black)
        //   outer rim shadow (sinks the panel into the chassis)
        //   outer violet glow (the nebula catching the well edge)
        "bg-[var(--color-panel)]/85 backdrop-blur-sm",
        "border border-[var(--color-panel-edge)]",
        "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.7),0_2px_0_rgba(0,0,0,0.9),0_6px_18px_rgba(0,0,0,0.55),0_0_14px_rgba(122,92,255,0.12)]",
        className
      )}
    >
      {children}
      {rivets !== "none" && <RivetGrid pattern={rivets} size={rivetSize} radius={radius} />}
    </div>
  );
}

function RivetGrid({
  pattern,
  size,
  radius,
}: {
  pattern: Exclude<RivetPattern, "none">;
  size: number;
  radius: BezelPanelProps["radius"];
}) {
  // Inset distance — scales with radius so rivets don't crash into the
  // rounded corner.
  const inset = radius === "lg" ? 6 : radius === "md" ? 5 : 4;
  const style = (top?: number, right?: number, bottom?: number, left?: number) => ({
    position: "absolute" as const,
    top: top !== undefined ? `${top}px` : undefined,
    right: right !== undefined ? `${right}px` : undefined,
    bottom: bottom !== undefined ? `${bottom}px` : undefined,
    left: left !== undefined ? `${left}px` : undefined,
  });

  const corners = (
    <>
      <span style={style(inset, undefined, undefined, inset)}>
        <Rivet size={size} />
      </span>
      <span style={style(inset, inset, undefined, undefined)}>
        <Rivet size={size} />
      </span>
      <span style={style(undefined, undefined, inset, inset)}>
        <Rivet size={size} />
      </span>
      <span style={style(undefined, inset, inset, undefined)}>
        <Rivet size={size} />
      </span>
    </>
  );

  const midHorizontal = (
    <>
      <span
        style={{
          position: "absolute",
          top: `${inset}px`,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Rivet size={size} />
      </span>
      <span
        style={{
          position: "absolute",
          bottom: `${inset}px`,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Rivet size={size} />
      </span>
    </>
  );

  const midVertical = (
    <>
      <span
        style={{
          position: "absolute",
          left: `${inset}px`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <Rivet size={size} />
      </span>
      <span
        style={{
          position: "absolute",
          right: `${inset}px`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <Rivet size={size} />
      </span>
    </>
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 select-none">
      {corners}
      {(pattern === "corners-mid-h" || pattern === "corners-mid-all") && midHorizontal}
      {pattern === "corners-mid-all" && midVertical}
    </div>
  );
}
