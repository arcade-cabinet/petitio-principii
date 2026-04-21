import { useCallback, useEffect, useRef, useState } from "react";

/**
 * RailroadClock — the primary game input surface.
 *
 * A mechanical railroad-watch face rendered in SVG (viewBox 500×500).
 *
 * Geometry:
 *   - 60-tick minute ring on the outer rim (every 5th tick in silver, rest violet)
 *   - Outer ring: 12 positions, 4 interactive direction slots (UP at 12,
 *     RIGHT at 3, DOWN at 6, LEFT at 9), 8 decorative hour ticks.
 *   - Inner ring: 7 rhetorical-action wedges (LOOK / EXAMINE / QUESTION /
 *     ASK WHY / ACCEPT / REJECT / TRACE BACK) at 51.4° stride,
 *     5 decorative spacer positions.
 *   - Spade hand pivots from centre; rotates to the last-activated slot.
 *
 * Inputs (T98):
 *   - Single tap: `{ kind: 'tap', slot }` on pointer-up (same slot).
 *   - Chord: if a second pointer-down lands on a different slot within
 *     CHORD_WINDOW_MS, fires `{ kind: 'chord', slots: [a, b] }` instead.
 *   - Multi-touch via pointer IDs.
 *
 * Shading:
 *   - `availableDirections` / `availableActions` control colour.
 *   - Enabled → violet (#7c3aed). Disabled → near-black (#1e1a2a).
 *   - Active slot (lastSlot prop) → bright violet + white rim.
 *   - All 11 slots always visible; never hidden (supersedes keycapSurface).
 *
 * A11y:
 *   - Each interactive slot has `aria-label` and `role="button"`.
 *   - Keyboard: Enter/Space on focused slot fires a tap.
 *   - Decorative ticks and the hand are aria-hidden.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const CX = 250;
const CY = 250;

/** How long after first pointer-down to wait for a second (chord window). */
const CHORD_WINDOW_MS = 250;

// Outer ring: 4 direction slots at 12/3/6/9 o'clock.
// Angle in degrees where 0° = 12 o'clock (top).
const DIRECTION_SLOTS = [
  { id: "UP", label: "Up", angle: 0 },
  { id: "RIGHT", label: "Right", angle: 90 },
  { id: "DOWN", label: "Down", angle: 180 },
  { id: "LEFT", label: "Left", angle: 270 },
] as const;

export type DirectionSlotId = "UP" | "RIGHT" | "DOWN" | "LEFT";

// Inner ring: 7 rhetorical actions at 51.4° stride.
// First slot at 0° (top), then every 51.43° CW.
const ACTION_STEP = 360 / 7; // ≈ 51.428°
const ACTION_SLOTS = [
  { id: "LOOK", label: "Look", angle: 0 },
  { id: "EXAMINE", label: "Examine", angle: ACTION_STEP },
  { id: "QUESTION", label: "Question", angle: ACTION_STEP * 2 },
  { id: "ASK_WHY", label: "Ask Why", angle: ACTION_STEP * 3 },
  { id: "ACCEPT", label: "Accept", angle: ACTION_STEP * 4 },
  { id: "REJECT", label: "Reject", angle: ACTION_STEP * 5 },
  { id: "TRACE_BACK", label: "Trace Back", angle: ACTION_STEP * 6 },
] as const;

export type ActionSlotId =
  | "LOOK"
  | "EXAMINE"
  | "QUESTION"
  | "ASK_WHY"
  | "ACCEPT"
  | "REJECT"
  | "TRACE_BACK";

export type SlotId = DirectionSlotId | ActionSlotId;

export type Move = { kind: "tap"; slot: SlotId } | { kind: "chord"; slots: [SlotId, SlotId] };

export interface RailroadClockProps {
  /** Set of direction slot ids that are currently available (enabled). */
  availableDirections: ReadonlySet<string>;
  /** Set of action slot ids that are currently available (enabled). */
  availableActions: ReadonlySet<string>;
  /** The last slot committed (drives the spade hand rotation). */
  lastSlot?: SlotId | null;
  /** Called when the player commits a tap or chord. */
  onCommit: (move: Move) => void;
  /** CSS size of the SVG. Defaults to "100%". */
  size?: number | string;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/**
 * Convert a clock angle (0 = 12 o'clock, CW) to SVG cartesian.
 * angle in degrees.
 */
function clockToXY(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/**
 * Build the SVG path for a spade shape (pointing upward from origin,
 * then translate/rotate in the parent group).
 * The spade tip is at (0, -len), the grip at (0, 0).
 */
function spadePath(len: number, width: number): string {
  // Spade: arrow tip at top, flanked by two lobes, then a narrow stem.
  const hw = width / 2;
  const stemH = len * 0.22;
  const tipY = -len;
  const lobe1Y = -len * 0.55;
  const lobe2Y = -len * 0.28;
  return [
    "M 0 0",
    // Stem up
    `L ${hw * 0.4} ${-stemH}`,
    // Left lobe curve
    `C ${hw * 1.1} ${lobe2Y} ${hw * 1.3} ${lobe1Y} 0 ${tipY}`,
    // Right lobe curve
    `C ${-hw * 1.3} ${lobe1Y} ${-hw * 1.1} ${lobe2Y} ${-hw * 0.4} ${-stemH}`,
    "Z",
  ].join(" ");
}

// ─── Slot rendering helpers ──────────────────────────────────────────────────

const OUTER_R = 195; // radius for direction slot markers
const INNER_R = 120; // radius for action slot markers
const SLOT_HIT_R = 28; // hit-test circle radius
const SLOT_RING_R = 22; // visible ring radius

const COL_ENABLED = "#7c3aed"; // violet
const COL_DISABLED = "#1e1a2a"; // near-black
const COL_ACTIVE_FILL = "#a855f7"; // bright violet
const COL_ACTIVE_RIM = "#ffffff";

interface SlotCircleProps {
  cx: number;
  cy: number;
  isEnabled: boolean;
  isActive: boolean;
  id: SlotId;
  label: string;
  ring: "outer" | "inner";
  onPointerDown: (id: SlotId, pointerId: number) => void;
  onPointerUp: (id: SlotId, pointerId: number) => void;
}

function SlotCircle({
  cx,
  cy,
  isEnabled,
  isActive,
  id,
  label,
  ring,
  onPointerDown,
  onPointerUp,
}: SlotCircleProps) {
  const fill = isActive ? COL_ACTIVE_FILL : isEnabled ? COL_ENABLED : COL_DISABLED;
  const stroke = isActive ? COL_ACTIVE_RIM : isEnabled ? "#c4b5fd" : "#2d2640";
  const strokeWidth = isActive ? 2.5 : 1.5;
  const labelFill = isActive ? "#fff" : isEnabled ? "#ddd6fe" : "#4c4575";
  const r = SLOT_RING_R;

  // Font size for label: shorter strings get bigger size
  const fontSize = label.length <= 4 ? 11 : label.length <= 6 ? 9.5 : 8.5;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // Synthesise a tap directly on keyboard activation
        onPointerDown(id, -1);
        onPointerUp(id, -1);
      }
    },
    [id, onPointerDown, onPointerUp]
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG does not support <button>; role="button" on <g> is the correct ARIA pattern for SVG interactive elements.
    <g
      role="button"
      aria-label={label}
      aria-disabled={!isEnabled}
      tabIndex={0}
      data-slot-id={id}
      data-ring={ring}
      style={{ cursor: isEnabled ? "pointer" : "default" }}
      onPointerDown={(e) => {
        if (!isEnabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointerDown(id, e.pointerId);
      }}
      onPointerUp={(e) => {
        if (!isEnabled) return;
        onPointerUp(id, e.pointerId);
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hit area — larger than the visible ring */}
      <circle cx={cx} cy={cy} r={SLOT_HIT_R} fill="transparent" />
      {/* Visible ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={isEnabled || isActive ? 0.92 : 0.45}
        style={
          isActive
            ? { filter: "drop-shadow(0 0 6px rgba(168,85,247,0.8))" }
            : isEnabled
              ? { filter: "drop-shadow(0 0 3px rgba(124,58,237,0.4))" }
              : undefined
        }
      />
      {/* Label — presentational duplicate of aria-label; pointerEvents:none so
          the parent <g> receives all pointer events. No aria-hidden so AT
          can read the slot label when focused. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={labelFill}
        fontSize={fontSize}
        fontFamily="'VT323', monospace"
        letterSpacing="0.05em"
        fontWeight="400"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RailroadClock({
  availableDirections,
  availableActions,
  lastSlot = null,
  onCommit,
  size = "100%",
}: RailroadClockProps) {
  // ── Hand rotation state ──────────────────────────────────────────────
  // Drives the CSS-var-controlled spade hand.
  const [handAngle, setHandAngle] = useState(0);

  // Compute the target angle for the last activated slot.
  useEffect(() => {
    if (!lastSlot) return;
    const dir = DIRECTION_SLOTS.find((d) => d.id === lastSlot);
    if (dir) {
      setHandAngle(dir.angle);
      return;
    }
    const act = ACTION_SLOTS.find((a) => a.id === lastSlot);
    if (act) setHandAngle(act.angle);
  }, [lastSlot]);

  // ── Chord detection ──────────────────────────────────────────────────
  // We track active pointer presses: Map<pointerId, SlotId>.
  const pressMap = useRef<Map<number, SlotId>>(new Map());
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPress = useRef<{ pointerId: number; slotId: SlotId } | null>(null);
  const chordFired = useRef(false);

  const clearChordTimer = useCallback(() => {
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (slotId: SlotId, pointerId: number) => {
      pressMap.current.set(pointerId, slotId);

      if (!firstPress.current) {
        // First press — open chord window.
        chordFired.current = false;
        firstPress.current = { pointerId, slotId };
        clearChordTimer();
        chordTimer.current = setTimeout(() => {
          // Chord window expired without a second press — will fire tap on up.
          chordTimer.current = null;
        }, CHORD_WINDOW_MS);
      } else {
        // Second press while chord window is open — check it's a different slot.
        const other = firstPress.current;
        if (other.slotId !== slotId) {
          clearChordTimer();
          chordFired.current = true;
          setHandAngle((_prev) => {
            // Hand goes to the second slot of the chord.
            const dir = DIRECTION_SLOTS.find((d) => d.id === slotId);
            if (dir) return dir.angle;
            const act = ACTION_SLOTS.find((a) => a.id === slotId);
            if (act) return act.angle;
            return _prev;
          });
          onCommit({ kind: "chord", slots: [other.slotId, slotId] });
        }
      }
    },
    [clearChordTimer, onCommit]
  );

  const handlePointerUp = useCallback(
    (slotId: SlotId, pointerId: number) => {
      pressMap.current.delete(pointerId);

      // If this is the first press being released and no chord fired, emit tap.
      if (
        firstPress.current?.pointerId === pointerId &&
        firstPress.current?.slotId === slotId &&
        !chordFired.current
      ) {
        clearChordTimer();
        firstPress.current = null;
        chordFired.current = false;
        setHandAngle((_prev) => {
          const dir = DIRECTION_SLOTS.find((d) => d.id === slotId);
          if (dir) return dir.angle;
          const act = ACTION_SLOTS.find((a) => a.id === slotId);
          if (act) return act.angle;
          return _prev;
        });
        onCommit({ kind: "tap", slot: slotId });
      } else if (firstPress.current?.pointerId === pointerId) {
        // First press released after chord — reset.
        firstPress.current = null;
        chordFired.current = false;
      }
    },
    [clearChordTimer, onCommit]
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearChordTimer();
  }, [clearChordTimer]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      style={{ width: size, height: "auto", display: "block" }}
      aria-label="Railroad clock input"
      focusable="false"
    >
      <title>Railroad clock — tap a slot or hold two for a chord</title>
      <defs>
        {/* Silver gradient for marks and text */}
        <linearGradient id="rc-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e0e4e8" />
          <stop offset="55%" stopColor="#8a95a5" />
          <stop offset="100%" stopColor="#f8f9fa" />
        </linearGradient>

        {/* Silver glow filter */}
        <filter id="rc-silver-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hand drop shadow */}
        <filter id="rc-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.85" />
        </filter>

        {/* Bezel brushed radial */}
        <radialGradient id="rc-bezel-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2d1f42" stopOpacity="1" />
          <stop offset="60%" stopColor="#120b1e" stopOpacity="1" />
          <stop offset="100%" stopColor="#060309" stopOpacity="1" />
        </radialGradient>

        {/* Outer bezel ring — brushed silver illusion */}
        <linearGradient id="rc-bezel-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8cdd6" />
          <stop offset="20%" stopColor="#868e9e" />
          <stop offset="45%" stopColor="#4a5262" />
          <stop offset="70%" stopColor="#9aa3b4" />
          <stop offset="100%" stopColor="#dde2ec" />
        </linearGradient>
      </defs>

      {/* ── Background disc ── */}
      <circle cx={CX} cy={CY} r={248} fill="url(#rc-bezel-ring)" />
      <circle cx={CX} cy={CY} r={242} fill="url(#rc-bezel-bg)" />

      {/* ── 60-tick minute ring on the rim ── */}
      <g>
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = i * 6; // every 6° = 1 minute
          const isMajor = i % 5 === 0; // every 5th is a major (silver) tick
          const pos = clockToXY(angle, 232);
          const inner = clockToXY(angle, isMajor ? 220 : 225);
          return (
            <line
              key={`tick-${angle}`}
              x1={inner.x}
              y1={inner.y}
              x2={pos.x}
              y2={pos.y}
              stroke={isMajor ? "url(#rc-silver)" : "#4a3568"}
              strokeWidth={isMajor ? 2.5 : 1}
              opacity={isMajor ? 0.9 : 0.55}
              filter={isMajor ? "url(#rc-silver-glow)" : undefined}
            />
          );
        })}
      </g>

      {/* ── Outer ring guide circle ── */}
      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill="none"
        stroke="#3b2e54"
        strokeWidth={1}
        strokeDasharray="4 10"
      />

      {/* ── Inner ring guide circle ── */}
      <circle
        cx={CX}
        cy={CY}
        r={INNER_R}
        fill="none"
        stroke="#2a1e3e"
        strokeWidth={1}
        strokeDasharray="3 8"
      />

      {/* ── Face fill (dark glass) ── */}
      <circle cx={CX} cy={CY} r={90} fill="#09060e" stroke="#1a0f28" strokeWidth={1} />

      {/* ── Decorative hour positions (outer ring — 8 non-direction slots) ── */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const isDirection = angle % 90 === 0;
          if (isDirection) return null; // direction slots rendered separately
          const pos = clockToXY(angle, OUTER_R);
          return (
            <g key={`deco-outer-${angle}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={8}
                fill="#1c1030"
                stroke="#3b2e54"
                strokeWidth={1}
                opacity={0.7}
              />
              {/* Hour numeral — small decorative */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#4a3568"
                fontSize={7}
                fontFamily="serif"
                style={{ userSelect: "none" }}
              >
                {i}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── Direction slots (outer ring) ── */}
      {DIRECTION_SLOTS.map((slot) => {
        const pos = clockToXY(slot.angle, OUTER_R);
        const isEnabled = availableDirections.has(slot.id);
        const isActive = lastSlot === slot.id;
        return (
          <SlotCircle
            key={slot.id}
            cx={pos.x}
            cy={pos.y}
            isEnabled={isEnabled}
            isActive={isActive}
            id={slot.id}
            label={slot.label}
            ring="outer"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        );
      })}

      {/* ── Decorative spacer positions (inner ring — 5 non-action slots) ── */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          // Check if this angle is close to any action slot angle
          const isAction = ACTION_SLOTS.some((a) => Math.abs((a.angle - angle + 360) % 360) < 15);
          if (isAction) return null;
          const pos = clockToXY(angle, INNER_R);
          return (
            <circle
              key={`deco-inner-${angle}`}
              cx={pos.x}
              cy={pos.y}
              r={5}
              fill="#160e26"
              stroke="#2d1f42"
              strokeWidth={0.8}
              opacity={0.5}
            />
          );
        })}
      </g>

      {/* ── Action slots (inner ring) ── */}
      {ACTION_SLOTS.map((slot) => {
        const pos = clockToXY(slot.angle, INNER_R);
        const isEnabled = availableActions.has(slot.id);
        const isActive = lastSlot === slot.id;
        return (
          <SlotCircle
            key={slot.id}
            cx={pos.x}
            cy={pos.y}
            isEnabled={isEnabled}
            isActive={isActive}
            id={slot.id}
            label={slot.label}
            ring="inner"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        );
      })}

      {/* ── Spade hand ── */}
      <g
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${handAngle}deg)`,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        filter="url(#rc-hand-shadow)"
      >
        {/* Hand extends from centre upward (toward 12 o'clock = angle 0). */}
        <g transform={`translate(${CX}, ${CY})`}>
          {/* Outer hand shaft — reaches toward the outer ring */}
          <path d={spadePath(165, 10)} fill="url(#rc-silver)" opacity={0.9} />
          {/* Inner counterweight shaft */}
          <rect x={-3} y={12} width={6} height={28} rx={2} fill="#8a95a5" opacity={0.7} />
        </g>
      </g>

      {/* ── Centre hub ── */}
      <g filter="url(#rc-silver-glow)">
        <circle cx={CX} cy={CY} r={14} fill="url(#rc-silver)" />
        <circle cx={CX} cy={CY} r={6} fill="#060309" />
        <circle cx={CX} cy={CY} r={2.5} fill="#a855f7" />
      </g>

      {/* ── Brand label at 6 o'clock position ── */}
      <text
        x={CX}
        y={CY + 62}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#3b2e54"
        fontSize={8}
        fontFamily="'VT323', monospace"
        letterSpacing="0.3em"
        style={{ userSelect: "none" }}
      >
        PETITIO
      </text>
    </svg>
  );
}
