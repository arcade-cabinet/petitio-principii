import { useCallback, useEffect, useRef, useState } from "react";

/**
 * RailroadClock — the primary game input surface.
 *
 * A mechanical railroad-watch face rendered in SVG (viewBox 500×500).
 *
 * Geometry (post visual rework):
 *   - Recessed bezel with case-edge silver stroke at r=240, dial radial
 *     gradient from #1a0526 → #050108, inset feDropShadow.
 *   - 60-tick minute ring on the rim. Majors: silver stroke-width 3.
 *     Minors: violet stroke-width 1.5.
 *   - Outer ring (r=210): 12 hour positions. 4 interactive direction slots
 *     (UP/RIGHT/DOWN/LEFT) + 8 decorative silver dots (r=6).
 *   - Separator ring at r=180 (silver) divides direction band from actions.
 *   - Inner ring (r=140): 7 rhetorical-action slots at 51.4° stride.
 *   - Spade hand: silver fill, wide lobes mid-shaft, narrow stem at pivot,
 *     drop-shadow filter. No breguet counterweight.
 *
 * Inputs (T98):
 *   - Single tap: `{ kind: 'tap', slot }` on pointer-up (same slot).
 *   - Chord: if a second pointer-down lands on a different slot within
 *     CHORD_WINDOW_MS, fires `{ kind: 'chord', slots: [a, b] }` instead.
 *
 * A11y: each interactive slot has `aria-label` and `role="button"`.
 * Keyboard Enter/Space on focused slot fires a tap.
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
const ACTION_STEP = 360 / 7; // ≈ 51.428°
const ACTION_SLOTS = [
  { id: "LOOK", label: "Look", angle: 0 },
  { id: "EXAMINE", label: "Examine", angle: ACTION_STEP },
  { id: "QUESTION", label: "Question", angle: ACTION_STEP * 2 },
  { id: "ASK_WHY", label: "Ask\nWhy", angle: ACTION_STEP * 3 },
  { id: "ACCEPT", label: "Accept", angle: ACTION_STEP * 4 },
  { id: "REJECT", label: "Reject", angle: ACTION_STEP * 5 },
  { id: "TRACE_BACK", label: "Trace\nBack", angle: ACTION_STEP * 6 },
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

function clockToXY(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/**
 * Build the SVG path for a spade-style clock hand.
 *
 * Modeled on the HTML reference: tip at top, wide lobes mid-shaft,
 * narrow neck near the pivot.  Designed to be placed at origin (0,0)
 * with the tip extending to (0, -len).  No counterweight.
 *
 * Example with len=200, width=12:
 *   tip at (0, -200), max lobe width ±6 at y ≈ -100, neck ±2.4 at y ≈ -50.
 */
function spadePath(len: number, width: number): string {
  const hw = width / 2;
  // Reference curve from the user-provided HTML spec, scaled to len.
  // Original (len=200): M 0 0 L 0 -100 C 0 -120 -8 -130 -8 -150
  //   C -8 -165 2 -180 0 -200 C -2 -180 12 -165 12 -150 C 12 -130 4 -120 4 -100 L 4 0 Z
  // We parameterise against len so callers can scale.
  const neckY = -len * 0.25; // where stem meets body (~-50 when len=200)
  const lobeY = -len * 0.5; // widest point (~-100 when len=200)
  const shoulderY = -len * 0.75; // upper shoulders (~-150)
  const stemHW = hw * 0.4; // stem half-width near pivot
  const neckHW = hw * 0.6; // neck half-width
  const lobeHW = hw * 1.0; // widest lobe

  // Build path: start at pivot on right side, go up to tip via left, back down via right.
  // shoulderY parameterises the cubic bezier control tangent near the tip.
  return [
    `M ${-stemHW} 0`,
    `L ${-stemHW} ${neckY}`,
    `C ${-neckHW} ${lobeY} ${-lobeHW} ${shoulderY} 0 ${-len}`,
    `C ${lobeHW} ${shoulderY} ${neckHW} ${lobeY} ${stemHW} ${neckY}`,
    `L ${stemHW} 0`,
    "Z",
  ].join(" ");
}

// ─── Slot rendering ──────────────────────────────────────────────────────────

// Post-rework sizing (T103 visual): bigger slot rings, bigger labels.
const OUTER_R = 210; // direction slot ring radius
const SEP_R = 180; // separator between direction band and action band
const INNER_R = 140; // action slot ring radius
const SLOT_RING_R = 30; // visible ring radius (was 22)
const DIR_RING_R = 34; // direction slots slightly larger
const SLOT_HIT_R = 38;
const LABEL_FONT_SIZE = 11;

const COL_ENABLED = "#7c3aed"; // violet
const COL_DISABLED = "#2a2140"; // dim violet (still reads as a slot)
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
  radius: number;
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
  radius,
  onPointerDown,
  onPointerUp,
}: SlotCircleProps) {
  const fill = isActive ? COL_ACTIVE_FILL : isEnabled ? COL_ENABLED : COL_DISABLED;
  const stroke = isActive ? COL_ACTIVE_RIM : isEnabled ? "#c4b5fd" : "#554676";
  const strokeWidth = isActive ? 3 : 2;
  const labelFill = isActive ? "#fff" : isEnabled ? "#ede9fe" : "#7c72a0";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPointerDown(id, -1);
        onPointerUp(id, -1);
      }
    },
    [id, onPointerDown, onPointerUp]
  );

  // Wrap label: "Ask\nWhy" / "Trace\nBack" → two lines.
  const lines = label.split("\n");
  const lineHeight = LABEL_FONT_SIZE * 1.05;
  const firstLineDY = lines.length === 1 ? 0 : -lineHeight * 0.45;

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG does not support <button>; role="button" on <g> is the correct ARIA pattern for SVG interactive elements.
    <g
      role="button"
      aria-label={label.replace("\n", " ")}
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
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={isEnabled || isActive ? 0.95 : 0.75}
        style={
          isActive
            ? { filter: "drop-shadow(0 0 8px rgba(168,85,247,0.9))" }
            : isEnabled
              ? { filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }
              : undefined
        }
      />
      {/* Label — presentational; pointerEvents:none so parent <g> gets events. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={labelFill}
        fontSize={LABEL_FONT_SIZE}
        fontFamily="'VT323', monospace"
        letterSpacing="0.05em"
        fontWeight="400"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {lines.map((line, idx) => (
          <tspan key={`${id}-${line}`} x={cx} dy={idx === 0 ? firstLineDY : lineHeight}>
            {line}
          </tspan>
        ))}
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
  const [handAngle, setHandAngle] = useState(0);

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
        chordFired.current = false;
        firstPress.current = { pointerId, slotId };
        clearChordTimer();
        chordTimer.current = setTimeout(() => {
          chordTimer.current = null;
        }, CHORD_WINDOW_MS);
      } else {
        const other = firstPress.current;
        if (other.slotId !== slotId) {
          clearChordTimer();
          chordFired.current = true;
          setHandAngle((_prev) => {
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
        firstPress.current = null;
        chordFired.current = false;
      }
    },
    [clearChordTimer, onCommit]
  );

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
        {/* Silver gradient for marks, hand, and hour dots */}
        <linearGradient id="rc-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e8ecf0" />
          <stop offset="55%" stopColor="#6a7383" />
          <stop offset="80%" stopColor="#b8c0ce" />
          <stop offset="100%" stopColor="#f8f9fa" />
        </linearGradient>

        {/* Brushed-silver bezel ring */}
        <linearGradient id="rc-bezel-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d8dde6" />
          <stop offset="25%" stopColor="#7a8392" />
          <stop offset="50%" stopColor="#3a4252" />
          <stop offset="75%" stopColor="#8a93a4" />
          <stop offset="100%" stopColor="#eef1f5" />
        </linearGradient>

        {/* Dial background — recessed radial */}
        <radialGradient id="rc-dial-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1a0526" />
          <stop offset="100%" stopColor="#050108" />
        </radialGradient>

        {/* Bezel recessed shadow — makes dial feel inset into the case */}
        <filter id="rc-bezel-inset" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="4" result="offset" />
          <feComposite in="SourceGraphic" in2="offset" operator="over" />
        </filter>

        {/* Silver glow filter for major ticks and hub */}
        <filter id="rc-silver-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hand drop shadow */}
        <filter id="rc-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#000" floodOpacity="0.9" />
        </filter>

        {/* Whole dial drop-shadow → "recessed into watch body" illusion */}
        <filter id="rc-dial-depth" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="6" result="offset-blur" />
          <feComposite in="SourceGraphic" in2="offset-blur" operator="over" />
        </filter>
      </defs>

      {/* ── Watch body / case ── */}
      <circle cx={CX} cy={CY} r={248} fill="url(#rc-bezel-ring)" />
      {/* Case-edge silver stroke */}
      <circle cx={CX} cy={CY} r={240} fill="none" stroke="url(#rc-silver)" strokeWidth={2.5} />

      {/* ── Dial background (recessed, radial gradient) ── */}
      <circle cx={CX} cy={CY} r={236} fill="url(#rc-dial-bg)" filter="url(#rc-dial-depth)" />

      {/* ── 60-tick minute ring ── */}
      <g>
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = i * 6;
          const isMajor = i % 5 === 0;
          const outerP = clockToXY(angle, 230);
          const innerP = clockToXY(angle, isMajor ? 215 : 222);
          return (
            <line
              key={`tick-${angle}`}
              x1={innerP.x}
              y1={innerP.y}
              x2={outerP.x}
              y2={outerP.y}
              stroke={isMajor ? "url(#rc-silver)" : "#7c3aed"}
              strokeWidth={isMajor ? 3 : 1.5}
              strokeLinecap="round"
              opacity={isMajor ? 1 : 0.8}
              filter={isMajor ? "url(#rc-silver-glow)" : undefined}
            />
          );
        })}
      </g>

      {/* ── Silver separator ring between direction band and action band ── */}
      <circle
        cx={CX}
        cy={CY}
        r={SEP_R}
        fill="none"
        stroke="url(#rc-silver)"
        strokeWidth={1.2}
        opacity={0.55}
      />

      {/* ── Silver inner-edge stroke around the central hub region ── */}
      <circle
        cx={CX}
        cy={CY}
        r={90}
        fill="#0a0513"
        stroke="url(#rc-silver)"
        strokeWidth={1}
        opacity={0.7}
      />

      {/* ── 12 hour markers: 8 decorative silver dots + 4 direction slots ── */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const isDirection = angle % 90 === 0;
          if (isDirection) return null; // rendered as interactive slot below
          const pos = clockToXY(angle, OUTER_R);
          return (
            <g key={`hour-marker-${angle}`}>
              {/* Silver filled hour dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={6}
                fill="url(#rc-silver)"
                stroke="#2a2535"
                strokeWidth={0.5}
                opacity={0.95}
              />
              {/* Hour numeral below the dot */}
              <text
                x={pos.x}
                y={pos.y + 18}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#9ca0b5"
                fontSize={10}
                fontFamily="'VT323', monospace"
                letterSpacing="0.08em"
                style={{ userSelect: "none" }}
              >
                {i === 0 ? 12 : i}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── Direction slots (outer ring, slightly larger) ── */}
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
            radius={DIR_RING_R}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        );
      })}

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
            radius={SLOT_RING_R}
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
        <g transform={`translate(${CX}, ${CY})`}>
          <path
            d={spadePath(200, 14)}
            fill="url(#rc-silver)"
            stroke="#2a2535"
            strokeWidth={0.6}
            opacity={0.98}
          />
        </g>
      </g>

      {/* ── Centre hub (pivot cap) ── */}
      <g filter="url(#rc-silver-glow)">
        <circle cx={CX} cy={CY} r={10} fill="url(#rc-silver)" />
        <circle cx={CX} cy={CY} r={4} fill="#060309" />
        <circle cx={CX} cy={CY} r={1.5} fill="#c4b5fd" />
      </g>

      {/* ── Brand label at 6 o'clock ── */}
      <text
        x={CX}
        y={CY + 62}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#4c4575"
        fontSize={9}
        fontFamily="'VT323', monospace"
        letterSpacing="0.35em"
        style={{ userSelect: "none" }}
      >
        PETITIO
      </text>
    </svg>
  );
}
