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

// Softer machined edges — bumped up so the panels read as milled wells,
// not stamped rectangles. Feels more "rounded metal" at any size.
const RADIUS = {
  sm: "rounded-[8px]",
  md: "rounded-[12px]",
  lg: "rounded-[16px]",
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
        // Machined, smoothed-edge box-shadow (layers outside → inside):
        //   1. A 2px dark drop so the panel sits in a well.
        //   2. A wider softer drop for ambient depth.
        //   3. A faint violet outer glow — the scene nebula licking the lip.
        //   4. Inset top-left highlight (silver) — catches ambient light.
        //   5. Inset bottom-right rim shadow — the cut-away edge.
        //   6. A subtle inset inner ring at 2px so the machined edge
        //      reads as "rounded metal" rather than a flat rectangle.
        "[box-shadow:0_2px_0_rgba(0,0,0,0.9),0_8px_22px_rgba(0,0,0,0.65),0_0_18px_rgba(122,92,255,0.14),inset_0_1.5px_0_rgba(255,255,255,0.09),inset_0_-1.5px_0_rgba(0,0,0,0.8),inset_1.5px_0_0_rgba(255,255,255,0.05),inset_-1.5px_0_0_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.02)]",
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
