import type { RhetoricalType } from "@/content";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/**
 * ArgumentMap — the visible geometry of the player's walk through the argument.
 *
 * This is the UI side of the "memory palace" metaphor. Each visited room is a
 * node on a horizontal rail; nodes are colored by rhetorical type; the
 * current room pulses; when the player closes the circle (accepting in a
 * circular/meta room) the visual loop from the last room back to the first
 * matching-type room draws in bright pink, and the player sees the shape of
 * the argument they've been making fold shut.
 *
 * Zero spatial semantics — the rail reflects TURN ORDER, not geography. The
 * argument doesn't have a map; it has a shape. That shape is time.
 *
 * Props are plain data — rendering never queries koota directly. The
 * feature-level wrapper (ArgumentMapOverlay) pulls the data from useWorld.
 */

export interface ArgumentMapNode {
  readonly roomId: string;
  readonly ordinal: number;
  readonly rhetoricalType: RhetoricalType;
}

export interface ArgumentMapProps {
  readonly visited: readonly ArgumentMapNode[];
  readonly currentRoomId: string;
  readonly circleClosed: boolean;
  readonly className?: string;
}

/**
 * CSS custom-property names already defined in `src/design/globals.css`.
 * We use them so the map stays in step with the rest of the palette if the
 * tokens ever shift — and so contributors don't wonder where the colors
 * came from.
 */
const TYPE_COLOR: Readonly<Record<RhetoricalType, string>> = {
  premise: "var(--color-silver)",
  conclusion: "var(--color-highlight)",
  definition: "var(--color-silver)",
  analogy: "var(--color-pink)",
  objection: "var(--color-pink)",
  fallacy: "var(--color-violet)",
  circular: "var(--color-pink)",
  meta: "#ffffff",
};

const NODE_RADIUS = 4;
const NODE_SPACING = 24;
const ROW_HEIGHT = 40;
const PADDING_X = 10;

export function ArgumentMap({ visited, currentRoomId, circleClosed, className }: ArgumentMapProps) {
  if (visited.length === 0) {
    // Nothing to draw; still take up layout space so the overlay doesn't
    // jump when the first visit stamps. A single "pending" pip keeps the
    // rail present and aligned.
    return (
      <div
        className={cn(
          "relative h-[40px] w-full overflow-hidden",
          "border-t border-b border-[var(--color-panel-edge)]/30",
          className
        )}
        aria-label="Argument map: no rooms visited yet."
        role="img"
      />
    );
  }

  const width = Math.max(
    visited.length * NODE_SPACING + PADDING_X * 2,
    NODE_SPACING + PADDING_X * 2
  );
  const cy = ROW_HEIGHT / 2;

  // The "circle closed" edge connects the last visited room back to the
  // nearest prior visit of the same rhetorical-type-or-matching room. For
  // the MVP we connect last → first (the shape the player *actually*
  // closed), which is unambiguous and matches LORE.md's "you brought this
  // here and you found it here again."
  const first = visited[0];
  const last = visited[visited.length - 1];

  // Accessible textual summary — read by screen readers, also shown as an
  // aria-label for the SVG.
  const labelParts = [`${visited.length} rooms visited`];
  if (circleClosed) labelParts.push("circle closed");
  const ariaLabel = `Argument map: ${labelParts.join("; ")}.`;

  return (
    <div
      className={cn(
        "relative h-[40px] w-full overflow-x-auto overflow-y-hidden",
        "border-t border-b border-[var(--color-panel-edge)]/30",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <svg
        width={width}
        height={ROW_HEIGHT}
        viewBox={`0 0 ${width} ${ROW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="block h-full"
      >
        <title>{ariaLabel}</title>

        {/* Rail line */}
        <line
          x1={PADDING_X}
          y1={cy}
          x2={width - PADDING_X}
          y2={cy}
          stroke="var(--color-panel-edge)"
          strokeWidth={1}
          strokeOpacity={0.5}
        />

        {/* Closing edge — drawn first so the nodes sit on top.
            Animates `stroke-dashoffset` from the path's length to 0 over
            900ms when `circleClosed` flips true (T66). The animation
            is honoured only when the user hasn't requested reduced motion;
            otherwise the path appears instantly. */}
        {circleClosed && first && last && first.roomId !== last.roomId && (
          <ClosingEdge
            d={`M ${PADDING_X + (last.ordinal - 1) * NODE_SPACING} ${cy}
                  C ${width / 2} ${cy - ROW_HEIGHT * 0.6},
                    ${width / 2} ${cy - ROW_HEIGHT * 0.6},
                    ${PADDING_X + (first.ordinal - 1) * NODE_SPACING} ${cy}`}
          />
        )}

        {/* Segments connecting sequential visits */}
        {visited.slice(0, -1).map((node, i) => {
          const nxt = visited[i + 1];
          if (!nxt) return null;
          const x1 = PADDING_X + (node.ordinal - 1) * NODE_SPACING;
          const x2 = PADDING_X + (nxt.ordinal - 1) * NODE_SPACING;
          return (
            <line
              key={`seg-${node.roomId}-${nxt.roomId}`}
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke="var(--color-silver)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes */}
        {visited.map((node) => {
          const cx = PADDING_X + (node.ordinal - 1) * NODE_SPACING;
          const isCurrent = node.roomId === currentRoomId;
          const color = TYPE_COLOR[node.rhetoricalType];
          return (
            <g
              key={node.roomId}
              data-testid="argument-map-node"
              data-current={isCurrent ? "true" : undefined}
              data-room-id={node.roomId}
              data-rhetorical-type={node.rhetoricalType}
            >
              {/* Pulsing outer ring for the current room */}
              {isCurrent && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.7}
                  className="motion-safe:[animation:pulse-violet_2s_ease-in-out_infinite]"
                />
              )}
              {/* Meta rooms get a double ring per LORE: "a panel thinking about itself" */}
              {node.rhetoricalType === "meta" && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.75}
                  strokeOpacity={0.5}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={NODE_RADIUS}
                fill={color}
                fillOpacity={isCurrent ? 1 : 0.85}
                style={
                  node.rhetoricalType === "circular"
                    ? { filter: "drop-shadow(0 0 4px var(--color-pink))" }
                    : undefined
                }
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * ClosingEdge — animated SVG path that draws itself in over 900ms via
 * stroke-dashoffset. Honours `prefers-reduced-motion`: when set, the
 * path appears instantly with no transition.
 *
 * Implementation: measure the path's total length on mount, set
 * stroke-dasharray = length, stroke-dashoffset starts at length and
 * transitions to 0 on the next frame. CSS handles the animation; React
 * just toggles the offset value via state.
 */
function ClosingEdge({ d }: { readonly d: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const len = node.getTotalLength();
    setLength(len);
    // Trigger the transition on the next frame so the initial dashoffset
    // is committed first. requestAnimationFrame keeps it deterministic.
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <g data-testid="argument-map-closing-edge">
      <path
        ref={ref}
        d={d}
        stroke="var(--color-pink)"
        strokeWidth={1.5}
        fill="none"
        strokeOpacity={0.9}
        strokeDasharray={length ?? undefined}
        strokeDashoffset={reducedMotion || drawn || length === null ? 0 : length}
        style={{
          filter: "drop-shadow(0 0 4px var(--color-pink))",
          transition: reducedMotion ? "none" : "stroke-dashoffset 900ms ease-out",
        }}
        data-testid="argument-map-closing-edge-path"
        data-drawn={drawn ? "true" : "false"}
      />
    </g>
  );
}
