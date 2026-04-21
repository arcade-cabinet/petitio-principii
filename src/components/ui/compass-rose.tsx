/**
 * CompassRose — the in-game spatial input device.
 *
 * 8-point star (4 cardinals + 4 sub-points) inside a silver dashed ring.
 * Each of the 8 points is a clickable wedge; clicking a wedge:
 *   1. Calls `onDirection(direction)` so the parent can submit the move.
 *   2. Spins the central star to point that direction (spring transition).
 *
 * Disabled directions (no exit available from the current room) render
 * as dim silhouettes — visible so the layout doesn't jitter, but
 * non-interactive and aria-disabled.
 *
 * The 4 cardinals (N/E/S/W) and 4 diagonals (NE/SE/SW/NW) cover the
 * full horizontal plane of the 3D memory palace. The player's vertical
 * traversal (up/down) lives on the keycap row alongside the rhetorical
 * verbs — those are not "geographic" enough to belong on the compass.
 *
 * Reduced-motion: rotation transition collapses to instant snap.
 */
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

export type CompassDirection =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest";

/** Backward-compat alias for legacy callers (lastCardinalHeading state). */
export type CompassHeading = CompassDirection | null;

/** The 8 directions with their clock-face angle (0° = N, 90° = E, etc). */
const DIRECTIONS: ReadonlyArray<{ id: CompassDirection; angle: number; label: string }> = [
  { id: "north", angle: 0, label: "N" },
  { id: "northeast", angle: 45, label: "NE" },
  { id: "east", angle: 90, label: "E" },
  { id: "southeast", angle: 135, label: "SE" },
  { id: "south", angle: 180, label: "S" },
  { id: "southwest", angle: 225, label: "SW" },
  { id: "west", angle: 270, label: "W" },
  { id: "northwest", angle: 315, label: "NW" },
];

const VB = 200;
const CX = VB / 2;
const CY = VB / 2;
const RING_R = 88;
const POINT_OUTER_R = 78;
const POINT_INNER_R = 30;
const HIT_R = 18;
const LABEL_R = 70;

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r };
}

export interface CompassRoseProps {
  /** Set of directions currently available as exits from the present room. */
  readonly available: ReadonlySet<CompassDirection>;
  /** Last direction the player pressed; the star spins to point there. */
  readonly lastHeading?: CompassHeading;
  /** Called when the player clicks an enabled direction wedge. */
  readonly onDirection: (dir: CompassDirection) => void;
  /** CSS size — number (px) or string. Default 100%. */
  readonly size?: number | string;
  /** Optional className for the SVG element. */
  readonly className?: string;
}

export function CompassRose({
  available,
  lastHeading,
  onDirection,
  size = "100%",
  className,
}: CompassRoseProps) {
  const reducedMotion = useReducedMotion();
  const filterId = useId();
  const angle = lastHeading ? (DIRECTIONS.find((d) => d.id === lastHeading)?.angle ?? 0) : 0;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ width: size, height: "auto", display: "block" }}
      className={className}
      aria-label="Compass rose — click a direction to move"
    >
      <title>Compass rose — click a direction to move</title>
      <defs>
        <linearGradient id={`${filterId}-silver`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="50%" stopColor="#7a8294" />
          <stop offset="100%" stopColor="#dfe5ee" />
        </linearGradient>
        <radialGradient id={`${filterId}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        cx={CX}
        cy={CY}
        r={RING_R}
        fill="none"
        stroke="#7a8294"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity="0.7"
      />

      <motion.g
        animate={{ rotate: angle }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 80, damping: 14, mass: 0.7 }
        }
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      >
        {DIRECTIONS.map(({ id, angle: a }) => {
          const tip = polar(a, POINT_OUTER_R);
          const left = polar(a - 6, POINT_INNER_R);
          const right = polar(a + 6, POINT_INNER_R);
          const isCardinal = a % 90 === 0;
          return (
            <polygon
              key={`star-${id}`}
              points={`${tip.x},${tip.y} ${right.x},${right.y} ${CX},${CY} ${left.x},${left.y}`}
              fill={isCardinal ? `url(#${filterId}-silver)` : "#3a4252"}
              stroke="#1a1f2c"
              strokeWidth="0.6"
              opacity={isCardinal ? 1 : 0.7}
            />
          );
        })}
        <circle
          cx={CX}
          cy={CY}
          r={6}
          fill={`url(#${filterId}-silver)`}
          stroke="#1a1f2c"
          strokeWidth="0.5"
        />
        <circle cx={CX - 1} cy={CY - 1} r={1.5} fill="#fff" opacity="0.7" />
      </motion.g>

      {DIRECTIONS.map(({ id, angle: a, label }) => {
        const pos = polar(a, LABEL_R);
        const isAvailable = available.has(id);
        const isActive = lastHeading === id;
        return (
          <g key={`label-${id}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={HIT_R}
              fill="transparent"
              role="button"
              tabIndex={isAvailable ? 0 : -1}
              aria-label={`${label} — ${id}${isAvailable ? "" : " (no exit)"}`}
              aria-disabled={!isAvailable}
              data-direction={id}
              onClick={isAvailable ? () => onDirection(id) : undefined}
              onKeyDown={(e) => {
                if (!isAvailable) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDirection(id);
                }
              }}
              style={{
                cursor: isAvailable ? "pointer" : "default",
                outline: "none",
              }}
            />
            {isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                fill={`url(#${filterId}-glow)`}
                pointerEvents="none"
              />
            )}
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isAvailable ? (isActive ? "#c4b5fd" : "#e8ecf0") : "#3a4252"}
              fontSize={a % 90 === 0 ? 14 : 11}
              fontFamily="var(--font-display), monospace"
              fontWeight={isActive ? 700 : 500}
              letterSpacing="0.06em"
              opacity={isAvailable ? 1 : 0.4}
              style={{
                userSelect: "none",
                pointerEvents: "none",
                filter: isActive ? "drop-shadow(0 0 4px rgba(196,181,253,0.8))" : undefined,
              }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
