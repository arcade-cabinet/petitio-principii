import { Rivet } from "./rivet";

/**
 * Inlay — a brushed black-steel divider strip that sits between panels
 * in the chassis.
 *
 * The bezel-framed panels hang in wells cut out of the chassis. Between
 * two adjacent wells the chassis itself is exposed as a narrow strip —
 * this component is that strip, styled so it reads as actual metal
 * frame you could run your finger along, not a 1px CSS line.
 *
 * Visual:
 *   - Darker at both edges (recessed into the wells on either side)
 *   - Brushed vertical grain in the middle (catches the scene light)
 *   - Silver rivets mounted along the strip at evenly-spaced positions
 *   - Inset highlight on the top edge + inset shadow on the bottom,
 *     so the strip reads as a machined rail between panels.
 *
 * Orientation can be "vertical" (separates panels in a row) or
 * "horizontal" (separates panels stacked top-to-bottom).
 */
export interface InlayProps {
  orientation?: "vertical" | "horizontal";
  /** Thickness of the inlay in px. Defaults to 14. */
  thickness?: number;
  /** Number of rivets along the inlay. Defaults to 3 (evenly distributed). */
  rivetCount?: number;
  /** Rivet dome size. Defaults to 9. */
  rivetSize?: number;
  className?: string;
}

export function Inlay({
  orientation = "vertical",
  thickness = 14,
  rivetCount = 3,
  rivetSize = 9,
  className = "",
}: InlayProps) {
  const isVertical = orientation === "vertical";

  // Base brushed-steel gradient. Darker at the edges (recessed into
  // the wells), slightly lighter in the middle.
  const background = isVertical
    ? "linear-gradient(90deg, #060309 0%, #15121b 30%, #1c1823 50%, #15121b 70%, #060309 100%)"
    : "linear-gradient(180deg, #060309 0%, #15121b 30%, #1c1823 50%, #15121b 70%, #060309 100%)";

  // 1px brushed grain running the long axis.
  const grain = isVertical
    ? "repeating-linear-gradient(180deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 4px)"
    : "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 4px)";

  const boxShadow = isVertical
    ? "inset 1px 0 0 rgba(255,255,255,0.04), inset -1px 0 0 rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.7)"
    : "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.8), inset 1px 0 0 rgba(255,255,255,0.03), inset -1px 0 0 rgba(0,0,0,0.7)";

  // Rivets distributed evenly along the long axis.
  const rivets = Array.from({ length: rivetCount }, (_, i) => {
    // Bias the positions towards endpoints so first/last rivet sit
    // close to the panel corners; middle rivets space evenly between.
    const t = rivetCount === 1 ? 0.5 : i / (rivetCount - 1);
    // Keep rivets off the absolute edge (10% margin).
    const pct = `${(t * 0.8 + 0.1) * 100}%`;
    const style: React.CSSProperties = isVertical
      ? { position: "absolute", top: pct, left: "50%", transform: "translate(-50%, -50%)" }
      : { position: "absolute", left: pct, top: "50%", transform: "translate(-50%, -50%)" };
    return (
      <span key={`rivet-${pct}`} style={style}>
        <Rivet size={rivetSize} />
      </span>
    );
  });

  return (
    <div
      aria-hidden="true"
      className={`relative isolate flex-shrink-0 ${className}`}
      style={{
        width: isVertical ? `${thickness}px` : "auto",
        height: isVertical ? "auto" : `${thickness}px`,
        alignSelf: "stretch",
        background,
        boxShadow,
        // Rounded caps on both ends — machined/milled feel, not stamped.
        borderRadius: `${Math.round(thickness / 2)}px`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: grain, opacity: 0.5 }}
      />
      {rivets}
    </div>
  );
}
